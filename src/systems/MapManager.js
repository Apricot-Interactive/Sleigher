// ==========================================
// >>> MAP MANAGER <<<
// ==========================================
// Handles map generation and layout

import { MAP_SIZE, ARENAS, TREE_LOCATION, SLEIGH_LOCATION, SPAWN_POINTS } from '../config/constants.js';

export default class MapManager {
    constructor(scene) {
        this.scene = scene;
        this.spawnPoints = [];
    }

    createMap() {
        // Create ground (tiled snow texture)
        const ground = this.scene.add.tileSprite(
            MAP_SIZE / 2,
            MAP_SIZE / 2,
            MAP_SIZE,
            MAP_SIZE,
            'ground_snow'
        );
        ground.setDepth(-1);

        // Create arenas and boundaries
        this.createArenas();

        // Create Christmas tree (center obstacle)
        this.createChristmasTree();

        // Create Sleigh (SW quadrant of Central Arena)
        this.createSleigh();

        // Define spawn points
        this.defineSpawnPoints();
    }

    createArenas() {
        // Create charcoal boundaries around arenas
        // For now, create a simple outer boundary
        const wallThickness = 100;

        // Top wall
        const topWall = this.scene.add.rectangle(
            MAP_SIZE / 2,
            wallThickness / 2,
            MAP_SIZE,
            wallThickness,
            0x1f2937
        );
        this.scene.physics.add.existing(topWall, true);

        // Bottom wall
        const bottomWall = this.scene.add.rectangle(
            MAP_SIZE / 2,
            MAP_SIZE - wallThickness / 2,
            MAP_SIZE,
            wallThickness,
            0x1f2937
        );
        this.scene.physics.add.existing(bottomWall, true);

        // Left wall
        const leftWall = this.scene.add.rectangle(
            wallThickness / 2,
            MAP_SIZE / 2,
            wallThickness,
            MAP_SIZE,
            0x1f2937
        );
        this.scene.physics.add.existing(leftWall, true);

        // Right wall
        const rightWall = this.scene.add.rectangle(
            MAP_SIZE - wallThickness / 2,
            MAP_SIZE / 2,
            wallThickness,
            MAP_SIZE,
            0x1f2937
        );
        this.scene.physics.add.existing(rightWall, true);

        // Create collision group for walls
        this.walls = this.scene.physics.add.staticGroup([topWall, bottomWall, leftWall, rightWall]);
    }

    createChristmasTree() {
        const tree = this.scene.add.image(TREE_LOCATION.x, TREE_LOCATION.y, 'christmas_tree');
        tree.setScale(2);
        this.scene.physics.add.existing(tree, true);

        const treeBody = tree.body;
        treeBody.setCircle(40);
    }

    createSleigh() {
        const sleigh = this.scene.add.image(SLEIGH_LOCATION.x, SLEIGH_LOCATION.y, 'sleigh');
        sleigh.setScale(2);
        sleigh.setData('interactable', 'sleigh');

        // Make sleigh a physics body for interaction detection
        this.scene.physics.add.existing(sleigh, true);
        this.sleigh = sleigh;
    }

    defineSpawnPoints() {
        // For now, define spawn points based on arena positions
        // This is simplified - in full implementation would be more precise

        this.spawnPoints = [
            { x: MAP_SIZE * 0.5, y: MAP_SIZE * 0.5, name: 'CENTRAL' },
            { x: MAP_SIZE * 0.35, y: MAP_SIZE * 0.35, name: 'REINDEER_STABLES' },
            { x: MAP_SIZE * 0.65, y: MAP_SIZE * 0.35, name: 'CLAUS_MANOR' },
            { x: MAP_SIZE * 0.5, y: MAP_SIZE * 0.2, name: 'YETI_CAVE' },
            { x: MAP_SIZE * 0.25, y: MAP_SIZE * 0.6, name: 'FOREST' }
        ];
    }

    getRandomSpawnPoint() {
        return this.spawnPoints[Math.floor(Math.random() * this.spawnPoints.length)];
    }

    getWalls() {
        return this.walls;
    }

    getSleigh() {
        return this.sleigh;
    }
}
