// ==========================================
// >>> GAME SCENE <<<
// ==========================================
// Main gameplay scene

import Phaser from 'phaser';
import InputManager from '../systems/InputManager.js';
import WaveManager from '../systems/WaveManager.js';
import MapManager from '../systems/MapManager.js';
import ExtractionManager from '../systems/ExtractionManager.js';
import Player from '../entities/Player.js';
import { PLAYER_SIZE, WAVE_DURATION } from '../config/constants.js';

export default class GameScene extends Phaser.Scene {
    constructor() {
        super({ key: 'GameScene' });
    }

    init(data) {
        this.loadout = data.loadout || null;
    }

    create() {
        // Initialize managers
        this.inputManager = new InputManager(this);
        this.mapManager = new MapManager(this);
        this.waveManager = new WaveManager(this);
        this.extractionManager = new ExtractionManager(this);

        // Create map
        this.mapManager.createMap();

        // Create player
        const spawnPoint = this.mapManager.getRandomSpawnPoint();
        this.player = new Player(this, spawnPoint.x, spawnPoint.y, this.loadout);

        // Camera setup
        this.cameras.main.startFollow(this.player.sprite, true, 0.1, 0.1);
        this.cameras.main.setZoom(1.0);

        // Groups for entities
        this.enemies = this.physics.add.group();
        this.projectiles = this.physics.add.group();
        this.loot = this.physics.add.group();
        this.presents = this.physics.add.group();

        // Particles
        this.createSnowParticles();

        // Start UI overlay
        this.scene.launch('UIScene');
        this.uiScene = this.scene.get('UIScene');

        // Game state
        this.gameTime = 0;
        this.wave = 1;
        this.waveTimer = WAVE_DURATION * 1.5; // First wave is longer
        this.magic = 0;
        this.enemiesKilled = 0;

        // Start wave manager
        this.waveManager.startWave(this.wave);

        // Collision detection
        this.setupCollisions();
    }

    setupCollisions() {
        // Player vs Enemies
        this.physics.add.overlap(
            this.player.sprite,
            this.enemies,
            this.handlePlayerEnemyCollision,
            null,
            this
        );

        // Projectiles vs Enemies
        this.physics.add.overlap(
            this.projectiles,
            this.enemies,
            this.handleProjectileEnemyCollision,
            null,
            this
        );

        // Player vs Loot
        this.physics.add.overlap(
            this.player.sprite,
            this.loot,
            this.handlePlayerLootCollision,
            null,
            this
        );

        // Player vs Presents
        this.physics.add.overlap(
            this.player.sprite,
            this.presents,
            this.handlePlayerPresentCollision,
            null,
            this
        );
    }

    createSnowParticles() {
        const isMobile = this.inputManager.isMobile;
        const particleCount = isMobile ? 50 : 200;

        const particles = this.add.particles('snowflake');

        this.snowEmitter = particles.createEmitter({
            x: { min: 0, max: this.scale.width },
            y: -10,
            lifespan: 20000,
            speedY: { min: 50, max: 100 },
            speedX: { min: -20, max: 20 },
            scale: { start: 0.5, end: 0.2 },
            alpha: { start: 0.8, end: 0.3 },
            frequency: isMobile ? 400 : 100,
            blendMode: 'ADD'
        });

        this.snowEmitter.setScrollFactor(0);
    }

    update(time, delta) {
        this.gameTime += delta;

        // Update input
        this.inputManager.update();

        // Update player
        this.player.update(time, delta, this.inputManager.movementVector, this.enemies);

        // Update wave
        this.waveTimer -= delta / 1000;
        this.waveManager.update(time, delta, this.waveTimer);

        // Check for wave transition
        if (this.waveTimer <= 0 && this.enemies.getChildren().length === 0) {
            this.wave++;
            this.waveTimer = WAVE_DURATION * 1.5;
            this.waveManager.startWave(this.wave);
            this.despawnDistantLoot();
        }

        // Update UI
        this.updateUI();

        // Update extraction
        this.extractionManager.update(this.player, this.magic);
    }

    despawnDistantLoot() {
        const maxDist = 40 * PLAYER_SIZE;
        this.presents.getChildren().forEach(present => {
            const dist = Phaser.Math.Distance.Between(
                this.player.sprite.x,
                this.player.sprite.y,
                present.x,
                present.y
            );

            if (dist > maxDist) {
                present.destroy();
            }
        });
    }

    updateUI() {
        const hudData = {
            hp: this.player.hp,
            maxHp: this.player.maxHp,
            weapon: this.player.weaponComponent.currentWeapon,
            weaponTier: this.player.weaponComponent.currentWeaponTier,
            ammo: this.player.weaponComponent.ammo,
            maxAmmo: this.player.weaponComponent.maxAmmo,
            magic: Math.floor(this.magic),
            wave: this.wave,
            waveTimer: this.waveTimer,
            waveDuration: WAVE_DURATION * 1.5,
            equippedGear: this.player.inventoryComponent.equippedGear,
            interactionPrompt: this.getInteractionPrompt()
        };

        this.uiScene.update(hudData);
    }

    getInteractionPrompt() {
        // Check if player is near interactable objects
        // TODO: Implement proper interaction detection
        return null;
    }

    handlePlayerEnemyCollision(playerSprite, enemySprite) {
        const enemy = enemySprite.getData('entity');
        if (enemy && !enemy.dead) {
            this.player.takeDamage(enemy.damage);
        }
    }

    handleProjectileEnemyCollision(projectileSprite, enemySprite) {
        const projectile = projectileSprite.getData('entity');
        const enemy = enemySprite.getData('entity');

        if (projectile && enemy && !enemy.dead && projectile.isPlayerProjectile) {
            enemy.takeDamage(projectile.damage);

            if (enemy.dead) {
                this.enemiesKilled++;
                // Drop loot
                if (Math.random() < 0.1) {
                    this.magic += 10;
                }
            }

            // Destroy projectile (unless it pierces)
            if (!projectile.pierce) {
                projectile.destroy();
            }
        }
    }

    handlePlayerLootCollision(playerSprite, lootSprite) {
        const loot = lootSprite.getData('entity');
        if (loot) {
            loot.pickup(this.player);
        }
    }

    handlePlayerPresentCollision(playerSprite, presentSprite) {
        const present = presentSprite.getData('entity');
        if (present && this.inputManager.isInteracting) {
            present.open(this.player);
        }
    }

    gameOver(victory = false) {
        const stats = {
            wave: this.wave,
            enemiesKilled: this.enemiesKilled,
            magicEarned: Math.floor(this.magic),
            victory: victory,
            bossDefeated: victory ? this.extractionManager.currentBossTier : null,
            gearScore: this.player.inventoryComponent.calculateGearScore()
        };

        const playerData = {
            weapon: this.player.weaponComponent.currentWeapon,
            weaponTier: this.player.weaponComponent.currentWeaponTier,
            equippedGear: this.player.inventoryComponent.equippedGear
        };

        this.scene.stop('UIScene');
        this.scene.start('GameOverScene', { victory, stats, playerData });
    }

    shutdown() {
        if (this.inputManager) {
            this.inputManager.destroy();
        }
    }
}
