

import { GameState, GameBalance, ItemTier, WeaponType, Loot, InventoryItem } from '../types.ts';
import { distance } from '../utils/math.ts';
import { BUNKER_ZONES, POI_LOCATIONS } from '../constants.ts';
import { addFloatingText, addParticle } from './ParticleSystem.ts';

// Helper to calculate UI prompts based on state
export const calculateInteractionFlags = (state: GameState, balance: GameBalance) => {
    const p = state.player;
    const d = distance(p.pos, POI_LOCATIONS.SLEIGH);
    const isNearSleigh = d < balance.player.pickupRadius + 50;
    const { bronze } = balance.economy.sleighThresholds;
    
    const isBossActive = state.bossState.active;
    const isExtracting = state.bossState.readyToExtract || state.exitAnim.active;
    const isSummoning = state.bossState.summonRequested;
    const isTransferring = state.transferState.active;

    // Added !isTransferring to prevent prompt while active
    const showInfuse = isNearSleigh && !isExtracting && !isBossActive && !isSummoning && !isTransferring;
    const showSummon = isNearSleigh && state.depositedCoins >= bronze && !isBossActive && !isExtracting && !isSummoning && !isTransferring;
    
    let showSell = false;
    let showGunsmith = false;
    let showCrafting = false;
    let showMedic = false;

    if (state.inBunker) {
        // In bunker, prompts are handled by modal auto-open, but we track zones here
        // We can just return basic flags for now
    }

    return { showInfuse, showSummon, showSell, showGunsmith, showCrafting, showMedic };
};

// Re-calc player stats helper
export const recalculatePlayerStats = (state: GameState, balance: GameBalance) => {
    const p = state.player;
    const oldMax = p.maxHp;
    let newMax = balance.player.maxHp;
    
    p.equippedGear.forEach(g => {
        if (g && g.stats && g.stats.hpBonus) {
            newMax += g.stats.hpBonus;
        }
    });
    
    const diff = newMax - oldMax;
    p.maxHp = newMax;
    
    if (diff > 0) p.hp += diff;
    else if (diff < 0) { if (p.hp > newMax) p.hp = newMax; }
};

export const handleInteraction = (state: GameState, balance: GameBalance, activeModal: string | null, setActiveModal: (m: any) => void) => {
    const p = state.player;
    const flags = calculateInteractionFlags(state, balance);

    // 1. Close Modals
    if (activeModal) {
        setActiveModal(null);
        return;
    }

    // 2. Infuse Magic
    if (flags.showInfuse) {
        if (state.transferState.active) return;
        state.transferState.active = true;
        state.transferState.startTime = state.gameTime;
        state.transferState.accumulator = 0;
        const { bronze, silver, gold } = balance.economy.sleighThresholds; 
        const currentTotal = state.depositedCoins;
        let target = bronze; if (currentTotal >= bronze) target = silver; if (currentTotal >= silver) target = gold;
        state.transferState.target = target;
        return;
    }

    // 3. Loot Pickup (Priority: Weapon > Gear)
    let closestLoot: Loot | null = null;
    let minDst = balance.player.pickupRadius;
    
    for (const l of state.loot) {
            if (l.type === 'present' || l.dead) continue;
            const d = distance(p.pos, l.pos);
            if (d < minDst) {
                minDst = d;
                closestLoot = l;
            }
    }

    if (closestLoot) {
        if (closestLoot.type === 'weapon_drop' && closestLoot.weaponType && closestLoot.tier !== undefined) {
            const equippedTier = p.weaponTiers[p.weapon];
            if (closestLoot.tier > equippedTier) {
                // Upgrade
                const oldTier = p.weaponTiers[p.weapon];
                p.weapon = closestLoot.weaponType;
                p.weaponTiers[p.weapon] = closestLoot.tier;
                p.maxTiers[p.weapon] = Math.max(p.maxTiers[p.weapon], closestLoot.tier);
                p.ammo = balance.weapons[p.weapon].magSize;
                closestLoot.dead = true; 
                addFloatingText(state, closestLoot.pos, "EQUIPPED", '#fff');
            } else {
                // Stash
                if (p.inventory.length < 6) {
                    p.inventory.push({ 
                        id: Math.random().toString(), 
                        type: 'weapon', 
                        weaponType: closestLoot.weaponType, 
                        tier: closestLoot.tier, 
                        value: Math.floor(balance.economy.baseWeaponCost * (1 + closestLoot.tier)),
                        label: closestLoot.label 
                    });
                    window.dispatchEvent(new CustomEvent('inventory-item-added'));
                    closestLoot.dead = true;
                    addFloatingText(state, closestLoot.pos, "STASHED", '#fff');
                } else {
                    addFloatingText(state, closestLoot.pos, "FULL!", '#ef4444', 0.5);
                }
            }
        } else if (closestLoot.type === 'item_drop' && closestLoot.contents) {
                const c = closestLoot.contents;
                if (c.type === 'gear' && c.stats) {
                    const emptySlot = p.equippedGear.indexOf(null);
                    if (emptySlot !== -1) {
                        p.equippedGear[emptySlot] = {
                            id: Math.random().toString(),
                            type: 'gear',
                            tier: c.tier,
                            stats: c.stats,
                            value: 200 * ((c.tier||0)+1),
                            label: c.label
                        };
                        closestLoot.dead = true;
                        recalculatePlayerStats(state, balance);
                        addFloatingText(state, closestLoot.pos, "EQUIPPED", '#fff');
                    } else if (p.inventory.length < 6) {
                        p.inventory.push({
                            id: Math.random().toString(),
                            type: 'gear',
                            tier: c.tier,
                            stats: c.stats,
                            value: 200 * ((c.tier||0)+1),
                            label: c.label
                        });
                        window.dispatchEvent(new CustomEvent('inventory-item-added'));
                        closestLoot.dead = true;
                        addFloatingText(state, closestLoot.pos, "STASHED", '#fff');
                    } else {
                        addFloatingText(state, closestLoot.pos, "FULL!", '#ef4444', 0.5);
                    }
                }
        }
        return;
    }
    
    // 4. Enter Bunker (If not in one)
    if (!state.inBunker) {
        for (let i = 0; i < state.activeBunkers.length; i++) {
            if (distance(p.pos, state.activeBunkers[i]) < 100) {
                const unlockWave = state.unlockedBunkers.get(i);
                if (unlockWave === state.wave) {
                    state.inBunker = true;
                    state.activeBunkerIndex = i;
                    state.bunkerPlayerPos = { ...BUNKER_ZONES.SPAWN };
                    p.pos = { ...state.bunkerPlayerPos };
                } else if (p.keys > 0) {
                    p.keys--;
                    state.unlockedBunkers.set(i, state.wave);
                    state.inBunker = true;
                    state.activeBunkerIndex = i;
                    state.bunkerPlayerPos = { ...BUNKER_ZONES.SPAWN };
                    p.pos = { ...state.bunkerPlayerPos };
                } else {
                    addFloatingText(state, p.pos, "NEED KEY", '#ef4444');
                }
                break;
            }
        }
    }
};