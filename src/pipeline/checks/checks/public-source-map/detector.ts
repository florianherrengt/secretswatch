import { z } from "zod";
import type { SourceMapProbe } from "../../contracts.js";

export const filterAccessibleSourceMaps = z
	.function()
	.args(z.array(z.custom<SourceMapProbe>()))
	.returns(z.array(z.custom<SourceMapProbe>()))
	.implement((probes) => {
		return probes.filter((probe) => probe.isAccessible);
	});
