import { z } from 'zod';
import { checkRunInputSchema, checkRunOutputSchema, checkFindingSchema } from '../../contracts.js';
import { fingerprintValue } from '../../shared/fingerprint.js';
import { dedupeFindings } from '../../shared/dedupe.js';
import { filterAccessibleSourceMaps } from './detector.js';

export const runPublicSourceMapCheck = z
	.function()
	.args(checkRunInputSchema)
	.returns(checkRunOutputSchema)
	.implement((input) => {
		const sourceMaps = input.sourceMaps ?? [];
		const accessible = filterAccessibleSourceMaps(sourceMaps);

		const findings = accessible.map((probe) => {
			const snippet = `Public source map exposed: ${probe.mapUrl} (via ${probe.discoveryMethod}, status ${probe.httpStatus})`;

			const finding: z.infer<typeof checkFindingSchema> = {
				type: 'secret',
				file: probe.mapUrl,
				snippet,
				fingerprint: fingerprintValue(probe.mapUrl),
			};

			return finding;
		});

		return {
			findings: dedupeFindings(findings),
		};
	});
