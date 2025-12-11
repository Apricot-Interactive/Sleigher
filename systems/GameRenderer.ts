

import { GameState, GameBalance, WorldPOI, WeaponType, Loot, EnemyType, ItemTier, Vector2 } from '../types.ts';
import { MAP_SIZE, GRID_CELL_SIZE, POI_LOCATIONS, BUNKER_INT_SIZE, BUNKER_ZONES } from '../constants.ts';
import { distance } from '../utils/math.ts';

// --- PATTERNS ---

export const createCamoPattern = () => {
    const pCanvas = document.createElement('canvas');
    pCanvas.width = 256; 
    pCanvas.height = 256; 
    const pCtx = pCanvas.getContext('2d'); 
    if (!pCtx) return null;
    
    pCtx.fillStyle = '#334155'; 
    pCtx.fillRect(0, 0, 256, 256);
    
    for(let i=0; i<60; i++) { 
        pCtx.fillStyle = Math.random() > 0.5 ? '#475569' : '#1e293b'; 
        const w = 16 + Math.random() * 48; 
        const h = 16 + Math.random() * 48; 
        const x = Math.floor((Math.random() * 256) / 16) * 16; 
        const y = Math.floor((Math.random() * 256) / 16) * 16; 
        pCtx.fillRect(x, y, w, h); 
    }
    return pCtx.createPattern(pCanvas, 'repeat');
};

export const createWoodPattern = () => {
    const pCanvas = document.createElement('canvas'); 
    pCanvas.width = 64; 
    pCanvas.height = 64; 
    const ctx = pCanvas.getContext('2d'); 
    if (!ctx) return null;
    
    ctx.fillStyle = '#a05a2c'; 
    ctx.fillRect(0, 0, 64, 64); 
    
    ctx.strokeStyle = '#5d3417'; 
    ctx.lineWidth = 2; 
    ctx.beginPath(); 
    for(let i=0; i<64; i+=16) { 
        ctx.moveTo(0, i); ctx.lineTo(64, i); 
    } 
    ctx.stroke();
    
    ctx.strokeStyle = '#784421'; 
    ctx.lineWidth = 1; 
    ctx.globalAlpha = 0.3; 
    for(let i=0; i<10; i++) { 
        ctx.beginPath(); 
        const y = Math.random() * 64; 
        ctx.moveTo(0, y); 
        ctx.lineTo(64, y + Math.random() * 10 - 5); 
        ctx.stroke(); 
    }
    return ctx.createPattern(pCanvas, 'repeat');
};

// --- ICONS & ASSETS ---

const drawWeaponIcon = (ctx: CanvasRenderingContext2D, type: WeaponType, x: number, y: number, size: number) => {
    ctx.save();
    ctx.translate(x, y);
    const scale = size / 100;
    ctx.scale(scale, scale);
    ctx.fillStyle = '#ffffff'; 

    // Center the drawing roughly around 0,0 based on 100x100 coord system
    ctx.translate(-50, -50);

    ctx.beginPath();
    if (type === WeaponType.Pistol) {
        ctx.moveTo(20, 40); ctx.lineTo(80, 40); ctx.lineTo(80, 55); 
        ctx.lineTo(70, 55); ctx.lineTo(70, 85); ctx.lineTo(45, 85); 
        ctx.lineTo(45, 55); ctx.lineTo(20, 55); ctx.fill();
    } else if (type === WeaponType.Shotgun) {
        ctx.moveTo(5, 45); ctx.lineTo(95, 45); ctx.lineTo(95, 55); ctx.lineTo(5, 55); ctx.fill(); // Barrel
        ctx.beginPath(); ctx.rect(25, 58, 30, 8); ctx.fill(); // Pump
        ctx.beginPath(); ctx.moveTo(5, 55); ctx.lineTo(15, 75); ctx.lineTo(5, 75); ctx.lineTo(0, 55); ctx.fill(); // Stock
    } else if (type === WeaponType.AR) {
        ctx.moveTo(10, 45); ctx.lineTo(90, 45); ctx.lineTo(90, 55); ctx.lineTo(10, 55); ctx.fill(); // Barrel/Body
        ctx.beginPath(); ctx.rect(50, 55, 10, 20); ctx.fill(); // Mag
        ctx.beginPath(); ctx.moveTo(10, 45); ctx.lineTo(0, 65); ctx.lineTo(15, 65); ctx.lineTo(20, 55); ctx.fill(); // Stock
        ctx.beginPath(); ctx.rect(55, 38, 4, 7); ctx.fill(); // Sight
    } else if (type === WeaponType.Flamethrower) {
        ctx.rect(20, 35, 60, 30); ctx.fill(); // Tank
        ctx.beginPath(); ctx.rect(80, 45, 15, 10); ctx.fill(); // Nozzle
        ctx.beginPath(); ctx.moveTo(20, 45); ctx.lineTo(5, 45); ctx.lineTo(5, 65); ctx.lineTo(20, 55); ctx.fill(); // Handle
    }
    ctx.closePath();
    ctx.restore();
};

