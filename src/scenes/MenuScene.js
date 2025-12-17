// ==========================================
// >>> MENU SCENE <<<
// ==========================================
// Hero selection screen with FNG and Veterans

import Phaser from 'phaser';
import { TierColors, calculateGearScore } from '../data/Items.js';

export default class MenuScene extends Phaser.Scene {
    constructor() {
        super({ key: 'MenuScene' });
    }

    create() {
        const { width, height } = this.scale;

        // Load saved heroes from LocalStorage
        this.loadHeroes();

        // Background
        this.cameras.main.setBackgroundColor('#0f172a');

        // Title
        this.add.text(width / 2, 80, 'SLEIGHER', {
            fontSize: '64px',
            color: '#ffffff',
            fontStyle: 'bold'
        }).setOrigin(0.5);

        // Settings cog (top right)
        const settingsCog = this.add.text(width - 40, 40, '⚙️', {
            fontSize: '32px'
        }).setOrigin(0.5).setInteractive();

        settingsCog.on('pointerdown', () => {
            this.openSettings();
        });

        // Hero selection boxes
        this.createHeroBoxes();

        // Deploy button
        this.deployButton = this.add.rectangle(width / 2, height - 80, 200, 60, 0x22c55e);
        this.deployButton.setInteractive();
        this.deployButton.setAlpha(0.5); // Disabled by default

        const deployText = this.add.text(width / 2, height - 80, 'DEPLOY', {
            fontSize: '24px',
            color: '#ffffff',
            fontStyle: 'bold'
        }).setOrigin(0.5);

        this.deployButton.on('pointerdown', () => {
            if (this.selectedHeroIndex !== null) {
                this.startGame();
            }
        });

        this.selectedHeroIndex = null;
    }

    loadHeroes() {
        try {
            const fngData = localStorage.getItem('sleigher-fng');
            this.fngLoadout = fngData ? JSON.parse(fngData) : null;

            const veteransData = localStorage.getItem('sleigher-veterans');
            this.veterans = veteransData ? JSON.parse(veteransData) : [];
        } catch (e) {
            this.fngLoadout = null;
            this.veterans = [];
        }
    }

    createHeroBoxes() {
        const { width, height } = this.scale;
        const boxWidth = 250;
        const boxHeight = 300;
        const spacing = 50;
        const startX = width / 2 - (boxWidth * 1.5 + spacing);
        const startY = height / 2 - 50;

        // FNG Box
        this.createHeroBox(startX, startY, boxWidth, boxHeight, 'FNG', this.fngLoadout, -1);

        // Veteran 1 Box
        const vet1 = this.veterans[0] || null;
        this.createHeroBox(startX + boxWidth + spacing, startY, boxWidth, boxHeight, 'Veteran 1', vet1, 0);

        // Veteran 2 Box
        const vet2 = this.veterans[1] || null;
        this.createHeroBox(startX + (boxWidth + spacing) * 2, startY, boxWidth, boxHeight, 'Veteran 2', vet2, 1);
    }

