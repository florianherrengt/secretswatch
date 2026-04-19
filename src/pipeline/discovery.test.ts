import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
	isPrivateIp,
	shouldSkipDiscovery,
	isSubdomainOf,
	extractSubdomainHosts,
	parseSitemapUrls,
	extractSitemapUrlsFromRobots,
	normalizeTarget,
	discoverSubdomainTargets,
} from './discovery.js';

const mockDnsLookup = vi.fn();

vi.mock('node:dns/promises', () => ({
	get lookup() {
		return mockDnsLookup;
	},
}));

const mockFetch = vi.fn();

vi.stubGlobal('fetch', mockFetch);

describe('isPrivateIp', () => {
	it('blocks 127.0.0.1', () => {
		expect(isPrivateIp('127.0.0.1')).toBe(true);
	});

	it('blocks 10.0.0.1', () => {
		expect(isPrivateIp('10.0.0.1')).toBe(true);
	});

	it('blocks 172.16.0.1', () => {
		expect(isPrivateIp('172.16.0.1')).toBe(true);
	});

	it('blocks 192.168.1.1', () => {
		expect(isPrivateIp('192.168.1.1')).toBe(true);
	});

	it('blocks 169.254.1.1', () => {
		expect(isPrivateIp('169.254.1.1')).toBe(true);
	});

	it('blocks 100.64.0.1', () => {
		expect(isPrivateIp('100.64.0.1')).toBe(true);
	});

	it('blocks 0.0.0.1', () => {
		expect(isPrivateIp('0.0.0.1')).toBe(true);
	});

	it('allows public IP 8.8.8.8', () => {
		expect(isPrivateIp('8.8.8.8')).toBe(false);
	});

	it('blocks ::1', () => {
		expect(isPrivateIp('::1')).toBe(true);
	});

	it('blocks :: (all zeros)', () => {
		expect(isPrivateIp('::')).toBe(true);
	});

	it('blocks fc00::1', () => {
		expect(isPrivateIp('fc00::1')).toBe(true);
	});

	it('blocks fe80::1', () => {
		expect(isPrivateIp('fe80::1')).toBe(true);
	});

	it('allows public IPv6 2606:4700:4700::1111', () => {
		expect(isPrivateIp('2606:4700:4700::1111')).toBe(false);
	});
});

describe('shouldSkipDiscovery', () => {
	it('skips localhost', () => {
		expect(shouldSkipDiscovery('localhost')).toBe(true);
	});

	it('skips IPv4 literal', () => {
		expect(shouldSkipDiscovery('192.168.1.1')).toBe(true);
	});

	it('skips IPv6 literal', () => {
		expect(shouldSkipDiscovery('::1')).toBe(true);
	});

	it('does not skip regular hostname', () => {
		expect(shouldSkipDiscovery('example.com')).toBe(false);
	});
});

describe('isSubdomainOf', () => {
	it('accepts www.example.com for baseHost example.com', () => {
		expect(isSubdomainOf('www.example.com', 'example.com')).toBe(true);
	});

	it('accepts a.b.example.com for baseHost example.com', () => {
		expect(isSubdomainOf('a.b.example.com', 'example.com')).toBe(true);
	});

	it('rejects example.com for baseHost example.com', () => {
		expect(isSubdomainOf('example.com', 'example.com')).toBe(false);
	});

	it('rejects example.com.evil.tld for baseHost example.com', () => {
		expect(isSubdomainOf('example.com.evil.tld', 'example.com')).toBe(false);
	});

	it('rejects notexample.com for baseHost example.com', () => {
		expect(isSubdomainOf('notexample.com', 'example.com')).toBe(false);
	});

	it('is case insensitive', () => {
		expect(isSubdomainOf('WWW.EXAMPLE.COM', 'example.com')).toBe(true);
	});
});

