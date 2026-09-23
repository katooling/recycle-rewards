import { CONFIG } from "./catalog.js";
import {
    createInitialState,
    getCustomerMetrics,
    markCollectionComplete,
    recordReturn,
    redeemVoucher,
    setCustomerName,
    setSelectedStore
} from "./state.js";
import { clearState, isStorageAvailable, loadState, loadTheme, saveState, saveTheme } from "./storage.js";
import { renderApp } from "./render.js";

let state = loadState(() => createInitialState(loadTheme()));
let ui = {
    activeView: "customer",
    feedback: null,
    storageAvailable: isStorageAvailable()
};

function render() {
    renderApp(state, ui);
    saveState(state);
}

function showFeedback(type, message) {
    ui.feedback = { type, message };
}

function bindEvents() {
    document.querySelector("#customerTab").addEventListener("click", () => {
        ui.activeView = "customer";
        render();
    });
    document.querySelector("#storeTab").addEventListener("click", () => {
        ui.activeView = "store";
        render();
    });
    document.querySelector("#themeToggle").addEventListener("click", () => {
        state.theme = state.theme === "dark" ? "light" : "dark";
        saveTheme(state.theme);
        render();
    });
    document.querySelector("#customerNameInput").addEventListener("change", (event) => {
        setCustomerName(state, event.target.value);
        render();
    });
    document.querySelector("#customerStoreSelect").addEventListener("change", (event) => {
        setSelectedStore(state, event.target.value);
        ui.feedback = null;
        render();
    });
    document.querySelector("#dashboardStoreSelect").addEventListener("change", (event) => {
        setSelectedStore(state, event.target.value);
        render();
    });
    document.querySelector("#returnForm").addEventListener("submit", (event) => {
        event.preventDefault();
        const materialId = document.querySelector("#materialSelect").value;
        const isClean = document.querySelector("#cleanItemCheckbox").checked;
        const entry = recordReturn(state, { materialId, isClean });
        showFeedback(entry.accepted ? "success" : "error", entry.accepted
            ? `Accepted. You earned ${entry.points} point.`
            : `Rejected. ${entry.reason}`);
        render();
    });
    document.querySelector("#redeemVoucherBtn").addEventListener("click", () => {
        const redemption = redeemVoucher(state);
        if (!redemption) {
            showFeedback("warning", `You need ${CONFIG.voucherThresholdPoints} points to redeem a voucher.`);
            render();
            return;
        }
        showFeedback("success", "Voucher redeemed. This is a demo transaction only.");
        render();
    });
    document.querySelector("#markCollectionBtn").addEventListener("click", () => {
        const collection = markCollectionComplete(state);
        showFeedback("success", `Collection recorded for ${collection.clearedItems} item${collection.clearedItems === 1 ? "" : "s"}.`);
        render();
    });
    document.querySelector("#resetDataBtn").addEventListener("click", () => {
        if (!window.confirm("Reset all local Recycle Rewards demo data?")) return;
        clearState();
        state = createInitialState(state.theme);
        ui.feedback = { type: "info", message: "Demo data reset." };
        render();
    });
}

function exposeDebugState() {
    globalThis.__recycleRewardsDebug = {
        getState: () => JSON.parse(JSON.stringify(state)),
        getCustomerMetrics: () => ({ ...getCustomerMetrics(state) }),
        getConfig: () => ({ ...CONFIG })
    };
}

bindEvents();
exposeDebugState();
render();

