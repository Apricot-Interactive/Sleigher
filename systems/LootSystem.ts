

import { GameState, ItemTier, WeaponType, LootContent, GearStats } from '../types.ts';
import { LOOT_CONFIG, GEAR_DROPS, MAP_SIZE } from '../constants.ts';
import { distance } from '../utils/math.ts';

export const generateLootContent = (wave: number): LootContent => {
    const roll = Math.random();
    
    // 50% Weapon, 50% Gear (No Magic)
    if (roll < LOOT_CONFIG.DROP_RATES.WEAPON) {
            // WEAPON SPAWN LOGIC
            const tr = Math.random(); 
            let tier = ItemTier.Grey;
            let tierConfig = LOOT_CONFIG.WEAPON_TIERS.EARLY;
            
            // Phase Check (Red wave deleted from config, but using logic for high tier access)
            if (wave >= LOOT_CONFIG.TIER_UNLOCKS.BLUE_WAVE) tierConfig = LOOT_CONFIG.WEAPON_TIERS.MID;
            
            for (const t of tierConfig) { if (tr < t.threshold) { tier = t.tier; break; } }
            
            // FILTER WEAPONS BY TIER AVAILABILITY
            // Snowball never drops. 
            // Crafted weapons (Flamethrower, Laser, ArcTaser) never drop.
            let availableWeapons: WeaponType[] = [];

            if (tier === ItemTier.Grey) {
                // Pistol, Shotgun, Sword start at Grey
                availableWeapons = [WeaponType.Pistol, WeaponType.Shotgun, WeaponType.Sword];
            } else if (tier === ItemTier.Green) {
                // AR, Boomerang, Chainsaw start at Green.
                // Pistol, Shotgun, Sword can also appear as Green.
                availableWeapons = [
                    WeaponType.AR, WeaponType.Boomerang, WeaponType.Chainsaw,
                    WeaponType.Pistol, WeaponType.Shotgun, WeaponType.Sword
                ];
            } else if (tier === ItemTier.Blue) {
                // Grenade Launcher, Sniper start at Blue.
                // AR, Boomerang, Chainsaw can appear as Blue.
                availableWeapons = [
                    WeaponType.GrenadeLauncher, WeaponType.Sniper,
                    WeaponType.AR, WeaponType.Boomerang, WeaponType.Chainsaw
                ];
            } else {
                // Fallback if somehow Red is selected (shouldn't happen for drops based on new rules, but safe fallback)
                availableWeapons = [WeaponType.GrenadeLauncher, WeaponType.Sniper]; 
            }

            const wType = availableWeapons[Math.floor(Math.random() * availableWeapons.length)];
            
            const color = tier === ItemTier.Grey ? '#94a3b8' : tier === ItemTier.Green ? '#4ade80' : tier === ItemTier.Blue ? '#60a5fa' : tier === ItemTier.Red ? '#f87171' : '#fff';
            return { type: 'weapon_drop', weaponType: wType, tier, color, label: `${ItemTier[tier]} ${wType}` };
    } else {
            // GEAR SPAWN LOGIC
            // Determine allowed tiers based on wave
            const availableTiers = [ItemTier.Grey, ItemTier.Green]; // Grey is always available
            if (wave >= LOOT_CONFIG.TIER_UNLOCKS.BLUE_WAVE) availableTiers.push(ItemTier.Blue);
            
            // Roll Rarity
            const r = Math.random();
            let selectedTier = ItemTier.Grey;
            
            if (r > 0.85) selectedTier = ItemTier.Blue; // Top 15%
            else if (r > 0.50) selectedTier = ItemTier.Green; // Next 35%
            else selectedTier = ItemTier.Grey; // Bottom 50%

            // Downgrade if tier not yet unlocked
            if (selectedTier === ItemTier.Blue && !availableTiers.includes(ItemTier.Blue)) selectedTier = ItemTier.Green;
            // Grey and Green are always unlocked essentially, but logic holds

            // Pick item from Tier
            const possibleItems = GEAR_DROPS.filter(g => g.tier === selectedTier);
            
            if (possibleItems.length > 0) {
                const item = possibleItems[Math.floor(Math.random() * possibleItems.length)];
                const color = selectedTier === ItemTier.Grey ? '#94a3b8' : selectedTier === ItemTier.Green ? '#4ade80' : selectedTier === ItemTier.Blue ? '#60a5fa' : '#f87171';
                
                return { type: 'gear', tier: selectedTier, color, label: item.label, stats: item.stats as GearStats };
            } else {
                // Fallback to Grey
                const fallback = GEAR_DROPS.find(g => g.tier === ItemTier.Grey);
                return { type: 'gear', tier: ItemTier.Grey, color: '#94a3b8', label: fallback?.label || 'Vest', stats: fallback?.stats as GearStats };
            }
    }
};

export const spawnLoot = (state: GameState, count: number, avoidViewport: boolean = false) => {
    const MARGIN = 176; // 4 Player Heights (4 * 44)
    
    for(let i=0; i<count; i++) {
        let pos = { x: 0, y: 0 }; let valid = false; let attempts = 0;
        while (!valid && attempts < 50) {
            // Constrain spawn within the margin
            pos = { 
                x: MARGIN + Math.random() * (MAP_SIZE - MARGIN * 2), 
                y: MARGIN + Math.random() * (MAP_SIZE - MARGIN * 2) 
            };

            if (avoidViewport) { 
                const screenX = pos.x - state.camera.x; 
                const screenY = pos.y - state.camera.y; 
                if (screenX >= -50 && screenX <= window.innerWidth + 50 && screenY >= -50 && screenY <= window.innerHeight + 50) valid = false; 
                else valid = true; 
            } else valid = true;
            
            if (valid) {
                // Check proximity to other presents (5 player heights ~ 220px)
                for (const l of state.loot) {
                    if (l.type === 'present' && distance(l.pos, pos) < 220) {
                        valid = false;
                        break;
                    }
                }
            }
            attempts++;
        }
        
        const content = generateLootContent(state.wave);
        
        state.loot.push({ 
            id: Math.random().toString(), 
            pos, 
            velocity: {x:0, y:0}, 
            radius: 15, 
            rotation: Math.random() * Math.PI * 2, 
            dead: false, 
            type: 'present', 
            pickupProgress: 0, 
            contents: content 
        });
    }
};