describe('extractSubdomainHosts', () => {
	const baseUrl = 'https://example.com/';

	it('extracts subdomain from <a href>', () => {
		const html = `<html><body><a href="https://a.example.com/page">Link</a></body></html>`;
		const { hosts } = extractSubdomainHosts(html, baseUrl, 'example.com');
		expect(hosts.size).toBe(1);
		expect(hosts.get('a.example.com')).toEqual({ hostname: 'a.example.com', scheme: 'https' });
	});

	it('extracts subdomain from <script src>', () => {
		const html = `<html><body><script src="https://cdn.example.com/app.js"></script></body></html>`;
		const { hosts } = extractSubdomainHosts(html, baseUrl, 'example.com');
		expect(hosts.size).toBe(1);
		expect(hosts.get('cdn.example.com')).toEqual({ hostname: 'cdn.example.com', scheme: 'https' });
	});

	it('extracts subdomain from <link href>', () => {
		const html = `<html><head><link href="https://static.example.com/style.css" rel="stylesheet"></head></html>`;
		const { hosts } = extractSubdomainHosts(html, baseUrl, 'example.com');
		expect(hosts.size).toBe(1);
		expect(hosts.get('static.example.com')).toEqual({
			hostname: 'static.example.com',
			scheme: 'https',
		});
	});

	it('ignores same-domain links', () => {
		const html = `<html><body><a href="https://example.com/page">Link</a></body></html>`;
		const { hosts } = extractSubdomainHosts(html, baseUrl, 'example.com');
		expect(hosts.size).toBe(0);
	});

	it('ignores lookalike domains', () => {
		const html = `<html><body><a href="https://example.com.evil.tld/page">Link</a></body></html>`;
		const { hosts } = extractSubdomainHosts(html, baseUrl, 'example.com');
		expect(hosts.size).toBe(0);
	});

	it('ignores mailto: links', () => {
		const html = `<html><body><a href="mailto:test@a.example.com">Email</a></body></html>`;
		const { hosts } = extractSubdomainHosts(html, baseUrl, 'example.com');
		expect(hosts.size).toBe(0);
	});

	it('ignores javascript: links', () => {
		const html = `<html><body><a href="javascript:void(0)">Click</a></body></html>`;
		const { hosts } = extractSubdomainHosts(html, baseUrl, 'example.com');
		expect(hosts.size).toBe(0);
	});

	it('deduplicates hosts preferring HTTPS', () => {
		const html = `<html><body>
			<a href="http://a.example.com/page1">Link1</a>
			<a href="https://a.example.com/page2">Link2</a>
		</body></html>`;
		const { hosts } = extractSubdomainHosts(html, baseUrl, 'example.com');
		expect(hosts.size).toBe(1);
		expect(hosts.get('a.example.com')?.scheme).toBe('https');
	});

	it('counts totalExamined correctly', () => {
		const html = `<html><body>
			<a href="https://a.example.com/page1">Link1</a>
			<a href="https://other.com/page">Link2</a>
			<a href="https://b.example.com/page">Link3</a>
		</body></html>`;
		const { totalExamined } = extractSubdomainHosts(html, baseUrl, 'example.com');
		expect(totalExamined).toBe(3);
	});

	it('handles relative URLs', () => {
		const html = `<html><body><a href="/page">Link</a></body></html>`;
		const { hosts } = extractSubdomainHosts(html, baseUrl, 'example.com');
		expect(hosts.size).toBe(0);
	});
});

