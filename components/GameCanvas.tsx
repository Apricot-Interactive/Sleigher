

import React, { useEffect, useRef, useState, forwardRef, useImperativeHandle } from 'react';
import { GameBalance, GameState, ItemTier, WeaponType, InventoryItem, HUDState } from '../types.ts';
import { createInitialState, updateGame } from '../systems/GameLoop.ts';
import { drawGame, createCamoPattern, createWoodPattern } from '../systems/GameRenderer.ts';
import { BUNKER_ZONES, POI_LOCATIONS } from '../constants.ts';
import { distance, normalize } from '../utils/math.ts';
import { handleInteraction, calculateInteractionFlags, recalculatePlayerStats } from '../systems/InteractionSystem.ts';
import { addFloatingText } from '../systems/ParticleSystem.ts';

interface GameCanvasProps {
  balance: GameBalance;
  paused: boolean;
  setPaused: (p: boolean) => void;
  onUpdateHUD: (data: HUDState) => void;
}

export interface GameCanvasHandle {
    setMagic: (amount: number) => void;
    setHealth: (amount: number) => void;
    setMaxHealth: (amount: number) => void;
}

export const GameCanvas = forwardRef<GameCanvasHandle, GameCanvasProps>(({ balance, paused, setPaused, onUpdateHUD }, ref) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationFrameRef = useRef<number>(0);
  const lastTimeRef = useRef<number>(0);
  const lastHudUpdateRef = useRef<number>(0);
  const gameStateRef = useRef<GameState>(createInitialState(balance));
  const gameEndedEmittedRef = useRef<boolean>(false);
  const isUiInteractingRef = useRef<boolean>(false);
  
  // Mobile Touch Refs
  const touchStartTimesRef = useRef<Map<number, number>>(new Map());
  const touchStartPositionsRef = useRef<Map<number, {x:number, y:number}>>(new Map());

  // UI Interaction State
  const [activeModal, setActiveModal] = useState<'sell' | 'gunsmith' | 'crafting' | null>(null);

  // UI Prompt States
  const uiFlagsRef = useRef({
      showInfuse: false, 
      showSummon: false,
      showCrafting: false,
      showSell: false,
      showGunsmith: false,
      showMedic: false
  });
  
  // Assets
  const assetsRef = useRef<{ bg: CanvasPattern | null, wood: CanvasPattern | null }>({ bg: null, wood: null });

  useImperativeHandle(ref, () => ({
      setMagic: (amount: number) => { gameStateRef.current.player.coins = amount; },
      setHealth: (amount: number) => { gameStateRef.current.player.hp = Math.min(amount, gameStateRef.current.player.maxHp); },
      setMaxHealth: (amount: number) => { }
  }));

  useEffect(() => {
      assetsRef.current.bg = createCamoPattern();
      assetsRef.current.wood = createWoodPattern();
  }, []);

  useEffect(() => {
      const handleUiStart = () => { isUiInteractingRef.current = true; gameStateRef.current.inputs.keys.delete('mousedown'); };
      const handleUiEnd = () => { isUiInteractingRef.current = false; };
      const handleRestart = (e: CustomEvent) => {
          const { loadout } = e.detail;
          gameStateRef.current = createInitialState(balance, loadout);
          gameStateRef.current.gamePhase = 'playing';
          gameEndedEmittedRef.current = false;
          setActiveModal(null);
      };

      const handleSellItem = (e: CustomEvent) => {
          const { index } = e.detail;
          const s = gameStateRef.current;
          const p = s.player;
          const item = p.inventory[index];
          if (item) {
              p.coins += item.value;
              p.inventory.splice(index, 1);
              addFloatingText(s, s.bunkerPlayerPos, `+$${item.value}`, '#fbbf24');
          }
      };
      
      const handleUpgradeWeapon = () => {
          const s = gameStateRef.current;
          const p = s.player;
          const currentTier = p.weaponTiers[p.weapon];
          
          if (currentTier >= ItemTier.Red) return;
          
          let cost = 0;
          if (currentTier === ItemTier.Grey) cost = 100;
          else if (currentTier === ItemTier.Green) cost = 500;
          else if (currentTier === ItemTier.Blue) cost = 2500;
          
          if (p.coins >= cost) {
              p.coins -= cost;
              p.weaponTiers[p.weapon] = currentTier + 1;
              p.maxTiers[p.weapon] = Math.max(p.maxTiers[p.weapon], currentTier + 1);
              addFloatingText(s, s.bunkerPlayerPos, "UPGRADED!", '#22c55e', 1.5);
          }
      };
      
      // Mobile Action Listener
      const handleMobileAction = (e: CustomEvent) => {
          const { action } = e.detail;
          if (action === 'interact') {
              handleInteraction(gameStateRef.current, balance, activeModal, setActiveModal);
          } else if (action === 'summon') {
              gameStateRef.current.bossState.summonRequested = true;
          }
      };

      window.addEventListener('ui-interaction-start', handleUiStart);
      window.addEventListener('ui-interaction-end', handleUiEnd);
      window.addEventListener('restart-game', handleRestart as EventListener);
      window.addEventListener('start-game', (() => {
          gameStateRef.current.gamePhase = 'playing';
      }) as EventListener);
      window.addEventListener('return-to-menu', (() => {
           gameStateRef.current = createInitialState(balance);
           gameStateRef.current.gamePhase = 'menu';
           gameEndedEmittedRef.current = false;
           setActiveModal(null);
      }) as EventListener);
      
      window.addEventListener('sell-item', handleSellItem as EventListener);
      window.addEventListener('upgrade-weapon', handleUpgradeWeapon);
      window.addEventListener('mobile-action', handleMobileAction as EventListener);
      
      return () => {
          window.removeEventListener('ui-interaction-start', handleUiStart);
          window.removeEventListener('ui-interaction-end', handleUiEnd);
          window.removeEventListener('restart-game', handleRestart as EventListener);
          window.removeEventListener('start-game', (() => {}) as EventListener);
          window.removeEventListener('return-to-menu', (() => {}) as EventListener);
          window.removeEventListener('sell-item', handleSellItem as EventListener);
          window.removeEventListener('upgrade-weapon', handleUpgradeWeapon);
          window.removeEventListener('mobile-action', handleMobileAction as EventListener);
      };
  }, [balance]);

    // Key Handlers & Input
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
          const k = e.key.toLowerCase();
          if (e.key === 'Escape') setPaused(!paused);
          gameStateRef.current.inputs.keys.add(k);
          
          if (gameStateRef.current.gamePhase !== 'playing') return;
          const s = gameStateRef.current;
          
          if (k === 'q') {
              if (uiFlagsRef.current.showSummon) {
                  s.bossState.summonRequested = true;
              }
          }

          if (k === 'e') {
              // Delegate to InteractionSystem
              handleInteraction(s, balance, activeModal, setActiveModal);
          }
      };

      const handleKeyUp = (e: KeyboardEvent) => {
          gameStateRef.current.inputs.keys.delete(e.key.toLowerCase());
      };
      
      const handleMouseDown = (e: MouseEvent) => { 
          if (activeModal || isUiInteractingRef.current) return;
          gameStateRef.current.inputs.keys.add('mousedown'); 
      };
      const handleMouseUp = () => { gameStateRef.current.inputs.keys.delete('mousedown'); };
      const handleMouseMove = (e: MouseEvent) => {
          if (!canvasRef.current) return;
          const rect = canvasRef.current.getBoundingClientRect();
          gameStateRef.current.inputs.mouse.x = e.clientX - rect.left;
          gameStateRef.current.inputs.mouse.y = e.clientY - rect.top;
      };

      // TOUCH HANDLERS
      const handleTouchStart = (e: TouchEvent) => {
          if (isUiInteractingRef.current) return;
          if ((e.target as HTMLElement).tagName !== 'CANVAS') return;
          e.preventDefault();

          const s = gameStateRef.current;
          
          for(let i=0; i<e.changedTouches.length; i++) {
              const t = e.changedTouches[i];
              const x = t.clientX;
              const y = t.clientY;
              
              touchStartTimesRef.current.set(t.identifier, Date.now());
              touchStartPositionsRef.current.set(t.identifier, {x, y});

              // Create floating joystick anywhere touched if not already active
              if (!s.inputs.mobile.joysticks.left.active) {
                  s.inputs.mobile.joysticks.left = { origin: {x,y}, current: {x,y}, active: true, id: t.identifier };
              }
          }
      };

      const handleTouchMove = (e: TouchEvent) => {
          if ((e.target as HTMLElement).tagName !== 'CANVAS') return;
          e.preventDefault();
          const s = gameStateRef.current;
          
          for(let i=0; i<e.changedTouches.length; i++) {
              const t = e.changedTouches[i];
              if (s.inputs.mobile.joysticks.left.id === t.identifier) {
                  s.inputs.mobile.joysticks.left.current = { x: t.clientX, y: t.clientY };
                  const dx = t.clientX - s.inputs.mobile.joysticks.left.origin.x;
                  const dy = t.clientY - s.inputs.mobile.joysticks.left.origin.y;
                  const len = Math.hypot(dx, dy);
                  const maxDist = 50;
                  if (len > 0) {
                      const scale = Math.min(len, maxDist) / maxDist;
                      s.inputs.mobile.moveVec = { x: (dx/len)*scale, y: (dy/len)*scale };
                  } else {
                      s.inputs.mobile.moveVec = { x: 0, y: 0 };
                  }
              }
          }
      };

      const handleTouchEnd = (e: TouchEvent) => {
           if ((e.target as HTMLElement).tagName !== 'CANVAS') return;
           e.preventDefault();
           const s = gameStateRef.current;
           const width = window.innerWidth;
           const height = window.innerHeight;

           for(let i=0; i<e.changedTouches.length; i++) {
               const t = e.changedTouches[i];
               
               const startTime = touchStartTimesRef.current.get(t.identifier) || 0;
               const startPos = touchStartPositionsRef.current.get(t.identifier) || {x:0, y:0};
               const duration = Date.now() - startTime;
               const dist = Math.hypot(t.clientX - startPos.x, t.clientY - startPos.y);
               
               if (duration < 300 && dist < 20) {
                   const screenX = width / 2;
                   const screenY = height / 2 - 75;
                   
                   const dx = Math.abs(t.clientX - screenX);
                   const dy = Math.abs(t.clientY - screenY);
                   
                   if (dx < 60 && dy < 30) {
                       handleInteraction(s, balance, activeModal, setActiveModal);
                   }
               }

               if (s.inputs.mobile.joysticks.left.id === t.identifier) {
                   s.inputs.mobile.joysticks.left.active = false;
                   s.inputs.mobile.joysticks.left.id = null;
                   s.inputs.mobile.moveVec = { x: 0, y: 0 };
               }
               
               touchStartTimesRef.current.delete(t.identifier);
               touchStartPositionsRef.current.delete(t.identifier);
           }
      };

      window.addEventListener('keydown', handleKeyDown);
      window.addEventListener('keyup', handleKeyUp);
      window.addEventListener('mousedown', handleMouseDown);
      window.addEventListener('mouseup', handleMouseUp);
      window.addEventListener('mousemove', handleMouseMove);
      
      const canvasEl = canvasRef.current;
      if (canvasEl) {
          canvasEl.addEventListener('touchstart', handleTouchStart, { passive: false });
          canvasEl.addEventListener('touchmove', handleTouchMove, { passive: false });
          canvasEl.addEventListener('touchend', handleTouchEnd, { passive: false });
          canvasEl.addEventListener('touchcancel', handleTouchEnd, { passive: false });
      }
      
      return () => {
          window.removeEventListener('keydown', handleKeyDown);
          window.removeEventListener('keyup', handleKeyUp);
          window.removeEventListener('mousedown', handleMouseDown);
          window.removeEventListener('mouseup', handleMouseUp);
          window.removeEventListener('mousemove', handleMouseMove);
          if (canvasEl) {
              canvasEl.removeEventListener('touchstart', handleTouchStart);
              canvasEl.removeEventListener('touchmove', handleTouchMove);
              canvasEl.removeEventListener('touchend', handleTouchEnd);
              canvasEl.removeEventListener('touchcancel', handleTouchEnd);
          }
      };
    }, [paused, activeModal, balance]);

    // Item Management Handlers
    useEffect(() => {
        const handleSwapBagWeapon = (e: CustomEvent) => {
          const { index } = e.detail;
          const s = gameStateRef.current;
          const p = s.player;
          const item = p.inventory[index];
          if (item && item.type === 'weapon' && item.weaponType) {
              const currentWeapon = p.weapon;
              const currentTier = p.weaponTiers[p.weapon];
              
              // Swap
              p.weapon = item.weaponType;
              p.weaponTiers[p.weapon] = item.tier || ItemTier.Grey;
              p.maxTiers[p.weapon] = Math.max(p.maxTiers[p.weapon], item.tier || ItemTier.Grey);
              p.ammo = balance.weapons[p.weapon].magSize;

              // Put old into inventory
              p.inventory[index] = {
                  id: Math.random().toString(),
                  type: 'weapon',
                  weaponType: currentWeapon,
                  tier: currentTier,
                  value: Math.floor(balance.economy.baseWeaponCost * (1 + currentTier)),
                  label: `${ItemTier[currentTier]} ${currentWeapon}`
              };
          }
      };

      const handleMoveItem = (e: CustomEvent) => {
          const { source, dest } = e.detail;
          const s = gameStateRef.current;
          const p = s.player;
          
          const getItem = (loc: { list: string, index: number }) => {
              if (loc.list === 'inventory') return p.inventory[loc.index] || null;
              if (loc.list === 'gear') return p.equippedGear[loc.index] || null;
              return null;
          };

          const sourceItem = getItem(source);
          if (!sourceItem) return;

          // Type Check for Gear
          if (dest.list === 'gear' && sourceItem.type !== 'gear') {
              addFloatingText(s, s.inBunker ? s.bunkerPlayerPos : p.pos, "CAN'T EQUIP", '#ef4444');
              return;
          }

          const destItem = getItem(dest);
          
          if (source.list === 'inventory' && dest.list === 'gear') {
               p.equippedGear[dest.index] = sourceItem;
               if (destItem) {
                   p.inventory[source.index] = destItem;
               } else {
                   p.inventory.splice(source.index, 1);
               }
          } else if (source.list === 'gear' && dest.list === 'gear') {
               p.equippedGear[source.index] = destItem;
               p.equippedGear[dest.index] = sourceItem;
          } else if (source.list === 'gear' && dest.list === 'inventory') {
               // Move gear to inventory
               p.equippedGear[source.index] = null;
               p.inventory.push(sourceItem);
          }
          recalculatePlayerStats(s, balance);
      };

      const handleDropItem = (e: CustomEvent) => {
            const { location, index } = e.detail;
            const s = gameStateRef.current;
            const p = s.player;
            
            let itemToDrop: InventoryItem | null = null;
            
            if (location === 'bag') {
                itemToDrop = p.inventory[index];
                if (itemToDrop) p.inventory.splice(index, 1);
            } else if (location === 'gear') {
                itemToDrop = p.equippedGear[index];
                if (itemToDrop) p.equippedGear[index] = null;
            } else if (location === 'equipped') {
                const w = p.weapon;
                const t = p.weaponTiers[w];
                if (w === WeaponType.Pistol && t === ItemTier.Grey) return; // Can't drop starting pistol
                
                itemToDrop = { 
                    id: Math.random().toString(), type: 'weapon', weaponType: w, tier: t, value: 0, label: `${ItemTier[t]} ${w}` 
                };
                
                // Reset to default pistol
                p.weapon = WeaponType.Pistol;
                p.weaponTiers[WeaponType.Pistol] = ItemTier.Grey;
                p.ammo = balance.weapons[WeaponType.Pistol].magSize;
            }

            if (itemToDrop) {
                const searchCenter = { x: p.pos.x, y: p.pos.y + 50 };
                let dropPos = { ...searchCenter };
                let found = false;
                
                for(let r=0; r<=100; r+=20) {
                    const steps = r===0 ? 1 : Math.floor(r/5) + 4;
                    for(let i=0; i<steps; i++) {
                        const theta = (i/steps) * Math.PI * 2;
                        const test = { x: searchCenter.x + Math.cos(theta)*r, y: searchCenter.y + Math.sin(theta)*r };
                        const overlap = s.loot.some(other => !other.dead && distance(other.pos, test) < 30);
                        if(!overlap) {
                            dropPos = test;
                            found = true;
                            break;
                        }
                    }
                    if(found) break;
                }

                const tier = itemToDrop.tier || ItemTier.Grey;
                const color = tier === ItemTier.Red ? '#f87171' : tier === ItemTier.Blue ? '#60a5fa' : tier === ItemTier.Green ? '#4ade80' : '#94a3b8';

                if (itemToDrop.type === 'weapon') {
                    s.loot.push({
                        id: Math.random().toString(),
                        pos: dropPos,
                        velocity: {x:0, y:0},
                        radius: 15, rotation: 0, dead: false,
                        type: 'weapon_drop',
                        pickupProgress: 0,
                        weaponType: itemToDrop.weaponType,
                        tier: tier,
                        color: color,
                        label: itemToDrop.label
                    });
                } else {
                    s.loot.push({
                        id: Math.random().toString(),
                        pos: dropPos,
                        velocity: {x:0, y:0},
                        radius: 15, rotation: 0, dead: false,
                        type: 'item_drop',
                        pickupProgress: 0,
                        contents: {
                            type: 'gear',
                            tier: tier,
                            stats: itemToDrop.stats,
                            label: itemToDrop.label
                        },
                        label: itemToDrop.label
                    });
                }
                
                if (location === 'gear') {
                    recalculatePlayerStats(s, balance);
                }
            }
      };

      window.addEventListener('swap-bag-weapon', handleSwapBagWeapon as EventListener);
      window.addEventListener('move-item', handleMoveItem as EventListener);
      window.addEventListener('drop-item', handleDropItem as EventListener);
      
      return () => {
          window.removeEventListener('swap-bag-weapon', handleSwapBagWeapon as EventListener);
          window.removeEventListener('move-item', handleMoveItem as EventListener);
          window.removeEventListener('drop-item', handleDropItem as EventListener);
      };
    }, [balance]);

    // Game Loop
    useEffect(() => {
        const loop = (timestamp: number) => {
            if (!lastTimeRef.current) lastTimeRef.current = timestamp;
            let dt = timestamp - lastTimeRef.current;
            lastTimeRef.current = timestamp;
            
            // Cap DT to prevent physics explosions on lag spikes (Max 50ms = 20fps)
            if (dt > 50) dt = 50;
  
            if (!paused) {
                updateGame(gameStateRef.current, balance, dt);
                
                // HUD Updates (throttled ~10fps)
                if (timestamp - lastHudUpdateRef.current > 100) {
                   const s = gameStateRef.current;
                   
                   const flags = calculateInteractionFlags(s, balance);
                   uiFlagsRef.current = flags;

                   if (s.inBunker && !activeModal && !isUiInteractingRef.current) {
                        const bPos = s.bunkerPlayerPos;
                        if (distance(bPos, BUNKER_ZONES.SELL) < BUNKER_ZONES.SELL.radius) setActiveModal('sell');
                        else if (distance(bPos, BUNKER_ZONES.GUNSMITH) < BUNKER_ZONES.GUNSMITH.radius) setActiveModal('gunsmith');
                        else if (distance(bPos, BUNKER_ZONES.CRAFTING) < BUNKER_ZONES.CRAFTING.radius) setActiveModal('crafting');
                   }
                   if (s.inBunker && activeModal) {
                        const bPos = s.bunkerPlayerPos;
                        if (activeModal === 'sell' && distance(bPos, BUNKER_ZONES.SELL) >= BUNKER_ZONES.SELL.radius) setActiveModal(null);
                        else if (activeModal === 'gunsmith' && distance(bPos, BUNKER_ZONES.GUNSMITH) >= BUNKER_ZONES.GUNSMITH.radius) setActiveModal(null);
                        else if (activeModal === 'crafting' && distance(bPos, BUNKER_ZONES.CRAFTING) >= BUNKER_ZONES.CRAFTING.radius) setActiveModal(null);
                   }

                   onUpdateHUD({
                       hp: s.player.hp,
                       maxHp: s.player.maxHp,
                       ammo: s.player.ammo,
                       maxAmmo: balance.weapons[s.player.weapon].magSize,
                       coins: s.player.coins,
                       keys: s.player.keys,
                       inventory: s.player.inventory,
                       equippedGear: s.player.equippedGear,
                       wave: s.wave,
                       waveTimer: s.waveTimer,
                       waveDuration: balance.enemies.waveDuration * 1.5,
                       depositedCoins: s.depositedCoins,
                       showInfuse: flags.showInfuse,
                       showSummon: flags.showSummon,
                       showCrafting: flags.showCrafting,
                       showSell: flags.showSell,
                       showGunsmith: flags.showGunsmith,
                       showMedic: flags.showMedic,
                       weapon: s.player.weapon,
                       weaponTier: s.player.weaponTiers[s.player.weapon],
                       weaponTiers: s.player.weaponTiers,
                       maxTiers: s.player.maxTiers,
                       ownedWeapons: s.player.ownedWeapons,
                       ammoType: s.player.ammoType,
                       unlockedAmmo: Array.from(s.player.unlockedAmmo),
                       hordeTime: s.hordeMode.active ? s.hordeMode.timeLeft : null,
                       transferring: s.transferState.active,
                       inBunker: s.inBunker,
                       bunkerCooldown: 0,
                       gamePhase: s.gamePhase,
                       bossFight: { active: s.bossState.active, readyToExtract: s.bossState.readyToExtract, tier: s.bossState.tier },
                       victoryData: s.gamePhase === 'victory' ? { medal: s.bossState.tier || 'Bronze', wave: s.wave } : null,
                       isCombatActive: s.enemies.length > 0,
                       isMoving: Math.abs(s.player.velocity.x) > 0.1 || Math.abs(s.player.velocity.y) > 0.1,
                       isFiring: s.inputs.keys.has('mousedown') || s.inputs.mobile.isFiring || s.isAutoFiring,
                       activeModal: activeModal,
                       isMobile: s.isMobile
                   });
                   lastHudUpdateRef.current = timestamp;
                }
  
                if (gameStateRef.current.gamePhase === 'game_over' && !gameEndedEmittedRef.current) {
                    window.dispatchEvent(new CustomEvent('game-ended', { detail: { win: false, player: gameStateRef.current.player } }));
                    gameEndedEmittedRef.current = true;
                }
                if (gameStateRef.current.gamePhase === 'victory' && !gameEndedEmittedRef.current) {
                    window.dispatchEvent(new CustomEvent('game-ended', { detail: { win: true, player: gameStateRef.current.player } }));
                    gameEndedEmittedRef.current = true;
                }
            }
  
            if (canvasRef.current) {
                const ctx = canvasRef.current.getContext('2d');
                if (ctx) {
                    if (canvasRef.current.width !== window.innerWidth) canvasRef.current.width = window.innerWidth;
                    if (canvasRef.current.height !== window.innerHeight) canvasRef.current.height = window.innerHeight;
                    drawGame(ctx, canvasRef.current.width, canvasRef.current.height, gameStateRef.current, balance, assetsRef.current);
                }
            }
            
            animationFrameRef.current = requestAnimationFrame(loop);
        };
        animationFrameRef.current = requestAnimationFrame(loop);
        return () => cancelAnimationFrame(animationFrameRef.current);
    }, [balance, paused, activeModal]);

  return <canvas ref={canvasRef} className="block" />;
});