const drawPOI = (ctx: CanvasRenderingContext2D, poi: WorldPOI) => {
    ctx.save();
    ctx.translate(poi.x, poi.y);
    switch(poi.type) {
        case 'frozen_lake':
            ctx.fillStyle = '#bae6fd'; ctx.beginPath(); ctx.ellipse(0, 0, 250, 180, 0, 0, Math.PI*2); ctx.fill();
            ctx.fillStyle = '#ffffff'; ctx.globalAlpha = 0.5; ctx.beginPath(); ctx.ellipse(-100, -50, 80, 20, -0.5, 0, Math.PI*2); ctx.fill(); ctx.globalAlpha = 1.0;
            break;
        case 'stables': 
            ctx.fillStyle = '#451a03'; ctx.fillRect(-100, -50, 200, 100); 
            ctx.fillStyle = '#78350f'; ctx.beginPath(); ctx.moveTo(-110, -50); ctx.lineTo(110, -50); ctx.lineTo(0, -100); ctx.fill(); 
            break;
        case 'bear_cave': 
            ctx.fillStyle = '#3f3f46'; ctx.beginPath(); ctx.arc(0, 0, 100, 0, Math.PI, true); ctx.fill(); 
            ctx.fillStyle = '#000'; ctx.beginPath(); ctx.arc(0, 0, 60, 0, Math.PI, true); ctx.fill(); 
            break;
        case 'giant_snowman': 
            ctx.fillStyle = '#ffffff'; 
            ctx.beginPath(); ctx.arc(0, 40, 60, 0, Math.PI*2); ctx.fill(); 
            ctx.beginPath(); ctx.arc(0, -30, 45, 0, Math.PI*2); ctx.fill(); 
            ctx.beginPath(); ctx.arc(0, -90, 30, 0, Math.PI*2); ctx.fill(); 
            ctx.fillStyle = '#000'; ctx.fillRect(-25, -140, 50, 40); ctx.fillRect(-35, -100, 70, 10); 
            break;
        case 'tree_farm': 
            ctx.fillStyle = '#166534'; 
            for(let i=0;i<3;i++) for(let j=0;j<3;j++) { 
                ctx.beginPath(); ctx.moveTo((i-1)*100, (j-1)*100-40); 
                ctx.lineTo((i-1)*100+30, (j-1)*100+40); ctx.lineTo((i-1)*100-30, (j-1)*100+40); ctx.fill(); 
            } 
            break;
        case 'snowman_trio': 
            [{x:-50,y:0,s:0.8},{x:50,y:10,s:0.9},{x:0,y:-40,s:1}].forEach(sm=>{
                ctx.save(); ctx.translate(sm.x,sm.y); ctx.scale(sm.s,sm.s);
                ctx.fillStyle='#fff'; ctx.beginPath(); ctx.arc(0,20,25,0,Math.PI*2); ctx.fill();
                ctx.beginPath(); ctx.arc(0,-10,20,0,Math.PI*2); ctx.fill();
                ctx.beginPath(); ctx.arc(0,-35,15,0,Math.PI*2); ctx.fill();
                ctx.fillStyle='#000'; ctx.fillRect(-10,-55,20,15); ctx.restore();
            }); 
            break;
        case 'elf_cafe': 
            ctx.fillStyle = '#b45309'; ctx.fillRect(-60,-40,120,80); 
            ctx.fillStyle='#fff'; ctx.fillRect(-65,-45,130,10); 
            ctx.fillStyle='#ef4444'; ctx.fillRect(-40,-60,80,20); 
            ctx.fillStyle='#fff'; ctx.font='12px monospace'; ctx.fillText('CAFE',-15,-45); 
            break;
        case 'toy_workshop': 
            ctx.fillStyle='#ef4444'; ctx.fillRect(-120,-120,240,240); 
            ctx.fillStyle='#166534'; ctx.beginPath(); ctx.moveTo(-130,-120); ctx.lineTo(130,-120); ctx.lineTo(0,-180); ctx.fill(); 
            ctx.strokeStyle='#78350f'; ctx.lineWidth=4; ctx.strokeRect(-120,-120,240,240); 
            break;
        case 'magic_forest': 
            for(let i=0;i<6;i++){
                const a=(i/6)*Math.PI*2;
                ctx.fillStyle='#c084fc'; ctx.fillRect(Math.cos(a)*80-10,Math.sin(a)*80-50,20,100);
                ctx.fillStyle='#22d3ee'; ctx.fillRect(Math.cos(a)*80-10,Math.sin(a)*80-40,20,10); ctx.fillRect(Math.cos(a)*80-10,Math.sin(a)*80-10,20,10);
            } 
            break;
        case 'sled_garage': 
            ctx.fillStyle='#1e293b'; ctx.fillRect(-100,-80,200,160); 
            ctx.fillStyle='#334155'; ctx.fillRect(-105,-85,210,10); ctx.fillRect(-105,-85,10,170); ctx.fillRect(95,-85,10,170); 
            ctx.fillStyle='#0f172a'; ctx.fillRect(-60,80,120,10); 
            break;
        case 'large_coal': 
            ctx.fillStyle='#171717'; ctx.beginPath(); ctx.moveTo(-60,40); ctx.lineTo(-40,-60); ctx.lineTo(20,-80); ctx.lineTo(70,-20); ctx.lineTo(50,60); ctx.lineTo(-20,80); ctx.fill(); 
            break;
        case 'cocoa_springs': 
            ctx.fillStyle='#451a03'; ctx.beginPath(); ctx.ellipse(0,0,180,80,0,0,Math.PI*2); ctx.fill(); 
            ctx.fillStyle='#fff'; ctx.beginPath(); ctx.arc(-50,-20,15,0,Math.PI*2); ctx.fill(); 
            break;
        case 'radio_tower': 
            ctx.fillStyle='#e2e8f0'; ctx.beginPath(); ctx.ellipse(0,0,60,30,0,0,Math.PI*2); ctx.fill(); 
            ctx.strokeStyle='#ef4444'; ctx.lineWidth=6; ctx.beginPath(); ctx.moveTo(-30,80); ctx.lineTo(0,-80); ctx.lineTo(30,80); ctx.stroke(); 
            break;
        case 'wrapping_station': 
            ctx.fillStyle='#94a3b8'; ctx.fillRect(-100,-50,200,100); ctx.fillStyle='#333'; ctx.fillRect(-100,-20,200,40); 
            break;
        case 'flight_school': 
            ctx.fillStyle='#e2e8f0'; ctx.fillRect(-240,-45,480,90); 
            ctx.fillStyle='#fff'; ctx.font='bold 40px monospace'; ctx.save(); ctx.translate(180,0); ctx.rotate(-Math.PI/2); ctx.fillText("27",-30,0); ctx.restore(); 
            break;
        case 'elf_paint_shop': 
            ctx.fillStyle='#1d4ed8'; ctx.fillRect(-120,-120,240,240); 
            ctx.fillStyle='#facc15'; ctx.beginPath(); ctx.moveTo(-130,-120); ctx.lineTo(130,-120); ctx.lineTo(0,-180); ctx.fill(); 
            break;
        case 'small_glacier': 
            ctx.fillStyle='#a5f3fc'; ctx.beginPath(); ctx.moveTo(-80,80); ctx.lineTo(-20,-80); ctx.lineTo(80,20); ctx.fill(); 
            ctx.fillStyle='#cffafe'; ctx.beginPath(); ctx.moveTo(-20,-80); ctx.lineTo(0,0); ctx.lineTo(-40,40); ctx.fill(); 
            break;
        case 'mail_center': 
            ctx.fillStyle='#f1f5f9'; ctx.fillRect(-60,-40,120,80); 
            ctx.strokeStyle='#94a3b8'; ctx.lineWidth=2; ctx.beginPath(); ctx.moveTo(-60,-40); ctx.lineTo(0,0); ctx.lineTo(60,-40); ctx.stroke(); 
            ctx.fillStyle='#b91c1c'; ctx.beginPath(); ctx.arc(0,0,10,0,Math.PI*2); ctx.fill(); 
            break;
        case 'north_pole': 
            ctx.fillStyle='#ef4444'; ctx.fillRect(-10,-100,20,200); 
            ctx.fillStyle='#fff'; for(let y=-100;y<100;y+=20) ctx.fillRect(-10,y,20,10); 
            ctx.fillStyle='#fcd34d'; ctx.beginPath(); ctx.arc(0,-110,20,0,Math.PI*2); ctx.fill(); 
            break;
        case 'elf_bakery': 
            ctx.fillStyle='#fbcfe8'; ctx.fillRect(-60,-40,120,80); 
            ctx.fillStyle='#fff'; ctx.fillRect(-65,-45,130,10); 
            ctx.fillStyle='#db2777'; ctx.fillRect(-40,-60,80,20); 
            ctx.fillStyle='#fff'; ctx.font='12px monospace'; ctx.fillText('BAKERY',-20,-45); 
            break;
        case 'yeti_cave': 
            ctx.fillStyle='#e5e5e5'; ctx.beginPath(); ctx.moveTo(-80,60); ctx.lineTo(0,-80); ctx.lineTo(80,60); ctx.fill(); 
            ctx.fillStyle='#000'; ctx.beginPath(); ctx.arc(0,40,30,0,Math.PI,true); ctx.fill(); 
            break;
        case 'storage_depot': 
            ctx.fillStyle='#78350f'; ctx.fillRect(-60,-60,40,40); ctx.fillRect(-20,-20,40,40); ctx.fillRect(20,-60,40,40); 
            break;
        case 'reindeer_pen': 
            ctx.fillStyle='#3f3f46'; ctx.fillRect(-100,-50,200,100); ctx.strokeStyle='#713f12'; ctx.lineWidth=3; ctx.strokeRect(-120,-70,240,140); 
            break;
        case 'frozen_pond': 
            ctx.fillStyle='#bae6fd'; ctx.beginPath(); ctx.ellipse(0,0,120,80,0,0,Math.PI*2); ctx.fill(); ctx.strokeStyle='#fff'; ctx.lineWidth=2; ctx.beginPath(); ctx.moveTo(0,0); ctx.lineTo(40,40); ctx.stroke(); 
            break;
    }
     // Auto Label
    if (!['elf_cafe', 'elf_bakery', 'sleigh', 'safe_house'].includes(poi.type)) {
        const overrides:any = { 'large_coal': 'COAL', 'flight_school': 'RUNWAY', 'elf_paint_shop': 'BLUE WORKSHOP', 'toy_workshop': 'RED WORKSHOP', 'magic_forest': 'MAGIC FOREST' };
        const offsets:any = { 'snowman_trio': -30, 'bear_cave': -90, 'giant_snowman': 50, 'north_pole': 40 };
        let text = overrides[poi.type] || poi.type.replace(/_/g, ' ').toUpperCase();
        let yOff = (poi.height ? poi.height/2 : (poi.radius || 100)) + 30 + (offsets[poi.type] || 0);
        ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.font = 'bold 12px monospace'; ctx.textAlign = 'center';
        ctx.fillStyle = '#ffffff'; ctx.fillText(text, 0, yOff);
    }
    ctx.restore();
};