describe('parseSitemapUrls', () => {
	it('parses urlset', () => {
		const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url><loc>https://a.example.com/</loc></url>
  <url><loc>https://b.example.com/</loc></url>
</urlset>`;
		const result = parseSitemapUrls(xml);
		expect(result.isIndex).toBe(false);
		expect(result.urls).toEqual(['https://a.example.com/', 'https://b.example.com/']);
	});

	it('detects sitemapindex', () => {
		const xml = `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <sitemap><loc>https://example.com/sitemap2.xml</loc></sitemap>
</sitemapindex>`;
		const result = parseSitemapUrls(xml);
		expect(result.isIndex).toBe(true);
		expect(result.urls).toEqual(['https://example.com/sitemap2.xml']);
	});

	it('returns empty for invalid XML', () => {
		const result = parseSitemapUrls('not xml');
		expect(result.urls).toEqual([]);
		expect(result.isIndex).toBe(false);
	});
});

describe('extractSitemapUrlsFromRobots', () => {
	it('extracts sitemap URLs', () => {
		const text = `User-agent: *
Disallow: /admin

Sitemap: https://example.com/sitemap.xml
Sitemap: https://example.com/sitemap2.xml`;
		const urls = extractSitemapUrlsFromRobots(text, 'https://example.com/robots.txt');
		expect(urls).toEqual(['https://example.com/sitemap.xml', 'https://example.com/sitemap2.xml']);
	});

	it('is case insensitive for Sitemap:', () => {
		const text = `sitemap: https://example.com/sitemap.xml
SITEMAP: https://example.com/sitemap2.xml`;
		const urls = extractSitemapUrlsFromRobots(text, 'https://example.com/robots.txt');
		expect(urls).toEqual(['https://example.com/sitemap.xml', 'https://example.com/sitemap2.xml']);
	});

	it('supports relative sitemap URLs', () => {
		const text = `Sitemap: /sitemap.xml`;
		const urls = extractSitemapUrlsFromRobots(text, 'https://example.com/robots.txt');
		expect(urls).toEqual(['https://example.com/sitemap.xml']);
	});

	it('ignores non-http sitemap URLs', () => {
		const text = `Sitemap: ftp://example.com/sitemap.xml`;
		const urls = extractSitemapUrlsFromRobots(text, 'https://example.com/robots.txt');
		expect(urls).toEqual([]);
	});

	it('returns empty for no sitemap lines', () => {
		const text = `User-agent: *\nDisallow: /`;
		const urls = extractSitemapUrlsFromRobots(text, 'https://example.com/robots.txt');
		expect(urls).toEqual([]);
	});
});

describe('normalizeTarget', () => {
	it('forces path to /', () => {
		expect(normalizeTarget('a.example.com', 'https')).toBe('https://a.example.com/');
	});

	it('lowercases hostname', () => {
		expect(normalizeTarget('A.EXAMPLE.COM', 'https')).toBe('https://a.example.com/');
	});

	it('preserves scheme', () => {
		expect(normalizeTarget('a.example.com', 'http')).toBe('http://a.example.com/');
	});
});

