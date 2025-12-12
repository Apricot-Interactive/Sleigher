import React, { useState, useEffect, useRef } from 'react';
import { GameBalance, HeroRecord, InventoryItem, ItemTier, WeaponType } from '../types.ts';
import { WeaponIcon } from './WeaponIcon.tsx';
import { drawPlayer } from '../systems/GameRenderer.ts';
import { createInitialState } from '../systems/GameLoop.ts';

const HeroPreview = ({ balance, tier, weaponType }: { balance: GameBalance, tier: ItemTier, weaponType: WeaponType }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        
        // Mock State for Drawing
        const mockState: any = createInitialState(balance);
        // Move player up in the canvas (y=25) to clear the bottom banner
        mockState.player.pos = { x: 50, y: 25 };
        mockState.player.angle = Math.PI / 2;
        mockState.player.weapon = weaponType;
        mockState.player.weaponTiers[weaponType] = tier;
        
        ctx.clearRect(0,0,100,100);
        drawPlayer(ctx, mockState, balance);
    }, [balance, tier, weaponType]);

    return <canvas ref={canvasRef} width={100} height={100} />;
};

interface MainMenuProps {
    balance: GameBalance;
    veterans: HeroRecord[];
    fngGear: InventoryItem | null;
}

export const MainMenu: React.FC<MainMenuProps> = ({ balance, veterans, fngGear }) => {
    const [selectedHeroIndex, setSelectedHeroIndex] = useState<number>(-1);

    const getScore = (tier: ItemTier) => {
        if (tier === ItemTier.White) return 0;
        if (tier === ItemTier.Grey) return 1;
        if (tier === ItemTier.Green) return 3;
        if (tier === ItemTier.Blue) return 6;
        if (tier === ItemTier.Red) return 10;
        return 1;
    };

    const getItemStyles = (tier?: ItemTier) => {
        if (tier === ItemTier.White) return 'bg-slate-200/60 border-white text-white';
        if (tier === ItemTier.Green) return 'bg-green-900/60 border-green-500 text-green-100';
        if (tier === ItemTier.Blue) return 'bg-blue-900/60 border-blue-500 text-blue-100';
        if (tier === ItemTier.Red) return 'bg-red-900/60 border-red-500 text-red-100';
        return 'bg-slate-700/60 border-slate-500 text-slate-300';
    };

    const renderGearIcon = (item: InventoryItem | null) => {
        if (!item) return <div className="text-transparent">.</div>;
        let icon = '🛡️';
        if (item.stats?.type === 'vest') icon = '🦺';
        else if (item.stats?.type === 'speed_shoes') icon = '👟';
        else if (item.stats?.type === 'mines') icon = '💣';
        else if (item.stats?.type === 'snowman') icon = '⛄';
        else if (item.stats?.type === 'elf_hat') icon = '🧢';
        else if (item.stats?.type === 'turret') icon = '🤖';
        else if (item.stats?.type === 'regen') icon = '💗';
        else if (item.stats?.type === 'lightning') icon = '⚡';
        else if (item.stats?.type === 'tesla') icon = '🔋';
        else if (item.stats?.type === 'pen') icon = '✒️';
        else if (item.stats?.type === 'sleighbells') icon = '🔔';
        else if (item.stats?.type === 'reinforce') icon = '👮';
        return <div className="text-2xl leading-none flex items-center justify-center h-full w-full drop-shadow-md">{icon}</div>;
    };

    // Calculate FNG Score
    let fngScore = 0; // White Snowball
    if (fngGear && fngGear.tier !== undefined) fngScore += getScore(fngGear.tier);

    const handleDeploy = () => {
        // Attempt Fullscreen on Mobile Only
        const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || navigator.maxTouchPoints > 0;
        
        if (isMobile) {
            const elem = document.documentElement;
            if (elem.requestFullscreen) {
                elem.requestFullscreen().catch(() => {});
            } else if ((elem as any).webkitRequestFullscreen) { /* Safari */
                (elem as any).webkitRequestFullscreen();
            } else if ((elem as any).msRequestFullscreen) { /* IE11 */
                (elem as any).msRequestFullscreen();
            }
        }

        window.dispatchEvent(new CustomEvent('start-game-request', { detail: { index: selectedHeroIndex } }));
        window.dispatchEvent(new CustomEvent('start-intro'));
    };

    return (
        <div className="absolute inset-0 z-50 flex flex-col items-center justify-center pointer-events-auto overflow-hidden">
            <div className="relative mb-4 md:mb-8 w-full flex justify-center">
                <h1 className="text-[20vw] sm:text-8xl md:text-9xl font-black text-red-600 tracking-tighter transform -skew-x-12 -translate-x-2 sm:-translate-x-4 scale-y-150 origin-center drop-shadow-[0_5px_5px_rgba(0,0,0,0.8)] border-text whitespace-nowrap text-center">
                    SLEIGHER
                </h1>
            </div>

            <div className="flex flex-row justify-center gap-2 sm:gap-4 mb-4 items-center w-full max-h-[60vh] overflow-y-auto px-2 py-4 md:py-20">
                {/* FNG Slot */}
                <button 
                    onClick={() => setSelectedHeroIndex(-1)}
                    className={`flex flex-col items-center transition-transform hover:scale-105 shrink-0 ${selectedHeroIndex === -1 ? 'scale-110 z-10' : 'opacity-80'}`}
                >
                    <div className={`w-[28vw] h-[35vw] sm:w-32 sm:h-40 bg-slate-900 border-4 rounded-lg flex flex-col relative overflow-hidden ${selectedHeroIndex === -1 ? 'border-yellow-500 shadow-[0_0_20px_rgba(234,179,8,0.5)]' : 'border-slate-700'}`}>
                        {/* Top Section: Icons */}
                        <div className="flex w-full h-[40%] border-b border-slate-700/50">
                            {/* Left: Weapon */}
                            <div className="w-1/2 p-1 flex items-center justify-center border-r border-slate-700/50">
                                <div className={`w-full h-full border rounded flex items-center justify-center ${getItemStyles(ItemTier.White)}`} title="White Snowball">
                                    <WeaponIcon type={WeaponType.Snowball} className="w-8 h-8" />
                                </div>
                            </div>
                            {/* Right: Gear */}
                            <div className="w-1/2 p-1 grid grid-cols-2 grid-rows-2 gap-[2px]">
                                <div className={`border rounded flex items-center justify-center text-[10px] ${getItemStyles(fngGear?.tier)}`}>
                                    {renderGearIcon(fngGear)}
                                </div>
                                <div className="bg-slate-900/30 border border-slate-700 rounded"></div>
                                <div className="bg-slate-900/30 border border-slate-700 rounded"></div>
                                <div className="bg-slate-900/30 border border-slate-700 rounded"></div>
                            </div>
                        </div>
                        
                        {/* Bottom Section: Hero Preview */}
                        <div className="flex-1 flex items-center justify-center">
                            <HeroPreview balance={balance} tier={ItemTier.White} weaponType={WeaponType.Snowball} />
                        </div>

                        {selectedHeroIndex === -1 && <div className="absolute bottom-0 w-full bg-yellow-600 text-black font-bold text-xs text-center py-1 uppercase">Selected</div>}
                    </div>
                    <div className="mt-2 font-black text-white uppercase tracking-wider text-xs sm:text-base">FNG</div>
                    <div className="text-slate-400 text-xs sm:text-sm font-bold">(Rank: {fngScore})</div>
                </button>

                {/* Veteran Slots */}
                {[0,1].map(i => {
                    const vet = veterans[i];
                    const isSelected = selectedHeroIndex === i;
                    
                    if (!vet) {
                        return (
                            <div key={i} className="flex flex-col items-center opacity-40 grayscale shrink-0">
                                <div className="w-[28vw] h-[35vw] sm:w-32 sm:h-40 bg-slate-900 border-4 border-slate-700 rounded-lg flex items-center justify-center border-dashed">
                                    <span className="text-2xl sm:text-4xl text-slate-700">🔒</span>
                                </div>
                                <div className="mt-2 font-black text-white uppercase tracking-wider text-xs sm:text-base">VETERAN</div>
                                <div className="text-transparent text-xs sm:text-sm font-bold">(-)</div>
                            </div>
                        );
                    }

                    return (
                        <button 
                            key={i} 
                            onClick={() => setSelectedHeroIndex(i)}
                            className={`flex flex-col items-center transition-transform hover:scale-105 shrink-0 ${isSelected ? 'scale-110 z-10' : 'opacity-90'}`}
                        >
                            <div className={`w-[28vw] h-[35vw] sm:w-32 sm:h-40 bg-slate-900 border-4 rounded-lg flex flex-col relative overflow-hidden ${isSelected ? 'border-yellow-500 shadow-[0_0_20px_rgba(234,179,8,0.5)]' : 'border-slate-700'}`}>
                                
                                {/* Top Section: Icons */}
                                <div className="flex w-full h-[40%] border-b border-black/20">
                                    {/* Left: Weapon */}
                                    <div className="w-1/2 p-1 flex items-center justify-center border-r border-black/20">
                                        <div className={`w-full h-full border rounded flex items-center justify-center ${getItemStyles(vet.weaponTier)}`} title={`${ItemTier[vet.weaponTier]} ${vet.weapon}`}>
                                            <WeaponIcon type={vet.weapon} className="w-8 h-8" />
                                        </div>
                                    </div>
                                    {/* Right: Gear */}
                                    <div className="w-1/2 p-1 grid grid-cols-2 grid-rows-2 gap-[2px]">
                                        {vet.gear.map((g, idx) => (
                                            <div key={idx} className={`border rounded flex items-center justify-center text-[10px] ${g ? getItemStyles(g.tier) : 'bg-slate-900/30 border-slate-700'}`}>
                                                {renderGearIcon(g)}
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Bottom Section: Hero Preview */}
                                <div className="flex-1 flex items-center justify-center">
                                    <HeroPreview balance={balance} tier={vet.weaponTier} weaponType={vet.weapon} />
                                </div>
                                
                                {isSelected && <div className="absolute bottom-0 w-full bg-yellow-600 text-black font-bold text-xs text-center py-1 uppercase">Selected</div>}
                            </div>
                            <div className="mt-2 font-black text-white uppercase tracking-wider text-xs sm:text-base">VETERAN</div>
                            <div className="text-slate-400 text-xs sm:text-sm font-bold">(Rank: {vet.score})</div>
                        </button>
                    );
                })}
            </div>

            <button 
                onClick={handleDeploy}
                className="w-[80vw] max-w-sm py-4 bg-green-600 hover:bg-green-500 text-white font-black text-2xl uppercase rounded tracking-wider border-2 border-green-400 shadow-xl transition-transform hover:scale-105 mb-4 shrink-0"
            >
                DEPLOY
            </button>

            <div className="absolute top-4 right-4">
                <button 
                    onClick={() => window.dispatchEvent(new CustomEvent('open-settings'))}
                    className="w-12 h-12 flex items-center justify-center bg-slate-800 hover:bg-slate-700 rounded-full border border-slate-600 text-2xl leading-none shadow-lg transition-all hover:rotate-90"
                >
                    ⚙️
                </button>
            </div>
        </div>
    );
};