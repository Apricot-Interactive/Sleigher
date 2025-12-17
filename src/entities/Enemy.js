// ==========================================
// >>> ENEMY ENTITY <<<
// ==========================================

import Phaser from 'phaser';
import HealthComponent from '../components/HealthComponent.js';
import { ENEMIES } from '../config/constants.js';

export default class Enemy {
    constructor(scene, x, y, type) {
        this.scene = scene;
        this.type = type;

        // Get enemy stats
        const stats = ENEMIES[type];
        if (!stats) {
            console.error(`Unknown enemy type: ${type}`);
            return;
        }

        this.stats = stats;

        // Health component
        this.healthComponent = new HealthComponent(stats.hp);
        this.hp = stats.hp;
        this.maxHp = stats.hp;
        this.damage = stats.damage;
        this.dead = false;

        // Create sprite
        const textureKey = this.getTextureKey(type);
        this.sprite = scene.physics.add.sprite(x, y, textureKey);
        this.sprite.setData('entity', this);

        // Physics
        this.sprite.setCollideWorldBounds(true);

        // AI state
        this.state = 'chase';
        this.stateTimer = 0;
    }

    getTextureKey(type) {
        const mapping = {
            'ZOMBIE_ELF': 'enemy_zombie_elf',
            'CRAZED_REINDEER': 'enemy_reindeer',
            'TANGLER_ELF': 'enemy_tangler',
            'BAKER_ELF': 'enemy_baker',
            'YETI': 'enemy_yeti'
        };

        return mapping[type] || 'enemy_zombie_elf';
    }

    update(time, delta, player) {
        if (this.dead) return;

        // Basic AI: chase player
        this.chasePlayer(player);
    }

    chasePlayer(player) {
        const playerSprite = player.sprite;

        const angle = Phaser.Math.Angle.Between(
            this.sprite.x,
            this.sprite.y,
            playerSprite.x,
            playerSprite.y
        );

        const velocityX = Math.cos(angle) * this.stats.speed;
        const velocityY = Math.sin(angle) * this.stats.speed;

        this.sprite.setVelocity(velocityX, velocityY);
        this.sprite.rotation = angle;
    }

    takeDamage(amount) {
        this.healthComponent.takeDamage(amount);
        this.hp = this.healthComponent.hp;

        // Flash effect
        this.sprite.setTint(0xff0000);
        this.scene.time.delayedCall(100, () => {
            this.sprite.clearTint();
        });

        if (this.healthComponent.isDead()) {
            this.onDeath();
        }
    }

    onDeath() {
        this.dead = true;

        // Create death particles
        const particles = this.scene.add.particles('snowflake');
        const emitter = particles.createEmitter({
            x: this.sprite.x,
            y: this.sprite.y,
            speed: { min: 50, max: 200 },
            angle: { min: 0, max: 360 },
            scale: { start: 1, end: 0 },
            blendMode: 'NORMAL',
            lifespan: 600,
            gravityY: 200,
            quantity: 10
        });

        emitter.explode();

        this.scene.time.delayedCall(1000, () => {
            particles.destroy();
        });

        // Destroy sprite
        this.sprite.destroy();
    }
}
