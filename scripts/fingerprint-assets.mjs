import { createHash } from 'node:crypto';
import {
	copyFileSync,
	existsSync,
	mkdirSync,
	readdirSync,
	readFileSync,
	rmSync,
	writeFileSync,
} from 'node:fs';
import { basename, dirname, extname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = dirname(fileURLToPath(import.meta.url));
const projectRoot = join(scriptDir, '..');
const assetsDir = join(projectRoot, 'assets');
const manifestPath = join(assetsDir, 'asset-manifest.json');
const assetsToFingerprint = ['app.css', 'theme.css', 'timezone-render.js', 'scan-fingerprint.js'];

const buildFingerprintPattern = (assetName) => {
	const extension = extname(assetName);
	const stem = basename(assetName, extension);
	return new RegExp(`^${stem}\\.[a-f0-9]{32}\\${extension}$`, 'u');
};

const removeStaleFingerprints = () => {
	for (const entry of readdirSync(assetsDir, { withFileTypes: true })) {
		if (!entry.isFile()) {
			continue;
		}

		const isGeneratedFingerprint = assetsToFingerprint.some((assetName) =>
			buildFingerprintPattern(assetName).test(entry.name),
		);

		if (isGeneratedFingerprint) {
			rmSync(join(assetsDir, entry.name));
		}
	}
};

const fingerprintAsset = (assetName) => {
	const sourcePath = join(assetsDir, assetName);

	if (!existsSync(sourcePath)) {
		throw new Error(`Cannot fingerprint missing asset: ${sourcePath}`);
	}

	const content = readFileSync(sourcePath);
	const hash = createHash('md5').update(content).digest('hex');
	const extension = extname(assetName);
	const stem = basename(assetName, extension);
	const fingerprintedName = `${stem}.${hash}${extension}`;
	const fingerprintedPath = join(assetsDir, fingerprintedName);

	copyFileSync(sourcePath, fingerprintedPath);

	return [`/assets/${assetName}`, `/assets/${fingerprintedName}`];
};

mkdirSync(assetsDir, { recursive: true });
removeStaleFingerprints();

const manifest = Object.fromEntries(assetsToFingerprint.map(fingerprintAsset));

writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
