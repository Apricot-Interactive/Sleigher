// ==========================================
// >>> GAME OVER SCENE <<<
// ==========================================
// Win/Loss screen with stats

import Phaser from 'phaser';

export default class GameOverScene extends Phaser.Scene {
    constructor() {
        super({ key: 'GameOverScene' });
    }

    create(data) {
        const { width, height } = this.scale;
        const { victory, stats, playerData } = data;

        this.cameras.main.setBackgroundColor('#0f172a');

        // Title
        const title = victory ? 'VICTORY!' : 'GAME OVER';
        const titleColor = victory ? '#22c55e' : '#ef4444';

        this.add.text(width / 2, 100, title, {
            fontSize: '64px',
            color: titleColor,
            fontStyle: 'bold'
        }).setOrigin(0.5);

        // Stats
        let yOffset = 200;

        if (victory) {
            this.add.text(width / 2, yOffset, `Boss Defeated: ${stats.bossDefeated}`, {
                fontSize: '24px',
                color: '#ffffff'
            }).setOrigin(0.5);
            yOffset += 40;

            this.add.text(width / 2, yOffset, `Final Gear Score: ${stats.gearScore}`, {
                fontSize: '24px',
                color: '#fbbf24'
            }).setOrigin(0.5);
            yOffset += 40;
        } else {
            this.add.text(width / 2, yOffset, `Waves Survived: ${stats.wave}`, {
                fontSize: '24px',
                color: '#ffffff'
            }).setOrigin(0.5);
            yOffset += 40;
        }

        this.add.text(width / 2, yOffset, `Enemies Killed: ${stats.enemiesKilled || 0}`, {
            fontSize: '24px',
            color: '#ffffff'
        }).setOrigin(0.5);
        yOffset += 40;

        this.add.text(width / 2, yOffset, `Magic Earned: ${stats.magicEarned || 0}`, {
            fontSize: '24px',
            color: '#fbbf24'
        }).setOrigin(0.5);
        yOffset += 80;

        // Save notification
        if (victory) {
            this.add.text(width / 2, yOffset, 'Loadout saved to Veteran slot!', {
                fontSize: '18px',
                color: '#22c55e'
            }).setOrigin(0.5);
        } else {
            this.add.text(width / 2, yOffset, 'SAFE slot gear saved to FNG loadout', {
                fontSize: '18px',
                color: '#9ca3af'
            }).setOrigin(0.5);
        }
        yOffset += 60;

        // Return to menu button
        const menuButton = this.add.rectangle(width / 2, yOffset, 250, 60, 0x3b82f6);
        menuButton.setInteractive();

        this.add.text(width / 2, yOffset, 'Return to Menu', {
            fontSize: '24px',
            color: '#ffffff'
        }).setOrigin(0.5);

        menuButton.on('pointerdown', () => {
            this.scene.start('MenuScene');
        });

        // Handle persistence
        this.saveProgress(victory, playerData, stats);
    }

    saveProgress(victory, playerData, stats) {
        try {
            // Save SAFE slot gear to FNG loadout
            const safeGear = playerData.equippedGear[0] || null;
            localStorage.setItem('sleigher-fng', JSON.stringify(safeGear));

            // If victory, save full loadout to Veteran slot
            if (victory) {
                const veterans = JSON.parse(localStorage.getItem('sleigher-veterans') || '[]');

                const newVeteran = {
                    id: Date.now().toString(),
                    weapon: playerData.weapon,
                    weaponTier: playerData.weaponTier,
                    gear: playerData.equippedGear,
                    score: stats.gearScore || 0
                };

                // If 2 veterans already exist, replace the lowest score
                if (veterans.length >= 2) {
                    veterans.sort((a, b) => a.score - b.score);
                    veterans[0] = newVeteran;
                } else {
                    veterans.push(newVeteran);
                }

                localStorage.setItem('sleigher-veterans', JSON.stringify(veterans));
            }
        } catch (e) {
            console.error('Failed to save progress:', e);
        }
    }
}
