// ==========================================
// >>> INPUT MANAGER <<<
// ==========================================
// Abstracts hardware inputs into game intents

export default class InputManager {
    constructor(scene) {
        this.scene = scene;

        // Output state
        this.movementVector = { x: 0, y: 0 };
        this.isInteracting = false;

        // Mobile detection
        this.isMobile = 'ontouchstart' in window || navigator.maxTouchPoints > 0;

        // Virtual joystick state
        this.joystick = {
            active: false,
            startX: 0,
            startY: 0,
            currentX: 0,
            currentY: 0,
            graphics: null,
            pointerId: null
        };

        // Keyboard state
        this.keys = {};

        this.setupInputs();
    }

    setupInputs() {
        if (this.isMobile) {
            this.setupTouchControls();
        } else {
            this.setupKeyboardControls();
        }
    }

    setupKeyboardControls() {
        // WASD movement
        this.keys.W = this.scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.W);
        this.keys.A = this.scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.A);
        this.keys.S = this.scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.S);
        this.keys.D = this.scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.D);

        // Interact
        this.keys.E = this.scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.E);
    }

    setupTouchControls() {
        // Create graphics for joystick visualization
        this.joystick.graphics = this.scene.add.graphics();
        this.joystick.graphics.setDepth(1000);
        this.joystick.graphics.setScrollFactor(0);

        // Touch events
        this.scene.input.on('pointerdown', this.onTouchStart, this);
        this.scene.input.on('pointermove', this.onTouchMove, this);
        this.scene.input.on('pointerup', this.onTouchEnd, this);
    }

    onTouchStart(pointer) {
        // Ignore if touching UI elements
        if (pointer.y < 100 || pointer.y > this.scene.scale.height - 200) {
            return;
        }

        if (!this.joystick.active) {
            this.joystick.active = true;
            this.joystick.startX = pointer.x;
            this.joystick.startY = pointer.y;
            this.joystick.currentX = pointer.x;
            this.joystick.currentY = pointer.y;
            this.joystick.pointerId = pointer.id;
        }
    }

    onTouchMove(pointer) {
        if (this.joystick.active && pointer.id === this.joystick.pointerId) {
            this.joystick.currentX = pointer.x;
            this.joystick.currentY = pointer.y;
        }
    }

    onTouchEnd(pointer) {
        if (pointer.id === this.joystick.pointerId) {
            this.joystick.active = false;
            this.joystick.pointerId = null;
        }
    }

    update() {
        if (this.isMobile) {
            this.updateMobile();
        } else {
            this.updateKeyboard();
        }
    }

    updateKeyboard() {
        let x = 0;
        let y = 0;

        if (this.keys.W.isDown) y -= 1;
        if (this.keys.S.isDown) y += 1;
        if (this.keys.A.isDown) x -= 1;
        if (this.keys.D.isDown) x += 1;

        // Normalize diagonal movement
        const length = Math.sqrt(x * x + y * y);
        if (length > 0) {
            x /= length;
            y /= length;
        }

        this.movementVector.x = x;
        this.movementVector.y = y;

        this.isInteracting = Phaser.Input.Keyboard.JustDown(this.keys.E);
    }

    updateMobile() {
        if (this.joystick.active) {
            const dx = this.joystick.currentX - this.joystick.startX;
            const dy = this.joystick.currentY - this.joystick.startY;

            const distance = Math.sqrt(dx * dx + dy * dy);
            const maxDistance = 80;

            if (distance > 0) {
                let x = dx / maxDistance;
                let y = dy / maxDistance;

                // Clamp to unit circle
                const length = Math.sqrt(x * x + y * y);
                if (length > 1) {
                    x /= length;
                    y /= length;
                }

                this.movementVector.x = x;
                this.movementVector.y = y;
            } else {
                this.movementVector.x = 0;
                this.movementVector.y = 0;
            }

            this.renderJoystick();
        } else {
            this.movementVector.x = 0;
            this.movementVector.y = 0;
            this.clearJoystick();
        }
    }

    renderJoystick() {
        const g = this.joystick.graphics;
        g.clear();

        // Draw base (subtle)
        g.fillStyle(0xffffff, 0.2);
        g.fillCircle(this.joystick.startX, this.joystick.startY, 60);

        // Draw stick
        g.fillStyle(0xffffff, 0.5);
        const dx = this.joystick.currentX - this.joystick.startX;
        const dy = this.joystick.currentY - this.joystick.startY;
        const distance = Math.sqrt(dx * dx + dy * dy);
        const maxDistance = 80;
        const clampedDist = Math.min(distance, maxDistance);
        const angle = Math.atan2(dy, dx);
        const stickX = this.joystick.startX + Math.cos(angle) * clampedDist;
        const stickY = this.joystick.startY + Math.sin(angle) * clampedDist;
        g.fillCircle(stickX, stickY, 30);
    }

    clearJoystick() {
        if (this.joystick.graphics) {
            this.joystick.graphics.clear();
        }
    }

    destroy() {
        if (this.joystick.graphics) {
            this.joystick.graphics.destroy();
        }

        if (this.scene.input) {
            this.scene.input.off('pointerdown', this.onTouchStart, this);
            this.scene.input.off('pointermove', this.onTouchMove, this);
            this.scene.input.off('pointerup', this.onTouchEnd, this);
        }
    }
}
