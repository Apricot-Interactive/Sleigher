

import { GameState, GameBalance, Vector2, WeaponType, EnemyType, ItemTier, AmmoType, Loot, GearType, Loadout, WorldPOI, Enemy } from '../types.ts';
import { MAP_SIZE, POI_LOCATIONS, BUNKER_INT_SIZE, BUNKER_ZONES, LOOT_CONFIG } from '../constants.ts';
import { distance, normalize, resolveRectCollision } from '../utils/math.ts';
import { generateMap } from './MapSystem.ts';
import { spawnLoot, generateLootContent } from './LootSystem.ts';
import { handleShoot } from './CombatSystem.ts';
import { spawnEnemy, updateEnemies } from './EnemySystem.ts';
import { addParticle, addFloatingText } from './ParticleSystem.ts';

const rotateTowards = (current: number, target: number, maxStep: number): number => {
    let diff = target - current;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    
    let newAngle = current;
    if (Math.abs(diff) <= maxStep) {
        newAngle = target;
    } else {
        newAngle = current + Math.sign(diff) * maxStep;
    }
    
    while (newAngle > Math.PI) newAngle -= Math.PI * 2;
    while (newAngle < -Math.PI) newAngle += Math.PI * 2;
    return newAngle;
};

export const createInitialState = (balance: GameBalance, loadout?: Loadout): GameState => {
    // Generate Map
    const mapData = generateMap();
    
    const isMobile = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    
    // Initialize Snow
    const snow = [];
    const w = window.innerWidth || 1920;
    const h = window.innerHeight || 1080;
    // Optimize for mobile: Reduce snow count significantly
    const snowCount = isMobile ? 50 : 400;
    
    for(let i=0; i<snowCount; i++) {
        snow.push({ x: Math.random() * w, y: Math.random() * h });
    }

    // Default Configuration (FNG starts with White Snowball)
    let initialWeapon = WeaponType.Snowball;
    let initialTier = ItemTier.White;
    let initialGear = [null, null, null, null] as (any | null)[];
    let initialHp = balance.player.maxHp;

    // Apply Loadout if Present
    if (loadout) {
        initialWeapon = loadout.weapon;
        initialTier = loadout.weaponTier;
        initialGear = loadout.gear;
        
        // Calculate HP Bonus from Gear
        let bonus = 0;
        initialGear.forEach(g => {
            if (g && g.stats && g.stats.hpBonus) {
                bonus += g.stats.hpBonus;
            }
        });
        initialHp += bonus;
    }

    const playerMaxHp = initialHp;

    // Initialize weapon tiers map with all weapons
    const weaponTiers: Record<WeaponType, ItemTier> = {} as any;
    Object.values(WeaponType).forEach(t => weaponTiers[t] = ItemTier.Grey);
    // Explicitly set Snowball to White if it's the weapon (though defaults to Grey in list, we override)
    weaponTiers[WeaponType.Snowball] = ItemTier.White;
    
    if (loadout) weaponTiers[loadout.weapon] = loadout.weaponTier;
    // If default (no loadout), override Snowball to White
    else weaponTiers[WeaponType.Snowball] = ItemTier.White;

    return {
        gamePhase: 'menu', 
        inBunker: false,
        bunkerPlayerPos: { ...BUNKER_ZONES.SPAWN },
        playerWorldPos: { ...mapData.playerStart },
        activeBunkers: mapData.activeBunkers,
        worldPois: mapData.worldPois,
        unlockedBunkers: new Map(),
        bunkerLootWaves: new Map(),
        activeBunkerIndex: -1,
        medicUsedWaves: -1,
        healingState: { active: false, endTime: 0, nextTick: 0 },
        transferState: { active: false, startTime: 0, accumulator: 0, target: 0 },
        bossState: { active: false, tier: null, readyToExtract: false, summonRequested: false },
        extractionProgress: 0,
        summoningProgress: 0,
        exitAnim: { active: false, offset: { x: 0, y: 0 }, t: 0 },
        player: {
            pos: { ...mapData.playerStart }, velocity: { x: 0, y: 0 }, hp: playerMaxHp, maxHp: playerMaxHp, coins: 0, keys: 1,
            weapon: initialWeapon,
            weaponTiers: weaponTiers,
            maxTiers: { ...weaponTiers },
            inventory: [],
            equippedGear: initialGear,
            ownedWeapons: [initialWeapon], lastShotTime: 0, reloadingUntil: 0, ammo: balance.weapons[initialWeapon].magSize, angle: 0, ammoType: AmmoType.Standard, unlockedAmmo: new Set([AmmoType.Standard]),
            reviving: false, reviveProgress: 0, invulnerableUntil: 0, lastMedkitWave: 0,
            lastUnarmedTime: 0
        },
        ammoProcCooldowns: new Map(),
        enemies: [], projectiles: [], particles: [], loot: [], floatingTexts: [], turrets: [], decoys: [], worldMedkits: [], worldKeys: [], magicDrops: [], clones: [], puddles: [],
        reinforcements: [], mines: [],
        camera: { x: 0, y: 0 }, screenShake: 0, snow: snow,
        gameTime: 0, wave: 1, waveTimer: balance.enemies.waveDuration * 1.5, nextSpawnTime: 0, depositedCoins: 0, hordeMode: { active: false, timeLeft: 0 },
        isAutoFiring: false,
        isMobile: isMobile,
        inputs: { 
            keys: new Set(), 
            mouse: { x: 0, y: 0 },
            mobile: {
                active: false,
                moveVec: {x:0, y:0},
                aimVec: {x:0, y:0},
                isFiring: false,
                joysticks: {
                    left: { origin: {x:0,y:0}, current: {x:0,y:0}, active: false, id: null },
                    right: { origin: {x:0,y:0}, current: {x:0,y:0}, active: false, id: null }
                }
            } 
        }
    };
};

