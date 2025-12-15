
import { GameState, GameBalance, EnemyType, ItemTier, AmmoType, WeaponType, Enemy } from '../types.ts';
import { MAP_SIZE, POI_LOCATIONS } from '../constants.ts';
import { distance, normalize, resolveRectCollision } from '../utils/math.ts';
import { addParticle, addFloatingText } from './ParticleSystem.ts';

const SPEED_SCALE = 0.25;

export const spawnEnemy = (state: GameState, balance: GameBalance, overrideType?: EnemyType, spawnDistOverride?: number, origin?: {x:number, y:number}) => {
    const playerPos = state.player.pos; const wave = state.wave;
    
    // Default to M1 (Zombie Elf) as Blue/Red are deprecated for now
    let type = overrideType || EnemyType.M1;
    
    const stats = balance.enemies.types[type];
    const angle = Math.random() * Math.PI * 2; const spawnDist = spawnDistOverride || 800;
    let spawnPos = origin ? { ...origin } : { x: playerPos.x + Math.cos(angle) * spawnDist, y: playerPos.y + Math.sin(angle) * spawnDist };
    spawnPos.x = Math.max(0, Math.min(MAP_SIZE, spawnPos.x)); spawnPos.y = Math.max(0, Math.min(MAP_SIZE, spawnPos.y));
    
    state.enemies.push({ 
        id: Math.random().toString(), pos: spawnPos, velocity: {x:0,y:0}, radius: stats.radius, rotation: 0, dead: false, type: type, 
        hp: stats.hp, maxHp: stats.hp, attackCooldown: 0, slowedUntil: 0, poisonDots: [], spawnOrigin: { ...spawnPos }, 
        lastRedSummon: type === EnemyType.Boss ? state.gameTime : undefined, lastBlueSummon: type === EnemyType.Boss ? state.gameTime : undefined,
        aiState: 'chase', aiStateTimer: 0,
        specialCooldown: state.gameTime + Math.random() * 2000 // Init cooldown with slight offset
    });
};

