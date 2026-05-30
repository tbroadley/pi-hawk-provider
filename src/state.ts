/**
 * Tiny JSON-file persistence for hawk-provider's session-spanning state
 * (currently just the fast-mode toggle). Modeled after pi-cas-provider's
 * `src/persistence.ts` — best-effort, never throws, preserves unknown keys
 * for forward compatibility.
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join } from "node:path";

/** Persisted shape. All keys optional — readers must tolerate absence. */
export interface PersistedState {
	/** Sticky fast-mode preference set via `/fast on|off`. Env var still wins per-launch. */
	fastMode?: boolean;
	/** Unknown keys preserved on write so a future hawk-provider version can add fields. */
	[key: string]: unknown;
}

export function statePath(): string {
	return join(homedir(), ".pi", "agent", "hawk-state.json");
}

export function loadState(): PersistedState {
	try {
		const p = statePath();
		if (!existsSync(p)) return {};
		const raw = readFileSync(p, "utf8");
		const parsed = JSON.parse(raw);
		return parsed && typeof parsed === "object" ? (parsed as PersistedState) : {};
	} catch {
		return {};
	}
}

/**
 * Merge `patch` into the on-disk state. Re-reads inside the write so
 * concurrent writers (rare: two pi sessions) don't clobber each other's
 * other keys. Best-effort — failures (read-only home, etc.) are swallowed.
 */
export function saveState(patch: Partial<PersistedState>): void {
	try {
		const p = statePath();
		mkdirSync(dirname(p), { recursive: true });
		const current = loadState();
		const merged = { ...current, ...patch };
		writeFileSync(p, JSON.stringify(merged, null, 2), "utf8");
	} catch {
		// Best effort.
	}
}
