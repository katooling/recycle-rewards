const { test, expect } = require("@playwright/test");

async function acceptItem(page, material = "deposit-container") {
    await page.selectOption("#materialSelect", material);
    await page.locator("#cleanItemCheckbox").check();
    await page.getByRole("button", { name: "Return item" }).click();
}

test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await page.evaluate(() => localStorage.clear());
    await page.reload();
});

test("accepts a clean item and persists the customer record", async ({ page }) => {
    await expect(page.getByRole("heading", { name: "Recycle Rewards" })).toBeVisible();
    await acceptItem(page, "plastic-container");

    await expect(page.locator("#pointsBalance")).toHaveText("1");
    await expect(page.locator("#acceptedCount")).toHaveText("1");
    await expect(page.locator("#returnFeedback")).toContainText("Accepted");
    await expect(page.locator("#returnHistory")).toContainText("Plastic food container");

    await page.reload();
    await expect(page.locator("#pointsBalance")).toHaveText("1");
    await expect(page.locator("#acceptedCount")).toHaveText("1");
});

test("rejects an unclean accepted material without awarding points", async ({ page }) => {
    await page.selectOption("#materialSelect", "plastic-container");
    await page.locator("#cleanItemCheckbox").uncheck();
    await page.getByRole("button", { name: "Return item" }).click();

    await expect(page.locator("#returnFeedback")).toContainText("Rejected");
    await expect(page.locator("#returnFeedback")).toContainText("clean and empty");
    await expect(page.locator("#pointsBalance")).toHaveText("0");
    await expect(page.locator("#rejectedCount")).toHaveText("1");
});

test("redeems a voucher after ten accepted items", async ({ page }) => {
    for (let index = 0; index < 10; index += 1) {
        await acceptItem(page);
    }

    await expect(page.locator("#pointsBalance")).toHaveText("10");
    await expect(page.locator("#redeemVoucherBtn")).toBeEnabled();
    await page.getByRole("button", { name: "Redeem €1 voucher" }).click();

    await expect(page.locator("#pointsBalance")).toHaveText("0");
    await expect(page.locator("#redeemedCount")).toHaveText("1");
    await expect(page.locator("#returnFeedback")).toContainText("Voucher redeemed");
});

test("updates the store view and clears a full demo kiosk", async ({ page }) => {
    for (let index = 0; index < 8; index += 1) {
        await acceptItem(page);
    }

    await page.getByRole("tab", { name: "Pilot store view" }).click();
    await expect(page.locator("#dashboardAcceptedCount")).toHaveText("8");
    await expect(page.locator("#dashboardFillLevel")).toHaveText("80%");
    await expect(page.locator("#capacityAlert")).toBeVisible();
    await expect(page.locator("#capacityStatusBadge")).toHaveText("Collection needed");

    await page.getByRole("button", { name: "Mark collection complete" }).click();
    await expect(page.locator("#dashboardFillLevel")).toHaveText("0%");
    await expect(page.locator("#capacityAlert")).toBeHidden();
});

test("resets demo data and keeps the layout usable on mobile", async ({ page }) => {
    await acceptItem(page);
    page.once("dialog", (dialog) => dialog.accept());
    await page.getByRole("button", { name: "Reset demo data" }).click();
    await expect(page.locator("#pointsBalance")).toHaveText("0");

    await page.setViewportSize({ width: 390, height: 844 });
    await expect(page.getByRole("tab", { name: "Customer kiosk" })).toBeVisible();
    await expect(page.locator("#returnForm")).toBeVisible();
});

test("persists the selected theme", async ({ page }) => {
    await expect(page.locator("#themeToggle")).toHaveText("Dark mode");
    await page.getByRole("button", { name: "Use dark theme" }).click();
    await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
    await expect(page.locator("#themeToggle")).toHaveText("Light mode");

    await page.reload();
    await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
    await expect(page.locator("#themeToggle")).toHaveText("Light mode");
});
