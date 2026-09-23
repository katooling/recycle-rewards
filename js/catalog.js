export const CONFIG = Object.freeze({
    pointsPerAcceptedItem: 1,
    voucherThresholdPoints: 10,
    voucherValueCents: 100,
    kioskCapacityItems: 10,
    capacityAlertThreshold: 0.8
});

export const PILOT_STORES = Object.freeze([
    { id: "berlin-1", name: "Berlin pilot store 1" },
    { id: "berlin-2", name: "Berlin pilot store 2" },
    { id: "berlin-3", name: "Berlin pilot store 3" },
    { id: "berlin-4", name: "Berlin pilot store 4" },
    { id: "berlin-5", name: "Berlin pilot store 5" }
]);

export const MATERIALS = Object.freeze([
    { id: "deposit-container", name: "Deposit bottle or can", shortName: "Bottles and cans", accepted: true, requiresClean: true },
    { id: "plastic-container", name: "Plastic food container", shortName: "Plastic containers", accepted: true, requiresClean: true },
    { id: "beverage-carton", name: "Beverage carton", shortName: "Cartons", accepted: true, requiresClean: true },
    { id: "glass-jar", name: "Glass jar", shortName: "Glass jars", accepted: true, requiresClean: true },
    { id: "detergent-bottle", name: "Detergent bottle", shortName: "Detergent bottles", accepted: true, requiresClean: true },
    { id: "aluminium-tray", name: "Aluminium tray", shortName: "Aluminium trays", accepted: true, requiresClean: true },
    { id: "food-waste", name: "Food waste", shortName: "Food waste", accepted: false, requiresClean: false },
    { id: "plastic-film", name: "Plastic film", shortName: "Plastic film", accepted: false, requiresClean: false },
    { id: "battery", name: "Battery or electronics", shortName: "Batteries and electronics", accepted: false, requiresClean: false },
    { id: "hazardous-material", name: "Hazardous material", shortName: "Hazardous materials", accepted: false, requiresClean: false },
    { id: "broken-glass", name: "Broken glass", shortName: "Broken glass", accepted: false, requiresClean: false }
]);

export function getMaterial(materialId) {
    return MATERIALS.find((material) => material.id === materialId) || null;
}

export function getStore(storeId) {
    return PILOT_STORES.find((store) => store.id === storeId) || PILOT_STORES[0];
}

