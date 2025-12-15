
import { GameBalance, WeaponType, EnemyType, PoiType, ItemTier } from './types.ts';

// ==========================================
// >>> WAVE CONFIGURATION <<<
// ==========================================

export const WAVE_RULES: Record<number, { types: EnemyType[], weights: number[] }> = {
    1: { types: [EnemyType.M1], weights: [1] },
    2: { types: [EnemyType.Reindeer], weights: [1] },
    3: { types: [EnemyType.M1, EnemyType.Tangler], weights: [0.5, 0.5] },
    4: { types: [EnemyType.Chef], weights: [1] },
    5: { types: [EnemyType.Yeti], weights: [1] },
    // 6+ handled by fallthrough logic in GameLoop
};

// ==========================================
// >>> DESIGNER TUNING SHEET <<<
// ==========================================

export const INITIAL_GAME_BALANCE: GameBalance = {
  // --- 1. PLAYER STATS ---
  player: {
    speed: 21,
    maxHp: 200,
    pickupRadius: 130, // Distance to grab loot/magic
    pickupTime: 1.5,   // Seconds to open a present
    radius: 22,        // Hitbox size
  },

  // --- 2. ECONOMY ---
  economy: {
    coinDropRate: 0.4,     // 40% chance enemy drops magic
    baseWeaponCost: 100,   // Base value for selling/calculating gear cost
    
    // Cost to UPGRADE to the NEXT tier (e.g., White -> Grey = 50)
    upgradeCosts: {
        [ItemTier.White]: 50,   // Upgrade Snowball to Grey Weapon
        [ItemTier.Grey]: 100,   // Upgrade Grey -> Green
        [ItemTier.Green]: 500,  // Upgrade Green -> Blue
        [ItemTier.Blue]: 2500,  // Upgrade Blue -> Red
        [ItemTier.Red]: 0       // Max Tier
    },

    // Total Magic required to Summon Boss
    sleighThresholds: {
      bronze: 500,
      silver: 1500,
      gold: 5000,
    },
  },

  // --- 3. ENEMIES ---
  enemies: {
    spawnRateInitial: 2000, // Starting ms between spawns
    spawnRateRamp: 0.85,    // Multiplier per wave (lower = faster spawns)
    limit: 200,             // Max enemies on screen
    waveDuration: 30,       // Seconds per wave
    spawnWindow: 15,        // Seconds at start of wave where enemies spawn
    types: {
      [EnemyType.M1]: {     // ZOMBIE ELF
        speed: 4, 
        hp: 25, 
        damage: 10,
        armor: 0,
        score: 3,           // Magic dropped
        color: '#65a30d', 
        radius: 16,
        fireRate: 0,
        range: 30,
        projectileSpeed: 0,
      },
      [EnemyType.Reindeer]: { // CRAZED REINDEER
        speed: 12, // Fast charge
        hp: 45, 
        damage: 15,
        armor: 0,
        score: 5,
        color: '#78350f',
        radius: 20,
        fireRate: 0,
        range: 0,
        projectileSpeed: 0,
      },
      [EnemyType.Tangler]: { // TANGLER ELF
        speed: 5,
        hp: 40,
        damage: 5,
        armor: 0,
        score: 8,
        color: '#06b6d4',
        radius: 18,
        fireRate: 3500,
        range: 400,
        projectileSpeed: 18,
      },
      [EnemyType.Chef]: { // CHEF ELF
        speed: 2,
        hp: 150,
        damage: 30,
        armor: 0,
        score: 15,
        color: '#fff',
        radius: 25,
        fireRate: 4000,
        range: 350,
        projectileSpeed: 10,
      },
      [EnemyType.Yeti]: { // YETI (WAVE 5)
        speed: 1.5,
        hp: 800,
        damage: 40, // Shockwave damage
        armor: 0.5, // 50% Damage Reduction
        score: 100,
        color: '#e2e8f0',
        radius: 40,
        fireRate: 0,
        range: 0, // Melee/AoE
        projectileSpeed: 0,
      },
      [EnemyType.Boss]: {   // BAD SANTA
        speed: 5,
        hp: 3000,
        damage: 20, 
        armor: 0.25, // 25% Damage Reduction
        score: 1000, 
        color: '#b91c1c', 
        radius: 88,
        fireRate: 0,
        range: 0,
        projectileSpeed: 0,
      },
    },
  },

  // --- 4. WEAPONS ---
  weapons: {
    [WeaponType.Snowball]: {
      damage: 5, fireRate: 1000, reloadTime: 1000, range: 500, projectileSpeed: 15, spread: 0.1, magSize: 1,
    },
    // TIER 0 (GREY) STARTERS
    [WeaponType.Pistol]: {
      damage: 15, fireRate: 400, reloadTime: 1000, range: 600, projectileSpeed: 30, spread: 0.05, magSize: 6,
    },
    [WeaponType.Shotgun]: {
      damage: 12, fireRate: 900, reloadTime: 1800, range: 350, projectileSpeed: 20, spread: 0.3, magSize: 6,
    },
    [WeaponType.Sword]: {
      damage: 10, fireRate: 400, reloadTime: 0, range: 70, projectileSpeed: 0, spread: 0, magSize: 9999,
    },
    // TIER 1 (GREEN)
    [WeaponType.AR]: {
      damage: 18, fireRate: 110, reloadTime: 1400, range: 700, projectileSpeed: 30, spread: 0.1, magSize: 30,
    },
    [WeaponType.Chainsaw]: {
      damage: 20, fireRate: 100, reloadTime: 2000, range: 50, projectileSpeed: 0, spread: 0, magSize: 100,
    },
    [WeaponType.Boomerang]: {
      damage: 30, fireRate: 1000, reloadTime: 400, range: 176 * 4, projectileSpeed: 20, spread: 0, magSize: 1,
    },
    // TIER 2 (BLUE)
    [WeaponType.GrenadeLauncher]: {
      damage: 0, fireRate: 400, reloadTime: 2500, range: 500, projectileSpeed: 20, spread: 0.2, magSize: 6,
    },
    [WeaponType.Sniper]: {
      damage: 150, fireRate: 800, reloadTime: 1000, range: 1000, projectileSpeed: 45, spread: 0, magSize: 8,
    },
    // CRAFT ONLY / SPECIAL
    [WeaponType.Flamethrower]: {
      damage: 4, fireRate: 40, reloadTime: 2500, range: 250, projectileSpeed: 12, spread: 0.7, magSize: 100,
    },
    [WeaponType.Laser]: {
      damage: 10, fireRate: 50, reloadTime: 2000, range: 264, projectileSpeed: 0, spread: 0, magSize: 30,
    },
    [WeaponType.ArcTaser]: {
      damage: 15, fireRate: 110, reloadTime: 1400, range: 176, projectileSpeed: 0, spread: 0, magSize: 20,
    },
  },

  // --- 5. GADGETS & STATUS EFFECTS ---
  turret: {
      fireRate: 50,
      damage: 4,
      range: 250,
      projectileSpeed: 12,
      duration: 3000
  },
  decoy: { hp: 1000 },
  clone: { hp: 100 },
  puddle: {
      damage: 30,
      duration: 20000,
      radius: 44
  }
};

