import { isIP } from 'node:net';
import { lookup as dnsLookup } from 'node:dns/promises';
import { z } from 'zod';

const MAX_SUBDOMAINS = 20;
const MAX_SITEMAP_ENTRIES = 500;
const SITEMAP_TIMEOUT_MS = 4_000;
const ROBOTS_TIMEOUT_MS = 4_000;
const DISCOVERY_MAX_BYTES = 200 * 1024;

export const discoveryStatsSchema = z.object({
	fromLinks: z.number().int().nonnegative(),
	fromSitemap: z.number().int().nonnegative(),
	totalConsidered: z.number().int().nonnegative(),
	totalAccepted: z.number().int().nonnegative(),
	truncated: z.boolean(),
});

export type DiscoveryStats = z.infer<typeof discoveryStatsSchema>;

export const discoveryOutputSchema = z.object({
	targets: z.array(z.string().url()),
	subdomains: z.array(z.string()),
	stats: discoveryStatsSchema,
});

export type DiscoveryOutput = z.infer<typeof discoveryOutputSchema>;

const emptyStats = z
	.function()
	.args()
	.returns(discoveryStatsSchema)
	.implement(() => ({
		fromLinks: 0,
		fromSitemap: 0,
		totalConsidered: 0,
		totalAccepted: 0,
		truncated: false,
	}));

const ipv4ToNumber = z
	.function()
	.args(z.string())
	.returns(z.number())
	.implement((ip) => {
		const [a, b, c, d] = ip.split('.').map(Number);
		return ((a << 24) | (b << 16) | (c << 8) | d) >>> 0;
	});

const PRIVATE_IPV4_RANGES: readonly { prefix: number; mask: number }[] = [
	{ prefix: 0x7f000000, mask: 0xff000000 },
	{ prefix: 0x0a000000, mask: 0xff000000 },
	{ prefix: 0xac100000, mask: 0xfff00000 },
	{ prefix: 0xc0a80000, mask: 0xffff0000 },
	{ prefix: 0xa9fe0000, mask: 0xffff0000 },
	{ prefix: 0x64400000, mask: 0xffc00000 },
	{ prefix: 0x00000000, mask: 0xff000000 },
] as const;

const isPrivateIPv4 = z
	.function()
	.args(z.string())
	.returns(z.boolean())
	.implement((ip) => {
		const num = ipv4ToNumber(ip);
		return PRIVATE_IPV4_RANGES.some((range) => (num & range.mask) >>> 0 === range.prefix);
	});

const expandIPv6 = z
	.function()
	.args(z.string())
	.returns(z.bigint())
	.implement((ip) => {
		let normalized = ip.toLowerCase(); // eslint-disable-line custom/no-mutable-variables
		if (normalized.startsWith('::')) {
			normalized = '0' + normalized;
		}
		if (normalized.endsWith('::')) {
			normalized = normalized + '0';
		}

		const halves = normalized.split('::');
		const groups: string[] = [];

		if (halves.length === 2) {
			const left = halves[0] ? halves[0].split(':') : [];
			const right = halves[1] ? halves[1].split(':') : [];
			const missing = 8 - left.length - right.length;
			for (const part of left) {
				groups.push(part);
			}
			for (let i = 0; i < missing; i++) {
				groups.push('0');
			}
			for (const part of right) {
				groups.push(part);
			}
		} else {
			const parts = normalized.split(':');
			for (const part of parts) {
				groups.push(part);
			}
		}

		let result = 0n; // eslint-disable-line custom/no-mutable-variables
		for (const group of groups) {
			result = (result << 16n) | BigInt(parseInt(group || '0', 16));
		}
		return result;
	});

const isPrivateIPv6 = z
	.function()
	.args(z.string())
	.returns(z.boolean())
	.implement((ip) => {
		const addr = expandIPv6(ip);
		if (addr === 1n) return true;
		if (addr === 0n) return true;
		const firstByte = Number((addr >> 120n) & 0xffn);
		if ((firstByte & 0xfe) === 0xfc) return true;
		const topTenBits = Number((addr >> 118n) & 0x3ffn);
		if (topTenBits === 0x3fa) return true;
		return false;
	});

