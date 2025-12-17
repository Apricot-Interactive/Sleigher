// ==========================================
// >>> MOVEMENT COMPONENT <<<
// ==========================================
// Handles movement logic (reserved for future use)

export default class MovementComponent {
    constructor(speed) {
        this.speed = speed;
        this.velocity = { x: 0, y: 0 };
    }

    setVelocity(x, y) {
        this.velocity.x = x;
        this.velocity.y = y;
    }

    update(sprite, delta) {
        sprite.x += this.velocity.x * delta;
        sprite.y += this.velocity.y * delta;
    }
}
