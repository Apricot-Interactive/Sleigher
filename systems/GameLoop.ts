
import { GameState, GameBalance, Vector2, WeaponType, ItemTier, AmmoType, Loot, EnemyType } from '../types.ts';
import { MAP_SIZE, POI_LOCATIONS, BUNKER_INT_SIZE, BUNKER_ZONES, LOOT_CONFIG, WAVE_RULES } from '../constants.ts';
import { distance, normalize, resolveRectCollision } from '../utils/math.ts';
import { generateMap } from './MapSystem.ts';
import { spawnLoot, generateLootContent } from './LootSystem.ts';
import { handleShoot, updateProjectiles, updateCombatInteraction } from './CombatSystem.ts';
import { spawnEnemy, updateEnemies } from './EnemySystem.ts';
import { addParticle, addFloatingText } from './ParticleSystem.ts';
import { updateInteractions } from './InteractionSystem.ts';

const SPEED_SCALE = 0.25;

const rotateTowards = (current: number, target: number, maxStep: number): number => {
    let diff = target - current;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    return Math.abs(diff) <= maxStep ? target : current + Math.sign(diff) * maxStep;
};

export const createInitialState = (balance: GameBalance, loadout?: any): GameState => {
    const mapData = generateMap();
    const isMobile = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    
    // Optimized snow count
    const snowCount = isMobile ? 50 : 400;
    const snow = Array.from({length: snowCount}, () => ({ 
        x: Math.random() * (window.innerWidth || 1920), 
        y: Math.random() * (window.innerHeight || 1080) 
    }));

    // Default Loadout
    let initialWeapon = WeaponType.Snowball;
    let initialGear = [null, null, null, null] as (any | null)[];
    let initialHp = balance.player.maxHp;

    if (loadout) {
        initialWeapon = loadout.weapon;
        initialGear = loadout.gear;
        initialGear.forEach(g => { if (g && g.stats && g.stats.hpBonus) initialHp += g.stats.hpBonus; });
    }

    const weaponTiers: Record<WeaponType, ItemTier> = {} as any;
    Object.values(WeaponType).forEach(t => weaponTiers[t] = ItemTier.Grey);
    weaponTiers[WeaponType.Snowball] = ItemTier.White;
    if (loadout) weaponTiers[loadout.weapon] = loadout.weaponTier;

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
            pos: { ...mapData.playerStart }, velocity: { x: 0, y: 0 }, hp: initialHp, maxHp: initialHp, coins: 0, keys: 1,
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
                joysticks: { left: { origin: {x:0,y:0}, current: {x:0,y:0}, active: false, id: null }, right: { origin: {x:0,y:0}, current: {x:0,y:0}, active: false, id: null } }
            } 
        }
    };
};

const updateSnow = (state: GameState, tick: number) => {
    const isPlaying = state.gamePhase === 'playing';
    const movingDown = state.player.velocity.y > 0.5; 
    const snowSpeed = isPlaying ? (movingDown ? 2.5 : 4.0) : 4.0;
    const width = window.innerWidth;
    const height = window.innerHeight;
    
    state.snow.forEach((flake, i) => { 
        flake.y += snowSpeed * tick; 
        flake.x += Math.sin(Date.now() / 2000 + i) * 1.5 * tick; 
        
        // Wrap
        if (flake.y > height) flake.y = -5;
        if (flake.x > width) flake.x = -5;
        if (flake.x < -5) flake.x = width;
    });
};

