
import { Vector2 } from '../types';

export const distance = (a: Vector2, b: Vector2) => Math.hypot(a.x - b.x, a.y - b.y);

export const normalize = (v: Vector2) => {
  const d = Math.hypot(v.x, v.y);
  return d === 0 ? { x: 0, y: 0 } : { x: v.x / d, y: v.y / d };
};

export const resolveRectCollision = (entityPos: Vector2, entityRadius: number, rectCenter: Vector2, w: number, h: number) => {
  const halfW = w / 2;
  const halfH = h / 2;

  // Find closest point on the rectangle to the entity
  const closestX = Math.max(rectCenter.x - halfW, Math.min(rectCenter.x + halfW, entityPos.x));
  const closestY = Math.max(rectCenter.y - halfH, Math.min(rectCenter.y + halfH, entityPos.y));

  const dx = entityPos.x - closestX;
  const dy = entityPos.y - closestY;
  const distanceSq = dx * dx + dy * dy;
  
  const minDistance = entityRadius + 2; 

  if (distanceSq < minDistance * minDistance) {
      if (distanceSq === 0) {
          entityPos.x += minDistance;
          return;
      }

      const d = Math.sqrt(distanceSq);
      const push = (minDistance - d) / d;
      
      entityPos.x += dx * push;
      entityPos.y += dy * push;
  }
};
