

import { GameState, GameBalance, Vector2, WeaponType, EnemyType, ItemTier, AmmoType, Loot, GearType, Loadout, WorldPOI } from '../types.ts';
import { MAP_SIZE, POI_LOCATIONS, BUNKER_INT_SIZE, BUNKER_ZONES, LOOT_CONFIG } from '../constants.ts';
import { distance, normalize, resolveRectCollision } from '../utils/math.ts';
import { generateMap } from './MapSystem.ts';
import { spawnLoot, generateLootContent } from './LootSystem.ts';
import { handleShoot } from './CombatSystem.ts';
import { spawnEnemy, updateEnemies } from './EnemySystem.ts';
import { addParticle, addFloatingText } from './ParticleSystem.ts';

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

    // Default Configuration
    let initialWeapon = WeaponType.Pistol;
    let initialTier = ItemTier.Grey;
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
            weaponTiers: { 
                [WeaponType.Pistol]: WeaponType.Pistol === initialWeapon ? initialTier : ItemTier.Grey, 
                [WeaponType.Shotgun]: WeaponType.Shotgun === initialWeapon ? initialTier : ItemTier.Grey, 
                [WeaponType.AR]: WeaponType.AR === initialWeapon ? initialTier : ItemTier.Grey, 
                [WeaponType.Flamethrower]: WeaponType.Flamethrower === initialWeapon ? initialTier : ItemTier.Grey 
            },
            maxTiers: { 
                [WeaponType.Pistol]: WeaponType.Pistol === initialWeapon ? initialTier : ItemTier.Grey, 
                [WeaponType.Shotgun]: WeaponType.Shotgun === initialWeapon ? initialTier : ItemTier.Grey, 
                [WeaponType.AR]: WeaponType.AR === initialWeapon ? initialTier : ItemTier.Grey, 
                [WeaponType.Flamethrower]: WeaponType.Flamethrower === initialWeapon ? initialTier : ItemTier.Grey 
            },
            inventory: [],
            equippedGear: initialGear,
            ownedWeapons: [initialWeapon], lastShotTime: 0, reloadingUntil: 0, ammo: balance.weapons[initialWeapon].magSize, angle: 0, ammoType: AmmoType.Standard, unlockedAmmo: new Set([AmmoType.Standard]),
            reviving: false, reviveProgress: 0, invulnerableUntil: 0, lastMedkitWave: 0
        },
        ammoProcCooldowns: new Map(),
        enemies: [], projectiles: [], particles: [], loot: [], floatingTexts: [], turrets: [], decoys: [], worldMedkits: [], worldKeys: [], magicDrops: [], clones: [], puddles: [],
        camera: { x: 0, y: 0 }, screenShake: 0, snow: snow,
        gameTime: 0, wave: 1, waveTimer: balance.enemies.waveDuration * 1.5, nextSpawnTime: 0, depositedCoins: 0, hordeMode: { active: false, timeLeft: 0 },
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

    const p = state.player;
    const SPEED_SCALE = 0.25; // Boosted from 0.1 to match high-fps feel
    const isPlaying = state.gamePhase === 'playing';

    if (state.loot.length < LOOT_CONFIG.SPAWNING.MAX_PRESENTS) spawnLoot(state, LOOT_CONFIG.SPAWNING.BATCH_SIZE, true);

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
                 p.coins += m.value;
                 addFloatingText(state, m.pos, `+${m.value} MAGIC`, m.tier === 'Rare' ? '#c084fc' : m.tier === 'Uncommon' ? '#facc15' : '#22d3ee');
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
        
        if (state.isMobile && state.inputs.mobile.joysticks.right.active) {
            p.angle = Math.atan2(state.inputs.mobile.aimVec.y, state.inputs.mobile.aimVec.x);
        } else {
            const worldMouse = { x: state.inputs.mouse.x + state.camera.x, y: state.inputs.mouse.y + state.camera.y };
            p.angle = Math.atan2(worldMouse.y - p.pos.y, worldMouse.x - p.pos.x);
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
                        } else if (g.stats.type === 'beaker') {
                            state.puddles.push({ id: Math.random().toString(), pos: { ...p.pos }, velocity: {x:0,y:0}, radius: 44, rotation: 0, dead: false, endTime: state.gameTime + 20000, nextTick: 0 });
                            g.stats.lastProc = state.gameTime + 6000;
                        } else if (g.stats.type === 'santa_hat') {
                            const spawnOffset = { x: p.pos.x - 25, y: p.pos.y }; // Behind
                            state.clones.push({ id: Math.random().toString(), pos: spawnOffset, velocity: {x:0,y:0}, radius: 22, rotation: p.angle, dead: false, hp: 100, maxHp: 100, lastShotTime: 0 });
                            g.stats.lastProc = state.gameTime + 20000; addFloatingText(state, p.pos, "CLONE SPAWNED", '#fca5a5');
                        } else if (g.stats.type === 'medkit') {
                            state.worldMedkits.push({ id: Math.random().toString(), pos: { x: p.pos.x + (Math.random()-0.5)*100, y: p.pos.y + (Math.random()-0.5)*100 }, velocity: {x:0,y:0}, radius: 10, rotation: 0, dead: false });
                            addFloatingText(state, p.pos, "MEDKIT SPAWNED", '#ef4444');
                            g.stats.lastProc = state.gameTime + 60000; 
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
            
            const hasShoes = p.equippedGear.some(g => g?.stats?.type === 'shoes');
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
            
            // AIMING LOGIC UPDATE FOR MOBILE
            if (state.isMobile) {
                if (state.inputs.mobile.joysticks.right.active) {
                    p.angle = Math.atan2(state.inputs.mobile.aimVec.y, state.inputs.mobile.aimVec.x);
                    if (state.inputs.mobile.isFiring) {
                        handleShoot(state, balance);
                        state.clones.forEach(c => handleShoot(state, balance, 'clone', c.pos, c.rotation));
                    }
                } else if (state.inputs.mobile.joysticks.left.active) {
                     // Aim in movement direction if not aiming
                     if (Math.abs(normMove.x) > 0.001 || Math.abs(normMove.y) > 0.001) {
                         p.angle = Math.atan2(normMove.y, normMove.x);
                     }
                }
                // Else: Do nothing, preserve existing p.angle
            } else {
                const worldMouse = { x: state.inputs.mouse.x + state.camera.x, y: state.inputs.mouse.y + state.camera.y };
                p.angle = Math.atan2(worldMouse.y - p.pos.y, worldMouse.x - p.pos.x);
                if (state.inputs.keys.has('mousedown')) {
                    handleShoot(state, balance);
                    state.clones.forEach(c => handleShoot(state, balance, 'clone', c.pos, c.rotation));
                }
            }
        }

        // Enemy Updates (Spawn/Move/Attack)
        updateEnemies(state, balance, dt, tick);

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
                 p.coins += m.value;
                 addFloatingText(state, m.pos, `+${m.value} MAGIC`, m.tier === 'Rare' ? '#c084fc' : m.tier === 'Uncommon' ? '#facc15' : '#22d3ee');
                 if (m.tier === 'Rare') addParticle(state, m.pos, '#c084fc', 'spark', 10, 3);
                 else if (m.tier === 'Uncommon') addParticle(state, m.pos, '#facc15', 'spark', 5, 2);
                 else addParticle(state, m.pos, '#22d3ee', 'spark', 3, 1);
                 return false;
            }
            return true;
        });

        for (let i = state.projectiles.length - 1; i >= 0; i--) {
            const proj = state.projectiles[i];
            proj.pos.x += proj.velocity.x * tick; 
            proj.pos.y += proj.velocity.y * tick; 
            proj.rangeRemaining -= Math.hypot(proj.velocity.x * tick, proj.velocity.y * tick);
            if (proj.rangeRemaining <= 0 || proj.pos.x < 0 || proj.pos.x > MAP_SIZE || proj.pos.y < 0 || proj.pos.y > MAP_SIZE) { proj.dead = true; continue; }

            if (proj.source === 'player' || proj.source === 'turret' || proj.source === 'clone') {
                for (const enemy of state.enemies) {
                    if (!enemy.dead && distance(proj.pos, enemy.pos) < enemy.radius + proj.radius + 5) {
                        enemy.hp -= proj.damage; proj.dead = true; addParticle(state, proj.pos, '#ff0000', 'blood', 3, 1, 5.0); 
                        if (enemy.type !== EnemyType.Boss) { const knockDir = normalize(proj.velocity); enemy.pos.x += knockDir.x * 5; enemy.pos.y += knockDir.y * 5; }
                        if (enemy.hp <= 0) { 
                            enemy.dead = true; 
                            p.coins += balance.enemies.types[enemy.type].score; 
                            addFloatingText(state, enemy.pos, `+${balance.enemies.types[enemy.type].score} ✨`, '#fcd34d'); 
                            addParticle(state, enemy.pos, '#ff0000', 'blood', 10, 2, 5.0); 

                            if (Math.random() < 0.02) {
                                state.worldKeys.push({
                                    id: Math.random().toString(),
                                    pos: { ...enemy.pos },
                                    velocity: {x:0, y:0},
                                    radius: 15,
                                    rotation: 0,
                                    dead: false
                                });
                            }
                            if (Math.random() < 0.02) {
                                state.worldMedkits.push({ id: Math.random().toString(), pos: { ...enemy.pos }, velocity: {x:0, y:0}, radius: 10, rotation: 0, dead: false });
                            }
                            if (Math.random() < 0.02) {
                                const r = Math.random();
                                let val = 20; let tier = 'Common' as any;
                                if (r < 0.15) { val = 200; tier = 'Rare'; }
                                else if (r < 0.50) { val = 50; tier = 'Uncommon'; }
                                
                                const ang = Math.random() * Math.PI * 2;
                                state.magicDrops.push({
                                    id: Math.random().toString(),
                                    pos: { ...enemy.pos },
                                    velocity: { x: Math.cos(ang) * 2, y: Math.sin(ang) * 2 },
                                    radius: 10, rotation: 0, dead: false,
                                    value: val, tier: tier
                                });
                            }
                        }
                        break;
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

                state.decoys.forEach(d => {
                    if (distance(proj.pos, d.pos) < d.radius + proj.radius) {
                        proj.dead = true; d.hp -= proj.damage;
                    }
                });
                state.clones.forEach(c => {
                    if (distance(proj.pos, c.pos) < c.radius + proj.radius) {
                        proj.dead = true; c.hp -= proj.damage;
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

    // Global Cleanup & Updates (Particles, Floating Text, Dead Loot) - MOVED OUTSIDE BUNK CHECK
    state.loot = state.loot.filter(l => !l.dead);

    state.particles.forEach(p => {
        p.pos.x += p.velocity.x * tick;
        p.pos.y += p.velocity.y * tick;
        p.life -= (dt / 1000);
        if (p.life <= 0) p.dead = true;
    });
    state.particles = state.particles.filter(p => !p.dead);

    state.floatingTexts.forEach(t => {
        t.pos.x += t.velocity.x * tick;
        t.pos.y += t.velocity.y * tick;
        t.life -= (dt / 1000);
    });
    state.floatingTexts = state.floatingTexts.filter(t => t.life > 0);
};