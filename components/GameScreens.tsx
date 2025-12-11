
import React from 'react';
import { InventoryItem, ItemTier } from '../types.ts';

export const IntroScreen = () => (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 pointer-events-auto">
        <div className="bg-slate-900 border-2 border-slate-600 max-w-lg w-full p-8 rounded shadow-2xl">
            <h1 className="text-3xl font-black text-red-500 mb-6 uppercase tracking-widest text-center border-b border-slate-700 pb-4">The North Pole Has Fallen</h1>
            <div className="text-slate-300 space-y-4 font-mono leading-relaxed mb-8">
                <p>The outbreak should have killed everyone in Santa's workshop. But that damn <span className="text-yellow-400">Holiday Magic</span> has reanimated the elves' tiny corpses and reprogrammed them to "spread cheer", figuratively speaking.</p>
                <p>Looks like it once again falls to America to save Christmas (and the world). Recover that holiday magic and exfil back to base.</p>
                <p className="text-white font-bold">Good luck, soldier.</p>
            </div>
            <button onClick={() => window.dispatchEvent(new CustomEvent('start-game'))} className="w-full py-4 bg-yellow-500 hover:bg-yellow-400 text-black font-black text-xl uppercase rounded tracking-wider transition-all transform hover:scale-105">Geronimo!</button>
        </div>
    </div>
);

export const GameOverScreen = ({ fngGear }: { fngGear: InventoryItem | null }) => {
    const getTierColor = (tier?: ItemTier) => {
        if (tier === ItemTier.Green) return 'text-green-400';
        if (tier === ItemTier.Blue) return 'text-blue-400';
        if (tier === ItemTier.Red) return 'text-red-400';
        return 'text-slate-400';
    };

    return (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-red-900/40 backdrop-blur-sm p-4 pointer-events-auto">
            <div className="bg-slate-900 border-2 border-red-600 max-w-md w-full p-8 rounded shadow-2xl text-center">
                <h1 className="text-5xl font-black text-red-600 mb-2 uppercase tracking-tighter">KIA</h1>
                <div className="text-slate-400 font-mono mb-8">YOU DIED IN SERVICE OF CHRISTMAS</div>
                {fngGear && (
                        <div className="mb-4 bg-slate-800 p-2 rounded border border-slate-600">
                            <div className="text-xs text-slate-400 uppercase">Secure Slot Saved</div>
                            <div className={`font-bold ${getTierColor(fngGear.tier)}`}>{fngGear.label || fngGear.type}</div>
                        </div>
                )}
                <button onClick={() => window.dispatchEvent(new CustomEvent('return-to-menu'))} className="w-full py-4 bg-slate-700 hover:bg-slate-600 text-white font-black text-xl uppercase rounded tracking-wider border border-slate-500 transition-all">Return to Base</button>
            </div>
        </div>
    );
};

export const VictoryScreen = ({ data }: { data: { medal: string; wave: number; } }) => (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-green-900/40 backdrop-blur-sm p-4 pointer-events-auto">
        <div className="bg-slate-900 border-4 border-yellow-500 max-w-md w-full p-8 rounded shadow-2xl text-center">
            <h1 className="text-4xl font-black text-yellow-400 mb-2 uppercase tracking-tighter">MISSION ACCOMPLISHED</h1>
            <div className="text-white font-bold text-xl mb-6">CHRISTMAS IS SAVED!</div>
            <div className="bg-slate-800 p-4 rounded mb-8 border border-slate-700">
                <div className="flex justify-between items-center mb-2">
                    <span className="text-slate-400 uppercase text-sm">Medal Achieved</span>
                    <span className={`font-black text-xl uppercase ${data.medal === 'Gold' ? 'text-yellow-400' : data.medal === 'Silver' ? 'text-slate-300' : 'text-orange-400'}`}>{data.medal}</span>
                </div>
                <div className="flex justify-between items-center">
                    <span className="text-slate-400 uppercase text-sm">Highest Wave</span>
                    <span className="font-bold text-xl text-white">{data.wave}</span>
                </div>
                <div className="mt-4 text-green-400 font-bold uppercase text-sm">VETERAN SAVED TO ROSTER</div>
            </div>
            <button onClick={() => window.dispatchEvent(new CustomEvent('return-to-menu'))} className="w-full py-4 bg-green-600 hover:bg-green-500 text-white font-black text-xl uppercase rounded tracking-wider border border-green-400 transition-all shadow-[0_0_20px_rgba(22,163,74,0.5)]">Return to Base</button>
        </div>
    </div>
);
