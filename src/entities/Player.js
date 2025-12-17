// ==========================================
// >>> PLAYER ENTITY <<<
// ==========================================

import Phaser from 'phaser';
import HealthComponent from '../components/HealthComponent.js';
import WeaponComponent from '../components/WeaponComponent.js';
import InventoryComponent from '../components/InventoryComponent.js';
import { PLAYER_HP, PLAYER_SPEED, ROTATION_SPEED } from '../config/constants.js';
import { WeaponType, ItemTier } from '../data/Items.js';

export default class Player {
    constructor(scene, x, y, loadout) {
        this.scene = scene;

        // Initialize components
        this.healthComponent = new HealthComponent(PLAYER_HP);
        this.weaponComponent = new WeaponComponent(scene, this);
        this.inventoryComponent = new InventoryComponent();

        // Apply loadout
        this.applyLoadout(loadout);

        // Create sprite
        this.sprite = scene.physics.add.sprite(x, y, 'player');
        this.sprite.setData('entity', this);

        // Physics properties
        this.sprite.setCollideWorldBounds(true);
        this.sprite.setDamping(true);
        this.sprite.setDrag(0.95);

        // Movement
        this.speed = PLAYER_SPEED;

        // Auto-aim
        this.targetEnemy = null;

        // Shorthand properties
        this.hp = this.healthComponent.hp;
        this.maxHp = this.healthComponent.maxHp;
    }

    applyLoadout(loadout) {
        if (!loadout) return;

        // Set weapon
        const weaponType = WeaponType[loadout.weapon] || WeaponType.SNOWBALL;
        const weaponTier = loadout.weaponTier !== undefined ? loadout.weaponTier : ItemTier.WHITE;
        this.weaponComponent.setWeapon(weaponType, weaponTier);

        // Set gear
        if (loadout.gear) {
            loadout.gear.forEach((gear, i) => {
                if (gear) {
                    this.inventoryComponent.equipGear(gear, i);

                    // Apply gear effects
                    if (gear.stats && gear.stats.type === 'VEST') {
                        this.healthComponent.setMaxHp(this.healthComponent.maxHp + (gear.stats.hpBonus || 300));
                        this.healthComponent.heal(gear.stats.hpBonus || 300);
                    }
                }
            });
        }
    }

    update(time, delta, movementVector, enemies) {
        // Update shorthand properties
        this.hp = this.healthComponent.hp;
        this.maxHp = this.healthComponent.maxHp;

        // Movement
        this.updateMovement(movementVector, delta);

        // Auto-aim and firing
        this.updateAiming(time, enemies);

        // Gear effects
        this.updateGearEffects(time, delta);

        // Check death
        if (this.healthComponent.isDead()) {
            this.onDeath();
        }
    }

    updateMovement(movementVector, delta) {
        // Apply movement based on input
        const speedBonus = this.inventoryComponent.hasGear('SHOES') ? 0.33 : 0;
        const effectiveSpeed = this.speed * (1 + speedBonus);

        const velocityX = movementVector.x * effectiveSpeed;
        const velocityY = movementVector.y * effectiveSpeed;

        this.sprite.setVelocity(velocityX, velocityY);
    }

    updateAiming(time, enemies) {
        // Find closest enemy in range
        this.targetEnemy = this.findClosestEnemy(enemies);

        if (this.targetEnemy) {
            // Rotate towards target
            const angleToTarget = Phaser.Math.Angle.Between(
                this.sprite.x,
                this.sprite.y,
                this.targetEnemy.sprite.x,
                this.targetEnemy.sprite.y
            );

            this.sprite.rotation = Phaser.Math.Angle.RotateTo(
                this.sprite.rotation,
                angleToTarget,
                Phaser.Math.DegToRad(ROTATION_SPEED) / 60
            );

            // Auto-fire
            this.fire(time, angleToTarget);
        } else {
            // Rotate towards movement direction
            if (this.sprite.body.velocity.length() > 0.1) {
                const angleToMove = Math.atan2(this.sprite.body.velocity.y, this.sprite.body.velocity.x);
                this.sprite.rotation = Phaser.Math.Angle.RotateTo(
                    this.sprite.rotation,
                    angleToMove,
                    Phaser.Math.DegToRad(ROTATION_SPEED) / 60
                );
            }
        }
    }

    findClosestEnemy(enemies) {
        if (!enemies || enemies.getChildren().length === 0) return null;

        const weaponRange = this.weaponComponent.currentWeapon ?
            this.scene.registry.get('weaponRange') || 500 : 0;

        let closest = null;
        let minDist = weaponRange;

        enemies.getChildren().forEach(enemySprite => {
            const enemy = enemySprite.getData('entity');
            if (enemy && !enemy.dead) {
                const dist = Phaser.Math.Distance.Between(
                    this.sprite.x,
                    this.sprite.y,
                    enemySprite.x,
                    enemySprite.y
                );

                if (dist < minDist) {
                    minDist = dist;
                    closest = enemy;
                }
            }
        });

        return closest;
    }

    fire(time, angle) {
        const projectileData = this.weaponComponent.fire(time, angle);

        if (projectileData) {
            // Create projectile
            this.createProjectile(projectileData);
        }
    }

    createProjectile(data) {
        const projectile = this.scene.physics.add.sprite(
            this.sprite.x,
            this.sprite.y,
            'projectile_bullet'
        );

        projectile.setData('entity', {
            damage: data.damage,
            isPlayerProjectile: true,
            pierce: false
        });

        const velocityX = Math.cos(data.angle) * data.speed;
        const velocityY = Math.sin(data.angle) * data.speed;

        projectile.setVelocity(velocityX, velocityY);
        projectile.rotation = data.angle;

        this.scene.projectiles.add(projectile);

        // Destroy projectile after range expires
        this.scene.time.delayedCall(data.range / data.speed * 1000, () => {
            if (projectile.active) {
                projectile.destroy();
            }
        });
    }

    updateGearEffects(time, delta) {
        // Regen
        if (this.inventoryComponent.hasGear('REGEN')) {
            const regenAmount = this.inventoryComponent.countGear('REGEN');
            this.healthComponent.heal(regenAmount * delta / 1000);
        }

        // TODO: Implement other gear effects (Mines, Snowman, Turret, etc.)
    }

    takeDamage(amount) {
        this.healthComponent.takeDamage(amount);

        // Screen shake effect
        this.scene.cameras.main.shake(200, 0.01);

        // Flash effect
        this.sprite.setTint(0xff0000);
        this.scene.time.delayedCall(100, () => {
            this.sprite.clearTint();
        });
    }

    onDeath() {
        // Trigger game over
        this.scene.gameOver(false);
    }
}
