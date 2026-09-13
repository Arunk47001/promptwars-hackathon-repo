/**
 * Runs all three C4 ingestion scripts in sequence against the local DB.
 * `npm run ingest`
 *
 * Each of census.ts/nfhs.ts/pmgsy.ts runs its own main() when executed
 * directly (require.main === module) and is a no-op-safe module when
 * imported. This orchestrator shells out to each script's CLI entrypoint
 * (rather than importing + calling main() in-process) so that a failure in
 * one script surfaces its own real exit code/output independently, and so
 * import-time side effects between the three scripts can't interfere with
 * each other.
 */
/* eslint-disable no-console */
import { spawnSync } from "node:child_process";
import path from "node:path";

const SCRIPTS = ["census.ts", "nfhs.ts", "pmgsy.ts"];

for (const script of SCRIPTS) {
  const scriptPath = path.join(__dirname, script);
  console.log(`\n=== Running ${script} ===`);
  const result = spawnSync("npx", ["tsx", scriptPath], {
    stdio: "inherit",
    shell: true
  });
  if (result.status !== 0) {
    console.error(`${script} failed with exit code ${result.status}`);
    process.exit(result.status ?? 1);
  }
}

console.log("\nAll ingestion scripts completed successfully.");
