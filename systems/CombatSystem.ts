

import { GameState, GameBalance, WeaponType, ItemTier, Vector2, Projectile } from '../types.ts';
import { addParticle } from './ParticleSystem.ts';
import { distance, normalize } from '../utils/math.ts';

export const handleShoot = (state: GameState, balance: GameBalance, source: 'player' | 'clone' = 'player', overridePos?: Vector2, overrideAngle?: number) => {
    const p = state.player;
    
    // Check if weapon is equipped (if player)
    if (source === 'player' && !p.weapon) return;

    // Check Lightning Gear (Double Fire Rate => Half Delay)
    const hasLightning = p.equippedGear.some(g => g?.stats?.type === 'lightning');
    const fireRateMod = hasLightning ? 0.5 : 1.0;

    const shooterPos = source === 'player' ? p.pos : overridePos!;
    const shooterAngle = source === 'player' ? p.angle : overrideAngle!;
    const shooterWeapon = (source === 'player' ? p.weapon : WeaponType.AR)!; // Default clone to AR if logic fails but usually provided or defaults
    
    // Safety check
    if (!shooterWeapon) return;

    const weaponStats = balance.weapons[shooterWeapon];

    // Reload / Ammo Check
    if (source === 'player') {
        if (p.reloadingUntil > state.gameTime || p.reviving || state.exitAnim.active) return;
        
        // Infinite Ammo Weapons
        const isInfinite = shooterWeapon === WeaponType.Sword;
        
        if (!isInfinite && p.ammo <= 0) { 
            p.reloadingUntil = state.gameTime + weaponStats.reloadTime; 
            p.ammo = weaponStats.magSize; 
            return; 
        }
        
        // Fire Rate Check
        if (state.gameTime - p.lastShotTime < (weaponStats.fireRate * fireRateMod)) return;
        
        p.lastShotTime = state.gameTime;
        if (!isInfinite) p.ammo--;
    } 

    const tier = p.weaponTiers[shooterWeapon];
    const tierDmgMult = 1 + (tier * 0.5);
    const tierColor = tier === ItemTier.Grey ? '#fbbf24' : tier === ItemTier.Green ? '#4ade80' : tier === ItemTier.Blue ? '#60a5fa' : tier === ItemTier.Red ? '#f87171' : '#fff';
    const finalDamage = balance.cheats?.instakill ? 10000 : weaponStats.damage * tierDmgMult;
    
    // Muzzle / Casing Effects
    const barrelLen = 35; 
    const muzzlePos = { x: shooterPos.x + Math.cos(shooterAngle) * barrelLen + Math.cos(shooterAngle + Math.PI/2) * 5, y: shooterPos.y + Math.sin(shooterAngle) * barrelLen + Math.sin(shooterAngle + Math.PI/2) * 5 };
    
    if (shooterWeapon !== WeaponType.Sword && shooterWeapon !== WeaponType.Chainsaw && shooterWeapon !== WeaponType.Laser) {
        addParticle(state, muzzlePos, '#ffff00', 'spark', 5, 2);
        if (shooterWeapon !== WeaponType.Snowball && shooterWeapon !== WeaponType.Boomerang && shooterWeapon !== WeaponType.ArcTaser) {
            const casingPos = { 
                x: shooterPos.x + Math.cos(shooterAngle) * 10 + Math.cos(shooterAngle + Math.PI/2) * 15, 
                y: shooterPos.y + Math.sin(shooterAngle) * 10 + Math.sin(shooterAngle + Math.PI/2) * 15 
            };
            addParticle(state, casingPos, '#d97706', 'casing', 1, 3, 20.0);
        }
    }

    if (source === 'player') state.screenShake += shooterWeapon === WeaponType.Shotgun || shooterWeapon === WeaponType.GrenadeLauncher ? 5 : 2;

    // --- WEAPON SPECIFIC LOGIC ---
    
    switch (shooterWeapon) {
        case WeaponType.Chainsaw:
        case WeaponType.Sword: {
            // MELEE HITBOX
            // Define a cone/rect in front of player
            const range = weaponStats.range;
            const arc = shooterWeapon === WeaponType.Sword ? Math.PI / 2 : Math.PI / 3; // 90 deg for sword, 60 for chainsaw
            
            state.enemies.forEach(e => {
                const dist = distance(shooterPos, e.pos);
                if (dist < range + e.radius) {
                    const angleToEnemy = Math.atan2(e.pos.y - shooterPos.y, e.pos.x - shooterPos.x);
                    let angleDiff = angleToEnemy - shooterAngle;
                    // Normalize -PI to PI
                    while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
                    while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
                    
                    if (Math.abs(angleDiff) < arc / 2) {
                        e.hp -= finalDamage;
                        addParticle(state, e.pos, '#ff0000', 'blood', 2, 1);
                        if (e.hp <= 0) { e.dead = true; if(source==='player') p.coins += balance.enemies.types[e.type].score; }
                    }
                }
            });
            break;
        }

        case WeaponType.Laser: {
            // RAYCAST BEAM
            const steps = 10;
            const stepSize = weaponStats.range / steps;
            
            // Visual Beam (handled in renderer, but we add particles along line)
            for(let i=0; i<steps; i++) {
                const checkPos = {
                    x: shooterPos.x + Math.cos(shooterAngle) * (stepSize * i),
                    y: shooterPos.y + Math.sin(shooterAngle) * (stepSize * i)
                };
                if (Math.random() > 0.8) addParticle(state, checkPos, '#ef4444', 'spark', 1, 1);
                
                // Hit check
                state.enemies.forEach(e => {
                    if (distance(checkPos, e.pos) < e.radius + 10) {
                        e.hp -= finalDamage;
                        if (e.hp <= 0) { e.dead = true; if(source==='player') p.coins += balance.enemies.types[e.type].score; }
                    }
                });
            }
            break;
        }

        case WeaponType.ArcTaser: {
            // CHAIN LIGHTNING
            let currentSource = { ...muzzlePos };
            let remainingJumps = 5;
            let hitList = new Set<string>();
            const jumpRange = 44 * 2; // ~88px
            
            // Initial Hit
            let closest: any = null;
            let minDist = weaponStats.range;
            
            state.enemies.forEach(e => {
                if (e.dead) return;
                const d = distance(currentSource, e.pos);
                // Check cone for first hit
                const angleTo = Math.atan2(e.pos.y - currentSource.y, e.pos.x - currentSource.x);
                let angleDiff = angleTo - shooterAngle;
                while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
                while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;

                if (d < minDist && Math.abs(angleDiff) < 0.5) {
                    minDist = d;
                    closest = e;
                }
            });

            if (closest) {
                hitList.add(closest.id);
                closest.hp -= finalDamage;
                if (closest.hp <= 0) { closest.dead = true; if(source==='player') p.coins += balance.enemies.types[closest.type].score; }
                
                // Visual Line
                // Draw logic is tricky in combat system, usually in renderer. 
                // We'll spawn particles along the path for now.
                const steps = 5;
                for(let k=0; k<=steps; k++) {
                    const lx = currentSource.x + (closest.pos.x - currentSource.x) * (k/steps);
                    const ly = currentSource.y + (closest.pos.y - currentSource.y) * (k/steps);
                    addParticle(state, {x:lx, y:ly}, '#60a5fa', 'spark', 1, 0);
                }

                currentSource = closest.pos;

                // Chain
                while (remainingJumps > 0) {
                    remainingJumps--;
                    let nextTarget: any = null;
                    let nextDist = jumpRange;

                    state.enemies.forEach(e => {
                         if (e.dead || hitList.has(e.id)) return;
                         const d = distance(currentSource, e.pos);
                         if (d < nextDist) {
                             nextDist = d;
                             nextTarget = e;
                         }
                    });

                    if (nextTarget) {
                        hitList.add(nextTarget.id);
                        nextTarget.hp -= finalDamage;
                        if (nextTarget.hp <= 0) { nextTarget.dead = true; if(source==='player') p.coins += balance.enemies.types[nextTarget.type].score; }
                        
                        for(let k=0; k<=steps; k++) {
                            const lx = currentSource.x + (nextTarget.pos.x - currentSource.x) * (k/steps);
                            const ly = currentSource.y + (nextTarget.pos.y - currentSource.y) * (k/steps);
                            addParticle(state, {x:lx, y:ly}, '#60a5fa', 'spark', 1, 0);
                        }
                        currentSource = nextTarget.pos;
                    } else {
                        break;
                    }
                }
            }
            break;
        }
        
        case WeaponType.Boomerang: {
            const targetDist = 176 * 4;
            const target = {
                x: shooterPos.x + Math.cos(shooterAngle) * targetDist,
                y: shooterPos.y + Math.sin(shooterAngle) * targetDist
            };
            
            // Curve Point (to the right of line)
            const midX = (shooterPos.x + target.x) / 2;
            const midY = (shooterPos.y + target.y) / 2;
            const perpX = -Math.sin(shooterAngle) * 100;
            const perpY = Math.cos(shooterAngle) * 100;
            
            // We just launch it towards target. GameLoop logic handles return.
            state.projectiles.push({
                id: Math.random().toString(),
                pos: { ...muzzlePos },
                velocity: { x: Math.cos(shooterAngle) * weaponStats.projectileSpeed, y: Math.sin(shooterAngle) * weaponStats.projectileSpeed },
                radius: 10,
                rotation: 0,
                dead: false,
                damage: finalDamage,
                rangeRemaining: 9999, // Handled by boomerang logic
                color: '#d97706',
                tier: tier,
                source: source,
                ammoType: p.ammoType,
                weaponType: WeaponType.Boomerang,
                boomerang: {
                    returning: false,
                    origin: { ...shooterPos },
                    target: target,
                    distTotal: targetDist
                }
            });
            break;
        }

        case WeaponType.GrenadeLauncher: {
             const spread = (Math.random() - 0.5) * weaponStats.spread; 
             const finalAngle = shooterAngle + spread;
             state.projectiles.push({ 
                 id: Math.random().toString(), 
                 pos: { ...muzzlePos }, 
                 velocity: { x: Math.cos(finalAngle) * weaponStats.projectileSpeed, y: Math.sin(finalAngle) * weaponStats.projectileSpeed }, 
                 radius: 6, 
                 rotation: finalAngle, 
                 dead: false, 
                 damage: 0, // No impact damage
                 rangeRemaining: weaponStats.range, 
                 color: '#166534', 
                 tier: tier, 
                 source: source, 
                 ammoType: p.ammoType, 
                 weaponType: WeaponType.GrenadeLauncher,
                 isGrenade: true
             });
             break;
        }

        default: {
            // STANDARD PROJECTILES (Pistol, AR, Shotgun, Snowball)
            const shots = shooterWeapon === WeaponType.Shotgun ? 5 : 1;
            
            for(let i=0; i<shots; i++) {
                const spread = (Math.random() - 0.5) * weaponStats.spread; 
                const finalAngle = shooterAngle + spread;
                
                // Snowball is slower, larger
                const radius = shooterWeapon === WeaponType.Snowball ? 8 : 5;
                const color = shooterWeapon === WeaponType.Snowball ? '#ffffff' : tierColor;

                state.projectiles.push({ 
                    id: Math.random().toString(), 
                    pos: { ...muzzlePos }, 
                    velocity: { x: Math.cos(finalAngle) * weaponStats.projectileSpeed, y: Math.sin(finalAngle) * weaponStats.projectileSpeed }, 
                    radius: radius, 
                    rotation: finalAngle, 
                    dead: false, 
                    damage: finalDamage, 
                    rangeRemaining: weaponStats.range, 
                    color: color, 
                    tier: tier, 
                    source: source, 
                    ammoType: p.ammoType, 
                    weaponType: shooterWeapon 
                });
            }
            break;
        }
    }
};