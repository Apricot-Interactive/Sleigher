// ==========================================
// >>> BOOT SCENE <<<
// ==========================================
// Handles asset creation (procedural graphics)

import Phaser from 'phaser';

export default class BootScene extends Phaser.Scene {
    constructor() {
        super({ key: 'BootScene' });
    }

    preload() {
        // Create loading text
        const { width, height } = this.scale;
        const loadingText = this.add.text(width / 2, height / 2, 'Loading Sleigher...', {
            fontSize: '32px',
            color: '#ffffff'
        });
        loadingText.setOrigin(0.5);
    }

    create() {
        // Generate procedural graphics
        this.createPlayerGraphics();
        this.createEnemyGraphics();
        this.createProjectileGraphics();
        this.createItemGraphics();
        this.createEnvironmentGraphics();

        // Proceed to Menu
        this.scene.start('MenuScene');
    }

    createPlayerGraphics() {
        // Player: Circle body with smaller circles for head/hands
        const graphics = this.add.graphics();
        graphics.fillStyle(0x3b82f6, 1); // Blue

        // Body
        graphics.fillCircle(64, 64, 40);

        // Head
        graphics.fillStyle(0xfbbf24, 1); // Yellow
        graphics.fillCircle(64, 30, 20);

        // Hands (will rotate with torso)
        graphics.fillStyle(0xfbbf24, 1);
        graphics.fillCircle(90, 64, 12);
        graphics.fillCircle(38, 64, 12);

        graphics.generateTexture('player', 128, 128);
        graphics.destroy();
    }

    createEnemyGraphics() {
        // Zombie Elf
        const zombieElf = this.add.graphics();
        zombieElf.fillStyle(0x65a30d, 1);
        zombieElf.fillCircle(32, 32, 16);
        zombieElf.fillStyle(0x84cc16, 1);
        zombieElf.fillCircle(32, 20, 10);
        zombieElf.generateTexture('enemy_zombie_elf', 64, 64);
        zombieElf.destroy();

        // Crazed Reindeer
        const reindeer = this.add.graphics();
        reindeer.fillStyle(0x78350f, 1);
        reindeer.fillCircle(40, 40, 20);
        reindeer.fillStyle(0x92400e, 1);
        reindeer.fillCircle(40, 28, 12);
        reindeer.generateTexture('enemy_reindeer', 80, 80);
        reindeer.destroy();

        // Tangler Elf
        const tangler = this.add.graphics();
        tangler.fillStyle(0x06b6d4, 1);
        tangler.fillCircle(36, 36, 18);
        tangler.fillStyle(0x22d3ee, 1);
        tangler.fillCircle(36, 24, 11);
        tangler.generateTexture('enemy_tangler', 72, 72);
        tangler.destroy();

        // Baker Elf
        const baker = this.add.graphics();
        baker.fillStyle(0xffffff, 1);
        baker.fillCircle(36, 36, 18);
        baker.fillStyle(0xf3f4f6, 1);
        baker.fillCircle(36, 24, 11);
        baker.generateTexture('enemy_baker', 72, 72);
        baker.destroy();

        // Yeti
        const yeti = this.add.graphics();
        yeti.fillStyle(0xe2e8f0, 1);
        yeti.fillCircle(80, 80, 40);
        yeti.fillStyle(0xf1f5f9, 1);
        yeti.fillCircle(80, 50, 25);
        yeti.generateTexture('enemy_yeti', 160, 160);
        yeti.destroy();
    }

    createProjectileGraphics() {
        // Standard bullet (yellow circle)
        const bullet = this.add.graphics();
        bullet.fillStyle(0xfbbf24, 1);
        bullet.fillCircle(4, 4, 4);
        bullet.generateTexture('projectile_bullet', 8, 8);
        bullet.destroy();

        // Snowball (white circle)
        const snowball = this.add.graphics();
        snowball.fillStyle(0xffffff, 1);
        snowball.fillCircle(6, 6, 6);
        snowball.generateTexture('projectile_snowball', 12, 12);
        snowball.destroy();

        // Grenade (red circle)
        const grenade = this.add.graphics();
        grenade.fillStyle(0xef4444, 1);
        grenade.fillCircle(8, 8, 8);
        grenade.generateTexture('projectile_grenade', 16, 16);
        grenade.destroy();

        // Explosion (orange expanding circle)
        const explosion = this.add.graphics();
        explosion.fillStyle(0xf97316, 0.6);
        explosion.fillCircle(32, 32, 32);
        explosion.generateTexture('effect_explosion', 64, 64);
        explosion.destroy();
    }

