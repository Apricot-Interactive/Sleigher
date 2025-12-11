
import React, { useState, useRef, useEffect } from 'react';
import { InventoryItem, ItemTier, HUDState } from '../types.ts';
import { WeaponIcon } from './WeaponIcon.tsx';

interface HUDProps {
    data: HUDState; 
}

export const HUD: React.FC<HUDProps> = ({ data }) => {
    const [bagOpen, setBagOpen] = useState(false);
    const [lastBagInteraction, setLastBagInteraction] = useState(0);
    const [swapSource, setSwapSource] = useState<{ location: 'bag' | 'gear', index: number } | null>(null);
    const [popupItem, setPopupItem] = useState<{ item: InventoryItem | null, location: 'bag' | 'equipped' | 'gear', index: number } | null>(null);
    const longPressTimerRef = useRef<number | null>(null);
    const [pressingTarget, setPressingTarget] = useState<{ location: string, index: number } | null>(null);
    const closeBagTimerRef = useRef<number | null>(null);

    // Auto-close bag based on movement/firing
    useEffect(() => {
        if (!data) return;
        
        // Always open if selling
        if (data.activeModal === 'sell') {
            setBagOpen(true);
            if (closeBagTimerRef.current) clearTimeout(closeBagTimerRef.current);
            return;
        }

        // If bag is closed, clear any pending close timers
        if (!bagOpen) {
            if (closeBagTimerRef.current) {
                clearTimeout(closeBagTimerRef.current);
                closeBagTimerRef.current = null;
            }
            return;
        }

        const isBusy = data.isMoving || data.isFiring;

        if (isBusy) {
            // Player is active, start 2s close timer if not already running
            if (!closeBagTimerRef.current) {
                closeBagTimerRef.current = window.setTimeout(() => {
                    setBagOpen(false);
                    setSwapSource(null);
                    closeBagTimerRef.current = null;
                }, 2000);
            }
        } else {
            // Player is idle, cancel any close timer so bag stays open indefinitely
            if (closeBagTimerRef.current) {
                clearTimeout(closeBagTimerRef.current);
                closeBagTimerRef.current = null;
            }
        }
    }, [bagOpen, data?.isMoving, data?.isFiring, data?.activeModal]);

    // Clean up timer on unmount
    useEffect(() => {
        return () => {
            if (closeBagTimerRef.current) clearTimeout(closeBagTimerRef.current);
        };
    }, []);

    // Handle "Inventory Added" Flash Open
    useEffect(() => {
        const handleAdded = () => {
            setBagOpen(true);
            setLastBagInteraction(Date.now());
        };
        window.addEventListener('inventory-item-added', handleAdded);
        return () => window.removeEventListener('inventory-item-added', handleAdded);
    }, []);

    const refreshTimer = () => setLastBagInteraction(Date.now());

    const getTierColor = (tier?: ItemTier) => {
        if (tier === ItemTier.Grey) return 'border-slate-400 text-slate-400';
        if (tier === ItemTier.Green) return 'border-green-400 text-green-400';
        if (tier === ItemTier.Blue) return 'border-blue-400 text-blue-400';
        if (tier === ItemTier.Red) return 'border-red-400 text-red-400';
        return 'border-slate-600';
    };

    const renderGearIcon = (item: InventoryItem | null) => {
        if (!item) return <div className="text-transparent">.</div>;
        let icon = '🛡️';
        if (item.stats?.type === 'pen') icon = '✒️';
        else if (item.stats?.type === 'turret') icon = '🤖';
        else if (item.stats?.type === 'snowman') icon = '⛄';
        else if (item.stats?.type === 'medkit') icon = '🏥';
        else if (item.stats?.type === 'shoes') icon = '👟';
        else if (item.stats?.type === 'lightning') icon = '⚡';
        else if (item.stats?.type === 'beaker') icon = '🧪';
        else if (item.stats?.type === 'santa_hat') icon = '🎅';
        return <div className="text-2xl leading-none flex items-center justify-center h-full w-full drop-shadow-md">{icon}</div>;
    };

    const hpPercent = (data.hp / data.maxHp) * 100;
    const waveProgress = Math.max(0, (data.waveTimer / data.waveDuration) * 100);

    const handlePointerDown = (e: React.PointerEvent, item: InventoryItem | null, location: 'bag' | 'equipped' | 'gear', index: number) => {
        e.stopPropagation(); // Prevent bubbling to window which triggers game firing
        window.dispatchEvent(new CustomEvent('ui-interaction-start'));
        
        if (!item) return;
        setPressingTarget({ location, index });
        longPressTimerRef.current = window.setTimeout(() => {
            setPopupItem({ item, location, index });
            setPressingTarget(null);
        }, 1000);
    };

    const handlePointerUp = () => {
        window.dispatchEvent(new CustomEvent('ui-interaction-end'));

        if (longPressTimerRef.current) {
            clearTimeout(longPressTimerRef.current);
            longPressTimerRef.current = null;
        }
        setPressingTarget(null);
    };

    const handleBagItemClick = (index: number) => {
        refreshTimer();
        const item = data.inventory[index];
        if (!item) return;

        // Sell Logic Override
        if (data.activeModal === 'sell') {
            window.dispatchEvent(new CustomEvent('sell-item', { detail: { index } }));
            return;
        }

        if (item.type === 'weapon') {
            window.dispatchEvent(new CustomEvent('swap-bag-weapon', { detail: { index } }));
        } else if (item.type === 'gear') {
            if (swapSource?.location === 'bag' && swapSource.index === index) {
                setSwapSource(null);
            } else {
                setSwapSource({ location: 'bag', index });
            }
        }
    };

    const handleGearSlotClick = (index: number) => {
        refreshTimer();
        if (data.activeModal === 'sell') return; // Can't edit gear while selling

        if (swapSource) {
            // Execute Swap
            window.dispatchEvent(new CustomEvent('move-item', { 
                detail: { 
                    source: { list: swapSource.location === 'bag' ? 'inventory' : 'gear', index: swapSource.index },
                    dest: { list: 'gear', index }
                }
            }));
            setSwapSource(null);
        } else {
            // Select Source
            if (data.equippedGear[index]) {
                setSwapSource({ location: 'gear', index });
            }
        }
    };

    const handleDrop = () => {
        if (!popupItem) return;
        window.dispatchEvent(new CustomEvent('drop-item', { detail: { location: popupItem.location, index: popupItem.index } }));
        setPopupItem(null);
    };
    
    const handleUpgradeWeapon = () => {
        window.dispatchEvent(new CustomEvent('upgrade-weapon'));
    };

    const weaponColorClass = getTierColor(data.weaponTier).split(' ')[1]; // Extract text color class

    // --- MODAL RENDERING ---
    let modalContent = null;
    
    // Generic Modal Wrapper Helper
    const renderBunkerModal = (title: string, body: React.ReactNode, footerText: string = "Walk away to close") => (
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-slate-900 border-4 border-slate-600 p-8 rounded-lg shadow-2xl z-[100] flex flex-col gap-4 items-center w-80 pointer-events-auto" onClick={e=>e.stopPropagation()}>
             <h2 className="text-2xl font-black text-white uppercase border-b border-slate-700 w-full text-center pb-2">{title}</h2>
             <div className="w-full flex flex-col items-center">
                 {body}
             </div>
             <div className="text-slate-500 text-xs mt-2">{footerText}</div>
        </div>
    );

    if (data.activeModal === 'gunsmith') {
        const tier = data.weaponTier;
        const nextTier = tier < ItemTier.Red ? tier + 1 : null;
        let upgradeCost = 0;
        if (tier === ItemTier.Grey) upgradeCost = 100;
        else if (tier === ItemTier.Green) upgradeCost = 500;
        else if (tier === ItemTier.Blue) upgradeCost = 2500;
        
        const canAfford = data.coins >= upgradeCost;
        const tierNames = ['GREY', 'GREEN', 'BLUE', 'RED'];
        
        const body = (
             <>
                <div className="flex flex-col items-center gap-1 mb-4">
                     <div className={`text-xl font-bold ${getTierColor(tier)}`}>{tierNames[tier]} {data.weapon}</div>
                     <div className="text-slate-400 text-xs uppercase">Current Weapon</div>
                 </div>
                 
                 {nextTier !== null ? (
                     <button 
                        onClick={handleUpgradeWeapon}
                        disabled={!canAfford}
                        className={`w-full py-4 rounded font-bold uppercase border-2 transition-all flex flex-col items-center ${canAfford ? 'bg-green-700 hover:bg-green-600 border-green-500 text-white' : 'bg-slate-800 border-slate-600 text-slate-500 cursor-not-allowed'}`}
                     >
                         <span>Upgrade to {tierNames[nextTier]}</span>
                         <span className="text-xs opacity-80 flex items-center gap-1">Cost: {upgradeCost} ✨</span>
                     </button>
                 ) : (
                     <div className="w-full py-4 bg-slate-800 border-2 border-slate-600 text-yellow-500 font-bold uppercase text-center rounded">
                         Max Level Reached
                     </div>
                 )}
             </>
        );

        modalContent = renderBunkerModal("Gunsmith", body);
    } 
    else if (data.activeModal === 'sell') {
        const body = (
            <div className="text-center text-slate-300 font-bold">
                Click an item in your inventory to sell it
            </div>
        );
        modalContent = renderBunkerModal("SELL", body);
    }
    else if (data.activeModal === 'crafting') {
        const body = (
            <div className="text-center text-slate-400 italic">
                Coming soon
            </div>
        );
        modalContent = renderBunkerModal("Crafting Station", body);
    }

    return (
        <div className="absolute inset-0 pointer-events-none p-4 flex flex-col justify-between">
            {/* TOP BAR */}
            <div className="flex justify-between items-start">
                <div className="flex flex-col gap-2">
                    <div className="w-64 h-6 bg-slate-900 border-2 border-slate-600 rounded skew-x-[-12deg] overflow-hidden relative">
                        <div className="h-full bg-red-600 transition-all duration-200" style={{ width: `${Math.max(0, hpPercent)}%` }} />
                        <span className="absolute inset-0 flex items-center justify-center font-bold text-sm text-white drop-shadow">HP {Math.floor(data.hp)} / {data.maxHp}</span>
                    </div>
                </div>
                <div className="text-right flex flex-col items-end">
                    <div className="text-4xl font-black text-white drop-shadow-lg tracking-tighter">
                        {data.hordeTime ? <span className="text-red-500">SURVIVE: {Math.ceil(data.hordeTime)}s</span> : data.inBunker ? <span className="text-yellow-500">BUNKER HUB</span> : <span>WAVE {data.wave}</span>}
                    </div>
                    {!data.hordeTime && !data.inBunker && (
                         <div className="w-32 h-2 bg-slate-800 rounded mt-1 overflow-hidden"><div className="h-full bg-blue-500" style={{ width: `${waveProgress}%` }} /></div>
                    )}
                    <div className="flex gap-4 items-center justify-end mt-2">
                         <div className="text-yellow-400 font-bold text-xl flex items-center gap-2"><span>🗝️</span> {data.keys}</div>
                         <div className="text-yellow-400 font-bold text-xl flex items-center gap-2"><span>✨</span> {data.coins}</div>
                    </div>
                </div>
            </div>

            {/* INTERACTION PROMPTS (Popups) - Only show if no modal active */}
            {!data.activeModal && (
                <div className="absolute top-1/4 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 pointer-events-none">
                    {data.showInfuse && (
                        <div className="bg-orange-600 text-white px-6 py-3 rounded-full font-black uppercase text-xl border-4 border-orange-400 shadow-xl">
                            [E] {data.depositedCoins > 0 ? 'INFUSE MORE' : 'INFUSE MAGIC'}
                        </div>
                    )}
                    {data.showSummon && (
                         <div className="bg-orange-600 text-white px-6 py-3 rounded-full font-black uppercase text-xl border-4 border-orange-400 shadow-xl">
                            [Q] START IT UP!
                        </div>
                    )}
                    {data.showGunsmith && (
                         <div className="bg-slate-800 text-white px-6 py-3 rounded-full font-bold uppercase text-lg border-2 border-slate-500 shadow-xl">
                            [E] GUNSMITH
                        </div>
                    )}
                    {data.showSell && (
                         <div className="bg-slate-800 text-white px-6 py-3 rounded-full font-bold uppercase text-lg border-2 border-slate-500 shadow-xl">
                            [E] SELL ITEMS
                        </div>
                    )}
                    {data.showCrafting && (
                         <div className="bg-slate-800 text-white px-6 py-3 rounded-full font-bold uppercase text-lg border-2 border-slate-500 shadow-xl">
                            [E] CRAFTING
                        </div>
                    )}
                </div>
            )}
            
            {/* Modal Layer */}
            {modalContent}

            {/* POPUP MODAL */}
            {popupItem && (
                <div className="absolute inset-0 flex items-center justify-center z-[100] pointer-events-auto bg-black/50 backdrop-blur-sm" onClick={(e) => e.stopPropagation()}>
                    <div className="bg-slate-900 border-2 border-slate-500 p-6 rounded shadow-2xl max-w-sm w-full">
                        <h2 className="text-xl font-bold text-white mb-2">{popupItem.item?.type === 'weapon' ? `${ItemTier[popupItem.item?.tier || 0]} ${popupItem.item?.weaponType}` : popupItem.item?.label || 'Item'}</h2>
                        <p className="text-slate-400 text-sm mb-6">{popupItem.item?.type === 'gear' ? 'Gear Item' : 'Weapon'}</p>
                        <div className="flex gap-4">
                            <button onClick={handleDrop} className="flex-1 py-3 bg-red-600 hover:bg-red-500 text-white font-bold rounded uppercase">Drop</button>
                            <button onClick={() => setPopupItem(null)} className="flex-1 py-3 bg-slate-700 hover:bg-slate-600 text-white font-bold rounded uppercase">Cancel</button>
                        </div>
                    </div>
                </div>
            )}

            {/* BOTTOM HUD */}
            <div className="flex justify-between items-end relative w-full pointer-events-auto" onClick={() => { setSwapSource(null); if (bagOpen && Date.now() - lastBagInteraction > 500 && !data.activeModal) setBagOpen(false); }}>
                
                {/* BOTTOM LEFT: GEAR */}
                <div className="flex flex-col gap-1" onClick={e => e.stopPropagation()}>
                    <div className="text-slate-400 font-bold uppercase text-xs tracking-wider mb-3">Gear</div>
                    <div className="grid grid-cols-2 gap-2">
                        {[0,1,2,3].map(i => {
                            const item = data.equippedGear[i];
                            const isSelected = swapSource?.location === 'gear' && swapSource.index === i;
                            const isTarget = !!swapSource;
                            return (
                                <div 
                                    key={i}
                                    onPointerDown={(e) => handlePointerDown(e, item, 'gear', i)}
                                    onPointerUp={handlePointerUp}
                                    onPointerLeave={handlePointerUp}
                                    onClick={() => handleGearSlotClick(i)}
                                    className={`w-16 h-16 bg-slate-900/90 border-2 rounded flex items-center justify-center relative cursor-pointer pointer-events-auto transition-all hover:scale-105 active:scale-95
                                        ${i === 0 ? 'border-yellow-600' : 'border-slate-600'}
                                        ${isSelected ? 'ring-2 ring-white scale-105 z-10' : ''}
                                        ${isTarget && !isSelected ? 'animate-pulse ring-1 ring-yellow-400 bg-yellow-900/20' : ''}
                                    `}
                                >
                                    {pressingTarget?.location === 'gear' && pressingTarget.index === i && (
                                        <div className="absolute inset-0 z-50 flex items-center justify-center pointer-events-none">
                                           <svg className="w-full h-full rotate-[-90deg] p-1">
                                              <circle cx="50%" cy="50%" r="40%" fill="none" stroke="white" strokeWidth="4" pathLength="100" strokeDasharray="100" strokeDashoffset="100" style={{animation: 'dash 1s linear forwards'}} />
                                           </svg>
                                        </div>
                                    )}
                                    {i === 0 && <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-yellow-800 text-yellow-100 text-[9px] px-2 rounded-full font-bold uppercase border border-yellow-600 z-10">SAFE</div>}
                                    {renderGearIcon(item)}
                                    {item && item.stats?.hpBonus && <div className="absolute bottom-0 right-1 text-[10px] text-green-400 font-bold">+{item.stats.hpBonus}</div>}
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* BOTTOM RIGHT: WEAPON & BAG */}
                <div className="flex flex-col items-end gap-1 relative" onClick={e => e.stopPropagation()}>
                    <div className={`text-sm uppercase tracking-widest font-bold ${weaponColorClass}`}>
                        {ItemTier[data.weaponTier]} {data.weapon}
                    </div>
                    
                    <div className="flex gap-2 items-end">
                        {/* BAG BUTTON & FLYOUT CONTAINER */}
                        <div className="relative">
                            {bagOpen && (
                                <div className="absolute right-[calc(100%+8px)] bottom-0 flex flex-col items-end gap-2">
                                    <div className="bg-black/50 text-white text-xs px-2 py-1 rounded whitespace-nowrap shadow-md backdrop-blur-sm">
                                        {data.activeModal === 'sell' ? 'CLICK TO SELL' : 'Tap to equip, hold to drop'}
                                    </div>
                                    <div className={`bg-slate-900/95 border-2 ${data.activeModal === 'sell' ? 'border-yellow-400' : 'border-slate-600'} p-2 rounded shadow-2xl grid grid-cols-3 gap-2 w-max`}>
                                        {[0,1,2,3,4,5].map(i => {
                                            const item = data.inventory[i];
                                            const isSelected = swapSource?.location === 'bag' && swapSource.index === i;
                                            return (
                                                <div 
                                                    key={i}
                                                    onPointerDown={(e) => handlePointerDown(e, item, 'bag', i)}
                                                    onPointerUp={handlePointerUp}
                                                    onPointerLeave={handlePointerUp}
                                                    onClick={() => handleBagItemClick(i)}
                                                    className={`w-16 h-16 bg-slate-800 border-2 rounded flex flex-col items-center justify-center relative cursor-pointer pointer-events-auto hover:bg-slate-700 overflow-hidden
                                                        ${item ? getTierColor(item.tier) : 'border-slate-700'}
                                                        ${isSelected ? 'ring-2 ring-white bg-slate-700' : ''}
                                                    `}
                                                >
                                                    {pressingTarget?.location === 'bag' && pressingTarget.index === i && (
                                                        <div className="absolute inset-0 z-50 flex items-center justify-center pointer-events-none">
                                                            <svg className="w-full h-full rotate-[-90deg] p-1">
                                                                <circle cx="50%" cy="50%" r="40%" fill="none" stroke="white" strokeWidth="4" pathLength="100" strokeDasharray="100" strokeDashoffset="100" style={{animation: 'dash 1s linear forwards'}} />
                                                            </svg>
                                                        </div>
                                                    )}
                                                    {item ? (
                                                        <>
                                                            {item.type === 'weapon' ? <WeaponIcon type={item.weaponType!} className="w-8 h-8" /> : renderGearIcon(item)}
                                                            {data.activeModal === 'sell' && (
                                                                <div className="absolute bottom-0 w-full bg-black/60 text-yellow-400 text-[9px] text-center font-bold">
                                                                    ${item.value}
                                                                </div>
                                                            )}
                                                        </>
                                                    ) : null}
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}
                            <button 
                                onClick={() => { setBagOpen(!bagOpen); setLastBagInteraction(Date.now()); }}
                                className={`w-16 h-16 bg-slate-800 border-2 ${bagOpen || data.activeModal === 'sell' ? 'border-yellow-400 bg-slate-700' : 'border-slate-500'} rounded flex items-center justify-center text-3xl hover:bg-slate-700 transition-colors pointer-events-auto shadow-lg active:scale-95`}
                            >
                                🎒
                            </button>
                        </div>

                        {/* EQUIPPED WEAPON */}
                        <div 
                            onPointerDown={(e) => handlePointerDown(e, { type: 'weapon', weaponType: data.weapon, tier: data.weaponTier } as any, 'equipped', -1)}
                            onPointerUp={handlePointerUp}
                            onPointerLeave={handlePointerUp}
                            className={`w-16 h-16 bg-slate-900/90 border-2 ${getTierColor(data.weaponTier)} rounded flex items-center justify-center cursor-pointer pointer-events-auto relative overflow-hidden`}
                        >
                            {pressingTarget?.location === 'equipped' && (
                                <div className="absolute inset-0 z-50 flex items-center justify-center pointer-events-none">
                                    <svg className="w-full h-full rotate-[-90deg] p-1">
                                        <circle cx="50%" cy="50%" r="40%" fill="none" stroke="white" strokeWidth="4" pathLength="100" strokeDasharray="100" strokeDashoffset="100" style={{animation: 'dash 1s linear forwards'}} />
                                    </svg>
                                </div>
                            )}
                            <WeaponIcon type={data.weapon} className="w-10 h-10" />
                        </div>

                        {/* AMMO */}
                        <div className="flex flex-col justify-center h-16 px-2">
                            <div className="text-3xl font-black text-white leading-none">{data.ammo}</div>
                            <div className="text-sm text-white font-bold">/ {data.maxAmmo}</div>
                        </div>
                    </div>
                </div>

            </div>
             <div className="absolute top-4 left-1/2 -translate-x-1/2 text-slate-500 text-xs">PRESS [ESC] TO TUNE GAME</div>
        </div>
    );
};