export const isPrivateIp = z
	.function()
	.args(z.string())
	.returns(z.boolean())
	.implement((ip) => {
		const version = isIP(ip);
		if (version === 4) return isPrivateIPv4(ip);
		if (version === 6) return isPrivateIPv6(ip);
		return false;
	});

export const resolveAndCheckHost = z
	.function()
	.args(z.string())
	.returns(z.promise(z.boolean()))
	.implement(async (hostname) => {
		if (hostname === 'localhost') return false;

		try {
			const result = await dnsLookup(hostname, { all: true });
			return !result.some((entry) => isPrivateIp(entry.address));
		} catch {
			return false;
		}
	});

export const shouldSkipDiscovery = z
	.function()
	.args(z.string())
	.returns(z.boolean())
	.implement((hostname) => {
		if (hostname === 'localhost') return true;
		if (hostname === 'localhost.localdomain') return true;
		return isIP(hostname) !== 0;
	});

export const isSubdomainOf = z
	.function()
	.args(z.string(), z.string())
	.returns(z.boolean())
	.implement((candidateHost, baseHost) => {
		const lowerCandidate = candidateHost.toLowerCase();
		const lowerBase = baseHost.toLowerCase();
		return lowerCandidate !== lowerBase && lowerCandidate.endsWith('.' + lowerBase);
	});

const IGNORED_SCHEMES = new Set(['data:', 'javascript:', 'mailto:', 'tel:', 'vbscript:', 'blob:']);

const isIgnoredScheme = z
	.function()
	.args(z.string())
	.returns(z.boolean())
	.implement((url) => {
		const colonIndex = url.indexOf(':');
		if (colonIndex === -1) return false;
		return IGNORED_SCHEMES.has(url.slice(0, colonIndex + 1).toLowerCase());
	});

export const extractSubdomainHosts = z
	.function()
	.args(z.string(), z.string().url(), z.string())
	.returns(
		z.object({
			hosts: z.map(z.string(), z.object({ hostname: z.string(), scheme: z.string() })),
			totalExamined: z.number().int().nonnegative(),
		}),
	)
	.implement((html, baseUrl, baseHost) => {
		const hosts = new Map<string, { hostname: string; scheme: string }>();
		let totalExamined = 0; // eslint-disable-line custom/no-mutable-variables

		const extractFromTags = z
			.function()
			.args(z.instanceof(RegExp))
			.returns(z.void())
			.implement((regex) => {
				const re = new RegExp(regex.source, regex.flags);
				let match; // eslint-disable-line custom/no-mutable-variables
				while ((match = re.exec(html)) !== null) {
					const rawUrl = (match[1] ?? match[2] ?? match[3] ?? '').trim();
					if (rawUrl.length === 0) continue;
					if (isIgnoredScheme(rawUrl)) continue;

					try {
						const parsed = new URL(rawUrl, baseUrl);
						if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') continue;

						totalExamined++;

						const host = parsed.hostname.toLowerCase();
						if (isSubdomainOf(host, baseHost)) {
							const scheme = parsed.protocol === 'https:' ? 'https' : 'http';
							const existing = hosts.get(host);
							if (!existing || (existing.scheme === 'http' && scheme === 'https')) {
								hosts.set(host, { hostname: host, scheme });
							}
						}
					} catch {
						continue;
					}
				}
			});

		extractFromTags(/<a\b[^>]*\bhref\s*=\s*(?:"([^"]+)"|'([^']+)'|([^\s"'=<>`]+))/gi);
		extractFromTags(/<script\b[^>]*\bsrc\s*=\s*(?:"([^"]+)"|'([^']+)'|([^\s"'=<>`]+))/gi);
		extractFromTags(/<link\b[^>]*\bhref\s*=\s*(?:"([^"]+)"|'([^']+)'|([^\s"'=<>`]+))/gi);

		return { hosts, totalExamined };
	});

const extractLocUrls = z
	.function()
	.args(z.string())
	.returns(z.array(z.string()))
	.implement((xml) => {
		const urls: string[] = [];
		const locRegex = /<loc>([^<]+)<\/loc>/gi;
		let match; // eslint-disable-line custom/no-mutable-variables
		while ((match = locRegex.exec(xml)) !== null) {
			urls.push(match[1].trim());
		}
		return urls;
	});

