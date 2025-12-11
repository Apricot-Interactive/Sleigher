
import { GameState, GameBalance, EnemyType, ItemTier, AmmoType, WeaponType } from '../types.ts';
import { MAP_SIZE, POI_LOCATIONS } from '../constants.ts';
import { distance, normalize, resolveRectCollision } from '../utils/math.ts';
import { addParticle, addFloatingText } from './ParticleSystem.ts';

export const spawnEnemy = (state: GameState, balance: GameBalance, overrideType?: EnemyType, spawnDistOverride?: number, origin?: {x:number, y:number}) => {
    const playerPos = state.player.pos; const wave = state.wave;
    let type = overrideType;
    if (!type) { 
        type = EnemyType.Green; 
        const rand = Math.random(); 
        
        if (wave >= 10) {
            // Wave 10+: 60% Green, 25% Red, 15% Blue
            if (rand > 0.85) type = EnemyType.Blue; // 15%
            else if (rand > 0.60) type = EnemyType.Red; // 25%
        } else if (wave >= 5) {
             // Wave 5-9: 30% Red, 70% Green
             if (rand > 0.7) type = EnemyType.Red;
        }
        // Wave 1-4: 100% Green
    }
    const stats = balance.enemies.types[type];
    const angle = Math.random() * Math.PI * 2; const spawnDist = spawnDistOverride || 800;
    let spawnPos = { x: 0, y: 0 };
    if (origin) spawnPos = { ...origin }; else spawnPos = { x: playerPos.x + Math.cos(angle) * spawnDist, y: playerPos.y + Math.sin(angle) * spawnDist };
    spawnPos.x = Math.max(0, Math.min(MAP_SIZE, spawnPos.x)); spawnPos.y = Math.max(0, Math.min(MAP_SIZE, spawnPos.y));
    state.enemies.push({ id: Math.random().toString(), pos: spawnPos, velocity: {x:0,y:0}, radius: stats.radius, rotation: 0, dead: false, type: type, hp: stats.hp, maxHp: stats.hp, attackCooldown: 0, slowedUntil: 0, poisonDots: [], spawnOrigin: { ...spawnPos }, lastRedSummon: type === EnemyType.Boss ? state.gameTime : undefined, lastBlueSummon: type === EnemyType.Boss ? state.gameTime : undefined });
};

