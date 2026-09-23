import { CONFIG, getMaterial, MATERIALS, PILOT_STORES } from "./catalog.js";
import { getCustomerMetrics, getReturnHistory, getStoreMetrics } from "./state.js";

export function renderApp(state, ui) {
    renderTheme(state.theme);
    renderView(ui.activeView);
    renderStoreSelectors(state);
    renderCustomer(state, ui);
    renderDashboard(state);
    renderStorageStatus(ui.storageAvailable);
}

function renderTheme(theme) {
    document.documentElement.dataset.theme = theme;
    document.documentElement.style.colorScheme = theme;
    const toggle = document.querySelector("#themeToggle");
    if (!toggle) return;
    const dark = theme === "dark";
    toggle.textContent = dark ? "Light mode" : "Dark mode";
    toggle.setAttribute("aria-label", dark ? "Use light theme" : "Use dark theme");
    toggle.setAttribute("aria-pressed", String(dark));
}

function renderView(activeView) {
    const customerActive = activeView === "customer";
    const customerView = document.querySelector("#customerView");
    const storeView = document.querySelector("#storeView");
    const customerTab = document.querySelector("#customerTab");
    const storeTab = document.querySelector("#storeTab");
    customerView.hidden = !customerActive;
    storeView.hidden = customerActive;
    customerView.classList.toggle("active", customerActive);
    storeView.classList.toggle("active", !customerActive);
    customerTab.classList.toggle("active", customerActive);
    storeTab.classList.toggle("active", !customerActive);
    customerTab.setAttribute("aria-selected", String(customerActive));
    storeTab.setAttribute("aria-selected", String(!customerActive));
}

function renderStoreSelectors(state) {
    const selectors = [document.querySelector("#customerStoreSelect"), document.querySelector("#dashboardStoreSelect")];
    selectors.forEach((select) => {
        if (!select) return;
        const currentValue = select.value || state.selectedStoreId;
        select.replaceChildren(...PILOT_STORES.map((store) => {
            const option = document.createElement("option");
            option.value = store.id;
            option.textContent = store.name;
            option.selected = store.id === (currentValue || state.selectedStoreId);
            return option;
        }));
        select.value = state.selectedStoreId;
    });
}

function renderMaterialSelector() {
    const select = document.querySelector("#materialSelect");
    if (!select || select.options.length) return;
    const acceptedGroup = document.createElement("optgroup");
    acceptedGroup.label = "Accepted in the pilot";
    const rejectedGroup = document.createElement("optgroup");
    rejectedGroup.label = "Rejected in the pilot";
    MATERIALS.forEach((material) => {
        const option = document.createElement("option");
        option.value = material.id;
        option.textContent = material.name;
        (material.accepted ? acceptedGroup : rejectedGroup).append(option);
    });
    select.append(acceptedGroup, rejectedGroup);
}

function renderCustomer(state, ui) {
    renderMaterialSelector();
    const metrics = getCustomerMetrics(state);
    const selectedStore = PILOT_STORES.find((store) => store.id === state.selectedStoreId) || PILOT_STORES[0];
    const nameInput = document.querySelector("#customerNameInput");
    if (document.activeElement !== nameInput) nameInput.value = state.customerName;
    setText("#pointsBalance", String(metrics.pointsBalance));
    setText("#acceptedCount", String(metrics.acceptedCount));
    setText("#rejectedCount", String(metrics.rejectedCount));
    setText("#redeemedCount", String(metrics.redeemedCount));
    setText("#customerStoreLabel", selectedStore.name.replace("Berlin pilot ", ""));
    setText("#historyCount", `${state.returns.length} ${state.returns.length === 1 ? "return" : "returns"}`);
    const progress = Math.min(100, Math.round((metrics.pointsBalance / CONFIG.voucherThresholdPoints) * 100));
    document.querySelector("#pointsProgress").style.width = `${progress}%`;
    setText("#pointsHint", metrics.pointsBalance >= CONFIG.voucherThresholdPoints
        ? "Your voucher is ready to redeem."
        : `${CONFIG.voucherThresholdPoints - metrics.pointsBalance} more point${CONFIG.voucherThresholdPoints - metrics.pointsBalance === 1 ? "" : "s"} until your next €1 voucher.`);
    document.querySelector("#redeemVoucherBtn").disabled = metrics.pointsBalance < CONFIG.voucherThresholdPoints;
    renderFeedback(ui.feedback);
    renderReturnHistory(state);
}

