// ==========================================
// >>> WEAPON COMPONENT <<<
// ==========================================

import { WEAPONS } from '../config/constants.js';
import { WeaponType, ItemTier } from '../data/Items.js';

export default class WeaponComponent {
    constructor(scene, owner) {
        this.scene = scene;
        this.owner = owner;

        this.currentWeapon = WeaponType.SNOWBALL;
        this.currentWeaponTier = ItemTier.WHITE;
        this.ammo = WEAPONS.SNOWBALL.clip;
        this.maxAmmo = WEAPONS.SNOWBALL.clip;
        this.lastShotTime = 0;
        this.reloading = false;
        this.reloadEndTime = 0;
    }

    setWeapon(weaponType, tier) {
        this.currentWeapon = weaponType;
        this.currentWeaponTier = tier;

        const weaponData = WEAPONS[weaponType];
        if (weaponData) {
            this.maxAmmo = weaponData.clip;
            this.ammo = weaponData.clip;
        }

        this.reloading = false;
    }

    canFire(currentTime) {
        if (this.reloading) {
            if (currentTime >= this.reloadEndTime) {
                this.finishReload();
            } else {
                return false;
            }
        }

        if (this.ammo <= 0) {
            this.startReload(currentTime);
            return false;
        }

        const weaponData = WEAPONS[this.currentWeapon];
        if (!weaponData) return false;

        const timeSinceLastShot = currentTime - this.lastShotTime;
        return timeSinceLastShot >= weaponData.fireRate;
    }

    fire(currentTime, targetAngle) {
        if (!this.canFire(currentTime)) return null;

        const weaponData = WEAPONS[this.currentWeapon];
        if (!weaponData) return null;

        this.ammo--;
        this.lastShotTime = currentTime;

        if (this.ammo <= 0) {
            this.startReload(currentTime);
        }

        return {
            weapon: this.currentWeapon,
            angle: targetAngle,
            damage: weaponData.damage,
            speed: weaponData.projectileSpeed,
            range: weaponData.range
        };
    }

    startReload(currentTime) {
        const weaponData = WEAPONS[this.currentWeapon];
        if (!weaponData) return;

        this.reloading = true;
        this.reloadEndTime = currentTime + weaponData.reloadTime;
    }

    finishReload() {
        this.reloading = false;
        this.ammo = this.maxAmmo;
    }

    refillAmmo() {
        this.ammo = this.maxAmmo;
        this.reloading = false;
    }
}
