// ==========================================
// >>> PRESENT ENTITY <<<
// ==========================================

import Phaser from 'phaser';
import { PRESENT_RARITY_WAVES, PRESENT_CONFIG } from '../config/constants.js';
import { ItemTier, getRandomWeaponByTier, getRandomGearByTier, TierColors } from '../data/Items.js';

export default class Present {
    constructor(scene, x, y, currentWave) {
        this.scene = scene;
        this.currentWave = currentWave;

        // Determine tier based on wave
        this.tier = this.determineTier(currentWave);

        // Create sprite
        const textureKey = `present_tier_${this.tier}`;
        this.sprite = scene.add.sprite(x, y, textureKey);
        this.sprite.setData('entity', this);

        // Physics
        scene.physics.add.existing(this.sprite);

        // Contents (generated on open)
        this.opened = false;
        this.pickupProgress = 0;
    }

    determineTier(wave) {
        if (wave < PRESENT_RARITY_WAVES.GREEN_UNLOCK) {
            return ItemTier.GREY;
        } else if (wave < PRESENT_RARITY_WAVES.BLUE_UNLOCK) {
            return Math.random() < 0.5 ? ItemTier.GREY : ItemTier.GREEN;
        } else {
            const rand = Math.random();
            if (rand < 0.5) return ItemTier.GREY;
            if (rand < 0.8) return ItemTier.GREEN;
            return ItemTier.BLUE;
        }
    }

    open(player) {
        if (this.opened) return;

        this.opened = true;

        // Determine contents
        const isWeapon = Math.random() < PRESENT_CONFIG.WEAPON_CHANCE;

        if (isWeapon) {
            const weaponType = getRandomWeaponByTier(this.tier);
            if (weaponType) {
                // Give weapon to player
                player.weaponComponent.setWeapon(weaponType, this.tier);
                console.log(`Found weapon: ${weaponType}`);
            }
        } else {
            const isGear = Math.random() < 0.5;

            if (isGear) {
                const gearType = getRandomGearByTier(this.tier);
                if (gearType) {
                    // Give gear to player
                    const gearItem = {
                        id: Math.random().toString(),
                        type: 'gear',
                        tier: this.tier,
                        stats: { type: gearType },
                        label: gearType
                    };

                    const added = player.inventoryComponent.addToBackpack(gearItem);
                    if (!added) {
                        console.log('Backpack full!');
                    } else {
                        console.log(`Found gear: ${gearType}`);
                    }
                }
            } else {
                // Give magic
                const magicAmount = PRESENT_CONFIG.MAGIC_VALUES[ItemTier[this.tier].toUpperCase()] || 20;
                this.scene.magic += magicAmount;
                console.log(`Found magic: ${magicAmount}`);
            }
        }

        // Destroy present
        this.sprite.destroy();
    }
}
