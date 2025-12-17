// ==========================================
// >>> PHASER GAME CONFIGURATION <<<
// ==========================================

import Phaser from 'phaser';
import BootScene from '../scenes/BootScene.js';
import MenuScene from '../scenes/MenuScene.js';
import GameScene from '../scenes/GameScene.js';
import UIScene from '../scenes/UIScene.js';
import GameOverScene from '../scenes/GameOverScene.js';

export const GameConfig = {
    type: Phaser.AUTO,
    parent: 'game-container',
    width: window.innerWidth,
    height: window.innerHeight,
    backgroundColor: '#1e293b',
    scale: {
        mode: Phaser.Scale.RESIZE,
        autoCenter: Phaser.Scale.CENTER_BOTH
    },
    physics: {
        default: 'arcade',
        arcade: {
            gravity: { y: 0 },
            debug: false
        }
    },
    scene: [BootScene, MenuScene, GameScene, UIScene, GameOverScene],
    render: {
        pixelArt: false,
        antialias: true
    }
};
