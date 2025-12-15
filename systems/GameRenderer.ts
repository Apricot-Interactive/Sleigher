
import { GameState, GameBalance, WorldPOI, WeaponType, Loot, EnemyType, ItemTier, Vector2, Enemy, Projectile, Particle } from '../types.ts';
import { MAP_SIZE, GRID_CELL_SIZE, POI_LOCATIONS, BUNKER_INT_SIZE, BUNKER_ZONES } from '../constants.ts';
import { distance } from '../utils/math.ts';

// ==========================================
// >>> ASSET GENERATION <<<
// ==========================================

export const createCamoPattern = () => {
    const pCanvas = document.createElement('canvas');
    pCanvas.width = 256; 
    pCanvas.height = 256; 
    const pCtx = pCanvas.getContext('2d'); 
    if (!pCtx) return null;
    
    // Dark base for Night Theme
    pCtx.fillStyle = '#1e293b'; 
    pCtx.fillRect(0, 0, 256, 256);
    
    // Abstract geometric camo shapes
    for(let i=0; i<40; i++) { 
        pCtx.fillStyle = Math.random() > 0.5 ? '#334155' : '#0f172a'; 
        const w = 32 + Math.random() * 64; 
        const h = 32 + Math.random() * 64; 
        const x = Math.random() * 256; 
        const y = Math.random() * 256; 
        pCtx.beginPath();
        pCtx.rect(x, y, w, h);
        pCtx.fill();
    }
    return pCtx.createPattern(pCanvas, 'repeat');
};

export const createWoodPattern = () => {
    const pCanvas = document.createElement('canvas'); 
    pCanvas.width = 64; 
    pCanvas.height = 64; 
    const ctx = pCanvas.getContext('2d'); 
    if (!ctx) return null;
    
    ctx.fillStyle = '#78350f'; 
    ctx.fillRect(0, 0, 64, 64); 
    
    // Wood grain lines
    ctx.strokeStyle = '#451a03'; 
    ctx.lineWidth = 2; 
    ctx.beginPath(); 
    for(let i=0; i<64; i+=8) { 
        ctx.moveTo(0, i + Math.random() * 4); 
        ctx.lineTo(64, i + Math.random() * 4); 
    } 
    ctx.stroke();
    return ctx.createPattern(pCanvas, 'repeat');
};

// ==========================================
// >>> HELPER FUNCTIONS <<<
// ==========================================

// Check if an entity is within the camera's viewport + buffer
const isVisible = (pos: Vector2, camera: Vector2, width: number, height: number, buffer: number = 200) => {
    return pos.x >= camera.x - buffer &&
           pos.x <= camera.x + width + buffer &&
           pos.y >= camera.y - buffer &&
           pos.y <= camera.y + height + buffer;
};

// ==========================================
// >>> ENTITY DRAWING <<<
// ==========================================

