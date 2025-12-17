// ==========================================
// >>> UI SCENE <<<
// ==========================================
// Overlay HUD (Health, Ammo, Inventory, etc.)

import Phaser from 'phaser';
import { TierColors } from '../data/Items.js';

export default class UIScene extends Phaser.Scene {
    constructor() {
        super({ key: 'UIScene' });
    }

    create() {
        const { width, height } = this.scale;

        // Top Left: Title, Settings, Health
        this.titleText = this.add.text(20, 20, 'Sleigher', {
            fontSize: '24px',
            color: '#ffffff',
            fontStyle: 'bold'
        });

        this.settingsCog = this.add.text(width - 40, 20, '⚙️', {
            fontSize: '24px'
        }).setInteractive();

        this.settingsCog.on('pointerdown', () => {
            this.openSettings();
        });

        this.healthText = this.add.text(20, 60, 'HP: 100/100', {
            fontSize: '18px',
            color: '#ffffff'
        });

        this.healthBar = this.add.graphics();

        // Top Right: Wave, Timer, Magic
        this.waveText = this.add.text(width - 20, 20, 'Wave 1', {
            fontSize: '20px',
            color: '#ffffff'
        }).setOrigin(1, 0);

        this.timerBar = this.add.graphics();

        this.magicText = this.add.text(width - 20, 100, '✨ 0', {
            fontSize: '20px',
            color: '#fbbf24'
        }).setOrigin(1, 0);

        // Bottom Left: Gear Grid (2x2)
        this.gearSlots = [];
        this.createGearGrid();

        // Bottom Right: Weapon, Ammo, Bag
        this.weaponIcon = this.add.rectangle(width - 120, height - 120, 80, 80, 0x334155);
        this.weaponIcon.setStrokeStyle(2, 0x64748b);

        this.weaponText = this.add.text(width - 120, height - 120, '', {
            fontSize: '12px',
            color: '#ffffff'
        }).setOrigin(0.5);

        this.ammoText = this.add.text(width - 120, height - 40, '0 / 0', {
            fontSize: '16px',
            color: '#ffffff'
        }).setOrigin(0.5);

        this.bagIcon = this.add.text(width - 40, height - 40, '🎒', {
            fontSize: '32px'
        }).setInteractive().setOrigin(0.5);

        this.bagIcon.on('pointerdown', () => {
            this.toggleBackpack();
        });

        // Backpack (hidden by default)
        this.backpackVisible = false;
        this.backpackContainer = null;

        // Interaction prompts (created dynamically)
        this.interactionPrompt = null;
    }

    createGearGrid() {
        const { height } = this.scale;
        const slotSize = 70;
        const spacing = 10;
        const startX = 20;
        const startY = height - (slotSize * 2 + spacing + 20);

        for (let row = 0; row < 2; row++) {
            for (let col = 0; col < 2; col++) {
                const x = startX + col * (slotSize + spacing);
                const y = startY + row * (slotSize + spacing);

                const slot = this.add.rectangle(x, y, slotSize, slotSize, 0x334155);
                slot.setStrokeStyle(2, 0x64748b);
                slot.setOrigin(0);

                const text = this.add.text(x + slotSize / 2, y + slotSize / 2, '', {
                    fontSize: '12px',
                    color: '#ffffff'
                }).setOrigin(0.5);

                // Mark top-left slot as SAFE
                if (row === 0 && col === 0) {
                    const safeLabel = this.add.text(x + slotSize / 2, y + slotSize - 5, 'SAFE', {
                        fontSize: '10px',
                        color: '#22c55e'
                    }).setOrigin(0.5);
                    this.gearSlots.push({ slot, text, safeLabel });
                } else {
                    this.gearSlots.push({ slot, text });
                }
            }
        }
    }