const updatePlayerPhysics = (state: GameState, balance: GameBalance, tick: number) => {
    const p = state.player;
    if (state.exitAnim.active || p.reviving) return;

    if (state.inBunker) {
        // Bunker Movement
        const bPos = state.bunkerPlayerPos;
        const move = { x: 0, y: 0 };
        if (state.inputs.keys.has('w')) move.y -= 1; if (state.inputs.keys.has('s')) move.y += 1; if (state.inputs.keys.has('a')) move.x -= 1; if (state.inputs.keys.has('d')) move.x += 1;
        let normMove = normalize(move);
        if (state.isMobile && state.inputs.mobile.joysticks.left.active) normMove = state.inputs.mobile.moveVec;

        bPos.x += normMove.x * balance.player.speed * SPEED_SCALE * 0.8 * tick; 
        bPos.y += normMove.y * balance.player.speed * SPEED_SCALE * 0.8 * tick;
        bPos.x = Math.max(balance.player.radius, Math.min(BUNKER_INT_SIZE.w - balance.player.radius, bPos.x)); 
        bPos.y = Math.max(balance.player.radius, Math.min(BUNKER_INT_SIZE.h - balance.player.radius, bPos.y));
        p.pos = { ...bPos };

        // Aiming
        const rotationSpeed = (4 * Math.PI) * (16.66 / 1000) * tick;
        if (Math.abs(normMove.x) > 0.001 || Math.abs(normMove.y) > 0.001) {
             p.angle = rotateTowards(p.angle, Math.atan2(normMove.y, normMove.x), rotationSpeed);
        } else if (!state.isMobile) {
            const worldMouse = { x: state.inputs.mouse.x + state.camera.x, y: state.inputs.mouse.y + state.camera.y };
            p.angle = rotateTowards(p.angle, Math.atan2(worldMouse.y - p.pos.y, worldMouse.x - p.pos.x), rotationSpeed);
        }

        // Bunker Exit
        if (distance(bPos, BUNKER_ZONES.EXIT) < BUNKER_ZONES.EXIT.radius) {
            state.inBunker = false;
            const bunkerPos = state.activeBunkers[state.activeBunkerIndex];
            p.pos = { x: bunkerPos.x - 120, y: bunkerPos.y + 0 }; state.playerWorldPos = { ...p.pos };
        }

    } else {
        // World Movement
        const move = { x: 0, y: 0 };
        if (state.inputs.keys.has('w')) move.y -= 1; if (state.inputs.keys.has('s')) move.y += 1; if (state.inputs.keys.has('a')) move.x -= 1; if (state.inputs.keys.has('d')) move.x += 1;
        
        let normMove = normalize(move);
        if (state.isMobile && state.inputs.mobile.joysticks.left.active) normMove = state.inputs.mobile.moveVec;
        
        const hasShoes = p.equippedGear.some(g => g?.stats?.type === 'speed_shoes');
        let speedMod = (hasShoes ? 2.0 : 1.0) + (balance.cheats?.speedy ? 2.0 : 0);

        p.velocity = { x: normMove.x * balance.player.speed * SPEED_SCALE * speedMod, y: normMove.y * balance.player.speed * SPEED_SCALE * speedMod };
        p.pos.x += p.velocity.x * tick; 
        p.pos.y += p.velocity.y * tick;
        p.pos.x = Math.max(0, Math.min(MAP_SIZE, p.pos.x)); p.pos.y = Math.max(0, Math.min(MAP_SIZE, p.pos.y));
        
        // Collisions
        const distToTree = distance(p.pos, POI_LOCATIONS.TREE);
        if (distToTree < 40 + balance.player.radius) { 
            const pushDir = normalize({ x: p.pos.x - POI_LOCATIONS.TREE.x, y: p.pos.y - POI_LOCATIONS.TREE.y }); 
            p.pos.x = POI_LOCATIONS.TREE.x + pushDir.x * (40 + balance.player.radius); 
            p.pos.y = POI_LOCATIONS.TREE.y + pushDir.y * (40 + balance.player.radius); 
        }
        for (const poi of state.worldPois) { 
            if (poi.width && poi.height) resolveRectCollision(p.pos, balance.player.radius, poi, poi.width, poi.height); 
            else { 
                const r = poi.radius || 100; const dist = distance(p.pos, poi); 
                if (dist < r + balance.player.radius) { 
                    const pushDir = normalize({ x: p.pos.x - poi.x, y: p.pos.y - poi.y }); 
                    p.pos.x = poi.x + pushDir.x * (r + balance.player.radius); 
                    p.pos.y = poi.y + pushDir.y * (r + balance.player.radius); 
                } 
            } 
        }
        for (let i = 0; i < state.activeBunkers.length; i++) {
            resolveRectCollision(p.pos, balance.player.radius, {x: state.activeBunkers[i].x, y: state.activeBunkers[i].y}, 120, 80); 
        }

        // Aiming & Auto Fire
        const rotationSpeed = (4 * Math.PI) * (16.66 / 1000) * tick;
        const weaponRange = p.weapon ? balance.weapons[p.weapon].range : 0;
        let targetEnemy = null;
        let minEnemyDist = weaponRange;
        
        if (p.weapon) {
             const viewW = window.innerWidth; const viewH = window.innerHeight;
             state.enemies.forEach(enemy => {
                 if (enemy.dead) return;
                 if (enemy.pos.x < state.camera.x - 100 || enemy.pos.x > state.camera.x + viewW + 100 || enemy.pos.y < state.camera.y - 100 || enemy.pos.y > state.camera.y + viewH + 100) return;
                 const d = distance(p.pos, enemy.pos);
                 if (d <= weaponRange) {
                     if (p.weapon === WeaponType.Sniper) { if (!targetEnemy || enemy.hp > targetEnemy.hp) targetEnemy = enemy; }
                     else { if (d < minEnemyDist) { minEnemyDist = d; targetEnemy = enemy; } }
                 }
             });
        }

        if (targetEnemy) {
            p.angle = rotateTowards(p.angle, Math.atan2(targetEnemy.pos.y - p.pos.y, targetEnemy.pos.x - p.pos.x), rotationSpeed);
            handleShoot(state, balance);
            state.isAutoFiring = true;
        } else if (Math.abs(p.velocity.x) > 0.1 || Math.abs(p.velocity.y) > 0.1) {
            p.angle = rotateTowards(p.angle, Math.atan2(p.velocity.y, p.velocity.x), rotationSpeed);
        }
    }
};

