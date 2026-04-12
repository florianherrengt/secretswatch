import { checkDefinitionSchema } from "../../contracts.js";

export const publicSourceMapCheckMetadata = checkDefinitionSchema.parse({
	id: "public-source-map",
	name: "Public Source Map Exposure",
	description:
		"Detects publicly accessible JavaScript source map (.map) files linked from production bundles."
});
