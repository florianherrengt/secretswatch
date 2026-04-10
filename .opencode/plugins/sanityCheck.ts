import type { Plugin } from "@opencode-ai/plugin";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";

function hashFiles(files: string[]) {
  const hash = createHash("sha1");

  for (const file of files.sort()) {
    try {
      const content = readFileSync(file, "utf-8");
      hash.update(file);
      hash.update(content);
    } catch {
      // file might be deleted, ignore
    }
  }

  return hash.digest("hex");
}

export default (async ({ $ }) => {
  const changedFiles = new Set<string>();

  let lastHash: string | null = null;

  return {
    event: async ({ event }) => {
      // Track edits
      if (event.type === "file.edited") {
        if (event.file?.path) {
          changedFiles.add(event.file.path);
        }
        return;
      }

      // Only run when agent is done
      if (event.type !== "session.idle") return;

      if (changedFiles.size === 0) return;

      const files = Array.from(changedFiles).filter(
        (f) => f.endsWith(".ts") || f.endsWith(".tsx"),
      );

      if (files.length === 0) {
        changedFiles.clear();
        return;
      }

      // --- HASH CURRENT STATE ---
      const currentHash = hashFiles(files);

      // Skip if nothing changed since last run
      if (currentHash === lastHash) {
        return;
      }

      lastHash = currentHash;

      const fileList = files.join(" ");

      const result =
        await $`npx tsx scripts/sanityCheck.ts ${fileList}`.quiet();

      if (result.exitCode !== 0) {
        throw new Error(result.stdout || "Sanity check failed");
      }

      // Only clear after success
      changedFiles.clear();
      lastHash = null;
    },
  };
}) satisfies Plugin;