// ==========================================
// >>> GEAR TUNING <<<
// ==========================================

export const GEAR_DROPS = [
    // --- TIER 0: GREY (Common) ---
    // Basic utility and survival
    { type: 'gear', id: 'vest', tier: ItemTier.Grey, stats: { type: 'vest', hpBonus: 300 }, label: 'Tac-Vest (+300 HP)' },
    { type: 'gear', id: 'speed_shoes', tier: ItemTier.Grey, stats: { type: 'speed_shoes' }, label: 'Speed Shoes' },
    { type: 'gear', id: 'mines', tier: ItemTier.Grey, stats: { type: 'mines' }, label: 'Mine Layer' },

    // --- TIER 1: GREEN (Uncommon) ---
    // Specialized utility
    { type: 'gear', id: 'snowman', tier: ItemTier.Green, stats: { type: 'snowman' }, label: 'Snowman Decoy' },
    { type: 'gear', id: 'elf_hat', tier: ItemTier.Green, stats: { type: 'elf_hat' }, label: 'Elf Hat (+50% Magic)' },
    { type: 'gear', id: 'turret', tier: ItemTier.Green, stats: { type: 'turret' }, label: 'Auto Turret' },
    
    // --- TIER 2: BLUE (Rare) ---
    // Powerful passive effects
    { type: 'gear', id: 'regen', tier: ItemTier.Blue, stats: { type: 'regen' }, label: 'Regen Module' },
    { type: 'gear', id: 'lightning', tier: ItemTier.Blue, stats: { type: 'lightning' }, label: 'Lightning Trigger' },
    { type: 'gear', id: 'tesla', tier: ItemTier.Blue, stats: { type: 'tesla' }, label: 'Tesla Coil' },

    // --- TIER 3: RED (Legendary) ---
    // Game changers (Only via cheat/special events currently)
    { type: 'gear', id: 'pen', tier: ItemTier.Red, stats: { type: 'pen' }, label: 'Self-Revive Pen' },
    { type: 'gear', id: 'sleighbells', tier: ItemTier.Red, stats: { type: 'sleighbells' }, label: 'Sleighbells' },
    { type: 'gear', id: 'reinforce', tier: ItemTier.Red, stats: { type: 'reinforce' }, label: 'Reinforcements' }
];

