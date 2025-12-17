// ==========================================
// >>> ITEM ENTITY <<<
// ==========================================
// World item logic (weapons, gear on ground)

import Phaser from 'phaser';

export default class Item {
    constructor(scene, x, y, itemType, tier) {
        this.scene = scene;
        this.itemType = itemType; // 'weapon' or 'gear'
        this.tier = tier;

        // Create sprite
        this.sprite = scene.add.sprite(x, y, 'weapon_drop');
        this.sprite.setData('entity', this);

        // Physics
        scene.physics.add.existing(this.sprite);
    }

    pickup(player) {
        // Handle pickup logic
        console.log(`Picked up ${this.itemType}`);
        this.sprite.destroy();
    }
}
