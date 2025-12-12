

import React, { useState, useRef, useEffect } from 'react';
import { GameCanvas, GameCanvasHandle } from './components/GameCanvas.tsx';
import { PauseMenu } from './components/PauseMenu.tsx';
import { UIOverlay } from './components/UIOverlay.tsx';
import { INITIAL_GAME_BALANCE } from './constants.ts';
import { GameBalance, HeroRecord, ItemTier, InventoryItem, WeaponType } from './types.ts';

export default function App() {
  const [balance, setBalance] = useState<GameBalance>(INITIAL_GAME_BALANCE);
  const [paused, setPaused] = useState(false);
  const [hudData, setHudData] = useState<any>(null);
  
  // Persistence State with LocalStorage
  const [veterans, setVeterans] = useState<HeroRecord[]>(() => {
      try {
          const saved = localStorage.getItem('sleigher-veterans');
          return saved ? JSON.parse(saved) : [];
      } catch (e) { return []; }
  });
  const [fngGear, setFngGear] = useState<InventoryItem | null>(() => {
      try {
          const saved = localStorage.getItem('sleigher-fng');
          return saved ? JSON.parse(saved) : null;
      } catch (e) { return null; }
  });
  
  const canvasRef = useRef<GameCanvasHandle>(null);

  // Save to LocalStorage effects
  useEffect(() => {
      try { localStorage.setItem('sleigher-veterans', JSON.stringify(veterans)); } catch (e) {}
  }, [veterans]);

  useEffect(() => {
      try { localStorage.setItem('sleigher-fng', JSON.stringify(fngGear)); } catch (e) {}
  }, [fngGear]);

  // Auto-focus window for key inputs
  useEffect(() => {
      window.focus();
  }, []);

  const handleHUDUpdate = (data: any) => {
      setHudData(data);
  };

  const getScore = (tier: ItemTier) => {
      if (tier === ItemTier.White) return 0;
      if (tier === ItemTier.Grey) return 1;
      if (tier === ItemTier.Green) return 3;
      if (tier === ItemTier.Blue) return 6;
      if (tier === ItemTier.Red) return 10;
      return 1;
  };

  useEffect(() => {
    const handleGameEnded = (e: CustomEvent) => {
        const { win, player } = e.detail;
        
        // FNG Gear Logic (Always save Slot 0)
        const savedSlot = player.equippedGear[0];
        setFngGear(savedSlot || null);

        // Veteran Logic (Only on Win)
        if (win) {
             let score = getScore(player.weaponTiers[player.weapon]);
             player.equippedGear.forEach((g: InventoryItem | null) => {
                 if (g && g.tier !== undefined) score += getScore(g.tier);
             });

             const newVeteran: HeroRecord = {
                 id: Math.random().toString(),
                 weapon: player.weapon,
                 weaponTier: player.weaponTiers[player.weapon],
                 gear: player.equippedGear,
                 score: score
             };

             setVeterans(prev => {
                 const newList = [...prev];
                 if (newList.length >= 2) {
                     // Find lowest score
                     let minScore = Infinity;
                     let minIndex = -1;
                     newList.forEach((v, i) => {
                         if (v.score < minScore) { minScore = v.score; minIndex = i; }
                     });
                     if (minIndex !== -1) newList.splice(minIndex, 1);
                 }
                 newList.push(newVeteran);
                 return newList;
             });
        }
    };

    const handleStartGameRequest = (e: CustomEvent) => {
        const { index } = e.detail;
        
        let loadout = null;

        if (index === -1) {
            // FNG
            loadout = {
                weapon: WeaponType.Snowball,
                weaponTier: ItemTier.White,
                gear: [fngGear, null, null, null]
            };
        } else {
            // Veteran
            const vet = veterans[index];
            if (vet) {
                loadout = {
                    weapon: vet.weapon,
                    weaponTier: vet.weaponTier,
                    gear: vet.gear
                };
                // Remove Veteran from list upon deployment
                setVeterans(prev => prev.filter((_, i) => i !== index));
            }
        }

        if (loadout) {
            // Trigger restart with data
            window.dispatchEvent(new CustomEvent('restart-game', { detail: { loadout } }));
        }
    };

    window.addEventListener('game-ended', handleGameEnded as EventListener);
    window.addEventListener('start-game-request', handleStartGameRequest as EventListener);
    return () => {
        window.removeEventListener('game-ended', handleGameEnded as EventListener);
        window.removeEventListener('start-game-request', handleStartGameRequest as EventListener);
    };
  }, [veterans, fngGear]);

  const handleMenuUpdate = (newConfig: any) => {
      const p = newConfig.player;
      if (canvasRef.current) {
         if (p.currentMagic !== undefined && p.currentMagic !== (hudData?.coins || 0)) {
             canvasRef.current.setMagic(p.currentMagic);
             setHudData((prev: any) => prev ? ({ ...prev, coins: p.currentMagic }) : prev);
         }
         if (p.currentHp !== undefined && p.currentHp !== (hudData?.hp || 0)) {
             canvasRef.current.setHealth(p.currentHp);
             setHudData((prev: any) => prev ? ({ ...prev, hp: p.currentHp }) : prev);
         }
      }
      const cleanBalance = { ...newConfig };
      cleanBalance.player = { ...newConfig.player };
      delete cleanBalance.player.currentHp;
      delete cleanBalance.player.currentMagic;
      // Do NOT delete cheats here, they need to persist in balance
      setBalance(cleanBalance);
  };

  useEffect(() => {
      const handleOpenSettings = () => setPaused(true);
      window.addEventListener('open-settings', handleOpenSettings);
      return () => window.removeEventListener('open-settings', handleOpenSettings);
  }, []);

  const menuConfig = {
      ...balance,
      player: {
          speed: balance.player.speed,
          maxHp: balance.player.maxHp,
          currentHp: Math.floor(hudData?.hp || 0), 
          pickupRadius: balance.player.pickupRadius,
          pickupTime: balance.player.pickupTime,
          radius: balance.player.radius,
          currentMagic: hudData?.coins || 0 
      }
  };

  return (
    <div className="relative w-full h-[100dvh] overflow-hidden bg-slate-900 touch-none">
      <GameCanvas 
        ref={canvasRef}
        balance={balance} 
        paused={paused} 
        setPaused={setPaused}
        onUpdateHUD={handleHUDUpdate}
      />
      <UIOverlay 
        data={hudData} 
        balance={balance} 
        veterans={veterans} 
        fngGear={fngGear}
      />
      {paused && (
        <PauseMenu 
          config={menuConfig} 
          onUpdate={handleMenuUpdate} 
          onResume={() => setPaused(false)} 
        />
      )}
    </div>
  );
}