    update(hudData) {
        if (!hudData) return;

        // Update health
        this.healthText.setText(`HP: ${Math.floor(hudData.hp)}/${hudData.maxHp}`);
        this.drawHealthBar(hudData.hp, hudData.maxHp);

        // Update wave
        this.waveText.setText(`Wave ${hudData.wave}`);

        // Update timer
        this.drawTimerBar(hudData.waveTimer, hudData.waveDuration);

        // Update magic
        this.magicText.setText(`✨ ${hudData.magic}`);

        // Update weapon
        if (hudData.weapon) {
            this.weaponText.setText(hudData.weapon);
            this.weaponIcon.setFillStyle(TierColors[hudData.weaponTier] ? parseInt(TierColors[hudData.weaponTier].replace('#', '0x')) : 0x334155);
        } else {
            this.weaponText.setText('Unarmed');
            this.weaponIcon.setFillStyle(0x334155);
        }

        // Update ammo
        this.ammoText.setText(`${hudData.ammo} / ${hudData.maxAmmo}`);

        // Update gear
        this.updateGearSlots(hudData.equippedGear);

        // Update interaction prompt
        this.updateInteractionPrompt(hudData.interactionPrompt);
    }

    drawHealthBar(hp, maxHp) {
        const width = 200;
        const height = 20;
        const x = 20;
        const y = 90;

        this.healthBar.clear();

        // Background
        this.healthBar.fillStyle(0x1f2937, 1);
        this.healthBar.fillRect(x, y, width, height);

        // Health fill
        const healthPercent = Math.max(0, hp / maxHp);
        const color = healthPercent > 0.5 ? 0x22c55e : (healthPercent > 0.25 ? 0xfbbf24 : 0xef4444);
        this.healthBar.fillStyle(color, 1);
        this.healthBar.fillRect(x, y, width * healthPercent, height);

        // Border
        this.healthBar.lineStyle(2, 0x64748b);
        this.healthBar.strokeRect(x, y, width, height);
    }

    drawTimerBar(timeLeft, totalTime) {
        const { width } = this.scale;
        const barWidth = 200;
        const height = 10;
        const x = width - barWidth - 20;
        const y = 70;

        this.timerBar.clear();

        // Background
        this.timerBar.fillStyle(0x1f2937, 1);
        this.timerBar.fillRect(x, y, barWidth, height);

        // Timer fill
        const percent = Math.max(0, Math.min(1, timeLeft / totalTime));
        this.timerBar.fillStyle(0x3b82f6, 1);
        this.timerBar.fillRect(x, y, barWidth * percent, height);

        // Border
        this.timerBar.lineStyle(2, 0x64748b);
        this.timerBar.strokeRect(x, y, barWidth, height);
    }

    updateGearSlots(equippedGear) {
        equippedGear.forEach((gear, i) => {
            if (i < this.gearSlots.length) {
                const { text, slot } = this.gearSlots[i];
                if (gear) {
                    text.setText(gear.label || gear.type);
                    const color = TierColors[gear.tier] ? parseInt(TierColors[gear.tier].replace('#', '0x')) : 0x334155;
                    slot.setFillStyle(color, 0.3);
                } else {
                    text.setText('');
                    slot.setFillStyle(0x334155);
                }
            }
        });
    }

    updateInteractionPrompt(prompt) {
        if (this.interactionPrompt) {
            this.interactionPrompt.destroy();
            this.interactionPrompt = null;
        }

        if (prompt) {
            const { width, height } = this.scale;
            this.interactionPrompt = this.add.text(width / 2, height - 250, prompt, {
                fontSize: '18px',
                color: '#ffffff',
                backgroundColor: '#1f2937',
                padding: { x: 20, y: 10 }
            }).setOrigin(0.5);
        }
    }

    toggleBackpack() {
        this.backpackVisible = !this.backpackVisible;

        if (this.backpackVisible) {
            this.showBackpack();
        } else {
            this.hideBackpack();
        }
    }

    showBackpack() {
        const { width, height } = this.scale;

        // Create backpack container
        this.backpackContainer = this.add.container(width / 2, height / 2);

        const bg = this.add.rectangle(0, 0, 300, 200, 0x1f2937, 0.95);
        bg.setStrokeStyle(4, 0x64748b);

        const title = this.add.text(0, -80, 'Backpack (3x2)', {
            fontSize: '20px',
            color: '#ffffff'
        }).setOrigin(0.5);

        this.backpackContainer.add([bg, title]);

        // TODO: Add inventory slots grid
    }

    hideBackpack() {
        if (this.backpackContainer) {
            this.backpackContainer.destroy();
            this.backpackContainer = null;
        }
    }

    openSettings() {
        // TODO: Implement settings overlay
        console.log('Settings opened from UI');
    }
}
