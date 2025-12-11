import React, { useState } from 'react';
import { GameBalance } from '../types.ts';

interface PauseMenuProps {
  config: GameBalance & { player: { currentMagic: number; currentHp: number } };
  onUpdate: (newConfig: any) => void;
  onResume: () => void;
}

export const PauseMenu: React.FC<PauseMenuProps> = ({ config, onUpdate, onResume }) => {
  const [view, setView] = useState<'main' | 'howToPlay' | 'reset' | 'cheats' | 'endRun'>('main');

  const toggleCheat = (key: 'invincible' | 'instakill' | 'speedy') => {
      const currentCheats = config.cheats || { invincible: false, instakill: false, speedy: false };
      onUpdate({
          ...config,
          cheats: { ...currentCheats, [key]: !currentCheats[key] }
      });
  };

  const addMagic = () => {
      onUpdate({
          ...config,
          player: {
              ...config.player,
              currentMagic: (config.player.currentMagic || 0) + 100000
          }
      });
  };

  const resetCheats = () => {
      onUpdate({
          ...config,
          player: { ...config.player, currentMagic: 500 },
          cheats: { invincible: false, instakill: false, speedy: false }
      });
  };

  const isCheatActive = (key: 'invincible' | 'instakill' | 'speedy') => config.cheats?.[key] ?? false;
  const isWealthyActive = (config.player.currentMagic || 0) > 90000;

  const renderContent = () => {
      switch (view) {
          case 'howToPlay':
              return (
                  <div className="text-center space-y-4">
                      <h2 className="text-2xl font-bold text-white mb-4">HOW TO PLAY</h2>
                      <div className="text-slate-300 space-y-2 text-sm font-mono leading-relaxed">
                          <p>Find the sleigh to escape!</p>
                          <p>WASD to move, Click to fire</p>
                          <p>Stand on presents to open them</p>
                          <p>E to equip weapons/gear you find</p>
                          <p>Click weapon/gear in bag to equip</p>
                          <p>Click and hold items in bag to drop</p>
                          <p>Game pauses in safehouses</p>
                          <p>Extracted heros keep their gear</p>
                      </div>
                      <button onClick={() => setView('main')} className="mt-6 px-6 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded border border-slate-500 font-bold uppercase w-full">Back</button>
                  </div>
              );
          case 'reset':
              return (
                  <div className="text-center">
                      <h2 className="text-xl font-bold text-red-500 mb-6">Really delete this save file and start over?</h2>
                      <div className="flex gap-4 justify-center">
                          <button 
                              onClick={() => {
                                  localStorage.clear();
                                  window.location.reload();
                              }} 
                              className="px-8 py-3 bg-red-600 hover:bg-red-500 text-white font-bold rounded uppercase"
                          >
                              Yes
                          </button>
                          <button 
                              onClick={() => setView('main')} 
                              className="px-8 py-3 bg-slate-700 hover:bg-slate-600 text-white font-bold rounded uppercase"
                          >
                              No
                          </button>
                      </div>
                  </div>
              );
          case 'endRun':
              return (
                  <div className="text-center">
                      <h2 className="text-xl font-bold text-red-500 mb-2">Really end this run?</h2>
                      <p className="text-slate-400 mb-6 text-sm">This character will perish.</p>
                      <div className="flex gap-4 justify-center">
                          <button 
                              onClick={() => {
                                  window.dispatchEvent(new CustomEvent('return-to-menu'));
                                  onResume();
                              }} 
                              className="px-8 py-3 bg-red-600 hover:bg-red-500 text-white font-bold rounded uppercase"
                          >
                              Yes
                          </button>
                          <button 
                              onClick={() => setView('main')} 
                              className="px-8 py-3 bg-slate-700 hover:bg-slate-600 text-white font-bold rounded uppercase"
                          >
                              No
                          </button>
                      </div>
                  </div>
              );
          case 'cheats':
              return (
                  <div className="text-center">
                      <h2 className="text-2xl font-bold text-yellow-400 mb-6 uppercase">Cheats</h2>
                      <div className="grid grid-cols-2 gap-3 mb-4">
                          <button onClick={() => toggleCheat('invincible')} className={`p-3 rounded font-bold uppercase border-2 transition-all ${isCheatActive('invincible') ? 'bg-slate-800 border-yellow-400 text-yellow-400 shadow-[0_0_10px_rgba(250,204,21,0.5)]' : 'bg-slate-700 border-slate-500 text-slate-300'}`}>Invincible</button>
                          <button onClick={() => toggleCheat('instakill')} className={`p-3 rounded font-bold uppercase border-2 transition-all ${isCheatActive('instakill') ? 'bg-slate-800 border-yellow-400 text-yellow-400 shadow-[0_0_10px_rgba(250,204,21,0.5)]' : 'bg-slate-700 border-slate-500 text-slate-300'}`}>Instakill</button>
                          <button onClick={addMagic} className={`p-3 rounded font-bold uppercase border-2 transition-all ${isWealthyActive ? 'bg-slate-800 border-yellow-400 text-yellow-400 shadow-[0_0_10px_rgba(250,204,21,0.5)]' : 'bg-slate-700 border-slate-500 text-slate-300'}`}>Wealthy</button>
                          <button onClick={() => toggleCheat('speedy')} className={`p-3 rounded font-bold uppercase border-2 transition-all ${isCheatActive('speedy') ? 'bg-slate-800 border-yellow-400 text-yellow-400 shadow-[0_0_10px_rgba(250,204,21,0.5)]' : 'bg-slate-700 border-slate-500 text-slate-300'}`}>Speedy</button>
                      </div>
                      <div className="flex flex-col gap-2">
                          <button onClick={resetCheats} className="px-6 py-2 bg-red-900/50 hover:bg-red-900 border border-red-500 text-red-200 rounded font-bold uppercase text-sm">Reset Cheats</button>
                          <button onClick={() => setView('main')} className="px-6 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded border border-slate-500 font-bold uppercase">Back</button>
                      </div>
                  </div>
              );
          default:
              return (
                  <div className="text-center flex flex-col gap-4">
                      <div className="mb-2">
                          <h1 className="text-4xl font-black text-red-600 tracking-tighter transform -skew-x-12">SLEIGHER</h1>
                          <p className="text-slate-500 text-xs mt-1">(c) 2025 Matthew Ott</p>
                          <p className="text-slate-500 text-xs">Built with Gemini in Google AI Studio</p>
                      </div>
                      
                      <button onClick={() => setView('howToPlay')} className="w-full py-4 bg-yellow-600 hover:bg-yellow-500 text-black font-black text-xl uppercase rounded shadow-lg transition-transform hover:scale-105">
                          How to Play
                      </button>

                      <div className="flex gap-4">
                          <button onClick={() => setView('endRun')} className="flex-1 py-3 bg-red-900/60 hover:bg-red-900 text-red-200 font-bold text-lg uppercase rounded border border-red-800">
                              End Run
                          </button>
                          <button onClick={onResume} className="flex-1 py-3 bg-slate-700 hover:bg-slate-600 text-white font-bold text-lg uppercase rounded border border-slate-500">
                              Back
                          </button>
                      </div>
                      
                      <div className="flex gap-4">
                          <button onClick={() => setView('reset')} className="flex-1 py-3 bg-slate-700 hover:bg-slate-600 text-white font-bold text-lg uppercase rounded border border-slate-500">
                              Reset
                          </button>
                          <button onClick={() => setView('cheats')} className="flex-1 py-3 bg-slate-700 hover:bg-slate-600 text-white font-bold text-lg uppercase rounded border border-slate-500">
                              Cheats
                          </button>
                      </div>
                  </div>
              );
      }
  };

  return (
    <div className="absolute inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-slate-900 border-2 border-slate-600 rounded-lg shadow-2xl relative p-8">
        <button 
            onClick={onResume}
            className="absolute top-2 right-3 text-slate-400 hover:text-white text-2xl font-bold leading-none"
        >
            &times;
        </button>
        {renderContent()}
      </div>
    </div>
  );
};