const drawWeaponIcon = (ctx: CanvasRenderingContext2D, type: WeaponType, x: number, y: number, size: number) => {
    ctx.save();
    ctx.translate(x, y);
    const scale = size / 100;
    ctx.scale(scale, scale);
    ctx.fillStyle = '#ffffff'; 
    ctx.translate(-50, -50); // Center at 0,0

    ctx.beginPath();
    if (type === WeaponType.Pistol) {
        ctx.moveTo(20, 40); ctx.lineTo(80, 40); ctx.lineTo(80, 55); 
        ctx.lineTo(70, 55); ctx.lineTo(70, 85); ctx.lineTo(45, 85); 
        ctx.lineTo(45, 55); ctx.lineTo(20, 55); ctx.fill();
    } else if (type === WeaponType.Shotgun) {
        ctx.moveTo(5, 45); ctx.lineTo(95, 45); ctx.lineTo(95, 55); ctx.lineTo(5, 55); ctx.fill();
        ctx.beginPath(); ctx.rect(25, 58, 30, 8); ctx.fill();
        ctx.beginPath(); ctx.moveTo(5, 55); ctx.lineTo(15, 75); ctx.lineTo(5, 75); ctx.lineTo(0, 55); ctx.fill();
    } else if (type === WeaponType.AR) {
        ctx.moveTo(10, 45); ctx.lineTo(90, 45); ctx.lineTo(90, 55); ctx.lineTo(10, 55); ctx.fill();
        ctx.beginPath(); ctx.rect(50, 55, 10, 20); ctx.fill();
        ctx.beginPath(); ctx.moveTo(10, 45); ctx.lineTo(0, 65); ctx.lineTo(15, 65); ctx.lineTo(20, 55); ctx.fill();
        ctx.beginPath(); ctx.rect(55, 38, 4, 7); ctx.fill();
    } else if (type === WeaponType.Flamethrower) {
        ctx.rect(20, 35, 60, 30); ctx.fill();
        ctx.beginPath(); ctx.rect(80, 45, 15, 10); ctx.fill();
        ctx.beginPath(); ctx.moveTo(20, 45); ctx.lineTo(5, 45); ctx.lineTo(5, 65); ctx.lineTo(20, 55); ctx.fill();
    } else if (type === WeaponType.Snowball) {
        ctx.arc(50, 50, 30, 0, Math.PI*2); ctx.fill();
    } else if (type === WeaponType.Chainsaw) {
        ctx.moveTo(10,40); ctx.lineTo(40,40); ctx.lineTo(40,30); ctx.lineTo(90,30); ctx.lineTo(95,40); ctx.lineTo(90,50); ctx.lineTo(40,50); ctx.lineTo(40,60); ctx.lineTo(10,60); ctx.fill();
        ctx.fillStyle = '#000'; ctx.beginPath(); ctx.arc(25,50,5,0,Math.PI*2); ctx.fill();
    } else if (type === WeaponType.Boomerang) {
        ctx.translate(50,50); ctx.rotate(-Math.PI/4); ctx.translate(-50,-50);
        ctx.moveTo(10,50); ctx.quadraticCurveTo(50,0,90,50); ctx.lineTo(80,60); ctx.quadraticCurveTo(50,20,20,60); ctx.fill();
    } else if (type === WeaponType.Sword) {
        ctx.moveTo(20,80); ctx.lineTo(35,65); ctx.lineTo(85,15); ctx.lineTo(90,20); ctx.lineTo(40,70); ctx.lineTo(25,85); ctx.fill();
    } else if (type === WeaponType.Laser) {
        ctx.rect(20,40,40,20); ctx.rect(60,45,30,10); ctx.fill();
    } else if (type === WeaponType.GrenadeLauncher) {
        ctx.rect(10,40,50,20); ctx.arc(60,50,15,0,Math.PI*2); ctx.fill(); ctx.rect(75,45,20,10); ctx.fill();
    } else if (type === WeaponType.ArcTaser) {
        ctx.rect(20,40,40,20); ctx.fill();
        ctx.strokeStyle = '#fff'; ctx.lineWidth=3; ctx.beginPath(); ctx.moveTo(60,50); ctx.lineTo(70,35); ctx.lineTo(80,65); ctx.lineTo(90,50); ctx.stroke();
    } else if (type === WeaponType.Sniper) {
        ctx.fillRect(5, 42, 75, 10); ctx.fillRect(80, 40, 15, 14);
        ctx.rect(20, 32, 40, 6); ctx.fill();
        ctx.fillRect(20, 52, 10, 15);
        ctx.beginPath(); ctx.moveTo(5, 52); ctx.lineTo(0, 65); ctx.lineTo(10, 65); ctx.lineTo(15, 52); ctx.fill();
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
    // Labels
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

const drawEnemy = (ctx: CanvasRenderingContext2D, e: Enemy, gameTime: number, balance: GameBalance) => {
    ctx.save();
    ctx.translate(e.pos.x, e.pos.y);
    const stats = balance.enemies.types[e.type];

    if (e.type === EnemyType.M1) {
        // M1 Zombie Elf Art
        const stagger = Math.sin(gameTime / 150 + parseFloat('0.'+e.id.replace(/\D/g,''))) * 0.3;
        ctx.rotate(e.rotation + Math.PI/2 + stagger);

        // Body
        ctx.fillStyle = '#14532d'; 
        ctx.fillRect(-12, -14, 24, 20);

        // Tatters
        ctx.fillStyle = '#052e16'; 
        ctx.fillRect(-12, -8, 24, 3);
        ctx.fillRect(-12, 0, 24, 2);

        // Shoulders
        ctx.fillStyle = '#14532d';
        ctx.beginPath(); ctx.arc(-10, -10, 6, 0, Math.PI*2); ctx.fill();
        ctx.beginPath(); ctx.arc(10, -10, 6, 0, Math.PI*2); ctx.fill();

        // Head
        ctx.fillStyle = '#86efac';
        ctx.beginPath(); ctx.arc(0, -6, 11, 0, Math.PI*2); ctx.fill();

        // Hat
        ctx.fillStyle = '#b91c1c'; 
        ctx.beginPath(); ctx.moveTo(-10, -10); ctx.lineTo(10, -10); ctx.lineTo(0, -35); ctx.fill();
        ctx.fillStyle = '#fff';
        ctx.beginPath(); ctx.arc(0, -35, 4, 0, Math.PI*2); ctx.fill();

        // Eyes
        ctx.fillStyle = '#1e293b';
        ctx.beginPath(); ctx.arc(-4, -8, 2.5, 0, Math.PI*2); ctx.fill();
        ctx.beginPath(); ctx.arc(4, -8, 2.5, 0, Math.PI*2); ctx.fill();

    } else if (e.type === EnemyType.Reindeer) {
        // Crazed Reindeer
        ctx.rotate(e.rotation + Math.PI/2);
        // Body (Oval)
        ctx.fillStyle = '#78350f'; // Dark Brown
        ctx.beginPath(); ctx.ellipse(0, 0, 12, 20, 0, 0, Math.PI*2); ctx.fill();
        
        // Head
        ctx.translate(0, -15);
        ctx.fillStyle = '#5c2b0b'; // Slightly darker head
        ctx.beginPath(); ctx.arc(0, 0, 8, 0, Math.PI*2); ctx.fill();
        
        // Nose (Glowing Red)
        ctx.fillStyle = '#ef4444';
        ctx.shadowBlur = 5; ctx.shadowColor = '#ef4444';
        ctx.beginPath(); ctx.arc(0, -6, 3, 0, Math.PI*2); ctx.fill();
        ctx.shadowBlur = 0;

        // Eyes (Small red dots)
        ctx.fillStyle = '#f87171';
        ctx.beginPath(); ctx.arc(-3, -2, 1.5, 0, Math.PI*2); ctx.fill();
        ctx.beginPath(); ctx.arc(3, -2, 1.5, 0, Math.PI*2); ctx.fill();

        // Antlers
        ctx.strokeStyle = '#fcd34d'; // Bone/Light color
        ctx.lineWidth = 2;
        ctx.lineCap = 'round';
        ctx.beginPath(); 
        // Left Antler
        ctx.moveTo(-4, -6); ctx.lineTo(-12, -15); ctx.lineTo(-8, -18); 
        ctx.moveTo(-12, -15); ctx.lineTo(-16, -12); 
        // Right Antler
        ctx.moveTo(4, -6); ctx.lineTo(12, -15); ctx.lineTo(8, -18); 
        ctx.moveTo(12, -15); ctx.lineTo(16, -12); 
        ctx.stroke();

    } else if (e.type === EnemyType.Tangler) {
        // Tangler Elf (Blue, Lights)
        const stagger = Math.sin(gameTime / 150) * 0.2;
        ctx.rotate(e.rotation + Math.PI/2 + stagger);

        // Body
        ctx.fillStyle = '#0e7490'; // Cyan/Blue
        ctx.fillRect(-10, -16, 20, 24); // Taller

        // Lights (Wrapped)
        const time = gameTime / 200;
        for(let i=0; i<3; i++) {
            const y = -14 + i * 8;
            ctx.strokeStyle = `hsl(${(time * 50 + i * 60) % 360}, 100%, 50%)`;
            ctx.lineWidth = 2;
            ctx.beginPath(); ctx.moveTo(-10, y); ctx.lineTo(10, y + 4); ctx.stroke();
        }

        // Head
        ctx.fillStyle = '#cffafe';
        ctx.beginPath(); ctx.arc(0, -8, 10, 0, Math.PI*2); ctx.fill();

        // Hat
        ctx.fillStyle = '#155e75';
        ctx.beginPath(); ctx.moveTo(-10, -12); ctx.lineTo(10, -12); ctx.lineTo(0, -40); ctx.fill();
        
        // Eyes
        ctx.fillStyle = '#000';
        ctx.beginPath(); ctx.arc(-4, -8, 2, 0, Math.PI*2); ctx.fill();
        ctx.beginPath(); ctx.arc(4, -8, 2, 0, Math.PI*2); ctx.fill();

    } else if (e.type === EnemyType.Chef) {
        const stagger = Math.sin(gameTime / 150) * 0.2;
        ctx.rotate(e.rotation + Math.PI/2 + stagger);

        // Body (Bloated)
        ctx.fillStyle = '#fef3c7'; // Cream
        ctx.beginPath(); ctx.arc(0, -5, 18, 0, Math.PI*2); ctx.fill();
        
        // Apron
        ctx.fillStyle = '#b91c1c';
        ctx.fillRect(-12, -15, 24, 25);

        // Head
        ctx.fillStyle = '#fecaca';
        ctx.beginPath(); ctx.arc(0, -8, 12, 0, Math.PI*2); ctx.fill();

        // Chef Hat
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.moveTo(-14, -18); ctx.lineTo(14, -18); ctx.lineTo(16, -45); ctx.lineTo(-16, -45);
        ctx.fill();
        // Hat Puff
        ctx.beginPath(); ctx.arc(0, -45, 16, Math.PI, 0); ctx.fill();

        // Sack
        ctx.fillStyle = '#fcd34d';
        ctx.beginPath(); ctx.arc(15, 10, 8, 0, Math.PI*2); ctx.fill();

    } else if (e.type === EnemyType.Yeti) {
        // Yeti
        const walk = Math.sin(gameTime / 300) * 5;
        ctx.rotate(e.rotation + Math.PI/2);

        // Body (Large Furry)
        ctx.fillStyle = '#e2e8f0'; // Slate 200
        ctx.beginPath(); ctx.ellipse(0, 0, 25, 40, 0, 0, Math.PI*2); ctx.fill();
        
        // Shoulders
        ctx.beginPath(); ctx.arc(-20, -15 + walk, 15, 0, Math.PI*2); ctx.fill();
        ctx.beginPath(); ctx.arc(20, -15 - walk, 15, 0, Math.PI*2); ctx.fill();

        // Head
        ctx.fillStyle = '#f8fafc';
        ctx.beginPath(); ctx.arc(0, -25, 20, 0, Math.PI*2); ctx.fill();

        // Face
        ctx.fillStyle = '#94a3b8'; // Darker skin
        ctx.beginPath(); ctx.arc(0, -25, 10, 0, Math.PI*2); ctx.fill();
        
        // Eyes (Blue glowing)
        ctx.fillStyle = '#60a5fa';
        ctx.beginPath(); ctx.arc(-4, -28, 3, 0, Math.PI*2); ctx.fill();
        ctx.beginPath(); ctx.arc(4, -28, 3, 0, Math.PI*2); ctx.fill();

    } else if (e.type === EnemyType.Boss) {
        // Boss Art
        ctx.beginPath(); ctx.arc(0, 0, e.radius, 0, Math.PI * 2); ctx.fill(); 
        ctx.fillStyle = '#fca5a5'; ctx.beginPath(); ctx.arc(0, 0, 30, 0, Math.PI * 2); ctx.fill(); 
        ctx.fillStyle = '#ffff00'; ctx.beginPath(); ctx.arc(-15, -10, 5, 0, Math.PI * 2); ctx.arc(15, -10, 5, 0, Math.PI * 2); ctx.fill(); 
        ctx.rotate(e.rotation - Math.PI/2); 
        ctx.fillStyle = '#ef4444'; ctx.beginPath(); ctx.moveTo(-30, -20); ctx.lineTo(30, -20); ctx.lineTo(0, -80); ctx.fill(); 
        ctx.fillStyle = '#ffffff'; ctx.fillRect(-35, -20, 70, 15); 
        ctx.beginPath(); ctx.arc(0, -80, 10, 0, Math.PI*2); ctx.fill(); 

    } else {
        // Generic Fallback (Should typically only catch M1 if art fails)
        ctx.fillStyle = stats.color;
        ctx.beginPath(); ctx.arc(0, 0, e.radius, 0, Math.PI * 2); ctx.fill(); 
        ctx.fillStyle = '#ffff00'; ctx.beginPath(); ctx.arc(-5, -5, 3, 0, Math.PI * 2); ctx.arc(5, -5, 3, 0, Math.PI * 2); ctx.fill(); 
    }

    // HP Bar
    if (e.hp < e.maxHp) { 
        ctx.restore(); ctx.save(); ctx.translate(e.pos.x, e.pos.y);
        const yOff = e.type === EnemyType.Boss ? 120 : e.type === EnemyType.Yeti ? 60 : 35;
        const width = e.type === EnemyType.Boss ? 120 : e.type === EnemyType.Yeti ? 60 : 40;
        ctx.fillStyle = 'red'; ctx.fillRect(-width/2, -yOff, width, 4); 
        ctx.fillStyle = 'green'; ctx.fillRect(-width/2, -yOff, width * (e.hp / e.maxHp), 4); 
        if (e.type === EnemyType.Boss || e.type === EnemyType.Yeti) {
             ctx.strokeStyle = '#fff'; ctx.lineWidth = 1; ctx.strokeRect(-width/2, -yOff, width, 4);
        }
    }

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

    // Body (Tactical Vest)
    ctx.fillStyle = '#335c67'; ctx.strokeStyle = '#0f172a'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.roundRect(-15, -16, 28, 32, 10); ctx.fill(); ctx.stroke();
    // Shoulders
    ctx.fillStyle = '#669999';
    ctx.beginPath(); ctx.arc(0, -14, 10, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.arc(0, 14, 10, 0, Math.PI * 2); ctx.fill(); ctx.stroke();

    // Weapon
    if (p.weapon) {
        ctx.save();
        const w = p.weapon as WeaponType;
        if (w === WeaponType.Pistol) { ctx.translate(20, 13); ctx.fillStyle = '#171717'; ctx.fillRect(-5, -3, 12, 6); ctx.fillStyle = '#cbd5e1'; ctx.fillRect(0, -3, 14, 6); ctx.strokeRect(0, -3, 14, 6); } 
        else if (w === WeaponType.Shotgun) { ctx.translate(15, 13); ctx.fillStyle = '#451a03'; ctx.fillRect(-10, -3, 15, 6); ctx.fillStyle = '#0f172a'; ctx.fillRect(5, -4, 20, 8); ctx.fillStyle = '#78350f'; ctx.fillRect(10, -5, 8, 10); }
        else if (w === WeaponType.AR) { ctx.translate(15, 13); ctx.fillStyle = '#0f172a'; ctx.fillRect(-5, -4, 35, 8); ctx.fillStyle = '#334155'; ctx.fillRect(5, 4, 8, 6); ctx.fillStyle = '#10b981'; ctx.fillRect(0, -6, 4, 2); }
        else if (w === WeaponType.Flamethrower) { ctx.translate(10, 13); ctx.fillStyle = '#f97316'; ctx.fillRect(-12, -22, 12, 36); ctx.fillStyle = '#475569'; ctx.fillRect(10, -6, 25, 12); ctx.fillStyle = '#ea580c'; ctx.fillRect(35, -4, 4, 8); }
        else if (w === WeaponType.Snowball) { ctx.translate(20, 13); ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.arc(0, 0, 6, 0, Math.PI*2); ctx.fill(); }
        else if (w === WeaponType.Chainsaw) { ctx.translate(20, 15); ctx.fillStyle = '#facc15'; ctx.fillRect(-5, -6, 20, 12); ctx.fillStyle = '#334155'; ctx.fillRect(15, -2, 35, 4); }
        else if (w === WeaponType.Boomerang) { ctx.translate(20, 13); ctx.rotate(-Math.PI/4); ctx.fillStyle = '#a05a2c'; ctx.beginPath(); ctx.moveTo(-5,0); ctx.quadraticCurveTo(5,-10, 15, -5); ctx.quadraticCurveTo(5, -5, -5, 0); ctx.fill(); ctx.beginPath(); ctx.moveTo(-5,0); ctx.quadraticCurveTo(5, 10, 15, 5); ctx.quadraticCurveTo(5, 5, -5, 0); ctx.fill(); }
        else if (w === WeaponType.Sword) { 
            const swingTime = 300; const timeSinceShot = state.gameTime - p.lastShotTime; let rot = 0;
            if (timeSinceShot < swingTime) { const progress = timeSinceShot / swingTime; rot = -Math.PI/4 + (Math.PI/2 * progress); }
            ctx.translate(10, 10); ctx.rotate(rot); ctx.translate(10, 0); ctx.fillStyle = '#e2e8f0'; ctx.fillRect(0, -2, 40, 4); ctx.fillStyle = '#475569'; ctx.fillRect(-5, -5, 5, 10); 
        }
        else if (w === WeaponType.Laser) { 
            ctx.translate(20, 13); ctx.fillStyle = '#b91c1c'; ctx.fillRect(-5, -4, 25, 8); ctx.fillStyle = '#ef4444'; ctx.fillRect(20, -2, 5, 4);
            if (state.gameTime - p.lastShotTime < 100 && p.ammo > 0) {
                ctx.shadowBlur = 10; ctx.shadowColor = '#ef4444'; ctx.strokeStyle = '#ef4444'; ctx.lineWidth = 3;
                ctx.beginPath(); ctx.moveTo(25, 0); ctx.lineTo(balance.weapons[WeaponType.Laser].range, 0); ctx.stroke();
                ctx.strokeStyle = '#fff'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(25, 0); ctx.lineTo(balance.weapons[WeaponType.Laser].range, 0); ctx.stroke();
                ctx.shadowBlur = 0;
            }
        }
        else if (w === WeaponType.GrenadeLauncher) { ctx.translate(15, 13); ctx.fillStyle = '#1e293b'; ctx.fillRect(-5, -5, 25, 10); ctx.fillStyle = '#000'; ctx.beginPath(); ctx.arc(10, 0, 8, 0, Math.PI*2); ctx.fill(); ctx.fillStyle = '#334155'; ctx.fillRect(20, -4, 15, 8); }
        else if (w === WeaponType.ArcTaser) { ctx.translate(15, 13); ctx.fillStyle = '#1e3a8a'; ctx.fillRect(-5, -5, 20, 10); ctx.strokeStyle = '#60a5fa'; ctx.lineWidth=2; ctx.beginPath(); ctx.moveTo(15, -3); ctx.lineTo(25, -3); ctx.stroke(); ctx.beginPath(); ctx.moveTo(15, 3); ctx.lineTo(25, 3); ctx.stroke(); }
        else if (w === WeaponType.Sniper) { ctx.translate(15, 13); ctx.fillStyle = '#1e293b'; ctx.fillRect(-5, -4, 45, 8); ctx.fillStyle = '#0f172a'; ctx.fillRect(-10, -3, 10, 6); ctx.fillStyle = '#000'; ctx.fillRect(10, -8, 20, 4); ctx.fillStyle = '#334155'; ctx.fillRect(5, 4, 6, 8); }
        ctx.restore();
    }

    // Hands
    ctx.fillStyle = '#fca5a5'; ctx.strokeStyle = '#b91c1c'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.arc(18, 13, 5, 0, Math.PI*2); ctx.fill(); ctx.stroke();
    if (!p.weapon) { ctx.beginPath(); ctx.arc(18, -13, 5, 0, Math.PI*2); ctx.fill(); ctx.stroke(); }

    // Head + Hat
    ctx.fillStyle = '#fca5a5'; ctx.beginPath(); ctx.arc(0, 0, 11, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#000000'; ctx.beginPath(); ctx.arc(0, 0, 11, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#171717'; ctx.fillRect(4, -8, 10, 16); 
    
    ctx.restore();
    
    // Reload Bar
    if (p.reloadingUntil > state.gameTime && p.weapon) {
        const totalTime = balance.weapons[p.weapon].reloadTime; 
        const pct = 1 - ((p.reloadingUntil - state.gameTime) / totalTime);
        ctx.fillStyle = '#334155'; ctx.fillRect(p.pos.x - 20, p.pos.y - 40, 40, 6); 
        ctx.fillStyle = '#fbbf24'; ctx.fillRect(p.pos.x - 20, p.pos.y - 40, 40 * pct, 6);
    }
};

// ==========================================
// >>> MAIN DRAW LOOP <<<
// ==========================================

export const drawGame = (ctx: CanvasRenderingContext2D, width: number, height: number, state: GameState, balance: GameBalance, assets: { bg: CanvasPattern | null, wood: CanvasPattern | null }) => {
    // Update Camera
    if (!state.inBunker) {
        state.camera.x = state.player.pos.x - width / 2;
        state.camera.y = state.player.pos.y - height / 2;
        // Clamp
        state.camera.x = Math.max(0, Math.min(state.camera.x, MAP_SIZE - width));
        state.camera.y = Math.max(0, Math.min(state.camera.y, MAP_SIZE - height));
    }

    // Clear
    ctx.fillStyle = '#0f172a'; // Slate 900
    ctx.fillRect(0, 0, width, height);

    if (state.inBunker) {
        // Draw Bunker
        ctx.save();
        // Center bunker on screen
        const bx = (width - BUNKER_INT_SIZE.w) / 2;
        const by = (height - BUNKER_INT_SIZE.h) / 2;
        ctx.translate(bx, by);
        
        // Floor
        ctx.fillStyle = assets.wood || '#573618';
        ctx.fillRect(0, 0, BUNKER_INT_SIZE.w, BUNKER_INT_SIZE.h);
        
        // Zones
        const drawZone = (zone: any, color: string, label: string) => {
            ctx.fillStyle = color;
            ctx.beginPath(); ctx.arc(zone.x, zone.y, zone.radius, 0, Math.PI*2); ctx.fill();
            ctx.fillStyle = 'rgba(255,255,255,0.2)';
            ctx.beginPath(); ctx.arc(zone.x, zone.y, zone.radius - 5, 0, Math.PI*2); ctx.fill();
            ctx.fillStyle = '#fff'; ctx.font = 'bold 10px monospace'; ctx.textAlign = 'center';
            ctx.fillText(label, zone.x, zone.y + 4);
        };

        drawZone(BUNKER_ZONES.EXIT, '#ef4444', 'EXIT');
        drawZone(BUNKER_ZONES.CRAFTING, '#3b82f6', 'CRAFT');
        drawZone(BUNKER_ZONES.SELL, '#eab308', 'SELL');
        drawZone(BUNKER_ZONES.GUNSMITH, '#64748b', 'GUNS');

        // Player
        drawPlayer(ctx, state, balance);
        
        // Floating Texts in Bunker
        state.floatingTexts.forEach(t => {
            ctx.save();
            ctx.translate(t.pos.x, t.pos.y);
            ctx.fillStyle = t.color;
            ctx.font = 'bold 14px monospace';
            ctx.textAlign = 'center';
            ctx.fillText(t.text, 0, 0);
            ctx.restore();
        });

        ctx.restore();
        return;
    }

    ctx.save();
    ctx.translate(-state.camera.x, -state.camera.y);

    // 1. Background
    if (assets.bg) {
        ctx.fillStyle = assets.bg;
        ctx.fillRect(state.camera.x, state.camera.y, width, height);
    } else {
        ctx.fillStyle = '#1e293b'; // Fallback
        ctx.fillRect(state.camera.x, state.camera.y, width, height);
    }
    
    // Grid (Restored)
    ctx.strokeStyle = '#94a3b8'; ctx.lineWidth = 1; ctx.globalAlpha = 0.3; 
    const gridSize = 100; 
    const startX = Math.floor(state.camera.x / gridSize) * gridSize; 
    const startY = Math.floor(state.camera.y / gridSize) * gridSize; 
    ctx.beginPath(); 
    for(let x = startX; x < state.camera.x + width + gridSize; x += gridSize) { ctx.moveTo(x, state.camera.y); ctx.lineTo(x, state.camera.y + height); } 
    for(let y = startY; y < state.camera.y + height + gridSize; y += gridSize) { ctx.moveTo(state.camera.x, y); ctx.lineTo(state.camera.x + width, y); } 
    ctx.stroke(); 
    ctx.globalAlpha = 1.0;

    // Hazard Stripes (Restored)
    ctx.fillStyle = '#ef4444'; ctx.globalAlpha = 0.6; 
    for (let gx = 0; gx < 5; gx++) { 
        for (let gy = 0; gy < 5; gy++) { 
            if (gx === 2 && gy === 2) continue; 
            const cx = gx * GRID_CELL_SIZE + GRID_CELL_SIZE / 2; 
            const cy = gy * GRID_CELL_SIZE + GRID_CELL_SIZE / 2; 
            // Culling optimization for stripes
            if (!isVisible({x: cx, y: cy}, state.camera, width, height, GRID_CELL_SIZE)) continue;
            
            ctx.save(); ctx.translate(cx, cy); ctx.rotate(Math.PI/4); 
            ctx.beginPath(); ctx.moveTo(30, 0); ctx.lineTo(-30, -60); ctx.lineTo(-10, 0); ctx.lineTo(-30, 60); ctx.closePath(); ctx.fill(); 
            ctx.restore(); 
        } 
    } 
    ctx.globalAlpha = 1.0;

    // Navigation Arrows (Restored)
    for(let gx=0; gx<5; gx++) {
        for(let gy=0; gy<5; gy++) {
            if (gx === 2 && gy === 2) continue;
            const cx = gx * GRID_CELL_SIZE + GRID_CELL_SIZE/2;
            const cy = gy * GRID_CELL_SIZE + GRID_CELL_SIZE/2;
            if (isVisible({x:cx, y:cy}, state.camera, width, height, 200)) {
                 const angle = Math.atan2(POI_LOCATIONS.TREE.y - cy, POI_LOCATIONS.TREE.x - cx);
                 ctx.save(); ctx.translate(cx, cy); ctx.rotate(angle);
                 ctx.fillStyle = '#b91c1c'; ctx.globalAlpha = 0.3;
                 ctx.beginPath(); ctx.moveTo(100, 0); ctx.lineTo(-50, -80); ctx.lineTo(-50, 80); ctx.fill();
                 ctx.restore();
            }
        }
    }
    ctx.globalAlpha = 1.0;
    
    // 2. POIs
    state.worldPois.forEach(poi => {
        if (isVisible({x: poi.x, y: poi.y}, state.camera, width, height, 400)) {
            drawPOI(ctx, poi);
        }
    });

    // 3. Bunkers (Exterior - Restored Details)
    state.activeBunkers.forEach((b, i) => {
        if (isVisible(b, state.camera, width, height)) {
            const unlocked = state.unlockedBunkers.has(i);
            const bx = b.x; const by = b.y;
            ctx.save();
            ctx.translate(bx, by);
            // Bunker Graphic
            ctx.fillStyle = '#78350f'; ctx.fillRect(-60, -40, 120, 80); 
            ctx.fillStyle = '#0f172a'; ctx.fillRect(-20, 0, 40, 40); // Door
            
            // Roof
            ctx.fillStyle = '#b91c1c'; ctx.beginPath(); ctx.moveTo(-70, -40); ctx.lineTo(70, -40); ctx.lineTo(0, -100); ctx.fill(); 
            ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.moveTo(0, -100); ctx.lineTo(-30, -75); ctx.lineTo(-20, -70); ctx.lineTo(0, -85); ctx.lineTo(20, -70); ctx.lineTo(30, -75); ctx.fill(); 
            
            // Text
            ctx.fillStyle = '#facc15'; ctx.font = '20px monospace'; ctx.textAlign = 'center'; ctx.fillText("SAFE HOUSE", 0, -110);
            
            const hasKey = state.player.keys > 0;
            ctx.font = 'bold 12px monospace'; 
            if (unlocked) { ctx.fillStyle = '#22c55e'; ctx.fillText("OPEN", 0, 58); } 
            else if (hasKey) { ctx.fillStyle = '#facc15'; ctx.fillText("LOCKED", 0, 58); } 
            else { ctx.fillStyle = '#ef4444'; ctx.fillText("LOCKED (NEED KEY)", 0, 58); } 
            
            // Light
            ctx.fillStyle = unlocked ? '#22c55e' : '#ef4444';
            ctx.shadowBlur = 10; ctx.shadowColor = ctx.fillStyle;
            ctx.beginPath(); ctx.arc(0, -20, 5, 0, Math.PI*2); ctx.fill();
            
            ctx.restore();
        }
    });
    
    // 4. Sleigh (Exit)
    if (isVisible(POI_LOCATIONS.SLEIGH, state.camera, width, height)) {
         ctx.save();
         ctx.translate(POI_LOCATIONS.SLEIGH.x, POI_LOCATIONS.SLEIGH.y);
         // Magic Circle
         if (state.bossState.readyToExtract) {
             const t = Date.now() / 200;
             ctx.strokeStyle = `hsl(${t % 360}, 100%, 50%)`;
             ctx.lineWidth = 5;
             ctx.beginPath(); ctx.arc(0,0, balance.player.pickupRadius, 0, Math.PI*2); ctx.stroke();
         }
         
         // Sleigh Art
         ctx.fillStyle = '#b91c1c';
         ctx.beginPath();
         ctx.moveTo(-40, 0); ctx.quadraticCurveTo(-40, 40, 0, 40); ctx.quadraticCurveTo(40, 40, 40, 0);
         ctx.lineTo(50, -20); ctx.lineTo(-50, -20); ctx.fill();
         // Runners
         ctx.strokeStyle = '#f59e0b'; ctx.lineWidth = 4;
         ctx.beginPath(); ctx.moveTo(-50, 45); ctx.lineTo(50, 45); ctx.quadraticCurveTo(70, 45, 70, 25); ctx.stroke();
         ctx.beginPath(); ctx.moveTo(-30, 45); ctx.lineTo(-30, 20); ctx.stroke();
         ctx.beginPath(); ctx.moveTo(30, 45); ctx.lineTo(30, 20); ctx.stroke();
         
         // Bag
         ctx.fillStyle = '#166534';
         ctx.beginPath(); ctx.arc(0, -20, 30, Math.PI, 0); ctx.fill();

         ctx.restore();
    }

    // 5. Ground Decals (Puddles, Mines)
    state.puddles.forEach(p => {
         if (isVisible(p.pos, state.camera, width, height)) {
             if (p.style === 'candy') {
                 ctx.fillStyle = 'rgba(239, 68, 68, 0.4)'; // Red for Candy
                 ctx.beginPath(); ctx.arc(p.pos.x, p.pos.y, p.radius, 0, Math.PI*2); ctx.fill();
                 ctx.strokeStyle = '#fca5a5'; ctx.lineWidth = 2; ctx.stroke();
                 // Spiral
                 const t = state.gameTime / 1000;
                 ctx.strokeStyle = 'rgba(255,255,255,0.5)';
                 ctx.beginPath();
                 for(let i=0; i<30; i++) {
                     const a = i * 0.5 + t;
                     const r = (i/30) * p.radius;
                     ctx.lineTo(p.pos.x + Math.cos(a)*r, p.pos.y + Math.sin(a)*r);
                 }
                 ctx.stroke();
             } else {
                 ctx.fillStyle = 'rgba(132, 204, 22, 0.4)';
                 ctx.beginPath(); ctx.arc(p.pos.x, p.pos.y, p.radius, 0, Math.PI*2); ctx.fill();
             }
         }
    });
    
    state.mines.forEach(m => {
        if (isVisible(m.pos, state.camera, width, height)) {
            ctx.fillStyle = m.armed ? '#ef4444' : '#fbbf24';
            ctx.beginPath(); ctx.arc(m.pos.x, m.pos.y, m.radius, 0, Math.PI*2); ctx.fill();
            if (m.armed) {
                ctx.strokeStyle = 'rgba(239, 68, 68, 0.3)';
                ctx.beginPath(); ctx.arc(m.pos.x, m.pos.y, m.triggerRadius, 0, Math.PI*2); ctx.stroke();
            }
        }
    });

    // 6. Turrets & Decoys
    state.turrets.forEach(t => {
        if (isVisible(t.pos, state.camera, width, height)) {
            ctx.save(); ctx.translate(t.pos.x, t.pos.y);
            ctx.fillStyle = '#94a3b8'; ctx.beginPath(); ctx.moveTo(-10,10); ctx.lineTo(0,-10); ctx.lineTo(10,10); ctx.fill();
            ctx.rotate(t.rotation);
            ctx.fillStyle = '#3b82f6'; ctx.fillRect(-5, -5, 25, 10);
            ctx.restore();
        }
    });
    
    state.decoys.forEach(d => {
        if (isVisible(d.pos, state.camera, width, height)) {
            ctx.save(); ctx.translate(d.pos.x, d.pos.y);
            // Snowman
            ctx.fillStyle = '#fff'; 
            ctx.beginPath(); ctx.arc(0, 10, 15, 0, Math.PI*2); ctx.fill();
            ctx.beginPath(); ctx.arc(0, -5, 12, 0, Math.PI*2); ctx.fill();
            ctx.beginPath(); ctx.arc(0, -20, 8, 0, Math.PI*2); ctx.fill();
            // HP Bar
            ctx.fillStyle = 'red'; ctx.fillRect(-15, -35, 30, 4);
            ctx.fillStyle = 'green'; ctx.fillRect(-15, -35, 30 * (d.hp/d.maxHp), 4);
            ctx.restore();
        }
    });

    // 7. Loot
    state.loot.forEach(l => {
        if (!isVisible(l.pos, state.camera, width, height)) return;
        ctx.save(); ctx.translate(l.pos.x, l.pos.y);
        
        if (l.type === 'present') {
             // Wiggle
             const wiggle = Math.sin(state.gameTime / 200) * 0.1;
             ctx.rotate(l.rotation + wiggle);
             ctx.fillStyle = '#ef4444'; ctx.fillRect(-12, -12, 24, 24);
             ctx.fillStyle = '#facc15'; ctx.fillRect(-4, -12, 8, 24); ctx.fillRect(-12, -4, 24, 8);
        } else if (l.type === 'weapon_drop') {
             // Halo
             ctx.shadowBlur = 10; ctx.shadowColor = l.color || '#fff';
             ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.beginPath(); ctx.arc(0,0, 18, 0, Math.PI*2); ctx.fill();
             if (l.weaponType) drawWeaponIcon(ctx, l.weaponType, 0, 0, 20);
             ctx.shadowBlur = 0;
             // Label
             ctx.fillStyle = l.color || '#fff'; ctx.font = 'bold 10px monospace'; ctx.textAlign = 'center';
             ctx.fillText(l.label || '', 0, -25);
        } else {
             // Gear
             ctx.shadowBlur = 10; ctx.shadowColor = l.color || '#fff';
             ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.beginPath(); ctx.arc(0,0, 18, 0, Math.PI*2); ctx.fill();
             ctx.fillStyle = l.color || '#fff'; ctx.font='20px sans-serif'; ctx.textAlign='center'; ctx.textBaseline='middle';
             ctx.fillText('⚙️', 0, 0);
             ctx.shadowBlur = 0;
             // Label
             ctx.fillStyle = l.color || '#fff'; ctx.font = 'bold 10px monospace'; ctx.textAlign = 'center'; ctx.textBaseline='alphabetic';
             ctx.fillText(l.label || '', 0, -25);
        }
        
        ctx.restore();
    });
    
    // 8. Reinforcements & Clones
    state.reinforcements.forEach(r => {
        if (!isVisible(r.pos, state.camera, width, height)) return;
        ctx.save(); ctx.translate(r.pos.x, r.pos.y); ctx.rotate(r.rotation);
        // Soldier Art
        ctx.fillStyle = '#1e40af'; ctx.beginPath(); ctx.arc(0, 0, 15, 0, Math.PI*2); ctx.fill(); // Blue Helmet
        ctx.fillStyle = '#60a5fa'; ctx.fillRect(10, -3, 15, 6); // Gun
        ctx.restore();
    });
    
    state.clones.forEach(c => {
         if (!isVisible(c.pos, state.camera, width, height)) return;
         ctx.globalAlpha = 0.6;
         drawPlayer(ctx, { ...state, player: { ...state.player, pos: c.pos, angle: c.rotation, weapon: WeaponType.Sword } as any }, balance); // Mock render
         ctx.globalAlpha = 1.0;
    });

    // 9. Enemies
    state.enemies.forEach(e => {
        if (isVisible(e.pos, state.camera, width, height, 100)) {
            drawEnemy(ctx, e, state.gameTime, balance);
        }
    });

    // 10. Player
    drawPlayer(ctx, state, balance);

    // 11. Projectiles
    state.projectiles.forEach(p => {
        if (!isVisible(p.pos, state.camera, width, height, 50)) return;
        ctx.save(); ctx.translate(p.pos.x, p.pos.y); ctx.rotate(p.rotation);
        
        if (p.isGrenade) {
            ctx.fillStyle = p.isCandyGrenade ? '#ef4444' : '#000';
            ctx.beginPath(); ctx.arc(0,0, p.isCandyGrenade ? 8 : 5, 0, Math.PI*2); ctx.fill();
            if (p.isCandyGrenade) {
                // Striping
                ctx.fillStyle = '#fff';
                ctx.beginPath(); ctx.arc(0,0,4,0,Math.PI*2); ctx.fill();
            }
        } else if (p.boomerang) {
            ctx.fillStyle = p.color;
            ctx.rotate(state.gameTime / 50);
            ctx.beginPath(); ctx.moveTo(-5,0); ctx.quadraticCurveTo(5,-10, 15, -5); ctx.quadraticCurveTo(5, -5, -5, 0); ctx.fill();
        } else if (p.isTanglerShot) {
            // Tangler Projectile: String of lights
            const t = state.gameTime / 50;
            for(let i=0; i<3; i++) {
                ctx.fillStyle = i===0?'#ef4444':i===1?'#22c55e':'#3b82f6';
                const off = (i-1)*6;
                ctx.beginPath(); ctx.arc(off + Math.sin(t+i)*2, Math.cos(t+i)*2, 3, 0, Math.PI*2); ctx.fill();
            }
            ctx.strokeStyle = '#fff'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(-10,0); ctx.lineTo(10,0); ctx.stroke();
        } else {
            ctx.fillStyle = p.color;
            if (p.weaponType === WeaponType.Snowball) {
                ctx.beginPath(); ctx.arc(0,0, p.radius, 0, Math.PI*2); ctx.fill();
            } else {
                ctx.fillRect(-p.radius, -p.radius/2, p.radius*2, p.radius);
            }
        }
        ctx.restore();
    });

    // 12. Particles
    state.particles.forEach(p => {
        if (!isVisible(p.pos, state.camera, width, height)) return;
        ctx.globalAlpha = p.life / p.maxLife;
        ctx.fillStyle = p.color;
        
        if (p.type === 'snow') {
             ctx.beginPath(); ctx.arc(p.pos.x, p.pos.y, p.size, 0, Math.PI*2); ctx.fill();
        } else if (p.type === 'casing') {
             ctx.save(); ctx.translate(p.pos.x, p.pos.y); ctx.rotate(p.rotation);
             ctx.fillRect(-2, -1, 4, 2);
             ctx.restore();
        } else if (p.type === 'shockwave') {
             // Expanding Ring
             ctx.strokeStyle = p.color;
             ctx.lineWidth = 4 * (1 - p.life/p.maxLife); // Thin out as it expands
             ctx.beginPath(); 
             ctx.arc(p.pos.x, p.pos.y, p.size, 0, Math.PI*2); 
             ctx.stroke();
        } else {
             ctx.beginPath(); ctx.arc(p.pos.x, p.pos.y, p.radius * (p.life/p.maxLife), 0, Math.PI*2); ctx.fill();
        }
        ctx.globalAlpha = 1.0;
    });

    // 13. Floating Texts
    state.floatingTexts.forEach(t => {
        if (!isVisible(t.pos, state.camera, width, height)) return;
        ctx.save();
        ctx.translate(t.pos.x, t.pos.y);
        ctx.fillStyle = t.color;
        ctx.shadowBlur = 2; ctx.shadowColor = '#000';
        ctx.font = 'bold 16px monospace';
        ctx.textAlign = 'center';
        ctx.fillText(t.text, 0, 0);
        ctx.shadowBlur = 0;
        ctx.restore();
    });

    ctx.restore();

    // 14. Screen Overlay (Snow, UI effects)
    // Snow
    ctx.fillStyle = '#fff';
    state.snow.forEach(s => {
        ctx.globalAlpha = Math.random() * 0.5 + 0.3;
        ctx.beginPath(); ctx.arc(s.x, s.y, Math.random() * 2 + 1, 0, Math.PI*2); ctx.fill();
    });
    ctx.globalAlpha = 1.0;

    // Damage Flash
    if (state.screenShake > 0) {
         state.screenShake *= 0.9;
         if (state.screenShake < 0.5) state.screenShake = 0;
    }
};
