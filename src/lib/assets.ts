import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { z } from 'zod';

const assetManifestSchema = z.record(
	z.string().regex(/^\/assets\/[^?#]+$/u),
	z.string().regex(/^\/assets\/[^?#]+$/u),
);

const missingFileErrorSchema = z.object({ code: z.literal('ENOENT') }).passthrough();

const loadAssetManifest = z
	.function()
	.args()
	.returns(assetManifestSchema)
	.implement(() => {
		try {
			const rawManifest = readFileSync(
				join(process.cwd(), 'assets', 'asset-manifest.json'),
				'utf8',
			);
			return assetManifestSchema.parse(JSON.parse(rawManifest));
		} catch (error) {
			if (missingFileErrorSchema.safeParse(error).success) {
				return {};
			}

			throw error;
		}
	});

const assetManifest = loadAssetManifest();

const normalizeAssetName = z
	.function()
	.args(z.string().min(1))
	.returns(z.string().regex(/^\/assets\/[^?#]+$/u))
	.implement((assetName) => {
		if (assetName.startsWith('/assets/')) {
			return assetName;
		}

		return `/assets/${assetName.replace(/^\/+/, '')}`;
	});

export const assetPath = z
	.function()
	.args(z.string().min(1))
	.returns(z.string().regex(/^\/assets\/[^?#]+$/u))
	.implement((assetName) => {
		const normalizedAssetName = normalizeAssetName(assetName);
		return assetManifest[normalizedAssetName] ?? normalizedAssetName;
	});
