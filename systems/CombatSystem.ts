
import { GameState, GameBalance, WeaponType, ItemTier, Vector2, Projectile, AmmoType, EnemyType, Enemy } from '../types.ts';
import { addParticle, addFloatingText } from './ParticleSystem.ts';
import { distance, normalize } from '../utils/math.ts';
import { MAP_SIZE } from '../constants.ts';

export const handleShoot = (state: GameState, balance: GameBalance, source: 'player' | 'clone' | 'reinforcement' = 'player', overridePos?: Vector2, overrideAngle?: number) => {
    const p = state.player;
    if (source === 'player' && !p.weapon) return;

    const shooterPos = source === 'player' ? p.pos : overridePos!;
    const shooterAngle = source === 'player' ? p.angle : overrideAngle!;
    const shooterWeapon = (source === 'player' ? p.weapon : WeaponType.AR)!; 
    
    if (!shooterWeapon) return;
    const weaponStats = balance.weapons[shooterWeapon];
    const hasLightning = p.equippedGear.some(g => g?.stats?.type === 'lightning');
    const fireRateMod = hasLightning ? 0.5 : 1.0;

    if (source === 'player') {
        if (p.reloadingUntil > state.gameTime || p.reviving || state.exitAnim.active) return;
        const isInfinite = shooterWeapon === WeaponType.Sword;
        if (!isInfinite && p.ammo <= 0) { p.reloadingUntil = state.gameTime + weaponStats.reloadTime; p.ammo = weaponStats.magSize; return; }
        if (state.gameTime - p.lastShotTime < (weaponStats.fireRate * fireRateMod)) return;
        p.lastShotTime = state.gameTime;
        if (!isInfinite) p.ammo--;
    } 

    const tier = p.weaponTiers[shooterWeapon];
    const tierDmgMult = 1 + (tier * 0.5);
    const tierColor = tier === ItemTier.Grey ? '#fbbf24' : tier === ItemTier.Green ? '#4ade80' : tier === ItemTier.Blue ? '#60a5fa' : tier === ItemTier.Red ? '#f87171' : '#fff';
    const finalDamage = balance.cheats?.instakill ? 10000 : weaponStats.damage * tierDmgMult;
    
    const barrelLen = 35; 
    const muzzlePos = { x: shooterPos.x + Math.cos(shooterAngle) * barrelLen + Math.cos(shooterAngle + Math.PI/2) * 5, y: shooterPos.y + Math.sin(shooterAngle) * barrelLen + Math.sin(shooterAngle + Math.PI/2) * 5 };
    
    // Muzzle FX
    if (shooterWeapon !== WeaponType.Sword && shooterWeapon !== WeaponType.Chainsaw && shooterWeapon !== WeaponType.Laser) {
        addParticle(state, muzzlePos, '#ffff00', 'spark', 5, 2);
        if (shooterWeapon !== WeaponType.Snowball && shooterWeapon !== WeaponType.Boomerang && shooterWeapon !== WeaponType.ArcTaser) {
            const casingPos = { x: shooterPos.x + Math.cos(shooterAngle) * 10 + Math.cos(shooterAngle + Math.PI/2) * 15, y: shooterPos.y + Math.sin(shooterAngle) * 10 + Math.sin(shooterAngle + Math.PI/2) * 15 };
            addParticle(state, casingPos, '#d97706', 'casing', 1, 3, 20.0);
        }
    }
    if (source === 'player') state.screenShake += shooterWeapon === WeaponType.Shotgun || shooterWeapon === WeaponType.GrenadeLauncher ? 5 : 2;

    switch (shooterWeapon) {
        case WeaponType.Chainsaw:
        case WeaponType.Sword: {
            const range = weaponStats.range;
            const arc = shooterWeapon === WeaponType.Sword ? Math.PI / 2 : Math.PI / 3; 
            state.enemies.forEach(e => {
                if (distance(shooterPos, e.pos) < range + e.radius) {
                    const angleTo = Math.atan2(e.pos.y - shooterPos.y, e.pos.x - shooterPos.x);
                    let diff = angleTo - shooterAngle; while (diff > Math.PI) diff -= Math.PI * 2; while (diff < -Math.PI) diff += Math.PI * 2;
                    if (Math.abs(diff) < arc / 2) {
                        const armor = balance.enemies.types[e.type].armor || 0;
                        const dmg = finalDamage * (1 - armor);
                        e.hp -= dmg; 
                        addParticle(state, e.pos, '#ff0000', 'blood', 2, 1);
                        if (e.hp <= 0) { e.dead = true; if(source==='player') p.coins += balance.enemies.types[e.type].score; }
                    }
                }
            });
            break;
        }
        case WeaponType.Laser: {
            const steps = 10; const stepSize = weaponStats.range / steps;
            for(let i=0; i<steps; i++) {
                const checkPos = { x: shooterPos.x + Math.cos(shooterAngle) * (stepSize * i), y: shooterPos.y + Math.sin(shooterAngle) * (stepSize * i) };
                if (Math.random() > 0.8) addParticle(state, checkPos, '#ef4444', 'spark', 1, 1);
                state.enemies.forEach(e => { 
                    if (distance(checkPos, e.pos) < e.radius + 10) { 
                        const armor = balance.enemies.types[e.type].armor || 0;
                        const dmg = finalDamage * (1 - armor);
                        e.hp -= dmg; 
                        if (e.hp <= 0) { e.dead = true; if(source==='player') p.coins += balance.enemies.types[e.type].score; } 
                    } 
                });
            }
            break;
        }
        case WeaponType.ArcTaser: {
            // Chain Lightning Logic
            let currentSource = { ...muzzlePos }; let remainingJumps = 5; let hitList = new Set<string>();
            let closest: Enemy | null = null; let minDist = weaponStats.range;
            state.enemies.forEach(e => {
                if (e.dead) return;
                const d = distance(currentSource, e.pos);
                const angleTo = Math.atan2(e.pos.y - currentSource.y, e.pos.x - currentSource.x);
                let diff = angleTo - shooterAngle; while (diff > Math.PI) diff -= Math.PI * 2; while (diff < -Math.PI) diff += Math.PI * 2;
                if (d < minDist && Math.abs(diff) < 0.5) { minDist = d; closest = e; }
            });
            if (closest) {
                const c = closest as Enemy; // Type assertion
                hitList.add(c.id); 
                const armor = balance.enemies.types[c.type].armor || 0;
                c.hp -= finalDamage * (1 - armor); 
                if (c.hp <= 0) { c.dead = true; if(source==='player') p.coins += balance.enemies.types[c.type].score; }
                currentSource = c.pos;
                while (remainingJumps > 0) {
                    remainingJumps--; let nextTarget: Enemy | null = null; let nextDist = 88;
                    state.enemies.forEach(e => { if (e.dead || hitList.has(e.id)) return; const d = distance(currentSource, e.pos); if (d < nextDist) { nextDist = d; nextTarget = e; } });
                    if (nextTarget) {
                        const n = nextTarget as Enemy;
                        hitList.add(n.id); 
                        const nArmor = balance.enemies.types[n.type].armor || 0;
                        n.hp -= finalDamage * (1 - nArmor); 
                        if (n.hp <= 0) { n.dead = true; if(source==='player') p.coins += balance.enemies.types[n.type].score; }
                        currentSource = n.pos;
                    } else break;
                }
            }
            break;
        }
        case WeaponType.Boomerang: {
            const targetDist = 176 * 4;
            const target = { x: shooterPos.x + Math.cos(shooterAngle) * targetDist, y: shooterPos.y + Math.sin(shooterAngle) * targetDist };
            state.projectiles.push({
                id: Math.random().toString(), pos: { ...muzzlePos }, velocity: { x: Math.cos(shooterAngle) * weaponStats.projectileSpeed, y: Math.sin(shooterAngle) * weaponStats.projectileSpeed },
                radius: 10, rotation: 0, dead: false, damage: finalDamage, rangeRemaining: 9999, color: '#d97706', tier, source, ammoType: p.ammoType, weaponType: WeaponType.Boomerang,
                boomerang: { returning: false, origin: { ...shooterPos }, target, distTotal: targetDist }
            });
            break;
        }
        case WeaponType.GrenadeLauncher: {
             const spread = (Math.random() - 0.5) * weaponStats.spread; const finalAngle = shooterAngle + spread;
             state.projectiles.push({ 
                 id: Math.random().toString(), pos: { ...muzzlePos }, velocity: { x: Math.cos(finalAngle) * weaponStats.projectileSpeed, y: Math.sin(finalAngle) * weaponStats.projectileSpeed }, 
                 radius: 6, rotation: finalAngle, dead: false, damage: 0, rangeRemaining: weaponStats.range, color: '#166534', tier, source, ammoType: p.ammoType, weaponType: WeaponType.GrenadeLauncher, isGrenade: true
             });
             break;
        }
        default: {
            const shots = shooterWeapon === WeaponType.Shotgun ? 5 : 1;
            for(let i=0; i<shots; i++) {
                const spread = (Math.random() - 0.5) * weaponStats.spread; const finalAngle = shooterAngle + spread;
                const radius = shooterWeapon === WeaponType.Snowball ? 8 : 5;
                const color = shooterWeapon === WeaponType.Snowball ? '#ffffff' : tierColor;
                state.projectiles.push({ 
                    id: Math.random().toString(), pos: { ...muzzlePos }, velocity: { x: Math.cos(finalAngle) * weaponStats.projectileSpeed, y: Math.sin(finalAngle) * weaponStats.projectileSpeed }, 
                    radius, rotation: finalAngle, dead: false, damage: finalDamage, rangeRemaining: weaponStats.range, color, tier, source, ammoType: p.ammoType, weaponType: shooterWeapon 
                });
            }
            break;
        }
    }
};

