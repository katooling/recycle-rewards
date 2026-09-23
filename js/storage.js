import { PILOT_STORES } from "./catalog.js";

export const STATE_VERSION = 1;
export const STORAGE_KEY = "recycleRewards.state";
export const THEME_KEY = "recycleRewards.theme";

function getStorage() {
    try {
        return globalThis.window?.localStorage || null;
    } catch (_error) {
        return null;
    }
}

export function isStorageAvailable() {
    const storage = getStorage();
    if (!storage) return false;
    try {
        const probeKey = `${STORAGE_KEY}.probe`;
        storage.setItem(probeKey, "1");
        storage.removeItem(probeKey);
        return true;
    } catch (_error) {
        return false;
    }
}

export function saveState(state) {
    const storage = getStorage();
    if (!storage) return false;
    try {
        storage.setItem(STORAGE_KEY, JSON.stringify(state));
        return true;
    } catch (_error) {
        return false;
    }
}

export function loadState(createInitialState) {
    const storage = getStorage();
    if (!storage) return createInitialState();

    let raw;
    try {
        raw = storage.getItem(STORAGE_KEY);
    } catch (_error) {
        return createInitialState();
    }
    if (!raw) return createInitialState();

    try {
        const parsed = JSON.parse(raw);
        return normalizeState(parsed, createInitialState);
    } catch (_error) {
        clearState();
        return createInitialState();
    }
}

export function clearState() {
    const storage = getStorage();
    if (!storage) return;
    try {
        storage.removeItem(STORAGE_KEY);
    } catch (_error) {
        // Clearing is a convenience and must not break the app.
    }
}

export function loadTheme(fallback = "light") {
    const storage = getStorage();
    let stored = null;
    try {
        stored = storage?.getItem(THEME_KEY) || null;
    } catch (_error) {
        stored = null;
    }
    if (stored === "light" || stored === "dark") return stored;

    try {
        return globalThis.window?.matchMedia?.("(prefers-color-scheme: dark)").matches ? "dark" : fallback;
    } catch (_error) {
        return fallback;
    }
}

export function saveTheme(theme) {
    const normalized = theme === "dark" ? "dark" : "light";
    const storage = getStorage();
    try {
        storage?.setItem(THEME_KEY, normalized);
    } catch (_error) {
        // The visual theme still changes when storage is unavailable.
    }
    return normalized;
}

function normalizeState(raw, createInitialState) {
    const initial = createInitialState();
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) return initial;
    if (raw.version !== STATE_VERSION) return initial;

    const storeIds = new Set(PILOT_STORES.map((store) => store.id));
    const returns = Array.isArray(raw.returns)
        ? raw.returns.filter((entry) => entry && typeof entry === "object" && storeIds.has(entry.storeId) && typeof entry.materialId === "string").map((entry) => ({
            id: String(entry.id || `${Date.now()}-${Math.random()}`),
            storeId: entry.storeId,
            materialId: entry.materialId,
            accepted: entry.accepted === true,
            points: Number.isFinite(Number(entry.points)) ? Math.max(0, Number(entry.points)) : 0,
            reason: String(entry.reason || ""),
            timestamp: String(entry.timestamp || new Date().toISOString())
        }))
        : [];
    const redemptions = Array.isArray(raw.redemptions)
        ? raw.redemptions.filter((entry) => entry && typeof entry === "object").map((entry) => ({
            id: String(entry.id || `${Date.now()}-${Math.random()}`),
            pointsSpent: Math.max(0, Number(entry.pointsSpent) || 0),
            valueCents: Math.max(0, Number(entry.valueCents) || 0),
            timestamp: String(entry.timestamp || new Date().toISOString())
        }))
        : [];
    const collections = Array.isArray(raw.collections)
        ? raw.collections.filter((entry) => entry && typeof entry === "object" && storeIds.has(entry.storeId)).map((entry) => ({
            id: String(entry.id || `${Date.now()}-${Math.random()}`),
            storeId: entry.storeId,
            clearedItems: Math.max(0, Number(entry.clearedItems) || 0),
            timestamp: String(entry.timestamp || new Date().toISOString())
        }))
        : [];

    return {
        version: STATE_VERSION,
        customerName: typeof raw.customerName === "string" && raw.customerName.trim() ? raw.customerName.trim().slice(0, 40) : initial.customerName,
        selectedStoreId: storeIds.has(raw.selectedStoreId) ? raw.selectedStoreId : initial.selectedStoreId,
        returns,
        redemptions,
        collections,
        theme: raw.theme === "dark" ? "dark" : raw.theme === "light" ? "light" : initial.theme
    };
}

