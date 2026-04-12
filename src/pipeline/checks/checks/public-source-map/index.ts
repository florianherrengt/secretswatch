import type { ScanCheck } from "../../contracts.js";
import { publicSourceMapCheckMetadata } from "./metadata.js";
import { runPublicSourceMapCheck } from "./run.js";

export const publicSourceMapCheck: ScanCheck = {
	...publicSourceMapCheckMetadata,
	run: runPublicSourceMapCheck
};
