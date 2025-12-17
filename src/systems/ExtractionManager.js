// ==========================================
// >>> EXTRACTION MANAGER <<<
// ==========================================
// Handles Sleigh infusion and boss summoning

import {
    EXTRACTION_COSTS,
    INFUSION_SPEED_MIN,
    INFUSION_SPEED_MAX,
    INFUSION_RAMP_TIME,
    TETHER_RADIUS
} from '../config/constants.js';

export default class ExtractionManager {
    constructor(scene) {
        this.scene = scene;
        this.infusing = false;
        this.infusionStartTime = 0;
        this.infusedMagic = 0;
        this.currentTier = null;
        this.currentBossTier = null;
        this.bossDefeated = false;
    }

    update(player, magic) {
        const sleigh = this.scene.mapManager.getSleigh();
        if (!sleigh) return;

        const distance = Phaser.Math.Distance.Between(
            player.sprite.x,
            player.sprite.y,
            sleigh.x,
            sleigh.y
        );

        // Check if player is near sleigh
        if (distance < 200) {
            // Show infusion prompt
            if (this.scene.inputManager.isInteracting && !this.infusing && !this.bossDefeated) {
                this.startInfusion();
            }
        }

        // Handle active infusion
        if (this.infusing) {
            const tetherDistance = Phaser.Math.Distance.Between(
                player.sprite.x,
                player.sprite.y,
                sleigh.x,
                sleigh.y
            );

            if (tetherDistance > TETHER_RADIUS) {
                // Tether broken
                this.pauseInfusion();
            } else {
                this.updateInfusion(magic);
            }
        }
    }

    startInfusion() {
        this.infusing = true;
        this.infusionStartTime = this.scene.gameTime;
        console.log('Infusion started');
    }

    pauseInfusion() {
        this.infusing = false;
        console.log('Infusion paused - tether broken');
    }

    updateInfusion(magic) {
        const elapsed = (this.scene.gameTime - this.infusionStartTime) / 1000;
        const rampProgress = Math.min(1, elapsed / INFUSION_RAMP_TIME);

        const currentSpeed = INFUSION_SPEED_MIN + (INFUSION_SPEED_MAX - INFUSION_SPEED_MIN) * rampProgress;

        const drainAmount = currentSpeed * (1 / 60); // Per frame at 60fps

        if (magic >= drainAmount) {
            this.scene.magic -= drainAmount;
            this.infusedMagic += drainAmount;

            // Check for tier unlocks
            if (this.infusedMagic >= EXTRACTION_COSTS.GOLD) {
                this.currentTier = 'GOLD';
            } else if (this.infusedMagic >= EXTRACTION_COSTS.SILVER) {
                this.currentTier = 'SILVER';
            } else if (this.infusedMagic >= EXTRACTION_COSTS.BRONZE) {
                this.currentTier = 'BRONZE';
            }
        } else {
            this.pauseInfusion();
        }
    }

    summonBoss(tier) {
        this.currentBossTier = tier;
        // TODO: Implement boss spawning
        console.log(`Summoning ${tier} boss`);
    }

    onBossDefeated() {
        this.bossDefeated = true;
        // Allow extraction
    }

    extract() {
        // Trigger victory
        this.scene.gameOver(true);
    }
}
