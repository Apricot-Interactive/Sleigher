
import { WorldPOI, Vector2 } from '../types.ts';
import { GRID_CELL_SIZE, MAP_SIZE, POI_GRID_CONFIG } from '../constants.ts';

// Helper to shuffle array
const shuffle = <T>(array: T[]): T[] => {
    let currentIndex = array.length, randomIndex;
    while (currentIndex !== 0) {
        randomIndex = Math.floor(Math.random() * currentIndex);
        currentIndex--;
        [array[currentIndex], array[randomIndex]] = [array[randomIndex], array[currentIndex]];
    }
    return array;
};

export const generateMap = () => {
    const gridCells: { gx: number, gy: number, type: 'center' | 'outer' }[] = [];
    
    // 1. Identify Grid Cells
    for(let x=0; x<5; x++) {
        for(let y=0; y<5; y++) {
            if (x === 2 && y === 2) gridCells.push({ gx: x, gy: y, type: 'center' });
            else gridCells.push({ gx: x, gy: y, type: 'outer' });
        }
    }

    const outerCells = gridCells.filter(c => c.type === 'outer'); // Should be 24
    const pois: WorldPOI[] = [];
    const safehouseCandidates: { gx: number, gy: number, pos: Vector2 }[] = [];
    const spawnCandidates: { gx: number, gy: number, pos: Vector2 }[] = [];

    // 2. Populate Anchors for Outer Cells
    outerCells.forEach((cell, i) => {
        // Define 4 anchor points in world space
        const cellX = cell.gx * GRID_CELL_SIZE;
        const cellY = cell.gy * GRID_CELL_SIZE;
        
        const anchors = [
            { x: cellX + GRID_CELL_SIZE * (1/3), y: cellY + GRID_CELL_SIZE * (1/3) }, // Top Left
            { x: cellX + GRID_CELL_SIZE * (2/3), y: cellY + GRID_CELL_SIZE * (1/3) }, // Top Right
            { x: cellX + GRID_CELL_SIZE * (1/3), y: cellY + GRID_CELL_SIZE * (2/3) }, // Bottom Left
            { x: cellX + GRID_CELL_SIZE * (2/3), y: cellY + GRID_CELL_SIZE * (2/3) }  // Bottom Right
        ];
        
        const shuffledAnchors = shuffle(anchors);
        
        // Slot 0: POI
        const poiDef = POI_GRID_CONFIG[i]; // i goes 0 to 23
        if (poiDef) {
            pois.push({
                x: shuffledAnchors[0].x,
                y: shuffledAnchors[0].y,
                type: poiDef.type,
                radius: poiDef.radius,
                width: poiDef.width,
                height: poiDef.height
            });
        }
        
        // Slot 1: Safehouse Candidate
        safehouseCandidates.push({ gx: cell.gx, gy: cell.gy, pos: shuffledAnchors[1] });
        
        // Slot 2: Spawn Candidate
        spawnCandidates.push({ gx: cell.gx, gy: cell.gy, pos: shuffledAnchors[2] });
        
        // Slot 3: Empty
    });

    // 3. Select 8 Safehouses with Constraints
    let activeBunkers: Vector2[] = [];
    let selectedSafehouseIndices: Set<number> = new Set();
    
    // Constraint: Borders 0 or 1 other safehouse
    // Neighbor definition: 8-way (dx<=1, dy<=1)
    const isValidSafehouse = (candidateIndex: number, currentSelectedIndices: Set<number>) => {
        const candidate = safehouseCandidates[candidateIndex];
        let neighbors = 0;
        
        currentSelectedIndices.forEach(idx => {
             const existing = safehouseCandidates[idx];
             const dx = Math.abs(candidate.gx - existing.gx);
             const dy = Math.abs(candidate.gy - existing.gy);
             if (dx <= 1 && dy <= 1) neighbors++;
        });
        
        return neighbors <= 1;
    };

    // Retry loop for generation
    let attempts = 0;
    while(activeBunkers.length < 8 && attempts < 100) {
        // Reset
        activeBunkers = [];
        selectedSafehouseIndices = new Set();
        const shuffledIndices = shuffle(Array.from({length: 24}, (_, i) => i));
        
        for (const idx of shuffledIndices) {
            if (activeBunkers.length >= 8) break;
            
            if (isValidSafehouse(idx, selectedSafehouseIndices)) {
                selectedSafehouseIndices.add(idx);
                activeBunkers.push(safehouseCandidates[idx].pos);
            }
        }
        attempts++;
    }

    // 4. Select Player Spawn
    // Must coincide with a selected safehouse grid
    const possibleSpawns = spawnCandidates.filter((_, i) => selectedSafehouseIndices.has(i));
    const startPos = possibleSpawns.length > 0 
        ? possibleSpawns[Math.floor(Math.random() * possibleSpawns.length)].pos 
        : { x: 6250, y: 6250 }; // Fallback

    return {
        activeBunkers,
        worldPois: pois,
        playerStart: startPos
    };
};