const isSitemapIndex = z
	.function()
	.args(z.string())
	.returns(z.boolean())
	.implement((xml) => {
		return /<sitemapindex[\s>]/i.test(xml);
	});

export const parseSitemapUrls = z
	.function()
	.args(z.string())
	.returns(
		z.object({
			urls: z.array(z.string()),
			isIndex: z.boolean(),
		}),
	)
	.implement((xml) => {
		const index = isSitemapIndex(xml);
		const urls = extractLocUrls(xml);
		return { urls, isIndex: index };
	});

export const extractSitemapUrlsFromRobots = z
	.function()
	.args(z.string(), z.string().url())
	.returns(z.array(z.string()))
	.implement((text, robotsUrl) => {
		const urls: string[] = [];
		const lines = text.split('\n');

		for (const line of lines) {
			const trimmed = line.trim();
			if (!trimmed.toLowerCase().startsWith('sitemap:')) continue;

			const rawUrl = trimmed.substring(8).trim();
			if (rawUrl.length === 0) continue;

			try {
				const resolved = new URL(rawUrl, robotsUrl);
				if (resolved.protocol === 'https:' || resolved.protocol === 'http:') {
					urls.push(resolved.toString());
				}
			} catch {
				continue;
			}
		}

		return urls;
	});

export const normalizeTarget = z
	.function()
	.args(z.string(), z.string())
	.returns(z.string().url())
	.implement((hostname, scheme) => {
		const url = new URL(`${scheme}://${hostname}/`);
		url.pathname = '/';
		url.search = '';
		url.hash = '';
		return url.toString();
	});

const fetchDiscoveryResource = z
	.function()
	.args(z.string(), z.number().int().positive(), z.number().int().positive(), z.string().optional())
	.returns(z.promise(z.string().nullable()))
	.implement(async (url, timeoutMs, maxBytes, allowedFinalHost) => {
		try {
			const parsed = new URL(url);
			const isSafe = await resolveAndCheckHost(parsed.hostname);
			if (!isSafe) return null;

			const response = await fetch(url, {
				method: 'GET',
				signal: AbortSignal.timeout(timeoutMs),
				redirect: 'follow',
			});

			if (!response.ok) return null;

			const finalUrl = new URL(response.url);
			if (isPrivateIp(finalUrl.hostname) || finalUrl.hostname === 'localhost') return null;

			if (allowedFinalHost && finalUrl.hostname.toLowerCase() !== allowedFinalHost.toLowerCase()) {
				return null;
			}

			const body = await response.text();
			return body.slice(0, maxBytes);
		} catch {
			return null;
		}
	});