export const updateEnemies = (state: GameState, balance: GameBalance, dt: number, tick: number) => {
    const p = state.player;
    const isPlaying = state.gamePhase === 'playing';

    for (let i = 0; i < state.enemies.length; i++) {
        const enemy = state.enemies[i]; if (enemy.dead) continue;
        const stats = balance.enemies.types[enemy.type];

        // Boss Logic - Now only spawns Zombie Elves (M1)
        if (enemy.type === EnemyType.Boss && isPlaying) {
             if (enemy.lastRedSummon === undefined) enemy.lastRedSummon = state.gameTime;
             if (enemy.lastBlueSummon === undefined) enemy.lastBlueSummon = state.gameTime;
             
             // Summon Wave 1
             if (state.gameTime > enemy.lastRedSummon + 8000) {
                 enemy.lastRedSummon = state.gameTime;
                 for(let k=0; k<4; k++) spawnEnemy(state, balance, EnemyType.M1, 0, { x: enemy.pos.x + Math.cos(Math.random()*Math.PI*2)*150, y: enemy.pos.y + Math.sin(Math.random()*Math.PI*2)*150 });
             }
             // Summon Wave 2
             if (state.gameTime > enemy.lastBlueSummon + 12000) {
                 enemy.lastBlueSummon = state.gameTime;
                 for(let k=0; k<6; k++) spawnEnemy(state, balance, EnemyType.M1, 0, { x: enemy.pos.x + Math.cos(Math.random()*Math.PI*2)*150, y: enemy.pos.y + Math.sin(Math.random()*Math.PI*2)*150 });
             }
        }

        // Poison
        enemy.poisonDots = enemy.poisonDots.filter(dot => { 
            if (state.gameTime > dot.endTime) return false; 
            if (state.gameTime > dot.nextTick) { 
                enemy.hp -= dot.damagePerTick; dot.nextTick = state.gameTime + 333; addParticle(state, enemy.pos, '#22c55e', 'smoke', 1, 0.5); 
                if (enemy.hp <= 0) { enemy.dead = true; p.coins += stats.score; addFloatingText(state, enemy.pos, `+${stats.score} ✨`, '#fcd34d'); } 
            } return true; 
        }); 
        if (enemy.dead) continue;

        // Separation
        let sepVector = { x: 0, y: 0 }; 
        for (let j = 0; j < state.enemies.length; j++) { 
            if (i === j) continue; const other = state.enemies[j]; const d = distance(enemy.pos, other.pos); 
            const minDist = enemy.radius + other.radius; 
            if (d < minDist) { const push = normalize({ x: enemy.pos.x - other.pos.x, y: enemy.pos.y - other.pos.y }); sepVector.x += push.x * 0.5; sepVector.y += push.y * 0.5; } 
        }

        // Movement Target
        let targetPos = p.pos;
        if (state.exitAnim.active) targetPos = POI_LOCATIONS.SLEIGH;
        else if (state.decoys.length > 0) {
             let nearest = state.decoys[0]; let minDist = distance(enemy.pos, nearest.pos);
             state.decoys.forEach(d => { const dst = distance(enemy.pos, d.pos); if (dst < minDist) { minDist = dst; nearest = d; } });
             targetPos = nearest.pos;
        } else if (state.clones.length > 0 && Math.random() > 0.5) {
             let nearest = state.clones[0]; let minDist = distance(enemy.pos, nearest.pos);
             state.clones.forEach(c => { const dst = distance(enemy.pos, c.pos); if (dst < minDist) { minDist = dst; nearest = c; } });
             targetPos = nearest.pos;
        }

        let moveVec = {x:0,y:0};
        
        if (enemy.type === EnemyType.Reindeer) {
            // Reindeer Logic: Charge & Retreat
            if (enemy.aiState === 'retreat') {
                if (enemy.aiStateTimer) {
                    enemy.aiStateTimer -= dt;
                    if (enemy.aiStateTimer <= 0) {
                        enemy.aiState = 'chase';
                    }
                }
                // Run AWAY from player
                moveVec = normalize({ x: enemy.pos.x - p.pos.x, y: enemy.pos.y - p.pos.y });
            } else {
                // Chase Logic
                moveVec = normalize({ x: targetPos.x - enemy.pos.x, y: targetPos.y - enemy.pos.y });
            }
        } else if (enemy.type === EnemyType.Tangler) {
            // Tangler Logic: Support / Pull
            // 1. Find Ally
            let bestAlly = null;
            let bestDist = 9999;
            // Prefer Boss > Reindeer > M1
            state.enemies.forEach(other => {
                if (other.id === enemy.id) return;
                const d = distance(enemy.pos, other.pos);
                if (d < 800) {
                    let score = 0;
                    if (other.type === EnemyType.Boss) score = 1000;
                    else if (other.type === EnemyType.Reindeer) score = 500;
                    else if (other.type === EnemyType.M1) score = 100;
                    
                    // Simple logic: just pick closest high value target
                    if (score > 0 && d < bestDist) {
                        bestDist = d;
                        bestAlly = other;
                    }
                }
            });

            if (bestAlly && bestDist > 80) {
                // Move towards ally
                moveVec = normalize({ x: (bestAlly as Enemy).pos.x - enemy.pos.x, y: (bestAlly as Enemy).pos.y - enemy.pos.y });
            } else if (distance(enemy.pos, p.pos) > 350) {
                // If no ally or already close to ally, approach player but keep distance
                moveVec = normalize({ x: targetPos.x - enemy.pos.x, y: targetPos.y - enemy.pos.y });
            }

            // SHOOT LOGIC
            const distToPlayer = distance(enemy.pos, p.pos);
            if (distToPlayer < stats.range && state.gameTime > enemy.attackCooldown && !state.exitAnim.active) {
                // Fire Tether
                const angle = Math.atan2(p.pos.y - enemy.pos.y, p.pos.x - enemy.pos.x);
                state.projectiles.push({
                    id: Math.random().toString(),
                    pos: { ...enemy.pos },
                    velocity: { x: Math.cos(angle) * stats.projectileSpeed, y: Math.sin(angle) * stats.projectileSpeed },
                    radius: 6,
                    rotation: angle,
                    dead: false,
                    damage: stats.damage,
                    rangeRemaining: stats.range,
                    color: '#06b6d4',
                    tier: ItemTier.Grey,
                    source: 'enemy',
                    ammoType: AmmoType.Standard,
                    isTanglerShot: true,
                    ownerId: enemy.id
                });
                enemy.attackCooldown = state.gameTime + stats.fireRate;
            }

        } else if (enemy.type === EnemyType.Chef) {
            // Chef Logic: Slow move, lob grenades
            // Maintain distance (e.g., 300)
            const distToPlayer = distance(enemy.pos, p.pos);
            if (distToPlayer > 300) {
                moveVec = normalize({ x: targetPos.x - enemy.pos.x, y: targetPos.y - enemy.pos.y });
            } else if (distToPlayer < 200) {
                // Too close, back up
                moveVec = normalize({ x: enemy.pos.x - p.pos.x, y: enemy.pos.y - p.pos.y });
            }

            // Lob Grenade
            if (distToPlayer < stats.range && state.gameTime > enemy.attackCooldown && !state.exitAnim.active) {
                const angle = Math.atan2(p.pos.y - enemy.pos.y, p.pos.x - enemy.pos.x);
                state.projectiles.push({
                    id: Math.random().toString(),
                    pos: { ...enemy.pos },
                    velocity: { x: Math.cos(angle) * stats.projectileSpeed, y: Math.sin(angle) * stats.projectileSpeed },
                    radius: 10,
                    rotation: angle,
                    dead: false,
                    damage: stats.damage, // Explosion damage
                    rangeRemaining: distToPlayer, // Explode on impact/arrival
                    color: '#ef4444',
                    tier: ItemTier.Grey,
                    source: 'enemy',
                    ammoType: AmmoType.Standard,
                    isCandyGrenade: true,
                    isGrenade: true 
                });
                enemy.attackCooldown = state.gameTime + stats.fireRate;
            }

        } else if (enemy.type === EnemyType.Yeti) {
            // Yeti Logic: Move slowly towards player
            moveVec = normalize({x: targetPos.x - enemy.pos.x, y: targetPos.y - enemy.pos.y});
            
            // Shockwave Attack
            if (isPlaying && !state.exitAnim.active) {
                if (state.gameTime > (enemy.specialCooldown || 0)) {
                    // Trigger Shockwave
                    enemy.specialCooldown = state.gameTime + 4000; // 4s cooldown
                    
                    // Add expanding visual
                    addParticle(state, enemy.pos, '#a5f3fc', 'shockwave', 1, 0, 2.0); // 2s duration matches approximate expansion
                    
                    // Check Logic immediately (Ground Slam)
                    const range = 250;
                    const d = distance(p.pos, enemy.pos);
                    
                    if (d < range) {
                        state.screenShake += 20;
                        if (!balance.cheats?.invincible && state.gameTime > p.invulnerableUntil) {
                            p.hp -= stats.damage;
                            addFloatingText(state, p.pos, "SLAM!", '#ef4444', 1.0);
                        }
                        
                        // Massive Knockback
                        const push = normalize({x: p.pos.x - enemy.pos.x, y: p.pos.y - enemy.pos.y});
                        p.velocity.x += push.x * 30; // Strong impulse
                        p.velocity.y += push.y * 30;
                    }
                }
            }

        } else {
            // Standard Chase Logic (M1, Boss)
            if (p.reviving) moveVec = normalize({ x: enemy.pos.x - p.pos.x, y: enemy.pos.y - p.pos.y });
            else moveVec = normalize({ x: targetPos.x - enemy.pos.x, y: targetPos.y - enemy.pos.y }); 
        }

        let speed = stats.speed * SPEED_SCALE;
        if (state.gameTime < enemy.slowedUntil) { speed *= 0.5; if (Math.random() < 0.1) addParticle(state, enemy.pos, '#93c5fd', 'snow', 1, 0.5); }
        
        enemy.pos.x += ((moveVec.x * speed) + sepVector.x) * tick; 
        enemy.pos.y += ((moveVec.y * speed) + sepVector.y) * tick;

        // Player Collision Push
        if (isPlaying && !state.exitAnim.active) { 
            const minDist = enemy.radius + balance.player.radius; 
            if (distance(enemy.pos, p.pos) < minDist) { 
                const pushDir = normalize({ x: enemy.pos.x - p.pos.x, y: enemy.pos.y - p.pos.y }); 
                enemy.pos.x = p.pos.x + pushDir.x * minDist; enemy.pos.y = p.pos.y + pushDir.y * minDist; 
            } 
        }

        // POI Collision
        for (const poi of state.worldPois) { 
            if (poi.width && poi.height) resolveRectCollision(enemy.pos, enemy.radius, poi, poi.width, poi.height); 
            else { const r = poi.radius || 100; if (distance(enemy.pos, poi) < r + enemy.radius) { const pushDir = normalize({ x: enemy.pos.x - poi.x, y: enemy.pos.y - poi.y }); enemy.pos.x = poi.x + pushDir.x * (r + enemy.radius); enemy.pos.y = poi.y + pushDir.y * (r + enemy.radius); } } 
        }

        // Melee Attack (Only if NOT Tangler or Chef or Yeti (Yeti has shockwave))
        // Yeti does not melee attack, it just walks and slams.
        if (isPlaying && !state.exitAnim.active && enemy.type !== EnemyType.Tangler && enemy.type !== EnemyType.Chef && enemy.type !== EnemyType.Yeti) {
            let target = null;
            if (state.decoys.length > 0) state.decoys.forEach(d => { if (distance(enemy.pos, d.pos) < enemy.radius + 25) target = d; });
            if (!target && state.clones.length > 0) state.clones.forEach(c => { if (distance(enemy.pos, c.pos) < enemy.radius + 25) target = c; });
            if (!target && distance(enemy.pos, p.pos) < enemy.radius + balance.player.radius + 10) target = p;

            if (target && state.gameTime > enemy.attackCooldown) {
                addParticle(state, target.pos, '#ffffff', 'spark', 5); enemy.attackCooldown = state.gameTime + 1000;
                
                // Deal Damage
                if (target === p) {
                    state.screenShake += 5;
                    if (state.gameTime > p.invulnerableUntil && !balance.cheats?.invincible) p.hp -= stats.damage;
                } else { target.hp -= stats.damage; }

                // Reindeer Retreat Logic Trigger
                if (enemy.type === EnemyType.Reindeer) {
                    enemy.aiState = 'retreat';
                    enemy.aiStateTimer = 1000; // Retreat for 1 second
                }
            }
        }
    }
    state.enemies = state.enemies.filter(e => !e.dead);
};
