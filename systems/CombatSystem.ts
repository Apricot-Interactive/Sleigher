
import { GameState, GameBalance, WeaponType, ItemTier, Vector2, Projectile } from '../types.ts';
import { addParticle } from './ParticleSystem.ts';

export const handleShoot = (state: GameState, balance: GameBalance, source: 'player' | 'clone' = 'player', overridePos?: Vector2, overrideAngle?: number) => {
    const p = state.player;
    
    // Check Lightning Gear (Double Fire Rate => Half Delay)
    const hasLightning = p.equippedGear.some(g => g?.stats?.type === 'lightning');
    const fireRateMod = hasLightning ? 0.5 : 1.0;

    if (source === 'player') {
        if (p.reloadingUntil > state.gameTime || p.reviving || state.exitAnim.active) return;
        if (p.ammo <= 0) { const weaponStats = balance.weapons[p.weapon]; p.reloadingUntil = state.gameTime + weaponStats.reloadTime; p.ammo = weaponStats.magSize; return; }
        const weaponStats = balance.weapons[p.weapon];
        
        if (state.gameTime - p.lastShotTime > (weaponStats.fireRate * fireRateMod)) {
            p.lastShotTime = state.gameTime; p.ammo--;
            const tier = p.weaponTiers[p.weapon]; const tierDmgMult = 1 + (tier * 0.5); const tierColor = tier === ItemTier.Grey ? '#fbbf24' : tier === ItemTier.Green ? '#4ade80' : tier === ItemTier.Blue ? '#60a5fa' : tier === ItemTier.Red ? '#f87171' : '#fff';
            const barrelLen = 35; const muzzlePos = { x: p.pos.x + Math.cos(p.angle) * barrelLen + Math.cos(p.angle + Math.PI/2) * 5, y: p.pos.y + Math.sin(p.angle) * barrelLen + Math.sin(p.angle + Math.PI/2) * 5 };
            addParticle(state, muzzlePos, '#ffff00', 'spark', 5, 2);
            
            // Spawn Casing
            const casingPos = { 
                x: p.pos.x + Math.cos(p.angle) * 10 + Math.cos(p.angle + Math.PI/2) * 15, 
                y: p.pos.y + Math.sin(p.angle) * 10 + Math.sin(p.angle + Math.PI/2) * 15 
            };
            addParticle(state, casingPos, '#d97706', 'casing', 1, 3, 20.0); 

            state.screenShake += p.weapon === WeaponType.Shotgun ? 5 : 2;
            const shots = p.weapon === WeaponType.Shotgun ? 5 : 1;
            
            // Instakill Cheat
            const finalDamage = balance.cheats?.instakill ? 10000 : weaponStats.damage * tierDmgMult;

            for(let i=0; i<shots; i++) {
                const spread = (Math.random() - 0.5) * weaponStats.spread; const finalAngle = p.angle + spread;
                state.projectiles.push({ id: Math.random().toString(), pos: { ...muzzlePos }, velocity: { x: Math.cos(finalAngle) * weaponStats.projectileSpeed, y: Math.sin(finalAngle) * weaponStats.projectileSpeed }, radius: 5, rotation: finalAngle, dead: false, damage: finalDamage, rangeRemaining: weaponStats.range, color: tierColor, tier: tier, source: 'player', ammoType: p.ammoType, weaponType: p.weapon });
            }
        }
    } else if (source === 'clone' && overridePos && overrideAngle !== undefined) {
        // Clone shoots player's weapon but infinite ammo/no reload
        const weaponStats = balance.weapons[p.weapon];
        const tier = p.weaponTiers[p.weapon]; const tierDmgMult = 1 + (tier * 0.5); const tierColor = tier === ItemTier.Grey ? '#fbbf24' : tier === ItemTier.Green ? '#4ade80' : tier === ItemTier.Blue ? '#60a5fa' : tier === ItemTier.Red ? '#f87171' : '#fff';
        const shots = p.weapon === WeaponType.Shotgun ? 5 : 1;
        const finalDamage = balance.cheats?.instakill ? 10000 : weaponStats.damage * tierDmgMult;
        
        for(let i=0; i<shots; i++) {
            const spread = (Math.random() - 0.5) * weaponStats.spread; const finalAngle = overrideAngle + spread;
            state.projectiles.push({ id: Math.random().toString(), pos: { ...overridePos }, velocity: { x: Math.cos(finalAngle) * weaponStats.projectileSpeed, y: Math.sin(finalAngle) * weaponStats.projectileSpeed }, radius: 5, rotation: finalAngle, dead: false, damage: finalDamage, rangeRemaining: weaponStats.range, color: tierColor, tier: tier, source: 'clone', ammoType: p.ammoType, weaponType: p.weapon });
        }
    }
};