export const updateProjectiles = (state: GameState, balance: GameBalance, tick: number) => {
    const p = state.player;
    const isPlaying = state.gamePhase === 'playing';

    for (let i = state.projectiles.length - 1; i >= 0; i--) {
        const proj = state.projectiles[i];

        if (proj.boomerang) {
             const b = proj.boomerang;
             if (!b.returning) {
                 proj.pos.x += proj.velocity.x * tick; proj.pos.y += proj.velocity.y * tick;
                 if (distance(proj.pos, b.origin) >= b.distTotal) b.returning = true;
             } else {
                 const dirToPlayer = normalize({ x: p.pos.x - proj.pos.x, y: p.pos.y - proj.pos.y });
                 const returnSpeed = Math.hypot(proj.velocity.x, proj.velocity.y) * 1.5;
                 proj.velocity = { x: dirToPlayer.x * returnSpeed, y: dirToPlayer.y * returnSpeed };
                 proj.pos.x += proj.velocity.x * tick; proj.pos.y += proj.velocity.y * tick;
                 if (distance(proj.pos, p.pos) < 20) { proj.dead = true; if (p.weapon === WeaponType.Boomerang) p.ammo = 1; }
             }
             proj.rotation += 0.3 * tick;
        } else {
            proj.pos.x += proj.velocity.x * tick; proj.pos.y += proj.velocity.y * tick;
            proj.rangeRemaining -= Math.hypot(proj.velocity.x * tick, proj.velocity.y * tick);
        }
        
        if (!proj.boomerang && (proj.rangeRemaining <= 0 || proj.pos.x < 0 || proj.pos.x > MAP_SIZE || proj.pos.y < 0 || proj.pos.y > MAP_SIZE)) { 
            proj.dead = true; 
            
            // Player Grenade Explosion
            if (proj.isGrenade && !proj.isCandyGrenade) {
                 addParticle(state, proj.pos, '#ffffff', 'explosion', 1, 1); addParticle(state, proj.pos, '#f59e0b', 'smoke', 8, 4); state.screenShake += 10;
                 state.enemies.forEach(e => {
                     if (distance(e.pos, proj.pos) < 60 + e.radius) {
                         const armor = balance.enemies.types[e.type].armor || 0;
                         e.hp -= 50 * (1 - armor); 
                         addParticle(state, e.pos, '#ff0000', 'blood', 5, 2);
                         if (e.hp <= 0) { e.dead = true; p.coins += balance.enemies.types[e.type].score; }
                     }
                 });
            }
            
            // Chef Candy Grenade
            if (proj.isCandyGrenade) {
                // AoE Damage
                addParticle(state, proj.pos, '#ffffff', 'explosion', 1, 1);
                addParticle(state, proj.pos, '#f87171', 'spark', 12, 3); // Red sparks
                
                if (distance(p.pos, proj.pos) < 60 + balance.player.radius) {
                    if (state.gameTime > p.invulnerableUntil && !balance.cheats?.invincible) {
                        p.hp -= proj.damage;
                        state.screenShake += 5;
                    }
                }

                // Spawn Puddle (Candy Zone)
                state.puddles.push({
                    id: Math.random().toString(),
                    pos: { ...proj.pos },
                    velocity: { x: 0, y: 0 },
                    radius: balance.puddle.radius,
                    rotation: 0,
                    dead: false,
                    endTime: state.gameTime + balance.puddle.duration,
                    nextTick: state.gameTime,
                    damage: balance.puddle.damage, // e.g. 30
                    style: 'candy'
                });
            }

            continue; 
        }

        if (proj.isGrenade) continue;

        if (proj.source === 'player' || proj.source === 'turret' || proj.source === 'clone' || proj.source === 'reinforcement') {
            for (const enemy of state.enemies) {
                if (!enemy.dead && distance(proj.pos, enemy.pos) < enemy.radius + proj.radius + 5) {
                    if (!proj.boomerang) proj.dead = true;
                    
                    const armor = balance.enemies.types[enemy.type].armor || 0;
                    enemy.hp -= proj.damage * (1 - armor);
                    
                    addParticle(state, proj.pos, '#ff0000', 'blood', 3, 1, 5.0);
                    if (enemy.type !== EnemyType.Boss && !proj.boomerang && enemy.type !== EnemyType.Yeti) { 
                         const knockDir = normalize(proj.velocity); enemy.pos.x += knockDir.x * 5; enemy.pos.y += knockDir.y * 5; 
                    }
                    if (enemy.hp <= 0) { 
                        enemy.dead = true; p.coins += balance.enemies.types[enemy.type].score; 
                        if (Math.random() < 0.02) state.worldKeys.push({ id: Math.random().toString(), pos: { ...enemy.pos }, velocity: {x:0, y:0}, radius: 15, rotation: 0, dead: false });
                        if (Math.random() < 0.02) state.worldMedkits.push({ id: Math.random().toString(), pos: { ...enemy.pos }, velocity: {x:0, y:0}, radius: 10, rotation: 0, dead: false });
                    }
                }
            }
        }
    }
    state.projectiles = state.projectiles.filter(p => !p.dead);
};