const updateWaveLogic = (state: GameState, balance: GameBalance, dt: number) => {
    const effectiveHordeMode = state.hordeMode.active || state.transferState.active;
    const timeScale = effectiveHordeMode ? 2 : 1; 
    state.waveTimer -= (dt / 1000) * timeScale;

    const baseDuration = balance.enemies.waveDuration;
    const totalWaveDuration = baseDuration * 1.5;
    const isSpawnPhase = (state.waveTimer > (totalWaveDuration - baseDuration)) || effectiveHordeMode;

    const getSpawnType = (wave: number): EnemyType => {
        // Use WAVE_RULES if defined, otherwise fallback to mixed
        const rule = WAVE_RULES[wave];
        if (rule) {
            const r = Math.random();
            let sum = 0;
            for(let i=0; i<rule.types.length; i++) {
                sum += rule.weights[i];
                if (r <= sum) return rule.types[i];
            }
            return rule.types[0];
        }
        
        // Fallback for Wave 6+
        const r = Math.random();
        if (r < 0.10) return EnemyType.Reindeer;
        if (r < 0.20) return EnemyType.Tangler;
        if (r < 0.30) return EnemyType.Chef;
        if (r < 0.35) return EnemyType.Yeti; // Rare Yeti in late waves
        return EnemyType.M1;
    };

    if (isSpawnPhase) {
        if (state.gameTime > state.nextSpawnTime) { 
            const type = getSpawnType(state.wave);
            spawnEnemy(state, balance, type); 
            const ramp = Math.pow(balance.enemies.spawnRateRamp, state.wave - 1); 
            state.nextSpawnTime = state.gameTime + (balance.enemies.spawnRateInitial * ramp) / timeScale; 
        }
    }

    const waveClear = !isSpawnPhase && state.enemies.length === 0 && !effectiveHordeMode && !state.exitAnim.active;
    if ((state.waveTimer <= 0 || waveClear) && !state.exitAnim.active) { 
        state.wave++; 
        state.waveTimer = totalWaveDuration; 
        const ramp = Math.pow(balance.enemies.spawnRateRamp, state.wave - 1);
        const currentSpawnRate = (balance.enemies.spawnRateInitial * ramp) / timeScale;
        
        // Spawn initial burst for new wave
        const burstAmount = Math.floor(5000 / currentSpawnRate);
        const burstType = getSpawnType(state.wave);
        for(let k=0; k<burstAmount; k++) spawnEnemy(state, balance, burstType);
        
        state.nextSpawnTime = state.gameTime + currentSpawnRate;

        // Despawn far loot
        state.loot = state.loot.filter(l => l.type !== 'present' || distance(l.pos, state.player.pos) < 1100);

        // Reinforcements
        const reinforceCount = state.player.equippedGear.filter(g => g?.stats?.type === 'reinforce').length;
        if (reinforceCount > 0) {
             for (let r=0; r<reinforceCount * state.wave; r++) {
                const angle = Math.random() * Math.PI * 2;
                state.reinforcements.push({
                    id: Math.random().toString(), pos: { x: state.player.pos.x + Math.cos(angle)*900, y: state.player.pos.y + Math.sin(angle)*900 },
                    velocity: {x:0, y:0}, radius: 22, rotation: 0, dead: false, hp: 200, maxHp: 200,
                    weapon: state.player.weapon || WeaponType.AR, lastShotTime: 0, immuneUntil: state.gameTime + 10000,
                    targetOffset: { x: (Math.random()-0.5)*200, y: (Math.random()-0.5)*200 }
                });
             }
             addFloatingText(state, state.player.pos, "REINFORCEMENTS!", '#3b82f6');
        }
    }
};

