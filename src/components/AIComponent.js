// ==========================================
// >>> AI COMPONENT <<<
// ==========================================
// Handles enemy AI logic (pathfinding, behaviors)

export default class AIComponent {
    constructor(owner) {
        this.owner = owner;
        this.state = 'chase';
        this.target = null;
    }

    update(delta, player) {
        switch (this.state) {
            case 'chase':
                this.chaseTarget(player);
                break;
            case 'retreat':
                this.retreatFrom(player);
                break;
            case 'attack':
                this.attack(player);
                break;
        }
    }

    chaseTarget(target) {
        // Simple pathfinding towards target
        // TODO: Implement steering behaviors and obstacle avoidance
    }

    retreatFrom(target) {
        // Move away from target
    }

    attack(target) {
        // Attack behavior
    }
}
