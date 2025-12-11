
import React from 'react';
import { InventoryItem, WeaponType, GameBalance, ItemTier, AmmoType, HeroRecord, HUDState } from '../types.ts';
import { MainMenu } from './MainMenu.tsx';
import { IntroScreen, GameOverScreen, VictoryScreen } from './GameScreens.tsx';
import { HUD } from './HUD.tsx';

interface HUDProps {
    data: HUDState;
    balance: GameBalance;
    veterans: HeroRecord[];
    fngGear: InventoryItem | null;
}

export const UIOverlay: React.FC<HUDProps> = ({ data, balance, veterans, fngGear }) => {
    if (!data) return null;

    if (data.gamePhase === 'menu') {
        return <MainMenu balance={balance} veterans={veterans} fngGear={fngGear} />;
    }

    if (data.gamePhase === 'intro') {
        return <IntroScreen />;
    }

    if (data.gamePhase === 'game_over') {
        return <GameOverScreen fngGear={fngGear} />;
    }

    if (data.gamePhase === 'victory' && data.victoryData) {
        return <VictoryScreen data={data.victoryData} />;
    }

    return <HUD data={data} />;
};
