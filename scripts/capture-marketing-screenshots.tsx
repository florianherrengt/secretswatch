import { chromium } from '@playwright/test';
import { execFile } from 'node:child_process';
import { createServer } from 'node:http';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { mkdir, readFile } from 'node:fs/promises';
import { dirname, join, normalize, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';
import { render } from '../src/lib/response.js';
import { CredentialCheckerPage } from '../src/views/pages/credentialChecker.js';
import { DomainDetailPage } from '../src/views/pages/domainDetail.js';
import { DomainListPage } from '../src/views/pages/domainList.js';
import { HomePage } from '../src/views/pages/home.js';
import { ScanResultPage } from '../src/views/pages/scanResult.js';
import type { ScanResultPageProps } from '../src/views/pages/scanResult.js';

const execFileAsync = promisify(execFile);
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const outputDir = join(root, 'assets', 'marketing', 'screenshots');
const rawDir = join(outputDir, 'raw');
const framedDir = join(outputDir, 'framed');

const fixedStartedAt = '2026-07-07T13:42:10.000Z';
const fixedFinishedAt = '2026-07-07T13:42:38.000Z';

type FixtureRoute = {
	path: string;
	render: () => string | Promise<string>;
};

type ScreenshotTarget = {
	name: string;
	path: string;
	title: string;
	subtitle: string;
	viewport: {
		width: number;
		height: number;
	};
	cropElement?: 'body' | 'homeScanCard';
	cropSectionHeading?: string;
};

const scanResultProps: ScanResultPageProps = {
	scanId: 'marketing-demo-scan',
	targetUrl: 'https://acme-payments.example',
	topNavMode: 'app',
	status: 'success',
	startedAtIso: fixedStartedAt,
	finishedAtIso: fixedFinishedAt,
	durationMs: 28_000,
	checks: [
		{
			checkId: 'env-var-key',
			checkName: 'Environment Variable Key',
			status: 'fail',
			classification: 'Public JavaScript secret exposure',
			sourceTimestamp: fixedFinishedAt,
			findings: [
				{
					findingId: 'finding-env-var-key',
					title: 'Client bundle exposes a live-looking Stripe secret key.',
					description: 'Secrets Watch found a credential pattern in a browser-delivered asset.',
					severity: 'critical',
					filePath: '/assets/checkout.8f31c1.js',
					snippet: 'STRIPE_SECRET_KEY="sk_live_redacted_demo_4f8a9c2e"',
					detectedAt: fixedFinishedAt,
				},
			],
		},
		{
			checkId: 'localstorage-jwt',
			checkName: 'LocalStorage JWT',
			status: 'fail',
			classification: 'Browser token storage',
			sourceTimestamp: fixedFinishedAt,
			findings: [
				{
					findingId: 'finding-localstorage-jwt',
					title: 'JWT stored in localStorage on the checkout app.',
					description:
						'Persistent browser storage increases the blast radius of XSS and leaked sessions.',
					severity: 'high',
					filePath: '/account/session.js',
					snippet: 'localStorage.setItem("session", "eyJhbGciOiJIUzI1NiIs...")',
					detectedAt: fixedFinishedAt,
				},
			],
		},
		{
			checkId: 'public-source-map',
			checkName: 'Public Source Map',
			status: 'fail',
			classification: 'Deployment metadata exposure',
			sourceTimestamp: fixedFinishedAt,
			findings: [
				{
					findingId: 'finding-public-source-map',
					title: 'Production source map is publicly accessible.',
					description: 'Source maps can expose internal file names, comments, and build structure.',
					severity: 'medium',
					filePath: '/assets/checkout.8f31c1.js.map',
					snippet: '{"sources":["../src/payments/stripe.ts","../src/config.ts"]}',
					detectedAt: fixedFinishedAt,
				},
			],
		},
		{
			checkId: 'credential-url',
			checkName: 'Credential URL',
			status: 'pass',
			classification: 'URLs containing inline credentials',
			sourceTimestamp: null,
			findings: [],
		},
		{
			checkId: 'generic-secret',
			checkName: 'Generic Secret',
			status: 'pass',
			classification: 'High-entropy secret patterns',
			sourceTimestamp: null,
			findings: [],
		},
		{
			checkId: 'pem-key',
			checkName: 'PEM Private Key',
			status: 'pass',
			classification: 'Private key material',
			sourceTimestamp: null,
			findings: [],
		},
		{
			checkId: 'missing-sitemap',
			checkName: 'Missing Sitemap',
			status: 'pass',
			classification: 'Search discovery configuration',
			sourceTimestamp: null,
			findings: [],
		},
	],
	discoveredSubdomains: [
		'api.acme-payments.example',
		'cdn.acme-payments.example',
		'admin.acme-payments.example',
	],
	subdomainAssetCoverage: [
		{
			subdomain: 'api.acme-payments.example',
			scannedAssetPaths: ['/openapi.json', '/docs/index.html'],
		},
		{
			subdomain: 'cdn.acme-payments.example',
			scannedAssetPaths: ['/assets/checkout.8f31c1.js', '/assets/checkout.8f31c1.js.map'],
		},
		{
			subdomain: 'admin.acme-payments.example',
			scannedAssetPaths: ['/login', '/assets/admin.js'],
		},
	],
	discoveryStats: {
		fromLinks: 18,
		fromSitemap: 6,
		totalConsidered: 24,
		totalAccepted: 11,
		truncated: false,
	},
};

const fixtures: FixtureRoute[] = [
	{
		path: '/home',
		render: async () =>
			render(HomePage, {
				domain: 'https://acme-payments.example',
				isLoggedIn: false,
			}),
	},
	{
		path: '/scan-results',
		render: async () => render(ScanResultPage, scanResultProps),
	},
	{
		path: '/domains',
		render: async () =>
			render(DomainListPage, {
				csrfToken: 'marketing-csrf-token',
				domains: [
					{
						id: '2f4c9f4c-9c31-4f91-9bfb-7c56b1c7ef01',
						domain: 'acme-payments.example',
						lastCheckResult: 'issues',
						href: '/domains/acme-payments.example',
					},
					{
						id: '6de89c23-3d8f-4bb6-8c8e-6617718f195a',
						domain: 'docs.acme-payments.example',
						lastCheckResult: 'pass',
						href: '/domains/docs.acme-payments.example',
					},
					{
						id: 'e368d8e8-b4b6-4430-9a36-29e3536dc3da',
						domain: 'sandbox.acme-payments.example',
						lastCheckResult: 'none',
						href: '/domains/sandbox.acme-payments.example',
					},
				],
			}),
	},
	{
		path: '/domain-history',
		render: async () =>
			render(DomainDetailPage, {
				hostname: 'acme-payments.example',
				deleteConfirmHref: '/domains/confirm?action=delete_domain',
				scans: [
					{
						scanId: '41e91f8f-25b8-47b1-90f2-0d46980d1a4d',
						status: 'success',
						startedAtIso: fixedStartedAt,
						durationMs: 28_000,
						findingCount: 3,
					},
					{
						scanId: '820fbdae-3282-46ce-b6ec-0d985884956d',
						status: 'success',
						startedAtIso: '2026-07-06T13:40:04.000Z',
						durationMs: 21_000,
						findingCount: 0,
					},
					{
						scanId: 'b89db0e4-62eb-48de-846b-96c2472d4b8c',
						status: 'pending',
						startedAtIso: '2026-07-07T14:02:11.000Z',
						durationMs: 0,
						findingCount: 0,
					},
				],
			}),
	},
	{
		path: '/credential-checker',
		render: async () =>
			render(CredentialCheckerPage, {
				provider: 'openai',
				apiKey: 'sk-live-redacted-demo',
				result: 'invalid',
				isLoggedIn: false,
			}),
	},
];

const targets: ScreenshotTarget[] = [
	{
		name: '01-home-scan',
		path: '/home',
		title: 'Public Website Scan',
		subtitle: 'The first action explains the product immediately: enter a URL and run a scan.',
		viewport: { width: 1120, height: 780 },
		cropElement: 'homeScanCard',
	},
	{
		name: '02-scan-results-overview',
		path: '/scan-results',
		title: 'Scan Results Overview',
		subtitle: 'Status, severity, runtime, and discovered assets in one screen.',
		viewport: { width: 1120, height: 920 },
	},
	{
		name: '03-findings-detail',
		path: '/scan-results',
		title: 'Actionable Findings',
		subtitle: 'Each issue shows severity, evidence, file path, and an exact snippet.',
		viewport: { width: 1120, height: 920 },
		cropSectionHeading: 'Findings',
	},
	{
		name: '04-domains-dashboard',
		path: '/domains',
		title: 'Domain Monitoring',
		subtitle: 'Saved domains make recurring scans and status review easy to explain.',
		viewport: { width: 1120, height: 760 },
		cropElement: 'body',
	},
	{
		name: '05-domain-history',
		path: '/domain-history',
		title: 'Scan History',
		subtitle: 'A simple timeline shows whether security posture is getting better.',
		viewport: { width: 1120, height: 760 },
		cropElement: 'body',
	},
	{
		name: '06-credential-checker',
		path: '/credential-checker',
		title: 'Credential Verification',
		subtitle: 'A focused tool demonstrates why exposed keys are urgent.',
		viewport: { width: 1120, height: 760 },
		cropElement: 'body',
	},
];

const contentTypeByExtension: Record<string, string> = {
	'.css': 'text/css; charset=utf-8',
	'.js': 'text/javascript; charset=utf-8',
	'.png': 'image/png',
};

const getContentType = (path: string) => {
	const extension = path.slice(path.lastIndexOf('.'));
	return contentTypeByExtension[extension] ?? 'application/octet-stream';
};

const safeJoin = (base: string, requestPath: string) => {
	const decodedPath = decodeURIComponent(requestPath);
	const normalizedPath = normalize(decodedPath).replace(/^(\.\.(\/|\\|$))+/, '');
	const filePath = join(base, normalizedPath);

	if (filePath !== base && !filePath.startsWith(`${base}${sep}`)) {
		throw new Error(`Refusing to serve path outside ${base}: ${requestPath}`);
	}

	return filePath;
};

const send = (
	response: ServerResponse,
	status: number,
	body: string,
	contentType = 'text/plain',
) => {
	response.writeHead(status, { 'content-type': contentType });
	response.end(body);
};

const sendFile = async (response: ServerResponse, filePath: string) => {
	const file = await readFile(filePath);
	response.writeHead(200, { 'content-type': getContentType(filePath) });
	response.end(file);
};

const renderFramePage = (imageName: string, title: string, subtitle: string) => `<!doctype html>
<html lang="en">
	<head>
		<meta charset="utf-8" />
		<meta name="viewport" content="width=device-width, initial-scale=1" />
		<title>${title}</title>
		<style>
			:root {
				color-scheme: light;
				--background: #eef2f7;
				--surface: #ffffff;
				--border: #d7dee8;
				--text: #111827;
				--muted: #607086;
				--accent: #1f3a5f;
			}

			* {
				box-sizing: border-box;
			}

			html,
			body {
				margin: 0;
				min-height: 100%;
				background: var(--background);
				color: var(--text);
				font-family:
					Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
			}

			body {
				display: grid;
				place-items: center;
				padding: 48px;
			}

			.shell {
				width: min(1160px, calc(100vw - 96px));
			}

			.caption {
				margin-bottom: 20px;
				max-width: 720px;
			}

			.caption h1 {
				margin: 0;
				font-size: 30px;
				line-height: 1.1;
				font-weight: 700;
				letter-spacing: 0;
			}

			.caption p {
				margin: 8px 0 0;
				color: var(--muted);
				font-size: 16px;
				line-height: 1.5;
			}

			.window {
				overflow: hidden;
				border: 1px solid var(--border);
				border-radius: 14px;
				background: var(--surface);
				box-shadow: 0 24px 60px rgb(31 58 95 / 18%);
			}

			.chrome {
				display: flex;
				align-items: center;
				gap: 12px;
				height: 44px;
				border-bottom: 1px solid var(--border);
				background: #f8fafc;
				padding: 0 14px;
			}

			.dots {
				display: flex;
				gap: 7px;
			}

			.dot {
				width: 10px;
				height: 10px;
				border-radius: 999px;
				background: #cbd5e1;
			}

			.address {
				min-width: 0;
				flex: 1;
				border: 1px solid #e2e8f0;
				border-radius: 999px;
				background: #ffffff;
				padding: 5px 12px;
				color: var(--muted);
				font-size: 13px;
				line-height: 1;
			}

			img {
				display: block;
				width: 100%;
				max-height: calc(100vh - 190px);
				object-fit: contain;
				object-position: top center;
				background: #f8fafc;
			}
		</style>
	</head>
	<body>
		<main class="shell">
			<section class="caption">
				<h1>${title}</h1>
				<p>${subtitle}</p>
			</section>
			<section class="window" aria-label="${title}">
				<div class="chrome" aria-hidden="true">
					<div class="dots">
						<span class="dot"></span>
						<span class="dot"></span>
						<span class="dot"></span>
					</div>
					<div class="address">app.secrets.watch/${imageName.replace(/^\d+-/, '')}</div>
				</div>
				<img src="/generated/${imageName}.png" alt="" />
			</section>
		</main>
	</body>
</html>`;

const routeRequest = async (request: IncomingMessage, response: ServerResponse) => {
	const requestUrl = new URL(request.url ?? '/', 'http://127.0.0.1');
	const pathname = requestUrl.pathname;

	try {
		if (pathname.startsWith('/assets/')) {
			await sendFile(response, safeJoin(join(root, 'assets'), pathname.replace('/assets/', '')));
			return;
		}

		if (pathname.startsWith('/generated/')) {
			await sendFile(response, safeJoin(rawDir, pathname.replace('/generated/', '')));
			return;
		}

		if (pathname === '/frame') {
			const imageName = requestUrl.searchParams.get('image') ?? '';
			const title = requestUrl.searchParams.get('title') ?? 'Secrets Watch';
			const subtitle = requestUrl.searchParams.get('subtitle') ?? '';

			send(response, 200, renderFramePage(imageName, title, subtitle), 'text/html; charset=utf-8');
			return;
		}

		const fixture = fixtures.find((item) => item.path === pathname);

		if (!fixture) {
			send(response, 404, 'Not found');
			return;
		}

		const html = await fixture.render();
		send(response, 200, `<!doctype html>${html}`, 'text/html; charset=utf-8');
	} catch (error) {
		const message = error instanceof Error ? (error.stack ?? error.message) : String(error);
		send(response, 500, message);
	}
};

const startServer = async () => {
	const server = createServer((request, response) => {
		void routeRequest(request, response);
	});

	await new Promise<void>((resolveListen) => {
		server.listen(0, '127.0.0.1', resolveListen);
	});

	const address = server.address();

	if (address === null || typeof address === 'string') {
		throw new Error('Could not determine marketing screenshot server port.');
	}

	return {
		server,
		baseUrl: `http://127.0.0.1:${address.port}`,
	};
};

const captureRawScreenshot = async (
	page: Awaited<ReturnType<Awaited<ReturnType<typeof chromium.launch>>['newPage']>>,
	baseUrl: string,
	target: ScreenshotTarget,
) => {
	await page.setViewportSize(target.viewport);
	await page.goto(`${baseUrl}${target.path}`);
	await page.waitForLoadState('networkidle');

	const outputPath = join(rawDir, `${target.name}.png`);

	if (target.cropElement === 'body') {
		await page.locator('body').screenshot({ path: outputPath });
		return outputPath;
	}

	if (target.cropElement === 'homeScanCard') {
		const scanCard = page
			.locator('#scan-form')
			.locator('xpath=ancestor::div[contains(@class, "max-w-4xl")][1]');
		await scanCard.screenshot({ path: outputPath });
		return outputPath;
	}

	if (target.cropSectionHeading) {
		const section = page
			.locator('section')
			.filter({ has: page.getByRole('heading', { name: target.cropSectionHeading, exact: true }) })
			.first();
		await section.screenshot({ path: outputPath });
		return outputPath;
	}

	await page.screenshot({ path: outputPath, fullPage: false });
	return outputPath;
};

const captureFramedScreenshot = async (
	page: Awaited<ReturnType<Awaited<ReturnType<typeof chromium.launch>>['newPage']>>,
	baseUrl: string,
	target: ScreenshotTarget,
) => {
	await page.setViewportSize({ width: 1440, height: 1040 });
	const url = new URL(`${baseUrl}/frame`);
	url.searchParams.set('image', target.name);
	url.searchParams.set('title', target.title);
	url.searchParams.set('subtitle', target.subtitle);
	await page.goto(url.toString());
	await page.waitForLoadState('networkidle');
	const outputPath = join(framedDir, `${target.name}.png`);
	await page.screenshot({ path: outputPath, fullPage: false });
	return outputPath;
};

const main = async () => {
	await mkdir(rawDir, { recursive: true });
	await mkdir(framedDir, { recursive: true });
	await execFileAsync('npm', ['run', 'build:css'], { cwd: root });

	const { server, baseUrl } = await startServer();
	const browser = await chromium.launch({ channel: 'chrome' }).catch(async () => chromium.launch());

	try {
		const context = await browser.newContext({
			colorScheme: 'light',
			deviceScaleFactor: 2,
			locale: 'en-US',
			timezoneId: 'UTC',
		});

		await context.route('**/*', async (route) => {
			const url = new URL(route.request().url());

			if (url.origin !== baseUrl && ['http:', 'https:'].includes(url.protocol)) {
				await route.abort();
				return;
			}

			await route.continue();
		});

		const page = await context.newPage();
		const generatedPaths: string[] = [];

		for (const target of targets) {
			generatedPaths.push(await captureRawScreenshot(page, baseUrl, target));
		}

		for (const target of targets) {
			generatedPaths.push(await captureFramedScreenshot(page, baseUrl, target));
		}

		await context.close();

		console.log('Generated marketing screenshots:');
		for (const generatedPath of generatedPaths) {
			console.log(generatedPath);
		}
	} finally {
		await browser.close();
		await new Promise<void>((resolveClose, rejectClose) => {
			server.close((error) => {
				if (error) {
					rejectClose(error);
					return;
				}

				resolveClose();
			});
		});
	}
};

void main().catch((error) => {
	console.error(error);
	process.exit(1);
});