export const updateGame = (state: GameState, balance: GameBalance, dt: number) => {
    state.gameTime += dt;
    // Calculate tick factor normalized to 60fps (16.66ms)
    // if dt = 33ms (30fps), tick = 2.0 (move twice as far per frame)
    const tick = dt / 16.667; 
    
    // Rotation speed: 360 deg (2PI) in 0.5s => 4PI rad/s
    const rotationSpeed = (4 * Math.PI) * (dt / 1000);

    // Reset auto-firing state for this frame
    state.isAutoFiring = false;

    const p = state.player;
    const SPEED_SCALE = 0.25; // Boosted from 0.1 to match high-fps feel
    const isPlaying = state.gamePhase === 'playing';

    if (state.loot.length < LOOT_CONFIG.SPAWNING.MAX_PRESENTS) spawnLoot(state, LOOT_CONFIG.SPAWNING.BATCH_SIZE, true);

    // UNARMED LOGIC (Auto-Equip White Snowball)
    if (isPlaying) {
        if (!p.weapon) {
            if (!p.lastUnarmedTime) p.lastUnarmedTime = state.gameTime;
            // 3 Seconds Wait
            if (state.gameTime - p.lastUnarmedTime > 3000) {
                p.weapon = WeaponType.Snowball;
                p.weaponTiers[WeaponType.Snowball] = ItemTier.White;
                p.ammo = balance.weapons[WeaponType.Snowball].magSize;
                p.lastUnarmedTime = 0;
                addFloatingText(state, p.pos, "FOUND SNOWBALL", '#fff');
            }
        } else {
            p.lastUnarmedTime = 0;
        }
    }

    // Menu / Game Over / Victory Logic (Visuals Only)
    if (state.gamePhase === 'menu' || state.gamePhase === 'intro' || state.gamePhase === 'game_over' || state.gamePhase === 'victory') {
        state.particles.forEach(p => { 
            p.pos.x += p.velocity.x * tick; 
            p.pos.y += p.velocity.y * tick; 
            p.life -= 0.02 * tick; 
            if (p.life <= 0) p.dead = true; 
        });
        state.particles = state.particles.filter(p => !p.dead);
        // Intro enemies wander
        if (state.gamePhase === 'intro') {
             state.enemies.forEach(enemy => {
                 // Wander Logic
                 if (!enemy.wanderTarget || distance(enemy.pos, enemy.wanderTarget) < 20) { const a = Math.random() * Math.PI * 2; const d = Math.random() * 300; enemy.wanderTarget = { x: enemy.spawnOrigin.x + Math.cos(a) * d, y: enemy.spawnOrigin.y + Math.sin(a) * d }; }
                 const moveVec = normalize({ x: enemy.wanderTarget.x - enemy.pos.x, y: enemy.wanderTarget.y - enemy.pos.y });
                 enemy.pos.x += moveVec.x * balance.enemies.types[enemy.type].speed * SPEED_SCALE * 0.5 * tick;
                 enemy.pos.y += moveVec.y * balance.enemies.types[enemy.type].speed * SPEED_SCALE * 0.5 * tick;
             });
        }
        
        // Update Snow (Background)
        state.snow.forEach((flake, i) => { 
            flake.y += 4.0 * tick; 
            flake.x += Math.sin(Date.now() / 2000 + i) * 1.5 * tick; 
            // Screen wrap logic not needed in state, handled by renderer modulo, but we must update state
        });
        return;
    }

    // Update Snow (Playing)
    const movingDown = p.velocity.y > 0.5; 
    const snowSpeed = movingDown ? 2.5 : 4.0; 
    state.snow.forEach((flake, i) => { 
        flake.y += snowSpeed * tick; 
        flake.x += Math.sin(Date.now() / 2000 + i) * 1.5 * tick; 
    });

    // Global Healing Logic (Works in World and Bunker)
    if (isPlaying && state.healingState.active) {
        if (state.gameTime > state.healingState.endTime) state.healingState.active = false;
        else if (state.gameTime > state.healingState.nextTick) { 
            state.healingState.nextTick = state.gameTime + 1000; 
            if (p.hp < p.maxHp) {
                p.hp = Math.min(p.hp + (p.maxHp * 0.05), p.maxHp); 
                addFloatingText(state, { x: p.pos.x, y: p.pos.y - 20 }, "❤️", '#ef4444', 1.0);
            }
        }
    }

    // Global Interaction Logic (Presents, Keys, Magic, etc.)
    // Moved out of "else" so it works in bunkers too
    if (isPlaying) {
        // Present Opening Logic
        state.loot.forEach(l => {
            if (l.type === 'present' && !l.dead) {
                if (distance(p.pos, l.pos) < balance.player.pickupRadius) {
                    l.pickupProgress += dt / 1000;
                    if (l.pickupProgress >= balance.player.pickupTime) {
                        // Open
                        l.pickupProgress = 0;
                        if (l.contents) {
                            
                            // Find non-overlapping position below player
                            const searchCenter = { x: p.pos.x, y: p.pos.y + 50 };
                            let foundPos = { ...searchCenter };
                            let found = false;
                            
                            for(let r=0; r<=60; r+=20) {
                                const steps = r===0 ? 1 : 8;
                                for(let i=0; i<steps; i++) {
                                    const theta = (i/steps) * Math.PI * 2;
                                    const test = { x: searchCenter.x + Math.cos(theta)*r, y: searchCenter.y + Math.sin(theta)*r };
                                    const overlap = state.loot.some(other => !other.dead && other.id !== l.id && distance(other.pos, test) < 30);
                                    if(!overlap) {
                                        foundPos = test;
                                        found = true;
                                        break;
                                    }
                                }
                                if(found) break;
                            }
                            
                            l.pos = foundPos;

                            if (l.contents.type === 'weapon_drop') {
                                l.type = 'weapon_drop';
                                l.weaponType = l.contents.weaponType;
                                l.tier = l.contents.tier;
                                l.color = l.contents.color;
                                l.label = l.contents.label;
                            } else if (l.contents.type === 'key') {
                                // Turn into world key
                                l.dead = true;
                                state.worldKeys.push({
                                    id: Math.random().toString(),
                                    pos: { ...l.pos },
                                    velocity: {x:0, y:0},
                                    radius: 15,
                                    rotation: 0,
                                    dead: false
                                });
                                addFloatingText(state, l.pos, "KEY FOUND", '#facc15');
                            } else {
                                l.type = 'item_drop';
                                // Important: Assign the specific label (e.g., "Armor") to the loot entity
                                l.label = l.contents.label; 
                            }
                            addParticle(state, l.pos, '#ffffff', 'spark', 10, 3);
                        }
                    }
                } else {
                    l.pickupProgress = Math.max(0, l.pickupProgress - dt / 1000);
                }
            }
        });

        // World Keys Pickup
        state.worldKeys = state.worldKeys.filter(k => {
             if (distance(k.pos, p.pos) < balance.player.radius + k.radius) {
                 p.keys++;
                 addFloatingText(state, k.pos, "+1 KEY", '#facc15');
                 return false;
             }
             return true;
        });
        
        // Magic Pickup
        state.magicDrops = state.magicDrops.filter(m => {
            m.pos.x += m.velocity.x * tick;
            m.pos.y += m.velocity.y * tick;
            m.velocity.x *= 0.9; m.velocity.y *= 0.9;
            
            if (distance(m.pos, p.pos) < balance.player.pickupRadius) {
                 // Check for Elf Hat (+50% Magic)
                 const hasHat = p.equippedGear.some(g => g?.stats?.type === 'elf_hat');
                 const bonus = hasHat ? Math.floor(m.value * 0.5) : 0;
                 
                 p.coins += m.value + bonus;
                 
                 const text = bonus > 0 ? `+${m.value} (+${bonus})` : `+${m.value}`;
                 addFloatingText(state, m.pos, `${text} MAGIC`, m.tier === 'Rare' ? '#c084fc' : m.tier === 'Uncommon' ? '#facc15' : '#22d3ee');
                 if (m.tier === 'Rare') addParticle(state, m.pos, '#c084fc', 'spark', 10, 3);
                 else if (m.tier === 'Uncommon') addParticle(state, m.pos, '#facc15', 'spark', 5, 2);
                 else addParticle(state, m.pos, '#22d3ee', 'spark', 3, 1);
                 return false;
            }
            return true;
        });
        
        // World Medkits Pickup
        state.worldMedkits = state.worldMedkits.filter(m => {
            if (distance(m.pos, p.pos) < balance.player.radius + m.radius + 10 && p.hp < p.maxHp) {
                state.healingState.active = true;
                state.healingState.endTime = state.gameTime + 8000;
                state.healingState.nextTick = state.gameTime;
                return false;
            }
            return true;
        });
    }

    if (state.inBunker && isPlaying) {
        const bPos = state.bunkerPlayerPos;
        
        // --- BUNKER SPAWN LOGIC ---
        // If items haven't been spawned for this bunker visit wave
        const lastLootWave = state.bunkerLootWaves.get(state.activeBunkerIndex);
        if (lastLootWave !== state.wave) {
             state.bunkerLootWaves.set(state.activeBunkerIndex, state.wave);
             
             // 1. Spawn Medkit (Bottom Right: 380, 500)
             state.worldMedkits.push({ id: Math.random().toString(), pos: { x: 380, y: 500 }, velocity: {x:0, y:0}, radius: 10, rotation: 0, dead: false });
             
             // 2. Spawn Loot (Next to it: 300, 500)
             const content = generateLootContent(state.wave);
             state.loot.push({ 
                id: Math.random().toString(), 
                pos: { x: 300, y: 500 }, 
                velocity: {x:0, y:0}, 
                radius: 15, 
                rotation: 0, 
                dead: false, 
                type: 'present', 
                pickupProgress: 0, 
                contents: content 
            });
        }
        
        const move = { x: 0, y: 0 };
        if (state.inputs.keys.has('w')) move.y -= 1; if (state.inputs.keys.has('s')) move.y += 1; if (state.inputs.keys.has('a')) move.x -= 1; if (state.inputs.keys.has('d')) move.x += 1;
        
        let normMove = normalize(move);
        if (state.isMobile && state.inputs.mobile.joysticks.left.active) {
            normMove = state.inputs.mobile.moveVec;
        }

        bPos.x += normMove.x * balance.player.speed * SPEED_SCALE * 0.8 * tick; 
        bPos.y += normMove.y * balance.player.speed * SPEED_SCALE * 0.8 * tick;
        bPos.x = Math.max(balance.player.radius, Math.min(BUNKER_INT_SIZE.w - balance.player.radius, bPos.x)); bPos.y = Math.max(balance.player.radius, Math.min(BUNKER_INT_SIZE.h - balance.player.radius, bPos.y));
        p.pos = { ...bPos };
        
        // In Bunker: Aim in direction of movement
        if (Math.abs(normMove.x) > 0.001 || Math.abs(normMove.y) > 0.001) {
             const targetAngle = Math.atan2(normMove.y, normMove.x);
             p.angle = rotateTowards(p.angle, targetAngle, rotationSpeed);
        } else {
             // Or mouse if on PC
             if (!state.isMobile) {
                const worldMouse = { x: state.inputs.mouse.x + state.camera.x, y: state.inputs.mouse.y + state.camera.y };
                const targetAngle = Math.atan2(worldMouse.y - p.pos.y, worldMouse.x - p.pos.x);
                p.angle = rotateTowards(p.angle, targetAngle, rotationSpeed);
             }
        }

        if (distance(bPos, BUNKER_ZONES.EXIT) < BUNKER_ZONES.EXIT.radius) {
            state.inBunker = false;
            // Exit to the specific active bunker
            const bunkerPos = state.activeBunkers[state.activeBunkerIndex];
            p.pos = { x: bunkerPos.x - 120, y: bunkerPos.y + 0 }; state.playerWorldPos = { ...p.pos };
        }

    } else {
        // Updated Collision with Active Bunkers from State
        if (isPlaying) { 
             for (let i = 0; i < state.activeBunkers.length; i++) {
                 resolveRectCollision(p.pos, balance.player.radius, {x: state.activeBunkers[i].x, y: state.activeBunkers[i].y}, 120, 80); 
             }
        }
        
        // --- TRANSFER LOGIC ---
        if (isPlaying && state.transferState.active) {
            const distToSleigh = distance(p.pos, POI_LOCATIONS.SLEIGH);
            const currentTotal = state.depositedCoins;
            const target = state.transferState.target;

            // Stop if too far or empty wallet or already full
            if (distToSleigh > 800 || p.coins <= 0 || currentTotal >= target) { 
                state.transferState.active = false; 
                addFloatingText(state, p.pos, "TRANSFER COMPLETE", '#22c55e'); 
            } else {
                const timeActive = (state.gameTime - state.transferState.startTime) / 1000;
                const baseRate = 5 * Math.pow(1.08, timeActive); 
                state.transferState.accumulator += baseRate * (dt / 1000);
                if (state.transferState.accumulator >= 1) {
                    const transferAmount = Math.floor(state.transferState.accumulator);
                    state.transferState.accumulator -= transferAmount;
                    
                    // Cap at target
                    const actualTransfer = Math.min(p.coins, transferAmount, target - currentTotal);
                    
                    if (actualTransfer > 0) { 
                        p.coins -= actualTransfer; 
                        state.depositedCoins += actualTransfer; 
                        if (Math.random() > 0.5) addParticle(state, POI_LOCATIONS.SLEIGH, '#fbbf24', 'spark', 1, 2); 
                    } else { 
                        state.transferState.active = false; 
                    }
                }
            }
        }
        
        // --- BOSS SUMMONING LOGIC ---
        if (isPlaying && state.bossState.summonRequested && !state.bossState.active && !state.bossState.readyToExtract) {
            const { bronze, silver, gold } = balance.economy.sleighThresholds; 
            const total = state.depositedCoins; 
            
            let tierReached: 'Bronze' | 'Silver' | 'Gold' | null = null; 
            if (total >= gold) tierReached = 'Gold'; 
            else if (total >= silver) tierReached = 'Silver'; 
            else if (total >= bronze) tierReached = 'Bronze';

            if (tierReached) {
                 const d = distance(p.pos, POI_LOCATIONS.SLEIGH);
                 const summonRadius = balance.player.pickupRadius * 1.5; 
                 
                 if (d < summonRadius) {
                     state.summoningProgress += dt / 1000;
                     if (state.summoningProgress >= balance.player.pickupTime * 3) {
                         // SUMMON BOSS
                         state.bossState.active = true; 
                         state.bossState.tier = tierReached; 
                         state.bossState.readyToExtract = false; 
                         state.bossState.summonRequested = false;
                         state.summoningProgress = 0;

                         addFloatingText(state, { x: p.pos.x + 264, y: p.pos.y }, "Not so fast!", '#ef4444', 3.0);

                         const sx = POI_LOCATIONS.SLEIGH.x; const sy = POI_LOCATIONS.SLEIGH.y;
                         let count = 1; if (tierReached === 'Silver') count = 2; if (tierReached === 'Gold') count = 3;
                         
                         const spawnX = sx + 1250;
                         
                         for(let i=0; i<count; i++) { 
                             const spawnY = sy + (i - (count-1)/2) * 200;
                             state.enemies.push({ id: Math.random().toString(), pos: { x: spawnX, y: spawnY }, velocity: {x:0,y:0}, radius: 88, rotation: 0, dead: false, type: 'Boss' as any, hp: 3000, maxHp: 3000, attackCooldown: 0, slowedUntil: 0, poisonDots: [], spawnOrigin: {x: spawnX, y: spawnY} }); 
                         }
                     }
                 } else {
                     // WALK AWAY LOGIC
                     state.summoningProgress = Math.max(0, state.summoningProgress - (dt / 1000));
                     // If progress hits 0 after having started (or just never started), cancel the request
                     if (state.summoningProgress <= 0) {
                         state.bossState.summonRequested = false;
                     }
                 }
            } else {
                state.summoningProgress = 0;
                // Safety reset if tier lost somehow
                state.bossState.summonRequested = false;
            }
        } else {
            // Not requested or active
            if (!state.bossState.summonRequested) state.summoningProgress = 0;
        }

        // --- EXTRACTION / EXIT LOGIC ---
        if (state.exitAnim.active) {
            state.exitAnim.t += dt;
            const tSec = state.exitAnim.t / 1000;
            const maxSpeed = balance.player.speed * SPEED_SCALE * 3; 
            let currentSpeed = 0;
            const rampUpTime = 3.0; 

            if (tSec < rampUpTime) {
                currentSpeed = maxSpeed * (tSec / rampUpTime);
            } else {
                currentSpeed = maxSpeed;
            }
            
            state.exitAnim.offset.x += currentSpeed * tick;
            state.exitAnim.offset.y -= currentSpeed * tick;
            
            p.pos.x = POI_LOCATIONS.SLEIGH.x + state.exitAnim.offset.x - 40; 
            p.pos.y = POI_LOCATIONS.SLEIGH.y + state.exitAnim.offset.y; 
            
            if (tSec > 0.5) {
                addParticle(state, { x: POI_LOCATIONS.SLEIGH.x + state.exitAnim.offset.x - 70, y: POI_LOCATIONS.SLEIGH.y + state.exitAnim.offset.y + 20 }, '#facc15', 'spark', 5, 2);
            }
            
            if (state.exitAnim.t > 5200) { 
                 state.gamePhase = 'victory';
            }
        } else if (isPlaying && state.bossState.readyToExtract) {
            const d = distance(p.pos, POI_LOCATIONS.SLEIGH);
            const extractRadius = balance.player.pickupRadius * 1.5;
            const requiredTime = balance.player.pickupTime * 3;
            
            if (d < extractRadius) {
                state.extractionProgress += dt / 1000;
                if (state.extractionProgress >= requiredTime) {
                    state.exitAnim.active = true;
                }
            } else {
                state.extractionProgress = Math.max(0, state.extractionProgress - (dt / 1000));
            }
        }

        const effectiveHordeMode = state.hordeMode.active || state.transferState.active;
        const timeScale = effectiveHordeMode ? 2 : 1; 

        state.waveTimer -= (dt / 1000) * timeScale;
        
        // --- WAVE TIMING & SPAWN RULES ---
        const baseDuration = balance.enemies.waveDuration; // 30s
        const totalWaveDuration = baseDuration * 1.5; // 45s
        
        // Quiet Period is the last 0.5x duration (15s)
        const quietThreshold = totalWaveDuration - baseDuration; 
        
        // Active Spawn Phase is the first 1x duration (30s)
        const isSpawnPhase = (state.waveTimer > quietThreshold) || effectiveHordeMode; 
        
        if (isSpawnPhase) {
            if (state.gameTime > state.nextSpawnTime) { 
                spawnEnemy(state, balance); 
                const ramp = Math.pow(balance.enemies.spawnRateRamp, state.wave - 1); 
                state.nextSpawnTime = state.gameTime + (balance.enemies.spawnRateInitial * ramp) / timeScale; 
            }
        }

        const waveClear = !isSpawnPhase && state.enemies.length === 0 && !effectiveHordeMode && !state.exitAnim.active;
        if ((state.waveTimer <= 0 || waveClear) && !state.exitAnim.active) { 
            state.wave++; 
            state.waveTimer = totalWaveDuration; 
            
            // --- WAVE START BURST ---
            // Spawn 5s worth of enemies immediately
            const ramp = Math.pow(balance.enemies.spawnRateRamp, state.wave - 1);
            const currentSpawnRate = (balance.enemies.spawnRateInitial * ramp) / timeScale;
            const burstAmount = Math.floor(5000 / currentSpawnRate);
            
            for(let k=0; k<burstAmount; k++) spawnEnemy(state, balance);
            
            // Resume normal spawning schedule after the burst
            state.nextSpawnTime = state.gameTime + currentSpawnRate;

            const DESPAWN_RADIUS = 1100;
            state.loot = state.loot.filter(l => {
                if (l.type !== 'present') return true; 
                if (distance(l.pos, p.pos) > DESPAWN_RADIUS) return false;
                return true;
            });

            // REINFORCEMENTS LOGIC: Spawn AI Allies
            const reinforceCount = p.equippedGear.filter(g => g?.stats?.type === 'reinforce').length;
            if (reinforceCount > 0) {
                // Spawn allies offscreen
                for (let r=0; r<reinforceCount * state.wave; r++) { // +1 per wave per item
                    // Just spawn 1 per item per wave increment, accumulating? 
                    // Prompt: "Calls a reinforcement every new wave... +1 each wave" implies cumulative or just 1 new one.
                    // "Clone is now Reinforce. It calls a reinforcement every new wave... +1 each wave"
                    // Let's interpret as: Spawn Wave # amount of reinforcements? No, that's too many.
                    // Let's spawn 1 reinforcement entity per equipped item at start of wave.
                    // AND they persist? No, "calls a reinforcement". 
                    // Let's spawn 1 per item.
                    
                    const angle = Math.random() * Math.PI * 2;
                    const spawnDist = 900;
                    const sPos = { x: p.pos.x + Math.cos(angle)*spawnDist, y: p.pos.y + Math.sin(angle)*spawnDist };
                    
                    state.reinforcements.push({
                        id: Math.random().toString(),
                        pos: sPos,
                        velocity: {x:0, y:0},
                        radius: 22,
                        rotation: 0,
                        dead: false,
                        hp: 200,
                        maxHp: 200,
                        weapon: p.weapon || WeaponType.AR, // Copy player weapon
                        lastShotTime: 0,
                        immuneUntil: state.gameTime + 10000, // Immune while walking in? "Briefly immune until they arrive within 4 player heights"
                        targetOffset: { x: (Math.random()-0.5)*200, y: (Math.random()-0.5)*200 } // Patrol offset
                    });
                }
                addFloatingText(state, p.pos, "REINFORCEMENTS!", '#3b82f6');
            }
        }
        
        if (isPlaying) {
            // Gear Logic
            if (p.reviving) {
                p.reviveProgress += dt / 1000;
                if (p.reviveProgress >= balance.player.pickupTime) {
                    p.reviving = false; p.hp = p.maxHp; p.invulnerableUntil = state.gameTime + 5000;
                    addFloatingText(state, p.pos, "REVIVED!", '#ffffff');
                    const penIndex = p.equippedGear.findIndex(g => g?.type === 'gear' && g.stats?.type === 'pen');
                    if (penIndex !== -1) p.equippedGear[penIndex] = null;
                }
            }
            
            // Active Gear Loop
            p.equippedGear.forEach(g => {
                if (g && g.stats) {
                    if (!g.stats.lastProc || state.gameTime > g.stats.lastProc) {
                        if (g.stats.type === 'turret') {
                            state.turrets.push({ id: Math.random().toString(), pos: { ...p.pos }, velocity: { x: 0, y: 0 }, radius: 15, rotation: 0, dead: false, fireCooldown: 0 });
                            g.stats.lastProc = state.gameTime + 25000; addFloatingText(state, p.pos, "TURRET DEPLOYED", '#60a5fa');
                        } else if (g.stats.type === 'snowman') {
                            state.decoys.push({ id: Math.random().toString(), pos: { ...p.pos }, velocity: { x: 0, y: 0 }, radius: 15, rotation: 0, dead: false, hp: 1000, maxHp: 1000 });
                            g.stats.lastProc = state.gameTime + 25000; addFloatingText(state, p.pos, "SNOWMAN DEPLOYED", '#fff');
                        } else if (g.stats.type === 'mines') { // Replaces Poison/Beaker
                            state.mines.push({ id: Math.random().toString(), pos: { ...p.pos }, velocity: {x:0,y:0}, radius: 10, rotation: 0, dead: false, triggerRadius: 30, blastRadius: 100, damage: 200, armed: false });
                            // Arm after 1s
                            setTimeout(() => { const m = state.mines[state.mines.length-1]; if(m) m.armed = true; }, 1000);
                            g.stats.lastProc = state.gameTime + 6000;
                        } else if (g.stats.type === 'regen') { // Replaces Medkit
                            if (p.hp < p.maxHp) {
                                p.hp = Math.min(p.hp + 1, p.maxHp);
                                // No floating text spam for 1hp/sec
                            }
                            g.stats.lastProc = state.gameTime + 1000; 
                        } else if (g.stats.type === 'tesla') {
                            // Fires Red Arc Taser every 5s
                            handleShoot(state, balance, 'player', p.pos, p.angle); // Reuse logic? No, create specific effect.
                            // Trigger Arc Effect manually to force weapon type
                            const weaponStats = balance.weapons[WeaponType.ArcTaser];
                            // Find target
                            let closest: Enemy | null = null;
                            let minDist = weaponStats.range;
                            state.enemies.forEach(e => {
                                const d = distance(p.pos, e.pos);
                                if (d < minDist) { minDist = d; closest = e; }
                            });
                            
                            if (closest) {
                                // Visual
                                addParticle(state, p.pos, '#f87171', 'spark', 5, 2);
                                // Hack: Call handleShoot with modified weapon prop in balance temporarily?
                                // Better: Just replicate simple hit logic or projectile
                                // Simple: Instant damage to closest
                                closest.hp -= 30;
                                addParticle(state, closest.pos, '#f87171', 'spark', 5, 2);
                                if (closest.hp <= 0) { closest.dead = true; p.coins += balance.enemies.types[closest.type].score; }
                                // Draw Line (Visual handled in renderer if we add a "beam" projectile that dies instantly)
                                state.projectiles.push({
                                    id: Math.random().toString(), pos: p.pos, velocity: {x:0,y:0}, radius: 1, rotation: 0, dead: true, damage: 0, rangeRemaining: 0,
                                    color: '#f87171', tier: ItemTier.Red, source: 'player', ammoType: AmmoType.Standard
                                }); 
                                // Actually, handleShoot logic for ArcTaser is complex. Let's just override weapon temporarily.
                                const oldW = p.weapon;
                                p.weapon = WeaponType.ArcTaser;
                                p.weaponTiers[WeaponType.ArcTaser] = ItemTier.Red; // Strong
                                handleShoot(state, balance, 'player');
                                p.weapon = oldW; // Restore
                            }
                            g.stats.lastProc = state.gameTime + 5000;
                        } else if (g.stats.type === 'sleighbells') {
                            // Firebombs straight line every 25s
                            // Find best line
                            const testAngles = 16;
                            let bestAngle = 0;
                            let maxHits = 0;
                            for(let i=0; i<testAngles; i++) {
                                const a = (i / testAngles) * Math.PI * 2;
                                let hits = 0;
                                // Raycast check 800px
                                for(let d=0; d<800; d+=50) {
                                    const ck = { x: p.pos.x + Math.cos(a)*d, y: p.pos.y + Math.sin(a)*d };
                                    state.enemies.forEach(e => {
                                        if (distance(ck, e.pos) < e.radius + 30) hits++;
                                    });
                                }
                                if (hits > maxHits) { maxHits = hits; bestAngle = a; }
                            }
                            
                            // Fire 5 grenades along line
                            for(let k=1; k<=5; k++) {
                                const dist = k * 150;
                                const target = { x: p.pos.x + Math.cos(bestAngle)*dist, y: p.pos.y + Math.sin(bestAngle)*dist };
                                // Spawn Grenade Projectile targeting that spot
                                const flightTime = dist / 20; // speed 20
                                state.projectiles.push({
                                    id: Math.random().toString(),
                                    pos: { ...p.pos },
                                    velocity: { x: Math.cos(bestAngle)*20, y: Math.sin(bestAngle)*20 },
                                    radius: 6, rotation: 0, dead: false, damage: 0, rangeRemaining: dist,
                                    color: '#ef4444', tier: ItemTier.Red, source: 'player', ammoType: AmmoType.Standard,
                                    weaponType: WeaponType.GrenadeLauncher, isGrenade: true
                                });
                            }
                            addFloatingText(state, p.pos, "SLEIGHBELLS!", '#fca5a5');
                            g.stats.lastProc = state.gameTime + 25000;
                        }
                    }
                }
            });
        }

        if (isPlaying && !p.reviving && !state.exitAnim.active) {
            const move = { x: 0, y: 0 };
            if (state.inputs.keys.has('w')) move.y -= 1; if (state.inputs.keys.has('s')) move.y += 1; if (state.inputs.keys.has('a')) move.x -= 1; if (state.inputs.keys.has('d')) move.x += 1;
            
            let normMove = normalize(move);
            if (state.isMobile && state.inputs.mobile.joysticks.left.active) {
                normMove = state.inputs.mobile.moveVec;
            }
            
            const hasShoes = p.equippedGear.some(g => g?.stats?.type === 'speed_shoes');
            let speedMod = hasShoes ? 2.0 : 1.0;
            if (balance.cheats?.speedy) speedMod += 2.0;

            // Velocity is "pixels per 60hz frame"
            p.velocity = { x: normMove.x * balance.player.speed * SPEED_SCALE * speedMod, y: normMove.y * balance.player.speed * SPEED_SCALE * speedMod };
            // Apply tick
            p.pos.x += p.velocity.x * tick; 
            p.pos.y += p.velocity.y * tick;
            
            p.pos.x = Math.max(0, Math.min(MAP_SIZE, p.pos.x)); p.pos.y = Math.max(0, Math.min(MAP_SIZE, p.pos.y));
            
            const distToTree = distance(p.pos, POI_LOCATIONS.TREE);
            if (distToTree < 40 + balance.player.radius) { const pushDir = normalize({ x: p.pos.x - POI_LOCATIONS.TREE.x, y: p.pos.y - POI_LOCATIONS.TREE.y }); p.pos.x = POI_LOCATIONS.TREE.x + pushDir.x * (40 + balance.player.radius); p.pos.y = POI_LOCATIONS.TREE.y + pushDir.y * (40 + balance.player.radius); }
            // Dynamic POI Collisions
            for (const poi of state.worldPois) { 
                if (poi.width && poi.height) resolveRectCollision(p.pos, balance.player.radius, poi, poi.width, poi.height); 
                else { const r = poi.radius || 100; const dist = distance(p.pos, poi); if (dist < r + balance.player.radius) { const pushDir = normalize({ x: p.pos.x - poi.x, y: p.pos.y - poi.y }); p.pos.x = poi.x + pushDir.x * (r + balance.player.radius); p.pos.y = poi.y + pushDir.y * (r + balance.player.radius); } } 
            }
            
            // --- AUTO AIM & AUTO FIRE LOGIC ---
            // 1. Identify closest enemy that is alive, onscreen, and in range.
            const weaponRange = p.weapon ? balance.weapons[p.weapon].range : 0;
            const viewW = window.innerWidth;
            const viewH = window.innerHeight;
            const cam = state.camera;
            
            let targetEnemy: Enemy | null = null;
            let minEnemyDist = weaponRange; // Only consider within range

            if (p.weapon) { // Only aim if has weapon
                if (p.weapon === WeaponType.Sniper) {
                    // SNIPER LOGIC: Highest HP in Range
                    let maxHp = -1;
                    for (const enemy of state.enemies) {
                        if (enemy.dead) continue;
                        
                        // Screen bounds check
                        if (enemy.pos.x < cam.x - 100 || enemy.pos.x > cam.x + viewW + 100 || 
                            enemy.pos.y < cam.y - 100 || enemy.pos.y > cam.y + viewH + 100) continue;

                        const d = distance(p.pos, enemy.pos);
                        if (d <= weaponRange) {
                            if (enemy.hp > maxHp) {
                                maxHp = enemy.hp;
                                targetEnemy = enemy;
                            }
                        }
                    }
                } else {
                    // STANDARD LOGIC: Closest in Range
                    for (const enemy of state.enemies) {
                        if (enemy.dead) continue;
                        
                        // Screen bounds check
                        if (enemy.pos.x < cam.x - 100 || enemy.pos.x > cam.x + viewW + 100 || 
                            enemy.pos.y < cam.y - 100 || enemy.pos.y > cam.y + viewH + 100) continue;

                        const d = distance(p.pos, enemy.pos);
                        if (d <= minEnemyDist) {
                            minEnemyDist = d;
                            targetEnemy = enemy;
                        }
                    }
                }
            }

            if (targetEnemy) {
                // Auto Face Enemy
                const targetAngle = Math.atan2(targetEnemy.pos.y - p.pos.y, targetEnemy.pos.x - p.pos.x);
                p.angle = rotateTowards(p.angle, targetAngle, rotationSpeed);
                // Auto Fire
                handleShoot(state, balance);
                state.isAutoFiring = true;
            } else {
                // No enemy? Auto Face Movement Direction
                if (Math.abs(p.velocity.x) > 0.1 || Math.abs(p.velocity.y) > 0.1) {
                    const targetAngle = Math.atan2(p.velocity.y, p.velocity.x);
                    p.angle = rotateTowards(p.angle, targetAngle, rotationSpeed);
                }
                // If stopped and no enemy, keep current facing angle
            }
        }

        // Enemy Updates (Spawn/Move/Attack)
        updateEnemies(state, balance, dt, tick);

        // Reinforcement AI
        state.reinforcements.forEach(r => {
            if (r.dead) return;
            // 1. Move to target offset from player
            const targetPos = { x: p.pos.x + r.targetOffset.x, y: p.pos.y + r.targetOffset.y };
            
            // Check immunity
            if (state.gameTime < r.immuneUntil) {
                if (distance(r.pos, p.pos) < 176) r.immuneUntil = 0; // Remove immunity if close
            }

            const dist = distance(r.pos, targetPos);
            if (dist > 20) {
                const dir = normalize({ x: targetPos.x - r.pos.x, y: targetPos.y - r.pos.y });
                r.pos.x += dir.x * balance.player.speed * SPEED_SCALE * tick;
                r.pos.y += dir.y * balance.player.speed * SPEED_SCALE * tick;
            }

            // 2. Shoot
            if (isPlaying && state.gameTime > r.lastShotTime + 500) { // Slower fire rate
                let closest: Enemy | null = null;
                let minDist = 600;
                state.enemies.forEach(e => {
                    const d = distance(r.pos, e.pos);
                    if (d < minDist && !e.dead) { minDist = d; closest = e; }
                });

                if (closest) {
                    const angle = Math.atan2(closest.pos.y - r.pos.y, closest.pos.x - r.pos.x);
                    r.rotation = angle;
                    // Mock shoot function
                    const muzzle = { x: r.pos.x + Math.cos(angle)*20, y: r.pos.y + Math.sin(angle)*20 };
                    state.projectiles.push({
                        id: Math.random().toString(), pos: muzzle, velocity: { x: Math.cos(angle)*20, y: Math.sin(angle)*20 },
                        radius: 4, rotation: angle, dead: false, damage: 15, rangeRemaining: 600, color: '#60a5fa', tier: ItemTier.Grey,
                        source: 'reinforcement', ammoType: AmmoType.Standard, weaponType: r.weapon
                    });
                    r.lastShotTime = state.gameTime;
                }
            }
        });
        state.reinforcements = state.reinforcements.filter(r => r.hp > 0);

        state.turrets.forEach(turret => {
            turret.rotation += (Math.PI * 2 / 3000) * dt; 
            if (turret.rotation > Math.PI * 2) turret.rotation -= Math.PI * 2;
            if (state.gameTime > turret.fireCooldown) {
                turret.fireCooldown = state.gameTime + balance.turret.fireRate;
                const angle = turret.rotation;
                const muzzlePos = { x: turret.pos.x + Math.cos(angle) * 20, y: turret.pos.y + Math.sin(angle) * 20 };
                state.projectiles.push({ id: Math.random().toString(), pos: muzzlePos, velocity: { x: Math.cos(angle) * balance.turret.projectileSpeed, y: Math.sin(angle) * balance.turret.projectileSpeed }, radius: 4, rotation: angle, dead: false, damage: balance.turret.damage, rangeRemaining: balance.turret.range, color: '#60a5fa', tier: ItemTier.Blue, source: 'turret', ammoType: AmmoType.Standard, weaponType: WeaponType.Flamethrower });
            }
        });

        // Mines Logic
        state.mines = state.mines.filter(m => {
            if (m.dead) return false;
            if (!m.armed) return true;
            
            // Check collision
            let triggered = false;
            for (const e of state.enemies) {
                if (distance(m.pos, e.pos) < m.triggerRadius + e.radius) {
                    triggered = true;
                    break;
                }
            }
            
            if (triggered) {
                // Explode
                addParticle(state, m.pos, '#ffffff', 'explosion', 1, 1);
                addParticle(state, m.pos, '#ef4444', 'smoke', 8, 4);
                state.screenShake += 5;
                state.enemies.forEach(e => {
                    if (distance(e.pos, m.pos) < m.blastRadius + e.radius) {
                        e.hp -= m.damage;
                        if (e.hp <= 0) { e.dead = true; p.coins += balance.enemies.types[e.type].score; }
                    }
                });
                return false;
            }
            return true;
        });

        state.decoys = state.decoys.filter(d => {
            if (d.hp <= 0) return false;
            if (distance(d.pos, p.pos) > 1320) return false; 
            return true;
        });
        
        state.puddles = state.puddles.filter(pud => {
            if (state.gameTime > pud.endTime) return false;
            if (state.gameTime > pud.nextTick) {
                pud.nextTick = state.gameTime + 1000;
                if (distance(pud.pos, p.pos) < pud.radius) {
                    if (state.gameTime > p.invulnerableUntil && !balance.cheats?.invincible) {
                         p.hp -= 30;
                         addParticle(state, p.pos, '#22c55e', 'smoke', 5);
                    }
                }
                state.enemies.forEach(e => {
                    if (distance(pud.pos, e.pos) < pud.radius) {
                        e.hp -= 30;
                        addParticle(state, e.pos, '#22c55e', 'smoke', 3);
                    }
                });
            }
            return true;
        });
        
        state.clones = state.clones.filter(c => {
            if (c.hp <= 0) return false;
            const target = p.pos;
            const d = distance(c.pos, target);
            if (d > 40) {
                const dir = normalize({ x: target.x - c.pos.x, y: target.y - c.pos.y });
                c.pos.x += dir.x * balance.player.speed * SPEED_SCALE * tick;
                c.pos.y += dir.y * balance.player.speed * SPEED_SCALE * tick;
            }
            c.rotation = p.angle; 
            return true;
        });

        state.worldKeys = state.worldKeys.filter(k => {
             if (distance(k.pos, p.pos) < balance.player.radius + k.radius) {
                 p.keys++;
                 addFloatingText(state, k.pos, "+1 KEY", '#facc15');
                 return false;
             }
             return true;
        });
        
        state.magicDrops = state.magicDrops.filter(m => {
            m.pos.x += m.velocity.x * tick;
            m.pos.y += m.velocity.y * tick;
            m.velocity.x *= 0.9; m.velocity.y *= 0.9;
            
            if (distance(m.pos, p.pos) < balance.player.pickupRadius) {
                 // Check for Elf Hat (+50% Magic)
                 const hasHat = p.equippedGear.some(g => g?.stats?.type === 'elf_hat');
                 const bonus = hasHat ? Math.floor(m.value * 0.5) : 0;
                 p.coins += m.value + bonus;
                 
                 const text = bonus > 0 ? `+${m.value} (+${bonus})` : `+${m.value}`;
                 addFloatingText(state, m.pos, `${text} MAGIC`, m.tier === 'Rare' ? '#c084fc' : m.tier === 'Uncommon' ? '#facc15' : '#22d3ee');
                 if (m.tier === 'Rare') addParticle(state, m.pos, '#c084fc', 'spark', 10, 3);
                 else if (m.tier === 'Uncommon') addParticle(state, m.pos, '#facc15', 'spark', 5, 2);
                 else addParticle(state, m.pos, '#22d3ee', 'spark', 3, 1);
                 return false;
            }
            return true;
        });

        for (let i = state.projectiles.length - 1; i >= 0; i--) {
            const proj = state.projectiles[i];

            // SPECIAL LOGIC: BOOMERANG
            if (proj.boomerang) {
                 const b = proj.boomerang;
                 if (!b.returning) {
                     // Heading out
                     proj.pos.x += proj.velocity.x * tick;
                     proj.pos.y += proj.velocity.y * tick;
                     
                     // Check if reached destination or range exhausted
                     const dTraveled = distance(proj.pos, b.origin);
                     if (dTraveled >= b.distTotal) {
                         b.returning = true;
                     }
                 } else {
                     // Heading back to player
                     const dirToPlayer = normalize({ x: p.pos.x - proj.pos.x, y: p.pos.y - proj.pos.y });
                     const returnSpeed = Math.hypot(proj.velocity.x, proj.velocity.y) * 1.5; // Return faster
                     proj.velocity = { x: dirToPlayer.x * returnSpeed, y: dirToPlayer.y * returnSpeed };
                     proj.pos.x += proj.velocity.x * tick;
                     proj.pos.y += proj.velocity.y * tick;
                     
                     if (distance(proj.pos, p.pos) < 20) {
                         proj.dead = true;
                         // Catch it - replenish ammo immediately
                         if (p.weapon === WeaponType.Boomerang) p.ammo = 1; 
                     }
                 }
                 // Boomerangs spin
                 proj.rotation += 0.3 * tick;
            } else {
                // STANDARD MOVEMENT
                proj.pos.x += proj.velocity.x * tick; 
                proj.pos.y += proj.velocity.y * tick; 
                proj.rangeRemaining -= Math.hypot(proj.velocity.x * tick, proj.velocity.y * tick);
            }
            
            // Death conditions
            if (!proj.boomerang && (proj.rangeRemaining <= 0 || proj.pos.x < 0 || proj.pos.x > MAP_SIZE || proj.pos.y < 0 || proj.pos.y > MAP_SIZE)) { 
                proj.dead = true; 
                
                // GRENADE EXPLOSION
                if (proj.isGrenade) {
                     addParticle(state, proj.pos, '#ffffff', 'explosion', 1, 1);
                     addParticle(state, proj.pos, '#f59e0b', 'smoke', 8, 4);
                     state.screenShake += 10;
                     
                     // Area Damage
                     const explosionRadius = 60; 
                     state.enemies.forEach(e => {
                         if (distance(e.pos, proj.pos) < explosionRadius + e.radius) {
                             e.hp -= 50; // Flat explosion damage
                             addParticle(state, e.pos, '#ff0000', 'blood', 5, 2);
                             if (e.hp <= 0) {
                                e.dead = true; 
                                p.coins += balance.enemies.types[e.type].score; 
                             }
                         }
                     });
                }
                continue; 
            }

            // GRENADES DONT HIT ENEMIES DIRECTLY
            if (proj.isGrenade) continue;

            if (proj.source === 'player' || proj.source === 'turret' || proj.source === 'clone' || proj.source === 'reinforcement') {
                for (const enemy of state.enemies) {
                    // Boomerangs pass through (don't die)
                    if (!enemy.dead && distance(proj.pos, enemy.pos) < enemy.radius + proj.radius + 5) {
                        
                        // If standard projectile, kill it. If boomerang, keep going.
                        if (!proj.boomerang) proj.dead = true;
                        
                        enemy.hp -= proj.damage; 
                        addParticle(state, proj.pos, '#ff0000', 'blood', 3, 1, 5.0); 
                        
                        if (enemy.type !== EnemyType.Boss && !proj.boomerang) { 
                             const knockDir = normalize(proj.velocity); 
                             enemy.pos.x += knockDir.x * 5; 
                             enemy.pos.y += knockDir.y * 5; 
                        }
                        
                        if (enemy.hp <= 0) { 
                            enemy.dead = true; 
                            p.coins += balance.enemies.types[enemy.type].score; 
                            // ... Loot drops logic (keys, medkits, magic) ...
                            if (Math.random() < 0.02) state.worldKeys.push({ id: Math.random().toString(), pos: { ...enemy.pos }, velocity: {x:0, y:0}, radius: 15, rotation: 0, dead: false });
                            if (Math.random() < 0.02) state.worldMedkits.push({ id: Math.random().toString(), pos: { ...enemy.pos }, velocity: {x:0, y:0}, radius: 10, rotation: 0, dead: false });
                            if (Math.random() < 0.02) {
                                const r = Math.random();
                                let val = 20; let tier = 'Common' as any;
                                if (r < 0.15) { val = 200; tier = 'Rare'; }
                                else if (r < 0.50) { val = 50; tier = 'Uncommon'; }
                                const ang = Math.random() * Math.PI * 2;
                                state.magicDrops.push({ id: Math.random().toString(), pos: { ...enemy.pos }, velocity: { x: Math.cos(ang) * 2, y: Math.sin(ang) * 2 }, radius: 10, rotation: 0, dead: false, value: val, tier: tier });
                            }
                        }
                        if (!proj.boomerang) break;
                    }
                }
            } else if (proj.source === 'enemy') {
                if (isPlaying && distance(proj.pos, p.pos) < balance.player.radius + proj.radius && state.gameTime > p.invulnerableUntil && !balance.cheats?.invincible) { 
                    proj.dead = true; state.screenShake += 5; addParticle(state, p.pos, '#ff0000', 'blood', 5, 1, 5.0);
                    const knockDir = normalize(proj.velocity); p.pos.x += knockDir.x * 2; p.pos.y += knockDir.y * 2;
                    p.hp -= proj.damage;
                } else if (isPlaying && distance(proj.pos, p.pos) < balance.player.radius + proj.radius && balance.cheats?.invincible) {
                    proj.dead = true; 
                }

                state.decoys.forEach(d => { if (distance(proj.pos, d.pos) < d.radius + proj.radius) { proj.dead = true; d.hp -= proj.damage; } });
                state.reinforcements.forEach(r => { 
                    // Reinforcement hit
                    if (state.gameTime > r.immuneUntil && distance(proj.pos, r.pos) < r.radius + proj.radius) {
                        proj.dead = true; r.hp -= proj.damage;
                        addParticle(state, r.pos, '#3b82f6', 'blood', 2, 1);
                    }
                });
            }
        }
        state.projectiles = state.projectiles.filter(p => !p.dead);

        if (state.bossState.active) { const livingBosses = state.enemies.filter(e => e.type === EnemyType.Boss).length; if (livingBosses === 0) { state.bossState.active = false; state.bossState.readyToExtract = true; addFloatingText(state, p.pos, "BOSS DEFEATED! EXTRACT!", '#fbbf24'); } }
    }

    if (p.hp <= 0 && !p.reviving) {
        const penIndex = p.equippedGear.findIndex(g => g?.type === 'gear' && g.stats?.type === 'pen');
        if (penIndex !== -1) { p.hp = 1; p.reviving = true; p.reviveProgress = 0; addFloatingText(state, p.pos, "REVIVING...", '#22d3ee'); } 
        else { state.gamePhase = 'game_over'; }
    }

    // Global Cleanup & Updates
    state.loot = state.loot.filter(l => !l.dead);
    state.particles.forEach(p => { p.pos.x += p.velocity.x * tick; p.pos.y += p.velocity.y * tick; p.life -= (dt / 1000); if (p.life <= 0) p.dead = true; });
    state.particles = state.particles.filter(p => !p.dead);
    state.floatingTexts.forEach(t => { t.pos.x += t.velocity.x * tick; t.pos.y += t.velocity.y * tick; t.life -= (dt / 1000); });
    state.floatingTexts = state.floatingTexts.filter(t => t.life > 0);
};