export const updateCombatInteraction = (state: GameState, balance: GameBalance, tick: number) => {
    // Turret Logic
    state.turrets.forEach(t => {
        let target: Enemy | null = null;
        let minDist = balance.turret.range;
        
        state.enemies.forEach(e => {
            if (e.dead) return;
            const d = distance(t.pos, e.pos);
            if (d < minDist) {
                minDist = d;
                target = e;
            }
        });

        if (target) {
            t.rotation = Math.atan2(target.pos.y - t.pos.y, target.pos.x - t.pos.x);
            
            if (state.gameTime > t.fireCooldown) {
                t.fireCooldown = state.gameTime + balance.turret.fireRate;
                // Fire projectile manually since handleShoot relies on weapons
                state.projectiles.push({
                    id: Math.random().toString(),
                    pos: { x: t.pos.x + Math.cos(t.rotation)*10, y: t.pos.y + Math.sin(t.rotation)*10 },
                    velocity: { x: Math.cos(t.rotation) * balance.turret.projectileSpeed, y: Math.sin(t.rotation) * balance.turret.projectileSpeed },
                    radius: 5,
                    rotation: t.rotation,
                    dead: false,
                    damage: balance.turret.damage,
                    rangeRemaining: balance.turret.range,
                    color: '#60a5fa',
                    tier: ItemTier.Green,
                    source: 'turret',
                    ammoType: AmmoType.Standard,
                    weaponType: WeaponType.Pistol
                });
            }
        }
    });

    // Reinforcements
    state.reinforcements.forEach(r => {
        if (r.dead) return;
        
        const targetPos = { x: state.player.pos.x + r.targetOffset.x, y: state.player.pos.y + r.targetOffset.y };
        if (distance(r.pos, targetPos) > 40) {
            const move = normalize({ x: targetPos.x - r.pos.x, y: targetPos.y - r.pos.y });
            r.pos.x += move.x * balance.player.speed * 0.9 * 0.25 * tick; 
            r.pos.y += move.y * balance.player.speed * 0.9 * 0.25 * tick;
            r.rotation = Math.atan2(move.y, move.x);
        }

        let target: Enemy | null = null;
        let minDist = 600; 
        
        state.enemies.forEach(e => {
            if (e.dead) return;
            const d = distance(r.pos, e.pos);
            if (d < minDist) { minDist = d; target = e; }
        });

        if (target) {
             r.rotation = Math.atan2(target.pos.y - r.pos.y, target.pos.x - r.pos.x);
             if (state.gameTime > r.lastShotTime + 150) { 
                 r.lastShotTime = state.gameTime;
                 handleShoot(state, balance, 'reinforcement', r.pos, r.rotation);
             }
        }
    });
};
