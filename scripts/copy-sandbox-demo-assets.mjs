import { cpSync, existsSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const projectRoot = join(scriptDir, "..");
const sourceDir = join(projectRoot, "src", "server", "routes", "sandbox", "demo", "site");
const targetDir = join(projectRoot, "dist", "server", "routes", "sandbox", "demo", "site");

if (!existsSync(sourceDir)) {
	throw new Error(`Sandbox demo site directory is missing: ${sourceDir}`);
}

mkdirSync(dirname(targetDir), { recursive: true });
cpSync(sourceDir, targetDir, { recursive: true, force: true });
