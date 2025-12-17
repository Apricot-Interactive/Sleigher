// ==========================================
// >>> SLEIGHER - MAIN ENTRY POINT <<<
// ==========================================

import Phaser from 'phaser';
import { GameConfig } from './config/config.js';

// Initialize Phaser Game
window.addEventListener('load', () => {
    const game = new Phaser.Game(GameConfig);

    // Store game instance globally for debugging
    window.sleigherGame = game;
});
