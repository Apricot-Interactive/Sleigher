
import { GameState, ItemTier, WeaponType, LootContent, GearStats } from '../types.ts';
import { LOOT_CONFIG, GEAR_DROPS, MAP_SIZE } from '../constants.ts';
import { distance } from '../utils/math.ts';

export const generateLootContent = (wave: number): LootContent => {
    const roll = Math.random();
    
    // 50% Weapon, 50% Gear (No Magic)
    if (roll < LOOT_CONFIG.DROP_RATES.WEAPON) {
            // WEAPON SPAWN LOGIC
            const types = Object.values(WeaponType); 
            const wType = types[Math.floor(Math.random() * types.length)];
            const tr = Math.random(); 
            let tier = ItemTier.Grey;
            let tierConfig = LOOT_CONFIG.WEAPON_TIERS.EARLY;
            
            // Phase Check
            if (wave >= LOOT_CONFIG.TIER_UNLOCKS.RED_WAVE) tierConfig = LOOT_CONFIG.WEAPON_TIERS.LATE; 
            else if (wave >= LOOT_CONFIG.TIER_UNLOCKS.BLUE_WAVE) tierConfig = LOOT_CONFIG.WEAPON_TIERS.MID;
            
            for (const t of tierConfig) { if (tr < t.threshold) { tier = t.tier; break; } }
            
            const color = tier === ItemTier.Grey ? '#94a3b8' : tier === ItemTier.Green ? '#4ade80' : tier === ItemTier.Blue ? '#60a5fa' : tier === ItemTier.Red ? '#f87171' : '#fff';
            return { type: 'weapon_drop', weaponType: wType, tier, color, label: `${ItemTier[tier]} ${wType}` };
    } else {
            // GEAR SPAWN LOGIC
            // Determine allowed tiers based on wave
            const availableTiers = [ItemTier.Green];
            if (wave >= LOOT_CONFIG.TIER_UNLOCKS.BLUE_WAVE) availableTiers.push(ItemTier.Blue);
            if (wave >= LOOT_CONFIG.TIER_UNLOCKS.RED_WAVE) availableTiers.push(ItemTier.Red);
            
            // Roll Rarity
            const r = Math.random();
            let selectedTier = ItemTier.Green;
            
            if (r > 0.85) selectedTier = ItemTier.Red; // Top 15%
            else if (r > 0.50) selectedTier = ItemTier.Blue; // Next 35%
            else selectedTier = ItemTier.Green; // Bottom 50%

            // Downgrade if tier not yet unlocked
            if (selectedTier === ItemTier.Red && !availableTiers.includes(ItemTier.Red)) selectedTier = ItemTier.Blue;
            if (selectedTier === ItemTier.Blue && !availableTiers.includes(ItemTier.Blue)) selectedTier = ItemTier.Green;

            // Pick item from Tier
            const possibleItems = GEAR_DROPS.filter(g => g.tier === selectedTier);
            
            if (possibleItems.length > 0) {
                const item = possibleItems[Math.floor(Math.random() * possibleItems.length)];
                const color = selectedTier === ItemTier.Green ? '#4ade80' : selectedTier === ItemTier.Blue ? '#60a5fa' : '#f87171';
                
                if (item.type === 'key') {
                    return { type: 'key', tier: selectedTier, color, label: item.label };
                } else {
                    return { type: 'gear', tier: selectedTier, color, label: item.label, stats: item.stats as GearStats };
                }
            } else {
                return { type: 'key', tier: ItemTier.Green, color: '#4ade80', label: 'Fallback Key' };
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
