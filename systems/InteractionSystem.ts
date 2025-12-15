
import { GameState, GameBalance, ItemTier, WeaponType, Loot, InventoryItem, AmmoType, EnemyType } from '../types.ts';
import { distance, normalize } from '../utils/math.ts';
import { BUNKER_ZONES, POI_LOCATIONS } from '../constants.ts';
import { addFloatingText, addParticle } from './ParticleSystem.ts';
import { spawnEnemy } from './EnemySystem.ts';

export const calculateInteractionFlags = (state: GameState, balance: GameBalance) => {
    const p = state.player;
    const d = distance(p.pos, POI_LOCATIONS.SLEIGH);
    const isNearSleigh = d < balance.player.pickupRadius + 50;
    const { bronze } = balance.economy.sleighThresholds;
    
    const isBossActive = state.bossState.active;
    const isExtracting = state.bossState.readyToExtract || state.exitAnim.active;
    const isSummoning = state.bossState.summonRequested;
    const isTransferring = state.transferState.active;

    const showInfuse = isNearSleigh && !isExtracting && !isBossActive && !isSummoning && !isTransferring;
    const showSummon = isNearSleigh && state.depositedCoins >= bronze && !isBossActive && !isExtracting && !isSummoning && !isTransferring;
    
    let showSell = false;
    let showGunsmith = false;
    let showCrafting = false;
    let showMedic = false;

    return { showInfuse, showSummon, showSell, showGunsmith, showCrafting, showMedic };
};

export const recalculatePlayerStats = (state: GameState, balance: GameBalance) => {
    const p = state.player;
    const oldMax = p.maxHp;
    let newMax = balance.player.maxHp;
    p.equippedGear.forEach(g => { if (g && g.stats && g.stats.hpBonus) newMax += g.stats.hpBonus; });
    
    const diff = newMax - oldMax;
    p.maxHp = newMax;
    if (diff > 0) p.hp += diff;
    else if (diff < 0 && p.hp > newMax) p.hp = newMax;
};

