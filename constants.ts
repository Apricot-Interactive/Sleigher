

import { GameBalance, WeaponType, EnemyType, PoiType, ItemTier } from './types.ts';

export const MAP_SIZE = 12500;
export const GRID_CELL_SIZE = 2500;

// ==========================================
// >>> LOOT & DROP TUNING CONFIGURATION <<<
// ==========================================

export const GEAR_DROPS = [
    // GREEN (Tier 1) - 50% Base
    { type: 'gear', id: 'shield', tier: ItemTier.Green, stats: { type: 'shield', hpBonus: 300 }, label: 'Armor (+300 HP)' },
    { type: 'key', id: 'key', tier: ItemTier.Green, label: 'Bunker Key' },
    
    // BLUE (Tier 2) - 35% Base
    { type: 'gear', id: 'pen', tier: ItemTier.Blue, stats: { type: 'pen' }, label: 'Revive Pen' },
    { type: 'gear', id: 'turret', tier: ItemTier.Blue, stats: { type: 'turret' }, label: 'Auto Turret' },
    { type: 'gear', id: 'medkit', tier: ItemTier.Blue, stats: { type: 'medkit' }, label: 'Auto Medkit' },
    { type: 'gear', id: 'shoes', tier: ItemTier.Blue, stats: { type: 'shoes' }, label: 'Speed Shoes' },
    { type: 'gear', id: 'lightning', tier: ItemTier.Blue, stats: { type: 'lightning' }, label: 'Lightning Trigger' },
    { type: 'gear', id: 'beaker', tier: ItemTier.Blue, stats: { type: 'beaker' }, label: 'Acid Beaker' },

    // RED (Tier 3) - 15% Base
    { type: 'gear', id: 'snowman', tier: ItemTier.Red, stats: { type: 'snowman' }, label: 'Snowman Decoy' },
    { type: 'gear', id: 'santa_hat', tier: ItemTier.Red, stats: { type: 'santa_hat' }, label: 'Santa Clone' }
];

export const LOOT_CONFIG = {
    SPAWNING: {
        MAX_PRESENTS: 75, // Total items maintained on the map
        BATCH_SIZE: 1,    // Respawn rate per frame if below MAX
    },
    // Top-level probabilities
    DROP_RATES: {
        WEAPON: 0.50,
        GEAR: 0.50,
    },
    // Wave Thresholds for unlocking tiers
    TIER_UNLOCKS: {
        BLUE_WAVE: 5,
        RED_WAVE: 10
    },
    // Weapon Tier Probabilities based on Game Phase
    WEAPON_TIERS: {
        EARLY: [ // Wave 1-4: Grey, Green
            { threshold: 0.6, tier: ItemTier.Grey },
            { threshold: 1.0, tier: ItemTier.Green }
        ],
        MID: [ // Wave 5-9: Grey, Green, Blue
            { threshold: 0.4, tier: ItemTier.Grey },
            { threshold: 0.8, tier: ItemTier.Green },
            { threshold: 1.0, tier: ItemTier.Blue }
        ],
        LATE: [ // Wave 10+: Green, Blue, Red
            { threshold: 0.3, tier: ItemTier.Green },
            { threshold: 0.7, tier: ItemTier.Blue },
            { threshold: 1.0, tier: ItemTier.Red }
        ]
    }
};

export const POI_LOCATIONS = {
  SLEIGH: { x: 6450, y: 6450 },
  TREE: { x: 6250, y: 6250 },
};

export const BUNKER_INT_SIZE = { w: 420, h: 600 };
export const BUNKER_ZONES = {
    EXIT: { x: 40, y: 40, radius: 40 },
    CRAFTING: { x: 380, y: 40, radius: 40 }, // Top Right
    SELL: { x: 40, y: 270, radius: 40 },     // Middle Left
    GUNSMITH: { x: 380, y: 270, radius: 40 }, // Middle Right
    SPAWN: { x: 210, y: 150 } // 25% down from top
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

export const INITIAL_GAME_BALANCE: GameBalance = {
  player: {
    speed: 21,
    maxHp: 200,
    pickupRadius: 130,
    pickupTime: 1.5,
    radius: 22,
  },
  weapons: {
    [WeaponType.Pistol]: {
      damage: 15,
      fireRate: 400,
      reloadTime: 1000,
      range: 600,
      projectileSpeed: 30, 
      spread: 0.05,
      magSize: 6,
    },
    [WeaponType.Shotgun]: {
      damage: 12, // Per pellet
      fireRate: 900,
      reloadTime: 1800,
      range: 350,
      projectileSpeed: 20, 
      spread: 0.3,
      magSize: 6,
    },
    [WeaponType.AR]: {
      damage: 18,
      fireRate: 110,
      reloadTime: 1400,
      range: 700,
      projectileSpeed: 30, 
      spread: 0.1,
      magSize: 30,
    },
    [WeaponType.Flamethrower]: {
      damage: 4, // High tick rate
      fireRate: 40,
      reloadTime: 2500,
      range: 250,
      projectileSpeed: 12, 
      spread: 0.7,
      magSize: 100,
    },
  },
  enemies: {
    spawnRateInitial: 2000,
    spawnRateRamp: 0.85,
    limit: 200,
    waveDuration: 30,
    spawnWindow: 15,
    types: {
      [EnemyType.Green]: {
        speed: 7,
        hp: 30,
        damage: 10,
        score: 3,
        color: '#4ade80',
        radius: 18,
        fireRate: 0,
        range: 0,
        projectileSpeed: 0,
      },
      [EnemyType.Blue]: {
        speed: 5.6,
        hp: 60,
        damage: 15,
        score: 8,
        color: '#60a5fa',
        radius: 20,
        fireRate: 1500,
        range: 500,
        projectileSpeed: 15,
      },
      [EnemyType.Red]: {
        speed: 8.4,
        hp: 120,
        damage: 2,
        score: 20,
        color: '#f87171',
        radius: 25,
        fireRate: 0,
        range: 0,
        projectileSpeed: 0,
      },
      [EnemyType.Boss]: {
        speed: 5,
        hp: 3000,
        damage: 20, 
        score: 1000, 
        color: '#b91c1c', 
        radius: 88,
        fireRate: 0,
        range: 0,
        projectileSpeed: 0,
      },
    },
  },
  economy: {
    coinDropRate: 0.4,
    baseWeaponCost: 100,
    sleighThresholds: {
      bronze: 500,
      silver: 1500,
      gold: 5000,
    },
  },
  turret: {
      fireRate: 50,
      damage: 4,
      range: 250,
      projectileSpeed: 12,
      duration: 3000
  },
  decoy: {
      hp: 1000
  },
  clone: {
      hp: 100
  },
  puddle: {
      damage: 30,
      duration: 20000,
      radius: 44
  }
};