import twinsJson from "./generated/genesisImageTwins.json";

/**
 * Workbench-synced Genesis image card id → curated stable Genesis image card id
 * carrying the byte-identical picture. Regenerate with scripts/generateGenesisImageTwins.mjs.
 *
 * Policy: while the curated stable card is visible, its workbench twin is hidden so the
 * reader shows each picture once with the hand-audited title and placement. Tombstoning
 * the stable card lets the workbench twin through.
 */
export const genesisWorkbenchImageTwins: Readonly<Record<string, string>> = twinsJson.twins;
