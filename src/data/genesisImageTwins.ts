import twinsJson from "./generated/genesisImageTwins.json";

/**
 * Workbench-synced Genesis image card id → curated stable Genesis image card id
 * carrying the byte-identical picture. Regenerate with scripts/generateGenesisImageTwins.mjs.
 *
 * Policy: the workbench card is the editable source of truth (the curated stable copy and
 * placement were migrated into its ledger on 2026-09-12), so the stable twin is hidden while
 * the workbench card is synced. If the workbench card is unsynced or excluded, the stable
 * twin shows again as a fallback.
 */
export const genesisWorkbenchImageTwins: Readonly<Record<string, string>> = twinsJson.twins;
