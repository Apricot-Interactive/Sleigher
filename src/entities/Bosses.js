// ==========================================
// >>> BOSSES <<<
// ==========================================
// Specific boss implementations

import Enemy from './Enemy.js';

// TODO: Implement specific boss classes
// - Rudolph (Bronze)
// - Elves on Shelves (Silver)
// - Zombie Santa (Gold)

export default class Boss extends Enemy {
    constructor(scene, x, y, type) {
        super(scene, x, y, type);
        // Boss-specific initialization
    }
}
