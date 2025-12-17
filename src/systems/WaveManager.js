// ==========================================
// >>> WAVE MANAGER <<<
// ==========================================
// Handles wave spawning logic and enemy composition

import {
    SPAWN_RATE,
    SPAWN_PHASE_DURATION,
    WAVE_SPAWN_TABLES,
    SPAWN_DISTANCE_MIN,
    SPAWN_DISTANCE_MAX,
    PRESENT_CONFIG
} from '../config/constants.js';
import Enemy from '../entities/Enemy.js';
import Present from '../entities/Present.js';

export default class WaveManager {
    constructor(scene) {
        this.scene = scene;
        this.nextSpawnTime = 0;
        this.currentWave = 1;
    }

    startWave(waveNumber) {
        this.currentWave = waveNumber;
        this.nextSpawnTime = this.scene.gameTime + SPAWN_RATE * 1000;

        // Spawn initial presents
        this.spawnPresents();
    }

    update(time, delta, waveTimer) {
        const waveDuration = this.scene.waveTimer;
        const totalWaveDuration = this.scene.waveManager.getWaveDuration();
        const timeIntoWave = totalWaveDuration - waveDuration;

        // Check if in spawn phase (first 30 seconds)
        const isSpawnPhase = timeIntoWave < SPAWN_PHASE_DURATION;

        if (isSpawnPhase && this.scene.gameTime >= this.nextSpawnTime) {
            this.spawnEnemies();
            this.nextSpawnTime = this.scene.gameTime + SPAWN_RATE * 1000;
        }

        // Maintain present count
        if (this.scene.presents.getChildren().length < PRESENT_CONFIG.TOTAL_PRESENTS) {
            this.spawnPresent();
        }
    }

    spawnEnemies() {
        const spawnTable = this.getSpawnTable(this.currentWave);
        const count = Phaser.Math.Between(spawnTable.enemiesPerSpawn.min, spawnTable.enemiesPerSpawn.max);

        for (let i = 0; i < count; i++) {
            const enemyType = this.selectEnemyType(spawnTable.composition);
            this.spawnEnemy(enemyType);
        }
    }

    spawnEnemy(type) {
        // Get spawn position around player
        const player = this.scene.player.sprite;
        const angle = Math.random() * Math.PI * 2;
        const distance = Phaser.Math.Between(SPAWN_DISTANCE_MIN, SPAWN_DISTANCE_MAX);

        const x = player.x + Math.cos(angle) * distance;
        const y = player.y + Math.sin(angle) * distance;

        const enemy = new Enemy(this.scene, x, y, type);
        this.scene.enemies.add(enemy.sprite);
    }

    getSpawnTable(wave) {
        if (wave <= 3) return WAVE_SPAWN_TABLES['1-3'];
        if (wave <= 7) return WAVE_SPAWN_TABLES['4-7'];
        return WAVE_SPAWN_TABLES['8+'];
    }

    selectEnemyType(composition) {
        const rand = Math.random();
        let cumulative = 0;

        for (const [type, weight] of Object.entries(composition)) {
            cumulative += weight;
            if (rand <= cumulative) {
                return type;
            }
        }

        return 'ZOMBIE_ELF'; // Fallback
    }

    spawnPresents() {
        // Spawn initial batch of presents
        for (let i = 0; i < PRESENT_CONFIG.TOTAL_PRESENTS; i++) {
            this.spawnPresent();
        }
    }

    spawnPresent() {
        // Random position on map
        const x = Math.random() * this.scene.mapManager.scene.scale.width * 10; // Simplified
        const y = Math.random() * this.scene.mapManager.scene.scale.height * 10;

        const present = new Present(this.scene, x, y, this.currentWave);
        this.scene.presents.add(present.sprite);
    }

    getWaveDuration() {
        return 45 * 1.5; // 45 seconds * 1.5
    }
}