    createItemGraphics() {
        // Present (box shape with ribbon)
        const presentColors = [0x9ca3af, 0x22c55e, 0x3b82f6, 0xef4444]; // Grey, Green, Blue, Red

        presentColors.forEach((color, i) => {
            const present = this.add.graphics();
            present.fillStyle(color, 1);
            present.fillRect(10, 10, 30, 30);

            // Ribbon
            present.fillStyle(0xfbbf24, 1);
            present.fillRect(23, 10, 4, 30);
            present.fillRect(10, 23, 30, 4);

            present.generateTexture(`present_tier_${i}`, 50, 50);
            present.destroy();
        });

        // Weapon drop (rectangle, gun-shaped)
        const weapon = this.add.graphics();
        weapon.fillStyle(0x64748b, 1);
        weapon.fillRect(5, 15, 30, 8);
        weapon.fillRect(10, 10, 10, 18);
        weapon.generateTexture('weapon_drop', 40, 40);
        weapon.destroy();

        // Medkit (red cross)
        const medkit = this.add.graphics();
        medkit.fillStyle(0xef4444, 1);
        medkit.fillRect(8, 2, 4, 16);
        medkit.fillRect(2, 8, 16, 4);
        medkit.generateTexture('medkit', 20, 20);
        medkit.destroy();

        // Magic/Coin (star shape)
        const magic = this.add.graphics();
        magic.fillStyle(0xfbbf24, 1);
        magic.beginPath();
        for (let i = 0; i < 5; i++) {
            const angle = (i * 4 * Math.PI) / 5 - Math.PI / 2;
            const x = 10 + Math.cos(angle) * 8;
            const y = 10 + Math.sin(angle) * 8;
            if (i === 0) magic.moveTo(x, y);
            else magic.lineTo(x, y);
        }
        magic.closePath();
        magic.fillPath();
        magic.generateTexture('magic_drop', 20, 20);
        magic.destroy();
    }

    createEnvironmentGraphics() {
        // Snow ground tile (blue-white with noise)
        const ground = this.add.graphics();
        ground.fillStyle(0xdbeafe, 1);
        ground.fillRect(0, 0, 128, 128);

        // Add some noise dots
        for (let i = 0; i < 30; i++) {
            ground.fillStyle(0xe0f2fe, Math.random() * 0.5 + 0.3);
            ground.fillCircle(
                Math.random() * 128,
                Math.random() * 128,
                Math.random() * 3 + 1
            );
        }
        ground.generateTexture('ground_snow', 128, 128);
        ground.destroy();

        // Charcoal wall
        const wall = this.add.graphics();
        wall.fillStyle(0x1f2937, 1);
        wall.fillRect(0, 0, 64, 64);
        wall.generateTexture('wall_charcoal', 64, 64);
        wall.destroy();

        // Christmas tree (green triangle)
        const tree = this.add.graphics();
        tree.fillStyle(0x22c55e, 1);
        tree.fillTriangle(40, 10, 10, 70, 70, 70);
        tree.fillStyle(0x78350f, 1);
        tree.fillRect(35, 70, 10, 20);
        tree.generateTexture('christmas_tree', 80, 90);
        tree.destroy();

        // Sleigh (simple sled shape)
        const sleigh = this.add.graphics();
        sleigh.fillStyle(0xef4444, 1);
        sleigh.fillRect(10, 20, 80, 40);
        sleigh.fillStyle(0xfbbf24, 1);
        sleigh.fillRect(0, 50, 100, 10);
        sleigh.generateTexture('sleigh', 100, 70);
        sleigh.destroy();

        // Snowflake (for particle effects)
        const snowflake = this.add.graphics();
        snowflake.fillStyle(0xffffff, 0.8);
        snowflake.fillCircle(4, 4, 3);
        snowflake.generateTexture('snowflake', 8, 8);
        snowflake.destroy();

        // Door/Barricade (brown rectangle)
        const door = this.add.graphics();
        door.fillStyle(0x78350f, 1);
        door.fillRect(0, 0, 40, 60);
        door.fillStyle(0x92400e, 1);
        door.fillRect(5, 5, 30, 50);
        door.generateTexture('barricade', 40, 60);
        door.destroy();
    }
}