function renderFeedback(feedback) {
    const target = document.querySelector("#returnFeedback");
    if (!feedback) {
        target.hidden = true;
        target.textContent = "";
        target.className = "feedback";
        return;
    }
    target.hidden = false;
    target.className = `feedback ${feedback.type}`;
    target.textContent = feedback.message;
}

function renderReturnHistory(state) {
    const target = document.querySelector("#returnHistory");
    const entries = getReturnHistory(state).slice(0, 10);
    if (!entries.length) {
        target.innerHTML = '<div class="empty-state">Your returns will appear here.</div>';
        return;
    }
    target.innerHTML = entries.map((entry) => {
        const material = getMaterial(entry.materialId);
        return `<div class="history-row">
            <div class="history-icon ${entry.accepted ? "accepted" : "rejected"}" aria-hidden="true">${entry.accepted ? "✓" : "!"}</div>
            <div class="history-main"><strong>${escapeHtml(material?.name || entry.materialId)}</strong><span>${formatDate(entry.timestamp)} · ${escapeHtml(entry.reason)}</span></div>
            <strong class="history-points ${entry.accepted ? "positive" : "muted"}">${entry.accepted ? `+${entry.points}` : "Rejected"}</strong>
        </div>`;
    }).join("");
}

function renderDashboard(state) {
    const metrics = getStoreMetrics(state, state.selectedStoreId);
    setText("#dashboardAcceptedCount", String(metrics.acceptedCount));
    setText("#dashboardRejectedCount", String(metrics.rejectedCount));
    setText("#dashboardPointsIssued", String(metrics.pointsIssued));
    setText("#dashboardFillLevel", `${metrics.fillPercent}%`);
    setText("#capacityReading", `${metrics.fillItems} of ${metrics.capacityItems} items`);
    setText("#lastCollectionLabel", metrics.latestCollection ? `Last collected ${formatDate(metrics.latestCollection.timestamp)}` : "No collection recorded");
    const capacityProgress = document.querySelector("#dashboardCapacityProgress");
    capacityProgress.style.width = `${metrics.fillPercent}%`;
    const progressBar = document.querySelector(".capacity-track");
    progressBar.setAttribute("aria-valuenow", String(metrics.fillPercent));
    const alert = document.querySelector("#capacityAlert");
    alert.hidden = !metrics.alert;
    alert.textContent = metrics.alert ? "Collection recommended: the kiosk is at or above 80% capacity." : "";
    const badge = document.querySelector("#capacityStatusBadge");
    badge.textContent = metrics.alert ? "Collection needed" : "Ready";
    badge.className = `badge ${metrics.alert ? "badge-warning" : "badge-success"}`;
    document.querySelector("#markCollectionBtn").disabled = metrics.fillItems === 0;
    renderMaterialSummary(metrics.materialSummary);
    renderStoreActivity(metrics.recentReturns);
}

function renderMaterialSummary(summary) {
    const target = document.querySelector("#materialSummary");
    if (!summary.length) {
        target.innerHTML = '<div class="empty-state">No accepted returns for this store yet.</div>';
        return;
    }
    target.innerHTML = summary.map(({ material, count }) => `<div class="summary-row"><span>${escapeHtml(material?.shortName || "Unknown material")}</span><strong>${count}</strong></div>`).join("");
}

function renderStoreActivity(entries) {
    const target = document.querySelector("#storeActivity");
    if (!entries.length) {
        target.innerHTML = '<div class="empty-state">Store activity will appear here.</div>';
        return;
    }
    target.innerHTML = entries.map((entry) => {
        const material = getMaterial(entry.materialId);
        return `<div class="history-row compact"><div class="history-icon ${entry.accepted ? "accepted" : "rejected"}" aria-hidden="true">${entry.accepted ? "✓" : "!"}</div><div class="history-main"><strong>${escapeHtml(material?.shortName || entry.materialId)}</strong><span>${formatDate(entry.timestamp)}</span></div><strong class="history-points ${entry.accepted ? "positive" : "muted"}">${entry.accepted ? `+${entry.points}` : "—"}</strong></div>`;
    }).join("");
}

function renderStorageStatus(storageAvailable) {
    setText("#storageStatus", storageAvailable ? "Demo data is saved in this browser." : "Browser storage is unavailable; this session will reset on reload.");
}

function setText(selector, value) {
    const element = document.querySelector(selector);
    if (element) element.textContent = value;
}

function formatDate(value) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "Just now";
    return new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(date);
}

function escapeHtml(value) {
    return String(value).replace(/[&<>'"]/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" }[character]));
}