export const LOOT_CONFIG = {
    SPAWNING: {
        MAX_PRESENTS: 75, // Total items maintained on the map
        BATCH_SIZE: 1,    // Respawn rate per frame if below MAX
    },
    // Top-level probabilities when opening a present
    DROP_RATES: {
        WEAPON: 0.50,
        GEAR: 0.50,
    },
    // Wave Thresholds for unlocking new tier drops
    TIER_UNLOCKS: {
        BLUE_WAVE: 5,
        RED_WAVE: 10
    },
    // Weapon Tier Probabilities based on Game Phase (Wave count)
    WEAPON_TIERS: {
        EARLY: [ // Wave 1-4
            { threshold: 0.6, tier: ItemTier.Grey },
            { threshold: 1.0, tier: ItemTier.Green }
        ],
        MID: [ // Wave 5-9
            { threshold: 0.4, tier: ItemTier.Grey },
            { threshold: 0.8, tier: ItemTier.Green },
            { threshold: 1.0, tier: ItemTier.Blue }
        ],
        LATE: [ // Wave 10+
            { threshold: 0.3, tier: ItemTier.Green },
            { threshold: 0.7, tier: ItemTier.Blue },
            { threshold: 1.0, tier: ItemTier.Red }
        ]
    }
};

// ==========================================
// >>> WORLD & MAP GENERATION <<<
// ==========================================

export const MAP_SIZE = 12500;
export const GRID_CELL_SIZE = 2500;

export const POI_LOCATIONS = {
  SLEIGH: { x: 6450, y: 6450 },
  TREE: { x: 6250, y: 6250 },
};

export const POI_GRID_CONFIG: { type: PoiType, radius?: number, width?: number, height?: number }[] = [
    { type: 'frozen_lake', radius: 200 },
    { type: 'stables', width: 200, height: 100 },
    { type: 'bear_cave', radius: 100 },
    { type: 'giant_snowman', radius: 100 },
    { type: 'tree_farm', radius: 150 },
    { type: 'snowman_trio', radius: 80 },
    { type: 'elf_cafe', width: 120, height: 80 },
    { type: 'toy_workshop', width: 240, height: 240 },
    { type: 'magic_forest', radius: 150 },
    { type: 'sled_garage', width: 200, height: 160 },
    { type: 'large_coal', radius: 80 },
    { type: 'cocoa_springs', radius: 180 },
    { type: 'radio_tower', radius: 60 },
    { type: 'wrapping_station', width: 200, height: 100 },
    { type: 'flight_school', width: 480, height: 90 },
    { type: 'elf_paint_shop', width: 240, height: 240 },
    { type: 'small_glacier', radius: 80 },
    { type: 'mail_center', width: 120, height: 80 },
    { type: 'north_pole', radius: 120 },
    { type: 'elf_bakery', width: 120, height: 80 },
    { type: 'yeti_cave', radius: 100 },
    { type: 'storage_depot', radius: 100 },
    { type: 'reindeer_pen', width: 200, height: 100 },
    { type: 'frozen_pond', radius: 120 }
];

export const BUNKER_INT_SIZE = { w: 420, h: 600 };
export const BUNKER_ZONES = {
    EXIT: { x: 40, y: 40, radius: 40 },
    CRAFTING: { x: 380, y: 40, radius: 40 }, // Top Right
    SELL: { x: 40, y: 270, radius: 40 },     // Middle Left
    GUNSMITH: { x: 380, y: 270, radius: 40 }, // Middle Right
    SPAWN: { x: 210, y: 150 } // 25% down from top
};