export const updateInteractions = (state: GameState, balance: GameBalance, dt: number) => {
    const p = state.player;
    const tick = dt / 16.667;

    // 1. Present Opening
    state.loot.forEach(l => {
        if (l.type === 'present' && !l.dead) {
            if (distance(p.pos, l.pos) < balance.player.pickupRadius) {
                l.pickupProgress += dt / 1000;
                if (l.pickupProgress >= balance.player.pickupTime) {
                    l.pickupProgress = 0;
                    if (l.contents) {
                        // Spread out
                        const searchCenter = { x: p.pos.x, y: p.pos.y + 50 };
                        let foundPos = { ...searchCenter };
                        let found = false;
                        for(let r=0; r<=60; r+=20) {
                            const steps = r===0 ? 1 : 8;
                            for(let i=0; i<steps; i++) {
                                const theta = (i/steps) * Math.PI * 2;
                                const test = { x: searchCenter.x + Math.cos(theta)*r, y: searchCenter.y + Math.sin(theta)*r };
                                const overlap = state.loot.some(other => !other.dead && other.id !== l.id && distance(other.pos, test) < 30);
                                if(!overlap) { foundPos = test; found = true; break; }
                            }
                            if(found) break;
                        }
                        l.pos = foundPos;

                        if (l.contents.type === 'weapon_drop') {
                            l.type = 'weapon_drop'; l.weaponType = l.contents.weaponType; l.tier = l.contents.tier; l.color = l.contents.color; l.label = l.contents.label;
                        } else if (l.contents.type === 'key') {
                            l.dead = true;
                            state.worldKeys.push({ id: Math.random().toString(), pos: { ...l.pos }, velocity: {x:0, y:0}, radius: 15, rotation: 0, dead: false });
                            addFloatingText(state, l.pos, "KEY FOUND", '#facc15');
                        } else {
                            l.type = 'item_drop'; l.label = l.contents.label; 
                        }
                        addParticle(state, l.pos, '#ffffff', 'spark', 10, 3);
                    }
                }
            } else {
                l.pickupProgress = Math.max(0, l.pickupProgress - dt / 1000);
            }
        }
    });

    // 2. Auto-Pickups (Keys, Magic, Medkits)
    state.worldKeys = state.worldKeys.filter(k => {
         if (distance(k.pos, p.pos) < balance.player.radius + k.radius) { p.keys++; addFloatingText(state, k.pos, "+1 KEY", '#facc15'); return false; }
         return true;
    });
    
    state.magicDrops = state.magicDrops.filter(m => {
        m.pos.x += m.velocity.x * tick; m.pos.y += m.velocity.y * tick; m.velocity.x *= 0.9; m.velocity.y *= 0.9;
        if (distance(m.pos, p.pos) < balance.player.pickupRadius) {
             const hasHat = p.equippedGear.some(g => g?.stats?.type === 'elf_hat');
             const bonus = hasHat ? Math.floor(m.value * 0.5) : 0;
             p.coins += m.value + bonus;
             const text = bonus > 0 ? `+${m.value} (+${bonus})` : `+${m.value}`;
             addFloatingText(state, m.pos, `${text} MAGIC`, m.tier === 'Rare' ? '#c084fc' : m.tier === 'Uncommon' ? '#facc15' : '#22d3ee');
             return false;
        }
        return true;
    });
    
    state.worldMedkits = state.worldMedkits.filter(m => {
        if (distance(m.pos, p.pos) < balance.player.radius + m.radius + 10 && p.hp < p.maxHp) {
            state.healingState.active = true; state.healingState.endTime = state.gameTime + 8000; state.healingState.nextTick = state.gameTime;
            return false;
        }
        return true;
    });

    // 3. Sleigh Logic (Transfer/Summon/Extract)
    if (state.transferState.active) {
        const distToSleigh = distance(p.pos, POI_LOCATIONS.SLEIGH);
        const currentTotal = state.depositedCoins;
        const target = state.transferState.target;

        if (distToSleigh > 800 || p.coins <= 0 || currentTotal >= target) { 
            state.transferState.active = false; addFloatingText(state, p.pos, "TRANSFER COMPLETE", '#22c55e'); 
        } else {
            const timeActive = (state.gameTime - state.transferState.startTime) / 1000;
            const baseRate = 5 * Math.pow(1.08, timeActive); 
            state.transferState.accumulator += baseRate * (dt / 1000);
            if (state.transferState.accumulator >= 1) {
                const transferAmount = Math.floor(state.transferState.accumulator);
                state.transferState.accumulator -= transferAmount;
                const actualTransfer = Math.min(p.coins, transferAmount, target - currentTotal);
                if (actualTransfer > 0) { p.coins -= actualTransfer; state.depositedCoins += actualTransfer; if (Math.random() > 0.5) addParticle(state, POI_LOCATIONS.SLEIGH, '#fbbf24', 'spark', 1, 2); } 
                else { state.transferState.active = false; }
            }
        }
    }

    if (state.bossState.summonRequested && !state.bossState.active && !state.bossState.readyToExtract) {
        const { bronze, silver, gold } = balance.economy.sleighThresholds; 
        const total = state.depositedCoins; 
        let tierReached: 'Bronze' | 'Silver' | 'Gold' | null = null; 
        if (total >= gold) tierReached = 'Gold'; else if (total >= silver) tierReached = 'Silver'; else if (total >= bronze) tierReached = 'Bronze';

        if (tierReached && distance(p.pos, POI_LOCATIONS.SLEIGH) < balance.player.pickupRadius * 1.5) {
             state.summoningProgress += dt / 1000;
             if (state.summoningProgress >= balance.player.pickupTime * 3) {
                 state.bossState.active = true; state.bossState.tier = tierReached; state.bossState.readyToExtract = false; state.bossState.summonRequested = false; state.summoningProgress = 0;
                 addFloatingText(state, { x: p.pos.x + 264, y: p.pos.y }, "Not so fast!", '#ef4444', 3.0);
                 const sx = POI_LOCATIONS.SLEIGH.x; const sy = POI_LOCATIONS.SLEIGH.y;
                 let count = 1; if (tierReached === 'Silver') count = 2; if (tierReached === 'Gold') count = 3;
                 for(let i=0; i<count; i++) spawnEnemy(state, balance, EnemyType.Boss, 0, { x: sx + 1250, y: sy + (i - (count-1)/2) * 200 }); 
             }
        } else {
             state.summoningProgress = Math.max(0, state.summoningProgress - (dt / 1000));
             if (state.summoningProgress <= 0) state.bossState.summonRequested = false;
        }
    }

    if (state.bossState.readyToExtract && distance(p.pos, POI_LOCATIONS.SLEIGH) < balance.player.pickupRadius * 1.5) {
        state.extractionProgress += dt / 1000;
        if (state.extractionProgress >= balance.player.pickupTime * 3) state.exitAnim.active = true;
    } else {
        state.extractionProgress = Math.max(0, state.extractionProgress - (dt / 1000));
    }

    if (state.exitAnim.active) {
        state.exitAnim.t += dt;
        const tSec = state.exitAnim.t / 1000;
        const maxSpeed = balance.player.speed * 0.25 * 3; 
        const currentSpeed = tSec < 3.0 ? maxSpeed * (tSec / 3.0) : maxSpeed;
        
        state.exitAnim.offset.x += currentSpeed * tick;
        state.exitAnim.offset.y -= currentSpeed * tick;
        p.pos.x = POI_LOCATIONS.SLEIGH.x + state.exitAnim.offset.x - 40; 
        p.pos.y = POI_LOCATIONS.SLEIGH.y + state.exitAnim.offset.y; 
        
        if (tSec > 0.5) addParticle(state, { x: POI_LOCATIONS.SLEIGH.x + state.exitAnim.offset.x - 70, y: POI_LOCATIONS.SLEIGH.y + state.exitAnim.offset.y + 20 }, '#facc15', 'spark', 5, 2);
        if (state.exitAnim.t > 5200) state.gamePhase = 'victory';
    }
};