export const discoverSubdomainTargets = z
	.function()
	.args(z.string().url(), z.string())
	.returns(z.promise(discoveryOutputSchema))
	.implement(async (baseUrl, mainPageHtml) => {
		const baseHost = new URL(baseUrl).hostname.toLowerCase();
		let totalConsidered = 0; // eslint-disable-line custom/no-mutable-variables
		let truncated = false; // eslint-disable-line custom/no-mutable-variables
		let sitemapEntriesProcessed = 0; // eslint-disable-line custom/no-mutable-variables

		const { hosts: linkHosts, totalExamined: linkTotalExamined } = extractSubdomainHosts(
			mainPageHtml,
			baseUrl,
			baseHost,
		);
		totalConsidered += linkTotalExamined;
		const fromLinks = linkHosts.size;

		const sitemapHosts = new Map<string, { hostname: string; scheme: string }>();
		const processedSitemapUrls = new Set<string>();

		const fetchAndProcessSitemap = z
			.function()
			.args(z.string(), z.number().int().nonnegative())
			.returns(z.promise(z.void()))
			.implement(async (sitemapUrl, depth) => {
				const normalizedSitemapUrl = (() => {
					try {
						return new URL(sitemapUrl).toString();
					} catch {
						return null;
					}
				})();

				if (normalizedSitemapUrl === null) return;
				if (processedSitemapUrls.has(normalizedSitemapUrl)) return;
				processedSitemapUrls.add(normalizedSitemapUrl);

				const xml = await fetchDiscoveryResource(
					normalizedSitemapUrl,
					SITEMAP_TIMEOUT_MS,
					DISCOVERY_MAX_BYTES,
					baseHost,
				);
				if (xml === null) return;

				const parsed = parseSitemapUrls(xml);

				if (parsed.isIndex && depth < 1) {
					for (const childUrl of parsed.urls) {
						sitemapEntriesProcessed++;
						totalConsidered++;

						if (sitemapEntriesProcessed > MAX_SITEMAP_ENTRIES) {
							truncated = true;
							break;
						}
						await fetchAndProcessSitemap(childUrl, depth + 1);
					}
					return;
				}

				if (parsed.isIndex) return;

				for (const locUrl of parsed.urls) {
					if (sitemapEntriesProcessed >= MAX_SITEMAP_ENTRIES) {
						truncated = true;
						break;
					}

					sitemapEntriesProcessed++;
					totalConsidered++;

					try {
						const locParsed = new URL(locUrl);
						if (locParsed.protocol !== 'https:' && locParsed.protocol !== 'http:') continue;

						const host = locParsed.hostname.toLowerCase();
						if (isSubdomainOf(host, baseHost)) {
							const scheme = locParsed.protocol === 'https:' ? 'https' : 'http';
							const existing = sitemapHosts.get(host);
							if (!existing || (existing.scheme === 'http' && scheme === 'https')) {
								sitemapHosts.set(host, { hostname: host, scheme });
							}
						}
					} catch {
						continue;
					}
				}
			});

		const rootSitemapUrl = new URL('/sitemap.xml', baseUrl);
		rootSitemapUrl.protocol = 'https:';
		await fetchAndProcessSitemap(rootSitemapUrl.toString(), 0);

		const robotsUrl = new URL('/robots.txt', baseUrl);
		robotsUrl.protocol = 'https:';
		const robotsText = await fetchDiscoveryResource(
			robotsUrl.toString(),
			ROBOTS_TIMEOUT_MS,
			DISCOVERY_MAX_BYTES,
			baseHost,
		);

		if (robotsText !== null) {
			const robotsSitemapUrls = extractSitemapUrlsFromRobots(robotsText, robotsUrl.toString());
			for (const sitemapUrl of robotsSitemapUrls) {
				if (sitemapEntriesProcessed >= MAX_SITEMAP_ENTRIES) {
					truncated = true;
					break;
				}
				await fetchAndProcessSitemap(sitemapUrl, 0);
			}
		}

		const fromSitemap = sitemapHosts.size;

		const merged = new Map<string, { hostname: string; scheme: string }>();

		for (const [host, entry] of linkHosts) {
			const existing = merged.get(host);
			if (!existing || (existing.scheme === 'http' && entry.scheme === 'https')) {
				merged.set(host, entry);
			}
		}

		for (const [host, entry] of sitemapHosts) {
			const existing = merged.get(host);
			if (!existing || (existing.scheme === 'http' && entry.scheme === 'https')) {
				merged.set(host, entry);
			}
		}

		const totalAccepted = merged.size;

		const sortedHosts = [...merged.entries()].sort((a, b) => a[0].localeCompare(b[0]));

		let finalHosts = sortedHosts; // eslint-disable-line custom/no-mutable-variables
		if (finalHosts.length > MAX_SUBDOMAINS) {
			finalHosts = finalHosts.slice(0, MAX_SUBDOMAINS);
			truncated = true;
		}

		const targets = finalHosts.map(([, entry]) => normalizeTarget(entry.hostname, entry.scheme));
		const subdomains = finalHosts.map(([host]) => host);

		return discoveryOutputSchema.parse({
			targets,
			subdomains,
			stats: {
				fromLinks,
				fromSitemap,
				totalConsidered,
				totalAccepted,
				truncated,
			},
		});
	});

export const getEmptyDiscoveryOutput = z
	.function()
	.args()
	.returns(discoveryOutputSchema)
	.implement(() => ({
		targets: [],
		subdomains: [],
		stats: emptyStats(),
	}));