const drawLootItem = (ctx: CanvasRenderingContext2D, l: Loot, state: GameState, balance: GameBalance) => {
    const p = state.player;
    // "Present" state is now a Package (Rectangle or Diamond)
    if (l.type === 'present') {
        if (state.gamePhase === 'playing' && distance(l.pos, p.pos) < balance.player.pickupRadius) { 
            ctx.strokeStyle = '#22c55e'; ctx.lineWidth = 2; ctx.beginPath(); 
            ctx.arc(l.pos.x, l.pos.y, 40, 0, Math.PI * 2 * (l.pickupProgress / balance.player.pickupTime)); 
            ctx.stroke(); 
        }

        const c = l.contents;
        const color = c?.color || '#94a3b8';

        ctx.save();
        ctx.translate(l.pos.x, l.pos.y);
        
        // Draw Shadow
        ctx.fillStyle = 'rgba(0,0,0,0.5)';
        ctx.beginPath(); ctx.ellipse(0, 15, 15, 5, 0, 0, Math.PI*2); ctx.fill();

        if (c?.type === 'weapon_drop') {
            // WEAPON PACKAGE: WIDE RECTANGLE + YELLOW RIBBON
            ctx.fillStyle = color;
            ctx.fillRect(-25, -10, 50, 20); // Wide base rectangle (50x20)
            
            // Yellow Ribbon (Cross)
            ctx.fillStyle = '#facc15'; 
            ctx.fillRect(-25, -2, 50, 4); // Horizontal band
            ctx.fillRect(-3, -10, 6, 20); // Vertical band
            
            // Bow
            ctx.beginPath(); ctx.arc(0, -5, 4, 0, Math.PI*2); ctx.fill();
        } else {
            // GEAR/KEY PACKAGE: DIAMOND + WHITE RIBBON
            // Diamond = Rotated Square
            ctx.rotate(Math.PI / 4);
            
            ctx.fillStyle = color;
            ctx.fillRect(-14, -14, 28, 28);
            
            // White Ribbon (Cross relative to rotation)
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(-14, -3, 28, 6);
            ctx.fillRect(-3, -14, 6, 28);
            
            // Bow
            ctx.beginPath(); ctx.arc(0, 0, 4, 0, Math.PI*2); ctx.fill();
        }
        ctx.restore();
    } else if (l.type === 'item_drop') {
        // Opened Gear Drop (Key handled by WorldKey now)
        ctx.save(); ctx.translate(l.pos.x, l.pos.y);
        
        // Interaction Text handled by overhead prompt logic now
        
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.font = '32px serif';
        if (l.contents?.type === 'key') {
            // Fallback if logic somehow keeps key as item_drop
            ctx.fillText('🗝️', 0, 0); 
        }
        else if (l.contents?.type === 'gear') {
            const t = l.contents.stats?.type;
            if (t === 'shield') ctx.fillText('🛡️', 0, 0);
            else if (t === 'pen') ctx.fillText('✒️', 0, 0);
            else if (t === 'turret') ctx.fillText('🤖', 0, 0); 
            else if (t === 'snowman') ctx.fillText('⛄', 0, 0);
            else if (t === 'medkit') ctx.fillText('🏥', 0, 0);
            else if (t === 'shoes') ctx.fillText('👟', 0, 0);
            else if (t === 'lightning') ctx.fillText('⚡', 0, 0);
            else if (t === 'beaker') ctx.fillText('🧪', 0, 0);
            else if (t === 'santa_hat') ctx.fillText('🎅', 0, 0);
            else ctx.fillText('⚙️', 0, 0);
        } else ctx.fillText('❓', 0, 0);
        ctx.restore();
    } else if (l.type === 'weapon_drop' && l.color && l.weaponType) { 
        // Opened Weapon Drop
        ctx.save(); ctx.translate(l.pos.x, l.pos.y); 
        
        // Draw Item Box
        ctx.fillStyle = '#1e293b'; 
        ctx.strokeStyle = l.color;
        ctx.lineWidth = 2;
        ctx.fillRect(-25, -25, 50, 50); 
        ctx.strokeRect(-25, -25, 50, 50);
        
        drawWeaponIcon(ctx, l.weaponType, 0, 0, 40);
        ctx.restore(); 
    }
};

const drawWorldMedkit = (ctx: CanvasRenderingContext2D, m: any) => {
    ctx.save(); ctx.translate(m.pos.x, m.pos.y);
    ctx.fillStyle = '#ffffff'; ctx.fillRect(-10, -10, 20, 20);
    ctx.fillStyle = '#ef4444'; ctx.fillRect(-3, -8, 6, 16); ctx.fillRect(-8, -3, 16, 6);
    ctx.restore();
};

const drawOverheadPrompt = (ctx: CanvasRenderingContext2D, pos: Vector2, text: string) => {
    ctx.save();
    // Twice as far above the player (was 38, now 75)
    ctx.translate(pos.x, pos.y - 75);

    ctx.font = '900 12px monospace';
    const tm = ctx.measureText(text);
    
    // 25% Wider and Taller than previous
    const w = (tm.width + 16) * 1.25;
    const h = 22 * 1.25;
    const r = 8;

    // Shadow
    ctx.shadowColor = 'rgba(0,0,0,0.5)';
    ctx.shadowBlur = 4;
    ctx.shadowOffsetY = 2;

    // Background
    ctx.fillStyle = '#ea580c'; // Orange-600
    ctx.beginPath();
    const x = -w/2, y = -h/2;
    ctx.moveTo(x+r, y);
    ctx.arcTo(x+w, y, x+w, y+h, r);
    ctx.arcTo(x+w, y+h, x, y+h, r);
    ctx.arcTo(x, y+h, x, y, r);
    ctx.arcTo(x, y, x+w, y, r);
    ctx.closePath();
    ctx.fill();

    // Border
    ctx.shadowColor = 'transparent';
    ctx.strokeStyle = '#fb923c'; // Orange-400
    ctx.lineWidth = 2;
    ctx.stroke();

    // Text
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, 0, 1);

    ctx.restore();
};