export const updateGame = (state: GameState, balance: GameBalance, dt: number) => {
    state.gameTime += dt;
    const tick = dt / 16.667; 
    state.isAutoFiring = false;

    // --- MAIN GAMEPLAY LOOP ---
    if (state.gamePhase === 'playing') {
        if (state.loot.length < LOOT_CONFIG.SPAWNING.MAX_PRESENTS) spawnLoot(state, LOOT_CONFIG.SPAWNING.BATCH_SIZE, true);

        // Unarmed Auto-Equip
        if (!state.player.weapon) {
            if (!state.player.lastUnarmedTime) state.player.lastUnarmedTime = state.gameTime;
            if (state.gameTime - state.player.lastUnarmedTime > 3000) {
                state.player.weapon = WeaponType.Snowball; state.player.weaponTiers[WeaponType.Snowball] = ItemTier.White;
                state.player.ammo = balance.weapons[WeaponType.Snowball].magSize;
                state.player.lastUnarmedTime = 0; addFloatingText(state, state.player.pos, "FOUND SNOWBALL", '#fff');
            }
        } else { state.player.lastUnarmedTime = 0; }
        
        // Systems
        updatePlayerPhysics(state, balance, tick);
        updateInteractions(state, balance, dt);
        updateCombatInteraction(state, balance, tick);
        updateEnemies(state, balance, dt, tick);
        updateWaveLogic(state, balance, dt);

        // Global Healing
        if (state.healingState.active) {
            if (state.gameTime > state.healingState.endTime) state.healingState.active = false;
            else if (state.gameTime > state.healingState.nextTick) { 
                state.healingState.nextTick = state.gameTime + 1000; 
                if (state.player.hp < state.player.maxHp) {
                    state.player.hp = Math.min(state.player.hp + (state.player.maxHp * 0.05), state.player.maxHp); 
                    addFloatingText(state, { x: state.player.pos.x, y: state.player.pos.y - 20 }, "❤️", '#ef4444', 1.0);
                }
            }
        }
        
        // Bunker Spawns
        if (state.inBunker && state.bunkerLootWaves.get(state.activeBunkerIndex) !== state.wave) {
             state.bunkerLootWaves.set(state.activeBunkerIndex, state.wave);
             state.worldMedkits.push({ id: Math.random().toString(), pos: { x: 380, y: 500 }, velocity: {x:0, y:0}, radius: 10, rotation: 0, dead: false });
             state.loot.push({ id: Math.random().toString(), pos: { x: 300, y: 500 }, velocity: {x:0, y:0}, radius: 15, rotation: 0, dead: false, type: 'present', pickupProgress: 0, contents: generateLootContent(state.wave) });
        }
    } 
    
    // --- MENU / ANIMATION LOOP ---
    else if (state.gamePhase === 'menu' || state.gamePhase === 'intro') {
        if (state.gamePhase === 'intro') {
             state.enemies.forEach(enemy => {
                 if (!enemy.wanderTarget || distance(enemy.pos, enemy.wanderTarget) < 20) { const a = Math.random() * Math.PI * 2; const d = Math.random() * 300; enemy.wanderTarget = { x: enemy.spawnOrigin.x + Math.cos(a) * d, y: enemy.spawnOrigin.y + Math.sin(a) * d }; }
                 const moveVec = normalize({ x: enemy.wanderTarget.x - enemy.pos.x, y: enemy.wanderTarget.y - enemy.pos.y });
                 enemy.pos.x += moveVec.x * balance.enemies.types[enemy.type].speed * SPEED_SCALE * 0.5 * tick;
                 enemy.pos.y += moveVec.y * balance.enemies.types[enemy.type].speed * SPEED_SCALE * 0.5 * tick;
             });
        }
    }

    // Common Updates
    updateSnow(state, tick);
    updateProjectiles(state, balance, tick);
    
    // Check Death
    if (state.player.hp <= 0 && !state.player.reviving && state.gamePhase === 'playing') {
        const penIndex = state.player.equippedGear.findIndex(g => g?.type === 'gear' && g.stats?.type === 'pen');
        if (penIndex !== -1) { 
            state.player.hp = 1; state.player.reviving = true; state.player.reviveProgress = 0; 
            addFloatingText(state, state.player.pos, "REVIVING...", '#22d3ee'); 
        } else { state.gamePhase = 'game_over'; }
    }

    // Cleanup
    state.loot = state.loot.filter(l => !l.dead);
    state.particles.forEach(p => { 
        p.pos.x += p.velocity.x * tick; 
        p.pos.y += p.velocity.y * tick; 
        p.life -= (dt / 1000); 
        
        // Shockwave expansion logic
        if (p.type === 'shockwave') p.size += 10 * tick;

        if (p.life <= 0) p.dead = true; 
    });
    state.particles = state.particles.filter(p => !p.dead);
    state.floatingTexts.forEach(t => { t.pos.x += t.velocity.x * tick; t.pos.y += t.velocity.y * tick; t.life -= (dt / 1000); });
    state.floatingTexts = state.floatingTexts.filter(t => t.life > 0);
};
