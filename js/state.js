import { CONFIG, getMaterial, getStore, PILOT_STORES } from "./catalog.js";
import { STATE_VERSION } from "./storage.js";

export function createInitialState(theme = "light") {
    return {
        version: STATE_VERSION,
        customerName: "Demo Customer",
        selectedStoreId: PILOT_STORES[0].id,
        returns: [],
        redemptions: [],
        collections: [],
        theme: theme === "dark" ? "dark" : "light"
    };
}

export function setCustomerName(state, value) {
    const name = String(value || "").trim().slice(0, 40);
    state.customerName = name || "Demo Customer";
}

export function setSelectedStore(state, storeId) {
    state.selectedStoreId = getStore(storeId).id;
}

export function recordReturn(state, { materialId, isClean }) {
    const material = getMaterial(materialId);
    const accepted = Boolean(material?.accepted && (!material.requiresClean || isClean));
    const reason = accepted
        ? "Accepted by the demo kiosk."
        : material?.accepted
            ? "Rejected because the item must be clean and empty."
            : "This material is outside the pilot acceptance list.";
    const entry = {
        id: createId(),
        storeId: state.selectedStoreId,
        materialId: material?.id || String(materialId || "unknown"),
        accepted,
        points: accepted ? CONFIG.pointsPerAcceptedItem : 0,
        reason,
        timestamp: new Date().toISOString()
    };
    state.returns.push(entry);
    return entry;
}

export function redeemVoucher(state) {
    const metrics = getCustomerMetrics(state);
    if (metrics.pointsBalance < CONFIG.voucherThresholdPoints) return null;

    const redemption = {
        id: createId(),
        pointsSpent: CONFIG.voucherThresholdPoints,
        valueCents: CONFIG.voucherValueCents,
        timestamp: new Date().toISOString()
    };
    state.redemptions.push(redemption);
    return redemption;
}

export function markCollectionComplete(state, storeId = state.selectedStoreId) {
    const metrics = getStoreMetrics(state, storeId);
    const collection = {
        id: createId(),
        storeId: getStore(storeId).id,
        clearedItems: metrics.fillItems,
        timestamp: new Date().toISOString()
    };
    state.collections.push(collection);
    return collection;
}

export function getCustomerMetrics(state) {
    const accepted = state.returns.filter((entry) => entry.accepted);
    const rejected = state.returns.filter((entry) => !entry.accepted);
    const pointsEarned = accepted.reduce((total, entry) => total + entry.points, 0);
    const pointsRedeemed = state.redemptions.reduce((total, entry) => total + entry.pointsSpent, 0);
    return {
        acceptedCount: accepted.length,
        rejectedCount: rejected.length,
        pointsEarned,
        pointsRedeemed,
        pointsBalance: Math.max(0, pointsEarned - pointsRedeemed),
        redeemedCount: state.redemptions.length
    };
}

export function getStoreMetrics(state, storeId) {
    const normalizedStoreId = getStore(storeId).id;
    const storeReturns = state.returns.filter((entry) => entry.storeId === normalizedStoreId);
    const acceptedReturns = storeReturns.filter((entry) => entry.accepted);
    const rejectedReturns = storeReturns.filter((entry) => !entry.accepted);
    const latestCollection = [...state.collections]
        .filter((entry) => entry.storeId === normalizedStoreId)
        .sort((a, b) => timestampValue(b.timestamp) - timestampValue(a.timestamp))[0] || null;
    const latestCollectionTime = latestCollection ? timestampValue(latestCollection.timestamp) : 0;
    const fillItems = acceptedReturns.filter((entry) => timestampValue(entry.timestamp) > latestCollectionTime).length;
    const fillPercent = Math.min(100, Math.round((fillItems / CONFIG.kioskCapacityItems) * 100));
    return {
        store: getStore(normalizedStoreId),
        acceptedCount: acceptedReturns.length,
        rejectedCount: rejectedReturns.length,
        pointsIssued: acceptedReturns.reduce((total, entry) => total + entry.points, 0),
        fillItems,
        fillPercent,
        capacityItems: CONFIG.kioskCapacityItems,
        alert: fillItems / CONFIG.kioskCapacityItems >= CONFIG.capacityAlertThreshold,
        latestCollection,
        materialSummary: getMaterialSummary(state, normalizedStoreId),
        recentReturns: [...storeReturns].sort((a, b) => timestampValue(b.timestamp) - timestampValue(a.timestamp)).slice(0, 8)
    };
}

export function getMaterialSummary(state, storeId) {
    const summary = new Map();
    state.returns
        .filter((entry) => entry.storeId === getStore(storeId).id && entry.accepted)
        .forEach((entry) => summary.set(entry.materialId, (summary.get(entry.materialId) || 0) + 1));
    return [...summary.entries()].map(([materialId, count]) => ({ material: getMaterial(materialId), count }));
}

export function getReturnHistory(state) {
    return [...state.returns].sort((a, b) => timestampValue(b.timestamp) - timestampValue(a.timestamp));
}

function timestampValue(value) {
    const parsed = Date.parse(value);
    return Number.isFinite(parsed) ? parsed : 0;
}

function createId() {
    try {
        return globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    } catch (_error) {
        return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    }
}