export const drawPlayer = (ctx: CanvasRenderingContext2D, state: GameState, balance: GameBalance) => {
    const p = state.player;
    ctx.save(); 
    ctx.translate(p.pos.x, p.pos.y); 
    
    // Revive Ring
    if (p.reviving) {
        ctx.beginPath();
        ctx.arc(0, 0, 50, 0, Math.PI * 2 * (p.reviveProgress / balance.player.pickupTime));
        ctx.strokeStyle = '#22d3ee'; ctx.lineWidth = 4; ctx.stroke();
        ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 1; ctx.stroke();
    }
    
    // Invulnerability Flash
    if (state.gameTime < p.invulnerableUntil) {
        if (Math.floor(Date.now() / 100) % 2 === 0) ctx.globalAlpha = 0.5;
        ctx.shadowBlur = 10; ctx.shadowColor = '#fbbf24';
    }

    ctx.rotate(p.angle);

    // --- 1. TACTICAL VEST (Body) ---
    ctx.fillStyle = '#335c67'; 
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(-15, -16, 28, 32, 10);
    ctx.fill();
    ctx.stroke();

    // Shoulder Pads
    ctx.fillStyle = '#669999';
    ctx.beginPath(); ctx.arc(0, -14, 10, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.arc(0, 14, 10, 0, Math.PI * 2); ctx.fill(); ctx.stroke();

    // --- 2. WEAPON (Right Hand Side usually) ---
    ctx.save();
    const weaponType = p.weapon as WeaponType;
    
    if (weaponType === WeaponType.Pistol) {
        ctx.translate(20, 13); 
        ctx.fillStyle = '#171717'; ctx.fillRect(-5, -3, 12, 6);
        ctx.fillStyle = '#cbd5e1'; ctx.fillRect(0, -3, 14, 6);
        ctx.strokeStyle = '#000'; ctx.lineWidth=1; ctx.strokeRect(0, -3, 14, 6);
    } 
    else if (weaponType === WeaponType.Shotgun) {
        ctx.translate(15, 13);
        ctx.fillStyle = '#451a03'; ctx.fillRect(-10, -3, 15, 6);
        ctx.fillStyle = '#0f172a'; ctx.fillRect(5, -4, 20, 8);
        ctx.fillStyle = '#78350f'; ctx.fillRect(10, -5, 8, 10);
    }
    else if (weaponType === WeaponType.AR) {
        ctx.translate(15, 13);
        ctx.fillStyle = '#0f172a'; ctx.fillRect(-5, -4, 35, 8);
        ctx.fillStyle = '#334155'; ctx.fillRect(5, 4, 8, 6); 
        ctx.fillStyle = '#10b981'; ctx.fillRect(0, -6, 4, 2);
    }
    else if (weaponType === WeaponType.Flamethrower) {
        ctx.translate(10, 13);
        ctx.fillStyle = '#f97316'; ctx.fillRect(-12, -22, 12, 36); 
        ctx.fillStyle = '#475569'; ctx.fillRect(10, -6, 25, 12);
        ctx.fillStyle = '#ea580c'; ctx.fillRect(35, -4, 4, 8);
    }
    ctx.restore();

    // --- 3. HANDS ---
    ctx.fillStyle = '#fca5a5'; ctx.strokeStyle = '#b91c1c'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.arc(18, 13, 5, 0, Math.PI*2); ctx.fill(); ctx.stroke();

    // --- 4. HEAD ---
    ctx.fillStyle = '#fca5a5'; ctx.beginPath(); ctx.arc(0, 0, 11, 0, Math.PI * 2); ctx.fill();

    // --- 5. HAT (Black Baseball Cap) ---
    ctx.fillStyle = '#000000'; ctx.beginPath(); ctx.arc(0, 0, 11, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#171717'; ctx.fillRect(4, -8, 10, 16); 
    
    ctx.restore();
    
    // Reload Bar
    if (p.reloadingUntil > state.gameTime) {
        const totalTime = balance.weapons[p.weapon].reloadTime; const timeLeft = p.reloadingUntil - state.gameTime; const pct = 1 - (timeLeft / totalTime);
        ctx.fillStyle = '#334155'; ctx.fillRect(p.pos.x - 20, p.pos.y - 40, 40, 6); ctx.fillStyle = '#fbbf24'; ctx.fillRect(p.pos.x - 20, p.pos.y - 40, 40 * pct, 6);
    }

    // Interaction Prompt Overhead
    if (state.gamePhase === 'playing') {
        const actionLabel = state.isMobile ? "[TAP]" : "[E]";
        let actionText = "";
        
        let closestLoot: Loot | null = null;
        let minDst = balance.player.pickupRadius;
        
        for (const l of state.loot) {
             if (l.type === 'present' || l.dead) continue;
             const d = distance(p.pos, l.pos);
             if (d < minDst) {
                 minDst = d;
                 closestLoot = l;
             }
        }

        if (closestLoot) {
            let isFull = false;
            
            if (closestLoot.type === 'weapon_drop' && closestLoot.weaponType && closestLoot.tier !== undefined) {
                 const equippedTier = p.weaponTiers[p.weapon];
                 // ONLY EQUIP IF TIER IS HIGHER, OTHERWISE STASH
                 if (closestLoot.tier > equippedTier) {
                      actionText = `${actionLabel} EQUIP`;
                 } else {
                      if (p.inventory.length < 6) actionText = `${actionLabel} STASH`;
                      else isFull = true;
                 }
            } else if (closestLoot.type === 'item_drop' && closestLoot.contents) {
                 const c = closestLoot.contents;
                 // Key is no longer an interact item via [E], handled via WorldKey
                 if (c.type === 'key') {
                     // Do nothing, handled by auto-pickup or WorldKey logic if converted
                 } else {
                     let canEquip = false;
                     if (c.type === 'gear') {
                          canEquip = p.equippedGear.some(s => s === null);
                     }
                     const hasWeaponToDrop = p.inventory.some(i => i.type === 'weapon');
                     const canStash = p.inventory.length < 6;
                     
                     if (canEquip) actionText = `${actionLabel} EQUIP`;
                     else if (canStash || hasWeaponToDrop) actionText = `${actionLabel} STASH`;
                     else isFull = true;
                 }
            }
            if (isFull) {
                // Optional: Draw text directly instead of prompt bubble if just "FULL"
            }
        }
        
        // If no loot interaction or player chose to prioritize bunker (logic below determines visual)
        // Let's say we prioritize loot if standing ON it, otherwise Bunker.
        // But for now, if no loot text, check Bunker.
        if (!actionText && !state.inBunker) {
             for(let i=0; i<state.activeBunkers.length; i++) {
                 // Check proximity to bunker. Interaction system uses 100.
                 // We use 120 for visual prompt to appear slightly before interaction is valid.
                 if (distance(p.pos, state.activeBunkers[i]) < 120) {
                     const unlocked = state.unlockedBunkers.get(i) === state.wave;
                     if (unlocked) {
                         // Even if unlocked, entering is an action.
                         actionText = `${actionLabel} ENTER`;
                     } else if (p.keys > 0) {
                         actionText = `${actionLabel} USE KEY`;
                     }
                     if (actionText) break;
                 }
             }
        }
        
        if (actionText) {
            drawOverheadPrompt(ctx, p.pos, actionText);
        }
    }
};

export const drawGame = (ctx: CanvasRenderingContext2D, width: number, height: number, state: GameState, balance: GameBalance, assets: { bg: CanvasPattern | null, wood: CanvasPattern | null }) => {
    const p = state.player;
    const camera = state.camera;
    
    // Camera Update Logic (Moved here to ensure sync with frame)
    if (state.exitAnim.active) {
        // Camera follows player during exit
        camera.x = p.pos.x - width / 2;
        camera.y = p.pos.y - height / 2;
    } else {
        camera.x = p.pos.x - width / 2;
        camera.y = p.pos.y - height / 2;
        if (state.screenShake > 0) {
            camera.x += (Math.random() - 0.5) * state.screenShake;
            camera.y += (Math.random() - 0.5) * state.screenShake;
            state.screenShake *= 0.9;
            if (state.screenShake < 0.5) state.screenShake = 0;
        }
        if (!state.inBunker) {
            camera.x = Math.max(0, Math.min(MAP_SIZE - width, camera.x));
            camera.y = Math.max(0, Math.min(MAP_SIZE - height, camera.y));
        }
    }

    ctx.save();
    ctx.translate(-camera.x, -camera.y);

    // --- WORLD DRAW (Always draw world unless in bunker, even in menu for BG) ---
    if (!state.inBunker) {
        ctx.fillStyle = '#1e293b'; 
        if (assets.bg) ctx.fillStyle = assets.bg; 
        ctx.fillRect(camera.x, camera.y, width, height);
        
        ctx.strokeStyle = '#94a3b8'; ctx.lineWidth = 1; ctx.globalAlpha = 0.3; 
        const gridSize = 100; 
        const startX = Math.floor(camera.x / gridSize) * gridSize; 
        const startY = Math.floor(camera.y / gridSize) * gridSize; 
        ctx.beginPath(); 
        for(let x = startX; x < camera.x + width + gridSize; x += gridSize) { ctx.moveTo(x, camera.y); ctx.lineTo(x, camera.y + height); } 
        for(let y = startY; y < camera.y + height + gridSize; y += gridSize) { ctx.moveTo(camera.x, y); ctx.lineTo(camera.x + width, y); } 
        ctx.stroke(); 
        ctx.globalAlpha = 1.0;
        
        // Hazard Stripes on Map Borders
        ctx.fillStyle = '#ef4444'; ctx.globalAlpha = 0.6; 
        for (let gx = 0; gx < 5; gx++) { 
            for (let gy = 0; gy < 5; gy++) { 
                if (gx === 2 && gy === 2) continue; 
                const cx = gx * GRID_CELL_SIZE + GRID_CELL_SIZE / 2; 
                const cy = gy * GRID_CELL_SIZE + GRID_CELL_SIZE / 2; 
                const mapCenter = MAP_SIZE / 2; 
                const angle = Math.atan2(mapCenter - cy, mapCenter - cx); 
                ctx.save(); 
                ctx.translate(cx, cy); 
                ctx.rotate(angle); 
                ctx.beginPath(); ctx.moveTo(30, 0); ctx.lineTo(-30, -60); ctx.lineTo(-10, 0); ctx.lineTo(-30, 60); ctx.closePath(); ctx.fill(); 
                ctx.restore(); 
            } 
        } 
        ctx.globalAlpha = 1.0;

        // Draw Navigation Arrows in Outer Grids
        for(let gx=0; gx<5; gx++) {
            for(let gy=0; gy<5; gy++) {
                if (gx === 2 && gy === 2) continue;
                // Center of grid cell
                const cx = gx * GRID_CELL_SIZE + GRID_CELL_SIZE/2;
                const cy = gy * GRID_CELL_SIZE + GRID_CELL_SIZE/2;
                
                // Only draw if within view
                if (cx > camera.x - 200 && cx < camera.x + width + 200 && cy > camera.y - 200 && cy < camera.y + height + 200) {
                     const centerX = POI_LOCATIONS.TREE.x;
                     const centerY = POI_LOCATIONS.TREE.y;
                     const angle = Math.atan2(centerY - cy, centerX - cx);
                     
                     ctx.save();
                     ctx.translate(cx, cy);
                     ctx.rotate(angle);
                     
                     // Red Arrow on Floor
                     ctx.fillStyle = '#b91c1c'; // Red-700
                     ctx.globalAlpha = 0.3;
                     ctx.beginPath();
                     ctx.moveTo(100, 0);
                     ctx.lineTo(-50, -80);
                     ctx.lineTo(-50, 80);
                     ctx.fill();
                     
                     ctx.restore();
                }
            }
        }
        ctx.globalAlpha = 1.0;

        // Snow (Always active)
        ctx.fillStyle = '#ffffff'; ctx.globalAlpha = 0.8; 
        ctx.beginPath(); 
        state.snow.forEach((flake, i) => { 
            // Position updated in GameLoop now for DT independence
            let drawX = (flake.x - camera.x) % width; if (drawX < 0) drawX += width; drawX += width; drawX = drawX % width; drawX += camera.x; 
            let drawY = (flake.y - camera.y) % height; if (drawY < 0) drawY += height; drawY += height; drawY = drawY % height; drawY += camera.y; 
            const r = 2 + (i % 2); 
            ctx.moveTo(drawX + r, drawY); ctx.arc(drawX, drawY, r, 0, Math.PI * 2); 
        }); 
        ctx.fill(); 
        ctx.globalAlpha = 1.0;
    }

    if (state.inBunker) {
        // ... Bunker Draw Code ...
        ctx.fillStyle = '#0f172a'; ctx.fillRect(camera.x, camera.y, width, height);
        if (assets.wood) ctx.fillStyle = assets.wood; else ctx.fillStyle = '#a05a2c';
        ctx.fillRect(0, 0, BUNKER_INT_SIZE.w, BUNKER_INT_SIZE.h);
        ctx.strokeStyle = '#27272a'; ctx.lineWidth = 10; ctx.strokeRect(0, 0, BUNKER_INT_SIZE.w, BUNKER_INT_SIZE.h);

        // 1. Exit (Top Left)
        const exit = BUNKER_ZONES.EXIT; 
        ctx.fillStyle = '#10b981'; ctx.fillRect(exit.x - 30, exit.y - 40, 60, 10); 
        ctx.fillStyle = '#000000'; ctx.fillRect(exit.x - 20, exit.y - 40, 40, 60); 
        ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 3; 
        ctx.beginPath(); ctx.moveTo(exit.x, exit.y + 10); ctx.lineTo(exit.x, exit.y - 20); ctx.moveTo(exit.x - 10, exit.y - 10); ctx.lineTo(exit.x, exit.y - 20); ctx.lineTo(exit.x + 10, exit.y - 10); ctx.stroke();
        
        // 2. Crafting (Top Right)
        const craft = BUNKER_ZONES.CRAFTING; 
        ctx.fillStyle = '#713f12'; ctx.fillRect(craft.x - 20, craft.y - 30, 40, 60); 
        ctx.fillStyle = '#a16207'; ctx.fillRect(craft.x - 25, craft.y - 35, 10, 70); 
        
        // 3. Sell (Middle Left)
        const sell = BUNKER_ZONES.SELL; 
        ctx.fillStyle = '#fbbf24'; ctx.beginPath(); ctx.arc(sell.x, sell.y, 25, 0, Math.PI * 2); ctx.fill(); 
        ctx.fillStyle = '#000'; ctx.font = 'bold 24px monospace'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('$', sell.x, sell.y);

        // 4. Gunsmith (Middle Right)
        const smith = BUNKER_ZONES.GUNSMITH; 
        ctx.fillStyle = '#334155'; ctx.fillRect(smith.x - 15, smith.y, 30, 20); 
        ctx.fillStyle = '#475569'; ctx.beginPath(); ctx.moveTo(smith.x - 20, smith.y); ctx.lineTo(smith.x + 10, smith.y); ctx.lineTo(smith.x + 20, smith.y - 5); ctx.lineTo(smith.x + 20, smith.y - 15); ctx.lineTo(smith.x - 20, smith.y - 15); ctx.fill();

        ctx.fillStyle = '#ffffff'; ctx.font = '12px monospace'; ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic'; 
        ctx.fillText("EXIT", exit.x, exit.y + 40); 
        ctx.fillText("CRAFTING", craft.x, craft.y + 40); 
        ctx.fillText("SELL", sell.x, sell.y + 40); 
        ctx.fillText("GUNSMITH", smith.x, smith.y + 40); 

        // BUNKER ENTITIES DRAW (Loot, Medkits)
        state.worldMedkits.forEach(m => drawWorldMedkit(ctx, m));
        state.loot.forEach(l => drawLootItem(ctx, l, state, balance));

    } else if (state.gamePhase !== 'menu') {
        // --- WORLD ENTITIES DRAW (Skip in Menu) ---
        // POIs
        for (const poi of state.worldPois) { 
            if (poi.x > camera.x - 300 && poi.x < camera.x + width + 300 && poi.y > camera.y - 300 && poi.y < camera.y + height + 300) {
                drawPOI(ctx, poi); 
            }
        }

        // Puddles
        state.puddles.forEach(pud => {
            ctx.save(); ctx.translate(pud.pos.x, pud.pos.y);
            ctx.fillStyle = 'rgba(34, 197, 94, 0.6)'; ctx.beginPath(); ctx.arc(0,0,pud.radius,0,Math.PI*2); ctx.fill();
            ctx.fillStyle = '#4ade80'; ctx.beginPath(); ctx.arc(10, 10, 5, 0, Math.PI*2); ctx.fill(); ctx.beginPath(); ctx.arc(-20, -10, 8, 0, Math.PI*2); ctx.fill();
            ctx.restore();
        });
        
        // --- LAYER 1: FLOOR PARTICLES (Blood, Casings) ---
        state.particles.forEach(pt => { 
            if (pt.type !== 'casing' && pt.type !== 'blood') return;

            ctx.fillStyle = pt.color; ctx.globalAlpha = Math.min(1.0, pt.life); 
            if (pt.type === 'casing') { 
                ctx.save(); 
                ctx.translate(pt.pos.x, pt.pos.y); 
                ctx.rotate(pt.rotation); 
                ctx.fillRect(-1.5, -0.75, 3, 1.5); 
                ctx.restore(); 
            } else if (pt.type === 'blood') { 
                 ctx.beginPath(); ctx.arc(pt.pos.x, pt.pos.y, pt.size, 0, Math.PI * 2); ctx.fill(); 
            }
        }); ctx.globalAlpha = 1.0;

        // Turrets
        state.turrets.forEach(t => {
            ctx.save(); ctx.translate(t.pos.x, t.pos.y);
            ctx.fillStyle = '#1f2937'; ctx.beginPath(); ctx.arc(0,0,15,0,Math.PI*2); ctx.fill();
            ctx.strokeStyle = '#374151'; ctx.lineWidth=3; ctx.stroke();
            ctx.rotate(t.rotation);
            ctx.fillStyle = '#60a5fa'; ctx.fillRect(0, -4, 20, 8); // Barrel
            ctx.restore();
        });

        // Decoys
        state.decoys.forEach(d => {
            ctx.save(); ctx.translate(d.pos.x, d.pos.y);
            ctx.fillStyle = '#fff';
            ctx.beginPath(); ctx.arc(0, 10, 15, 0, Math.PI*2); ctx.fill(); // Base
            ctx.beginPath(); ctx.arc(0, -5, 12, 0, Math.PI*2); ctx.fill(); // Mid
            ctx.beginPath(); ctx.arc(0, -20, 10, 0, Math.PI*2); ctx.fill(); // Head
            ctx.fillStyle = '#f97316'; ctx.beginPath(); ctx.moveTo(0, -20); ctx.lineTo(10, -18); ctx.lineTo(0, -16); ctx.fill(); // Nose
            ctx.fillStyle = 'red'; ctx.fillRect(-15, -40, 30, 4);
            ctx.fillStyle = 'green'; ctx.fillRect(-15, -40, 30 * (d.hp / d.maxHp), 4);
            ctx.restore();
        });

        // Clones
        state.clones.forEach(c => {
            ctx.save(); ctx.globalAlpha = 0.6; // Ghostly
            ctx.translate(c.pos.x, c.pos.y); ctx.rotate(c.rotation);
            // Simplified player draw
            ctx.fillStyle = '#335c67'; ctx.beginPath(); ctx.roundRect(-15, -16, 28, 32, 10); ctx.fill(); // Body
            ctx.fillStyle = '#000'; ctx.beginPath(); ctx.arc(0, 0, 11, 0, Math.PI * 2); ctx.fill(); // Hat
            ctx.fillStyle = '#fca5a5'; ctx.beginPath(); ctx.arc(18, 13, 5, 0, Math.PI*2); ctx.fill(); // Hand
            ctx.restore(); ctx.globalAlpha = 1.0;
        });

        // Medkits
        state.worldMedkits.forEach(m => drawWorldMedkit(ctx, m));

        // World Keys
        state.worldKeys.forEach(k => {
            ctx.save();
            ctx.translate(k.pos.x, k.pos.y + Math.sin(state.gameTime / 200) * 5);
            ctx.font = '32px serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('🗝️', 0, 0);
            ctx.restore();
        });
        
        // Magic Drops
        state.magicDrops.forEach(m => {
            ctx.save(); ctx.translate(m.pos.x, m.pos.y + Math.sin(state.gameTime / 200) * 5); // Bobbing
            ctx.font = '32px serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
            if (m.tier === 'Rare') { ctx.shadowBlur = 15; ctx.shadowColor = '#c084fc' }
            ctx.fillText('✨', 0, 0);
            ctx.restore();
        });

        // Bunkers (Active)
        state.activeBunkers.forEach((bunker, i) => { 
            if (bunker.x > camera.x - 200 && bunker.x < camera.x + width + 200 && bunker.y > camera.y - 200 && bunker.y < camera.y + height + 200) { 
                const bx = bunker.x; 
                const by = bunker.y; 
                ctx.fillStyle = '#78350f'; ctx.fillRect(bx - 60, by - 40, 120, 80); 
                ctx.strokeStyle = '#451a03'; ctx.lineWidth = 2; 
                for(let i=0; i<4; i++) { ctx.beginPath(); ctx.moveTo(bx - 60, by - 40 + i*20); ctx.lineTo(bx + 60, by - 40 + i*20); ctx.stroke(); } 
                ctx.fillStyle = '#451a03'; ctx.fillRect(bx - 15, by + 10, 30, 30); 
                ctx.fillStyle = '#fcd34d'; ctx.beginPath(); ctx.arc(bx + 10, by + 25, 3, 0, Math.PI*2); ctx.fill(); 
                ctx.fillStyle = '#b91c1c'; ctx.beginPath(); ctx.moveTo(bx - 70, by - 40); ctx.lineTo(bx + 70, by - 40); ctx.lineTo(bx, by - 100); ctx.fill(); 
                ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.moveTo(bx, by - 100); ctx.lineTo(bx - 30, by - 75); ctx.lineTo(bx - 20, by - 70); ctx.lineTo(bx, by - 85); ctx.lineTo(bx + 20, by - 70); ctx.lineTo(bx + 30, by - 75); ctx.fill(); 
                ctx.fillStyle = '#facc15'; ctx.font = '20px monospace'; ctx.textAlign = 'center'; ctx.fillText("SAFE HOUSE", bx, by - 110);
                
                const isUnlocked = state.unlockedBunkers.get(i) === state.wave; 
                const hasKey = p.keys > 0; 
                // Overhead prompt handles visual, this is floor text
                
                ctx.font = 'bold 12px monospace'; 
                if (isUnlocked) { ctx.fillStyle = '#22c55e'; ctx.fillText("OPEN", bx, by + 58); } 
                else if (hasKey) { ctx.fillStyle = '#facc15'; ctx.fillText("LOCKED", bx, by + 58); } 
                else { ctx.fillStyle = '#ef4444'; ctx.fillText("LOCKED (NEED KEY)", bx, by + 58); } 
            } 
        });

        // Sleigh
        const { bronze, silver, gold } = balance.economy.sleighThresholds; 
        const currentTotal = state.depositedCoins;
        
        let sx = POI_LOCATIONS.SLEIGH.x; 
        let sy = POI_LOCATIONS.SLEIGH.y;

        if (state.exitAnim.active) {
            sx += state.exitAnim.offset.x;
            sy += state.exitAnim.offset.y;
        }

        ctx.save();
        ctx.translate(sx, sy);

        const isGlowing = state.bossState.readyToExtract || (currentTotal >= bronze && !state.bossState.active && !state.bossState.summonRequested);
        
        // Vibration
        if (isGlowing) {
            const cycle = 2300;
            const dur = 150;
            const t = state.gameTime % cycle;
            if (t < dur) {
                const mag = 10 * (Math.PI / 180); // Reduced to 10 degrees
                const p = t / dur; // 0 to 1
                const rot = Math.sin(p * Math.PI * 4) * mag; 
                ctx.rotate(rot);
            }
        }
        
        // Base Outline
        ctx.strokeStyle = '#9ca3af'; 
        ctx.lineWidth = 4; 
        ctx.beginPath(); 
        ctx.moveTo(-70, -30); ctx.lineTo(70, -30); 
        ctx.moveTo(-70, 30); ctx.lineTo(70, 30); 
        ctx.stroke(); 
        ctx.beginPath(); 
        ctx.moveTo(-40, -30); ctx.lineTo(-40, 30); 
        ctx.moveTo(40, -30); ctx.lineTo(40, 30); 
        ctx.stroke(); 

        // Glow Overlay
        if (isGlowing) {
             const glowPhase = (Math.sin(state.gameTime / 200) + 1) / 2; // 0..1
             ctx.save();
             ctx.globalAlpha = glowPhase;
             ctx.shadowBlur = glowPhase * 40;
             ctx.shadowColor = '#facc15';
             ctx.strokeStyle = '#facc15';
             
             ctx.beginPath(); 
             ctx.moveTo(-70, -30); ctx.lineTo(70, -30); 
             ctx.moveTo(-70, 30); ctx.lineTo(70, 30); 
             ctx.stroke(); 
             ctx.beginPath(); 
             ctx.moveTo(-40, -30); ctx.lineTo(-40, 30); 
             ctx.moveTo(40, -30); ctx.lineTo(40, 30); 
             ctx.stroke();
             ctx.restore();
        }
        
        ctx.shadowBlur = 0; 

        // Body
        ctx.fillStyle = '#b91c1c'; ctx.fillRect(-60, -25, 100, 50); 
        ctx.fillStyle = '#7f1d1d'; ctx.fillRect(-30, -20, 40, 40); 
        ctx.fillStyle = '#fcd34d'; ctx.beginPath(); ctx.arc(-40, 0, 25, 0, Math.PI * 2); ctx.fill(); 
        ctx.fillStyle = '#b45309'; ctx.beginPath(); ctx.arc(-40, 0, 10, 0, Math.PI * 2); ctx.fill(); 
        ctx.fillStyle = '#fbbf24'; ctx.font = '20px monospace'; ctx.textAlign = 'center'; ctx.fillText("SLEIGH (EXIT)", 0, -50);
        
        let target = bronze; if (currentTotal >= bronze) target = silver; if (currentTotal >= silver) target = gold; 
        if (!state.exitAnim.active) {
             ctx.fillStyle = '#facc15'; ctx.font = 'bold 16px monospace'; ctx.fillText(`${Math.floor(currentTotal)} / ${target}`, 0, 50);
        }

        // Extraction Radial
        if (state.extractionProgress > 0 && !state.exitAnim.active) {
            const maxTime = balance.player.pickupTime * 3;
            const progress = state.extractionProgress / maxTime;
            ctx.strokeStyle = '#fbbf24';
            ctx.lineWidth = 4;
            ctx.beginPath();
            ctx.arc(0, 0, balance.player.pickupRadius * 1.5, 0, Math.PI * 2 * progress); 
            ctx.stroke();
            ctx.fillStyle = '#ffffff'; ctx.font = 'bold 12px monospace'; ctx.fillText("EXTRACTING...", 0, 70);
        }

        // Summoning Radial
        if (state.summoningProgress > 0) {
            const maxTime = balance.player.pickupTime * 3;
            const progress = state.summoningProgress / maxTime;
            ctx.strokeStyle = '#fbbf24';
            ctx.lineWidth = 4;
            ctx.beginPath();
            ctx.arc(0, 0, balance.player.pickupRadius, 0, Math.PI * 2 * progress);
            ctx.stroke();
            ctx.fillStyle = '#ffffff'; ctx.font = 'bold 12px monospace'; ctx.fillText("SUMMONING BOSS...", 0, 70);
        }

        ctx.restore();

        // Transfer Beams
        if (state.transferState.active) { 
            ctx.save(); 
            const dx = sx - p.pos.x; 
            const dy = sy - p.pos.y; 
            const d = Math.sqrt(dx*dx + dy*dy); 
            const angle = Math.atan2(dy, dx); 
            ctx.translate(p.pos.x, p.pos.y); 
            ctx.rotate(angle); 
            ctx.beginPath(); 
            ctx.strokeStyle = 'rgba(251, 191, 36, 0.6)'; 
            ctx.lineWidth = 3; 
            const time = Date.now() / 100; 
            for(let i=0; i<d; i+=10) { ctx.lineTo(i, Math.sin(i * 0.05 - time) * 10); } 
            ctx.stroke(); 
            ctx.beginPath(); 
            ctx.strokeStyle = 'rgba(252, 211, 77, 0.6)'; 
            ctx.lineWidth = 2; 
            for(let i=0; i<d; i+=10) { ctx.lineTo(i, Math.sin(i * 0.05 - time + Math.PI) * 10); } 
            ctx.stroke(); 
            ctx.restore(); 
        }

        // Center Tree (Decoration)
        ctx.fillStyle = '#166534'; 
        ctx.beginPath(); ctx.moveTo(POI_LOCATIONS.TREE.x, POI_LOCATIONS.TREE.y - 200); 
        ctx.lineTo(POI_LOCATIONS.TREE.x + 100, POI_LOCATIONS.TREE.y + 100); 
        ctx.lineTo(POI_LOCATIONS.TREE.x - 100, POI_LOCATIONS.TREE.y + 100); 
        ctx.fill(); 
        ctx.fillStyle = '#ef4444'; 
        [{x:0,y:-100},{x:-40,y:0},{x:30,y:20},{x:-20,y:60},{x:50,y:80}].forEach(o=>{
            ctx.beginPath();ctx.arc(POI_LOCATIONS.TREE.x+o.x,POI_LOCATIONS.TREE.y+o.y,8,0,Math.PI*2);ctx.fill();
        });

        // --- LAYER 2: LOOT ---
        state.loot.forEach(l => drawLootItem(ctx, l, state, balance));

        // --- LAYER 3: ENTITIES ---
        state.enemies.forEach(e => {
            const stats = balance.enemies.types[e.type]; 
            ctx.fillStyle = stats.color; 
            ctx.save(); ctx.translate(e.pos.x, e.pos.y);
            
            if (e.type === EnemyType.Boss) { 
                ctx.beginPath(); ctx.arc(0, 0, e.radius, 0, Math.PI * 2); ctx.fill(); 
                ctx.fillStyle = '#fca5a5'; ctx.beginPath(); ctx.arc(0, 0, 30, 0, Math.PI * 2); ctx.fill(); 
                ctx.fillStyle = '#ffff00'; ctx.beginPath(); ctx.arc(-15, -10, 5, 0, Math.PI * 2); ctx.arc(15, -10, 5, 0, Math.PI * 2); ctx.fill(); 
                const moveAngle = Math.atan2(p.pos.y - e.pos.y, p.pos.x - e.pos.x); 
                ctx.rotate(moveAngle - Math.PI/2); 
                ctx.fillStyle = '#ef4444'; ctx.beginPath(); ctx.moveTo(-30, -20); ctx.lineTo(30, -20); ctx.lineTo(0, -80); ctx.fill(); 
                ctx.fillStyle = '#ffffff'; ctx.fillRect(-35, -20, 70, 15); 
                ctx.beginPath(); ctx.arc(0, -80, 10, 0, Math.PI*2); ctx.fill(); 
                ctx.restore(); 
                
                ctx.fillStyle = 'red'; ctx.fillRect(e.pos.x - 60, e.pos.y - 120, 120, 10); 
                ctx.fillStyle = '#22c55e'; ctx.fillRect(e.pos.x - 60, e.pos.y - 120, 120 * (e.hp / e.maxHp), 10); 
                ctx.strokeStyle = '#fff'; ctx.lineWidth = 1; ctx.strokeRect(e.pos.x - 60, e.pos.y - 120, 120, 10); 
            } else { 
                ctx.beginPath(); ctx.arc(0, 0, e.radius, 0, Math.PI * 2); ctx.fill(); 
                ctx.fillStyle = '#ffff00'; ctx.beginPath(); ctx.arc(-5, -5, 3, 0, Math.PI * 2); ctx.arc(5, -5, 3, 0, Math.PI * 2); ctx.fill(); 
                if (e.type === EnemyType.Blue) { 
                    ctx.fillStyle = '#334155'; ctx.fillRect(0, -2, e.radius + 10, 4); 
                } 
                ctx.restore(); 
                
                if (e.hp < e.maxHp) { 
                    ctx.fillStyle = 'red'; ctx.fillRect(e.pos.x - 20, e.pos.y - 35, 40, 4); 
                    ctx.fillStyle = 'green'; ctx.fillRect(e.pos.x - 20, e.pos.y - 35, 40 * (e.hp / e.maxHp), 4); 
                } 
            }
        });

        state.projectiles.forEach(pr => { 
            const speed = Math.hypot(pr.velocity.x, pr.velocity.y); 
            if (speed > 5 || (pr.weaponType && pr.weaponType !== WeaponType.Flamethrower)) { 
                ctx.beginPath(); ctx.lineWidth = pr.radius * 2; ctx.lineCap = 'round'; ctx.strokeStyle = pr.color; 
                ctx.moveTo(pr.pos.x - pr.velocity.x, pr.pos.y - pr.velocity.y); 
                ctx.lineTo(pr.pos.x, pr.pos.y); ctx.stroke(); 
                ctx.beginPath(); ctx.fillStyle = '#ffffff'; ctx.arc(pr.pos.x, pr.pos.y, pr.radius * 0.7, 0, Math.PI * 2); ctx.fill(); 
            } else { 
                ctx.beginPath(); ctx.fillStyle = pr.color; ctx.arc(pr.pos.x, pr.pos.y, pr.radius, 0, Math.PI * 2); ctx.fill(); 
                ctx.beginPath(); ctx.fillStyle = '#ffffff'; ctx.arc(pr.pos.x, pr.pos.y, pr.radius * 0.5, 0, Math.PI * 2); ctx.fill(); 
            } 
        });

    }
    
    // --- LAYER 4: AIR PARTICLES & TEXT (Moved out to support Bunker rendering) ---
    if (state.gamePhase !== 'menu') {
        state.floatingTexts.forEach(ft => { 
            ctx.save(); ctx.translate(ft.pos.x, ft.pos.y); 
            ctx.fillStyle = ft.color; ctx.font = 'bold 16px monospace'; ctx.textAlign = 'center'; 
            ctx.globalAlpha = ft.life; 
            ctx.fillText(ft.text, 0, 0); 
            ctx.restore(); 
        }); 
        ctx.globalAlpha = 1.0;
        
        state.particles.forEach(pt => { 
            if (pt.type === 'casing' || pt.type === 'blood') return; 

            ctx.fillStyle = pt.color; ctx.globalAlpha = Math.min(1.0, pt.life); 
            if (pt.type === 'heart') { 
                ctx.font = '20px serif'; ctx.textAlign = 'center'; ctx.fillText('❤️', pt.pos.x, pt.pos.y); 
            } else { 
                ctx.beginPath(); ctx.arc(pt.pos.x, pt.pos.y, pt.size, 0, Math.PI * 2); ctx.fill(); 
            } 
        }); 
        ctx.globalAlpha = 1.0;
    }

    if (state.gamePhase !== 'intro' && state.gamePhase !== 'menu') {
        drawPlayer(ctx, state, balance);
        
        // Draw Mobile Joysticks
        if (state.isMobile) {
            ctx.restore(); // Pop back to Screen Space (Identity)
            ctx.save();
            
            // Left Joystick
            if (state.inputs.mobile.joysticks.left.active) {
                const j = state.inputs.mobile.joysticks.left;
                ctx.beginPath();
                ctx.arc(j.origin.x, j.origin.y, 40, 0, Math.PI * 2);
                ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
                ctx.fill();
                ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
                ctx.lineWidth = 2;
                ctx.stroke();

                ctx.beginPath();
                ctx.arc(j.current.x, j.current.y, 20, 0, Math.PI * 2);
                ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
                ctx.fill();
            }

            // Right Joystick
            if (state.inputs.mobile.joysticks.right.active) {
                const j = state.inputs.mobile.joysticks.right;
                ctx.beginPath();
                ctx.arc(j.origin.x, j.origin.y, 40, 0, Math.PI * 2);
                ctx.fillStyle = 'rgba(255, 0, 0, 0.1)';
                ctx.fill();
                ctx.strokeStyle = 'rgba(255, 0, 0, 0.3)';
                ctx.lineWidth = 2;
                ctx.stroke();

                ctx.beginPath();
                ctx.arc(j.current.x, j.current.y, 20, 0, Math.PI * 2);
                ctx.fillStyle = 'rgba(255, 0, 0, 0.5)';
                ctx.fill();
            }
        }
    }
    
    ctx.restore();
};