    createHeroBox(x, y, width, height, title, loadout, index) {
        const isLocked = loadout === null && index !== -1;

        // Box background
        const box = this.add.rectangle(x, y, width, height, isLocked ? 0x1f2937 : 0x334155);
        box.setStrokeStyle(4, 0x475569);

        if (!isLocked) {
            box.setInteractive();
            box.on('pointerdown', () => {
                this.selectHero(index);
            });
        }

        // Title
        this.add.text(x, y - height / 2 + 30, title, {
            fontSize: '20px',
            color: isLocked ? '#6b7280' : '#ffffff',
            fontStyle: 'bold'
        }).setOrigin(0.5);

        if (isLocked) {
            // Lock icon
            this.add.text(x, y, '🔒', {
                fontSize: '48px'
            }).setOrigin(0.5);
        } else {
            // Display loadout
            if (index === -1) {
                // FNG - only show safe slot gear
                this.add.text(x, y - 40, 'Weapon: Snowball', {
                    fontSize: '14px',
                    color: '#9ca3af'
                }).setOrigin(0.5);

                if (this.fngLoadout && this.fngLoadout.type === 'gear') {
                    this.add.text(x, y, `Gear: ${this.fngLoadout.label || 'Unknown'}`, {
                        fontSize: '14px',
                        color: TierColors[this.fngLoadout.tier] || '#ffffff'
                    }).setOrigin(0.5);
                } else {
                    this.add.text(x, y, 'Gear: None', {
                        fontSize: '14px',
                        color: '#6b7280'
                    }).setOrigin(0.5);
                }

                this.add.text(x, y + 60, 'Score: 0', {
                    fontSize: '16px',
                    color: '#ffffff'
                }).setOrigin(0.5);
            } else {
                // Veteran
                const weaponText = `Weapon: ${loadout.weapon}`;
                this.add.text(x, y - 60, weaponText, {
                    fontSize: '14px',
                    color: TierColors[loadout.weaponTier] || '#ffffff'
                }).setOrigin(0.5);

                // Gear display (4 items)
                const gearCount = loadout.gear.filter(g => g !== null).length;
                this.add.text(x, y - 20, `Gear: ${gearCount} items`, {
                    fontSize: '14px',
                    color: '#9ca3af'
                }).setOrigin(0.5);

                // Score
                const gearTiers = loadout.gear.map(g => g ? g.tier : null);
                const score = calculateGearScore(loadout.weaponTier, gearTiers);
                this.add.text(x, y + 60, `Score: ${score}`, {
                    fontSize: '16px',
                    color: '#fbbf24'
                }).setOrigin(0.5);
            }
        }

        // Store box reference
        if (index === -1) this.fngBox = box;
        else if (index === 0) this.vet1Box = box;
        else if (index === 1) this.vet2Box = box;
    }

    selectHero(index) {
        this.selectedHeroIndex = index;

        // Reset all box highlights
        if (this.fngBox) this.fngBox.setStrokeStyle(4, 0x475569);
        if (this.vet1Box) this.vet1Box.setStrokeStyle(4, 0x475569);
        if (this.vet2Box) this.vet2Box.setStrokeStyle(4, 0x475569);

        // Highlight selected box
        const selectedBox = index === -1 ? this.fngBox : (index === 0 ? this.vet1Box : this.vet2Box);
        if (selectedBox) {
            selectedBox.setStrokeStyle(6, 0x22c55e);
        }

        // Enable deploy button
        this.deployButton.setAlpha(1);
    }

    startGame() {
        console.log('startGame() called, selectedHeroIndex:', this.selectedHeroIndex);

        let loadout = null;

        if (this.selectedHeroIndex === -1) {
            // FNG
            loadout = {
                weapon: 'SNOWBALL',
                weaponTier: -1, // White
                gear: [this.fngLoadout, null, null, null]
            };
            console.log('FNG loadout created:', loadout);
        } else {
            // Veteran
            const vet = this.veterans[this.selectedHeroIndex];
            if (vet) {
                loadout = {
                    weapon: vet.weapon,
                    weaponTier: vet.weaponTier,
                    gear: vet.gear
                };

                // Delete veteran from localStorage (Permadeath!)
                this.veterans.splice(this.selectedHeroIndex, 1);
                localStorage.setItem('sleigher-veterans', JSON.stringify(this.veterans));
                console.log('Veteran loadout created:', loadout);
            }
        }

        if (loadout) {
            console.log('Starting GameScene with loadout:', loadout);
            try {
                this.scene.start('GameScene', { loadout });
            } catch (error) {
                console.error('Error starting GameScene:', error);
            }
        } else {
            console.error('No loadout created, cannot start game');
        }
    }

    openSettings() {
        // TODO: Implement settings overlay
        console.log('Settings opened');
    }
}