describe('discoverSubdomainTargets', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockDnsLookup.mockResolvedValue([{ address: '93.184.216.34', family: 4 }]);
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	it('discovers subdomains from links and sitemap', async () => {
		const html = `<html><body>
			<a href="https://a.example.com/page">Link</a>
			<a href="https://b.example.com/page">Link</a>
		</body></html>`;

		const sitemapXml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url><loc>https://c.example.com/</loc></url>
</urlset>`;

		mockFetch.mockImplementation((url) => {
			if (typeof url === 'string' && url.includes('sitemap.xml')) {
				return Promise.resolve({ ok: true, url, text: () => Promise.resolve(sitemapXml) });
			}
			return Promise.resolve({ ok: false, status: 404 });
		});

		const result = await discoverSubdomainTargets('https://example.com/', html);

		expect(result.subdomains).toEqual(['a.example.com', 'b.example.com', 'c.example.com']);
		expect(result.targets).toEqual([
			'https://a.example.com/',
			'https://b.example.com/',
			'https://c.example.com/',
		]);
		expect(result.stats.fromLinks).toBe(2);
		expect(result.stats.fromSitemap).toBe(1);
		expect(result.stats.truncated).toBe(false);
	});

	it('follows sitemapindex one level', async () => {
		const html = `<html><body></body></html>`;

		const sitemapIndex = `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <sitemap><loc>https://example.com/sitemap-sub.xml</loc></sitemap>
</sitemapindex>`;

		const subSitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url><loc>https://a.example.com/</loc></url>
</urlset>`;

		mockFetch.mockImplementation((url) => {
			if (typeof url === 'string' && url.endsWith('/sitemap.xml')) {
				return Promise.resolve({ ok: true, url, text: () => Promise.resolve(sitemapIndex) });
			}
			if (typeof url === 'string' && url.includes('sitemap-sub.xml')) {
				return Promise.resolve({ ok: true, url, text: () => Promise.resolve(subSitemap) });
			}
			return Promise.resolve({ ok: false, status: 404 });
		});

		const result = await discoverSubdomainTargets('https://example.com/', html);

		expect(result.subdomains).toEqual(['a.example.com']);
		expect(result.stats.fromSitemap).toBe(1);
	});

	it('does not recurse into nested sitemapindex', async () => {
		const html = `<html><body></body></html>`;

		const sitemapIndex = `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <sitemap><loc>https://example.com/nested.xml</loc></sitemap>
</sitemapindex>`;

		const nestedIndex = `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <sitemap><loc>https://example.com/deep.xml</loc></sitemap>
</sitemapindex>`;

		const deepSitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url><loc>https://a.example.com/</loc></url>
</urlset>`;

		mockFetch.mockImplementation((url) => {
			if (typeof url === 'string' && url.endsWith('/sitemap.xml')) {
				return Promise.resolve({ ok: true, url, text: () => Promise.resolve(sitemapIndex) });
			}
			if (typeof url === 'string' && url.includes('nested.xml')) {
				return Promise.resolve({ ok: true, url, text: () => Promise.resolve(nestedIndex) });
			}
			if (typeof url === 'string' && url.includes('deep.xml')) {
				return Promise.resolve({ ok: true, url, text: () => Promise.resolve(deepSitemap) });
			}
			return Promise.resolve({ ok: false, status: 404 });
		});

		const result = await discoverSubdomainTargets('https://example.com/', html);

		expect(result.subdomains).toEqual([]);
	});

	it('truncates at 20 subdomains deterministically', async () => {
		const links = Array.from(
			{ length: 25 },
			(_, i) => `<a href="https://sub${String(i).padStart(2, '0')}.example.com/">Link</a>`,
		).join('\n');
		const html = `<html><body>${links}</body></html>`;

		mockFetch.mockImplementation(() => Promise.resolve({ ok: false, status: 404 }));

		const result = await discoverSubdomainTargets('https://example.com/', html);

		expect(result.subdomains.length).toBe(20);
		expect(result.stats.truncated).toBe(true);
		expect(result.subdomains[0]).toBe('sub00.example.com');
		expect(result.subdomains[19]).toBe('sub19.example.com');
	});

	it('returns empty when sitemap is missing', async () => {
		const html = `<html><body>
			<a href="https://other.com/">External</a>
		</body></html>`;

		mockFetch.mockImplementation(() => Promise.resolve({ ok: false, status: 404 }));

		const result = await discoverSubdomainTargets('https://example.com/', html);

		expect(result.subdomains).toEqual([]);
		expect(result.targets).toEqual([]);
		expect(result.stats.fromLinks).toBe(0);
		expect(result.stats.fromSitemap).toBe(0);
	});

	it('produces deterministic ordering for same input', async () => {
		const html = `<html><body>
			<a href="https://z.example.com/">Z</a>
			<a href="https://a.example.com/">A</a>
			<a href="https://m.example.com/">M</a>
		</body></html>`;

		mockFetch.mockImplementation(() => Promise.resolve({ ok: false, status: 404 }));

		const result1 = await discoverSubdomainTargets('https://example.com/', html);
		const result2 = await discoverSubdomainTargets('https://example.com/', html);

		expect(result1.subdomains).toEqual(result2.subdomains);
		expect(result1.subdomains).toEqual(['a.example.com', 'm.example.com', 'z.example.com']);
	});

	it('always uses https for sitemap and robots start points', async () => {
		mockFetch.mockImplementation((url) => Promise.resolve({ ok: false, status: 404, url }));

		await discoverSubdomainTargets('http://example.com/path', '<html><body></body></html>');

		const calledUrls = mockFetch.mock.calls.map((args) => String(args[0]));
		expect(calledUrls).toContain('https://example.com/sitemap.xml');
		expect(calledUrls).toContain('https://example.com/robots.txt');
	});
});
