
import { GameState, Vector2 } from '../types.ts';

export const addParticle = (state: GameState, pos: Vector2, color: string, type: any, count = 1, speed = 1, lifeScale = 1.0) => {
    for(let i=0; i<count; i++) {
        const angle = Math.random() * Math.PI * 2; const vel = Math.random() * speed;
        // Heart: Fast upward movement
        const v = type === 'heart' 
            ? { x: (Math.random()-0.5)*1.5, y: -3 - Math.random() * 2 } 
            : { x: Math.cos(angle) * vel, y: Math.sin(angle) * vel };
            
        state.particles.push({ id: Math.random().toString(), pos: { ...pos }, velocity: v, radius: Math.random() * 3 + 1, rotation: Math.random() * Math.PI, dead: false, life: 1.0 * lifeScale, maxLife: 1.0 * lifeScale, color, size: Math.random() * 3 + 1, type });
    }
};

export const addFloatingText = (state: GameState, pos: Vector2, text: string, color: string, duration: number = 1.0) => { 
    state.floatingTexts.push({ id: Math.random().toString(), pos: { ...pos }, text, color, life: duration, velocity: { x: 0, y: -0.75 } }); 
};
