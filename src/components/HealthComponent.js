// ==========================================
// >>> HEALTH COMPONENT <<<
// ==========================================

export default class HealthComponent {
    constructor(maxHp) {
        this.hp = maxHp;
        this.maxHp = maxHp;
        this.dead = false;
    }

    takeDamage(amount) {
        if (this.dead) return;

        this.hp -= amount;

        if (this.hp <= 0) {
            this.hp = 0;
            this.dead = true;
        }

        return this.hp;
    }

    heal(amount) {
        if (this.dead) return;

        this.hp = Math.min(this.hp + amount, this.maxHp);
        return this.hp;
    }

    setMaxHp(newMax) {
        this.maxHp = newMax;
        this.hp = Math.min(this.hp, this.maxHp);
    }

    isDead() {
        return this.dead;
    }

    getHpPercent() {
        return this.hp / this.maxHp;
    }
}