export const updateEnemies = (state: GameState, balance: GameBalance, dt: number) => {
    const SPEED_SCALE = 0.1;
    const p = state.player;
    const isPlaying = state.gamePhase === 'playing';

    for (let i = 0; i < state.enemies.length; i++) {
        const enemy = state.enemies[i]; if (enemy.dead) continue;
        
        // Boss Summoning Logic
        if (enemy.type === EnemyType.Boss && isPlaying) {
             if (enemy.lastRedSummon === undefined) enemy.lastRedSummon = state.gameTime;
             if (enemy.lastBlueSummon === undefined) enemy.lastBlueSummon = state.gameTime;

             if (state.gameTime > enemy.lastRedSummon + 8000) {
                 enemy.lastRedSummon = state.gameTime;
                 for(let k=0; k<3; k++) {
                     const a = Math.random() * Math.PI * 2;
                     const sPos = { x: enemy.pos.x + Math.cos(a)*150, y: enemy.pos.y + Math.sin(a)*150 };
                     spawnEnemy(state, balance, EnemyType.Red, 0, sPos);
                 }
             }
             if (state.gameTime > enemy.lastBlueSummon + 12000) {
                 enemy.lastBlueSummon = state.gameTime;
                 for(let k=0; k<2; k++) {
                     const a = Math.random() * Math.PI * 2;
                     const sPos = { x: enemy.pos.x + Math.cos(a)*150, y: enemy.pos.y + Math.sin(a)*150 };
                     spawnEnemy(state, balance, EnemyType.Blue, 0, sPos);
                 }
             }
        }

        const stats = balance.enemies.types[enemy.type];
        
        // Poison Logic
        enemy.poisonDots = enemy.poisonDots.filter(dot => { 
            if (state.gameTime > dot.endTime) return false; 
            if (state.gameTime > dot.nextTick) { 
                enemy.hp -= dot.damagePerTick; 
                dot.nextTick = state.gameTime + 333; 
                addParticle(state, enemy.pos, '#22c55e', 'smoke', 1, 0.5); 
                if (enemy.hp <= 0) { 
                    enemy.dead = true; 
                    p.coins += stats.score; 
                    addFloatingText(state, enemy.pos, `+${stats.score} ✨`, '#fcd34d'); 
                } 
            } 
            return true; 
        }); 
        if (enemy.dead) continue;
        
        // Separation
        let sepVector = { x: 0, y: 0 }; 
        for (let j = 0; j < state.enemies.length; j++) { 
            if (i === j) continue; 
            const other = state.enemies[j]; 
            const d = distance(enemy.pos, other.pos); 
            const minDist = enemy.radius + other.radius; 
            if (d < minDist) { 
                const push = normalize({ x: enemy.pos.x - other.pos.x, y: enemy.pos.y - other.pos.y }); 
                sepVector.x += push.x * 0.5; 
                sepVector.y += push.y * 0.5; 
            } 
        }

        let moveVec = { x: 0, y: 0 }; let shouldShoot = false; let enemySpeed = stats.speed * SPEED_SCALE;
        
        let targetPos = p.pos;
        // let targetType = 'player';
        
        if (state.exitAnim.active) {
            targetPos = POI_LOCATIONS.SLEIGH;
        } else {
            if (state.decoys.length > 0) {
                let nearestDecoy = state.decoys[0];
                let minDist = distance(enemy.pos, nearestDecoy.pos);
                state.decoys.forEach(d => { const dst = distance(enemy.pos, d.pos); if (dst < minDist) { minDist = dst; nearestDecoy = d; } });
                targetPos = nearestDecoy.pos; // targetType = 'decoy';
            }
            else if (state.clones.length > 0 && Math.random() > 0.5) {
                    let nearestClone = state.clones[0];
                    let minDist = distance(enemy.pos, nearestClone.pos);
                    state.clones.forEach(c => { const dst = distance(enemy.pos, c.pos); if (dst < minDist) { minDist = dst; nearestClone = c; } });
                    targetPos = nearestClone.pos; // targetType = 'clone';
            }
        }

        if (p.reviving) { moveVec = normalize({ x: enemy.pos.x - p.pos.x, y: enemy.pos.y - p.pos.y }); } 
        else {
            if (enemy.type === EnemyType.Blue) { 
                if (distance(enemy.pos, targetPos) < stats.range && distance(enemy.pos, targetPos) > 200 && !state.exitAnim.active) { 
                    moveVec = { x: 0, y: 0 }; shouldShoot = true; 
                } else { 
                    moveVec = normalize({ x: targetPos.x - enemy.pos.x, y: targetPos.y - enemy.pos.y }); 
                } 
            } else { 
                moveVec = normalize({ x: targetPos.x - enemy.pos.x, y: targetPos.y - enemy.pos.y }); 
            }
        }
        
        if (state.gameTime < enemy.slowedUntil) { enemySpeed *= 0.5; if (Math.random() < 0.1) addParticle(state, enemy.pos, '#93c5fd', 'snow', 1, 0.5); }
        enemy.pos.x += (moveVec.x * enemySpeed) + sepVector.x; enemy.pos.y += (moveVec.y * enemySpeed) + sepVector.y;

        if (isPlaying && !state.exitAnim.active) { 
            const minDistToPlayer = enemy.radius + balance.player.radius; 
            const distToPlayer = distance(enemy.pos, p.pos);
            if (distToPlayer < minDistToPlayer) { 
                const pushDir = normalize({ x: enemy.pos.x - p.pos.x, y: enemy.pos.y - p.pos.y }); 
                enemy.pos.x = p.pos.x + pushDir.x * minDistToPlayer; 
                enemy.pos.y = p.pos.y + pushDir.y * minDistToPlayer; 
            } 
        }
        
        // Check Collision with Dynamic POIs
        for (const poi of state.worldPois) { 
            if (poi.width && poi.height) resolveRectCollision(enemy.pos, enemy.radius, poi, poi.width, poi.height); 
            else { 
                const r = poi.radius || 100; 
                const dist = distance(enemy.pos, poi); 
                if (dist < r + enemy.radius) { 
                    const pushDir = normalize({ x: enemy.pos.x - poi.x, y: enemy.pos.y - poi.y }); 
                    enemy.pos.x = poi.x + pushDir.x * (r + enemy.radius); 
                    enemy.pos.y = poi.y + pushDir.y * (r + enemy.radius); 
                } 
            } 
        }

        if (isPlaying && shouldShoot && state.gameTime > enemy.attackCooldown) {
            enemy.attackCooldown = state.gameTime + stats.fireRate; 
            const angle = Math.atan2(targetPos.y - enemy.pos.y, targetPos.x - enemy.pos.x); 
            const muzzlePos = { x: enemy.pos.x + Math.cos(angle) * enemy.radius, y: enemy.pos.y + Math.sin(angle) * enemy.radius };
            addParticle(state, muzzlePos, '#60a5fa', 'spark', 3, 3);
            state.projectiles.push({ id: Math.random().toString(), pos: muzzlePos, velocity: { x: Math.cos(angle) * stats.projectileSpeed, y: Math.sin(angle) * stats.projectileSpeed }, radius: 5, rotation: angle, dead: false, damage: stats.damage, rangeRemaining: stats.range, color: '#93c5fd', tier: ItemTier.Grey, source: 'enemy', ammoType: AmmoType.Standard, weaponType: WeaponType.AR });
        }
        
        if (isPlaying && !state.exitAnim.active) {
            let target = null;
            if (state.decoys.length > 0) { state.decoys.forEach(d => { if (distance(enemy.pos, d.pos) < enemy.radius + 25) target = d; }); }
            if (!target && state.clones.length > 0) { state.clones.forEach(c => { if (distance(enemy.pos, c.pos) < enemy.radius + 25) target = c; }); }
            if (!target && distance(enemy.pos, p.pos) < enemy.radius + balance.player.radius + 10) target = p;

            if (target && state.gameTime > enemy.attackCooldown) {
                addParticle(state, target.pos, '#ffffff', 'spark', 5); enemy.attackCooldown = state.gameTime + 1000;
                if (target === p) {
                    state.screenShake += 5;
                    if (state.gameTime > p.invulnerableUntil && !balance.cheats?.invincible) p.hp -= stats.damage;
                } else {
                    target.hp -= stats.damage;
                }
            }
        }
    }
    
    state.enemies = state.enemies.filter(e => !e.dead);
};
