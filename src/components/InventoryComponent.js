// ==========================================
// >>> INVENTORY COMPONENT <<<
// ==========================================

import { TierScores } from '../data/Items.js';

export default class InventoryComponent {
    constructor() {
        this.equippedGear = [null, null, null, null]; // 4 slots
        this.backpack = [null, null, null, null, null, null]; // 3x2 grid
    }

    equipGear(gear, slotIndex) {
        if (slotIndex < 0 || slotIndex >= 4) return false;

        this.equippedGear[slotIndex] = gear;
        return true;
    }

    addToBackpack(item) {
        for (let i = 0; i < this.backpack.length; i++) {
            if (this.backpack[i] === null) {
                this.backpack[i] = item;
                return true;
            }
        }
        return false; // Backpack full
    }

    removeFromBackpack(index) {
        if (index < 0 || index >= this.backpack.length) return null;

        const item = this.backpack[index];
        this.backpack[index] = null;
        return item;
    }

    swapGear(slotIndex, backpackIndex) {
        if (slotIndex < 0 || slotIndex >= 4) return false;
        if (backpackIndex < 0 || backpackIndex >= this.backpack.length) return false;

        const temp = this.equippedGear[slotIndex];
        this.equippedGear[slotIndex] = this.backpack[backpackIndex];
        this.backpack[backpackIndex] = temp;

        return true;
    }

    calculateGearScore() {
        let score = 0;

        this.equippedGear.forEach(gear => {
            if (gear && gear.tier !== null && gear.tier !== undefined) {
                score += TierScores[gear.tier] || 0;
            }
        });

        return score;
    }

    getGearByType(type) {
        return this.equippedGear.filter(gear => gear && gear.stats && gear.stats.type === type);
    }

    hasGear(type) {
        return this.equippedGear.some(gear => gear && gear.stats && gear.stats.type === type);
    }

    countGear(type) {
        return this.equippedGear.filter(gear => gear && gear.stats && gear.stats.type === type).length;
    }
}