export const handleInteraction = (state: GameState, balance: GameBalance, activeModal: string | null, setActiveModal: (m: any) => void) => {
    const p = state.player;
    const flags = calculateInteractionFlags(state, balance);
    if (activeModal) { setActiveModal(null); return; }

    if (flags.showInfuse) {
        if (state.transferState.active) return;
        state.transferState.active = true; state.transferState.startTime = state.gameTime; state.transferState.accumulator = 0;
        const { bronze, silver, gold } = balance.economy.sleighThresholds; 
        const currentTotal = state.depositedCoins;
        let target = bronze; if (currentTotal >= bronze) target = silver; if (currentTotal >= silver) target = gold;
        state.transferState.target = target;
        return;
    }

    // Manual Loot Pickup (Priority)
    let closestLoot: Loot | null = null;
    let minDst = balance.player.pickupRadius;
    for (const l of state.loot) {
            if (l.type === 'present' || l.dead) continue;
            const d = distance(p.pos, l.pos);
            if (d < minDst) { minDst = d; closestLoot = l; }
    }

    if (closestLoot) {
        if (closestLoot.type === 'weapon_drop' && closestLoot.weaponType && closestLoot.tier !== undefined) {
            if (closestLoot.tier > p.weaponTiers[p.weapon]) {
                p.weapon = closestLoot.weaponType; p.weaponTiers[p.weapon] = closestLoot.tier; p.maxTiers[p.weapon] = Math.max(p.maxTiers[p.weapon], closestLoot.tier);
                p.ammo = balance.weapons[p.weapon].magSize; closestLoot.dead = true; addFloatingText(state, closestLoot.pos, "EQUIPPED", '#fff');
            } else {
                if (p.inventory.length < 6) {
                    p.inventory.push({ id: Math.random().toString(), type: 'weapon', weaponType: closestLoot.weaponType, tier: closestLoot.tier, value: Math.floor(balance.economy.baseWeaponCost * (1 + closestLoot.tier)), label: closestLoot.label });
                    window.dispatchEvent(new CustomEvent('inventory-item-added')); closestLoot.dead = true; addFloatingText(state, closestLoot.pos, "STASHED", '#fff');
                } else { addFloatingText(state, closestLoot.pos, "FULL!", '#ef4444', 0.5); }
            }
        } else if (closestLoot.type === 'item_drop' && closestLoot.contents?.type === 'gear') {
             const c = closestLoot.contents;
             const emptySlot = p.equippedGear.indexOf(null);
             if (emptySlot !== -1) {
                 p.equippedGear[emptySlot] = { id: Math.random().toString(), type: 'gear', tier: c.tier, stats: c.stats, value: 200 * ((c.tier||0)+1), label: c.label };
                 closestLoot.dead = true; recalculatePlayerStats(state, balance); addFloatingText(state, closestLoot.pos, "EQUIPPED", '#fff');
             } else if (p.inventory.length < 6) {
                 p.inventory.push({ id: Math.random().toString(), type: 'gear', tier: c.tier, stats: c.stats, value: 200 * ((c.tier||0)+1), label: c.label });
                 window.dispatchEvent(new CustomEvent('inventory-item-added')); closestLoot.dead = true; addFloatingText(state, closestLoot.pos, "STASHED", '#fff');
             } else { addFloatingText(state, closestLoot.pos, "FULL!", '#ef4444', 0.5); }
        }
        return;
    }
    
    // Enter Bunker
    if (!state.inBunker) {
        for (let i = 0; i < state.activeBunkers.length; i++) {
            if (distance(p.pos, state.activeBunkers[i]) < 100) {
                const unlockWave = state.unlockedBunkers.get(i);
                if (unlockWave === state.wave) {
                    state.inBunker = true; state.activeBunkerIndex = i; state.bunkerPlayerPos = { ...BUNKER_ZONES.SPAWN }; p.pos = { ...state.bunkerPlayerPos };
                } else if (p.keys > 0) {
                    p.keys--; state.unlockedBunkers.set(i, state.wave); state.inBunker = true; state.activeBunkerIndex = i; state.bunkerPlayerPos = { ...BUNKER_ZONES.SPAWN }; p.pos = { ...state.bunkerPlayerPos };
                } else { addFloatingText(state, p.pos, "NEED KEY", '#ef4444'); }
                break;
            }
        }
    }
};
