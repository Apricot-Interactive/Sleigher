
export enum WeaponType {
  Pistol = 'Pistol',
  Shotgun = 'Shotgun',
  AR = 'AR',
  Flamethrower = 'Flamethrower'
}

export enum EnemyType {
  Green = 'Green', // Melee
  Blue = 'Blue',   // Ranged
  Red = 'Red',     // Fire/Tank
  Boss = 'Boss'    // Santa Boss
}

export enum ItemTier {
  Grey = 0,
  Green = 1,
  Blue = 2,
  Red = 3
}

export enum AmmoType {
    Standard = 'Standard',
    Frost = 'Frost',
    Electric = 'Electric',
    Poison = 'Poison',
    Dark = 'Dark'
}

export interface Vector2 {
  x: number;
  y: number;
}

export interface GameBalance {
  player: {
    speed: number;
    maxHp: number;
    pickupRadius: number;
    pickupTime: number; // Seconds to pickup loot
    radius: number; // Collision radius
    currentHp?: number; // Runtime transient
    currentMagic?: number; // Runtime transient
  };
  weapons: {
    [key in WeaponType]: {
      damage: number;
      fireRate: number; // ms between shots
      reloadTime: number; // ms
      range: number;
      projectileSpeed: number;
      spread: number;
      magSize: number;
    };
  };
  enemies: {
    spawnRateInitial: number; // ms between spawns
    spawnRateRamp: number; // multiplier per minute
    limit: number;
    waveDuration: number; // Seconds per wave
    spawnWindow: number; // Seconds at start of wave to spawn
    types: {
      [key in EnemyType]: {
        speed: number;
        hp: number;
        damage: number;
        score: number;
        color: string;
        radius: number;
        // Combat stats
        fireRate: number; // ms
        range: number;
        projectileSpeed: number;
      };
    };
  };
  economy: {
    coinDropRate: number; // 0-1 probability
    baseWeaponCost: number;
    sleighThresholds: {
      bronze: number;
      silver: number;
      gold: number;
    };
  };
  turret: {
      fireRate: number;
      damage: number;
      range: number;
      projectileSpeed: number;
      duration: number; // rotation period
  };
  decoy: {
      hp: number;
  };
  clone: {
      hp: number;
  };
  puddle: {
      damage: number;
      duration: number;
      radius: number;
  };
  cheats?: {
      invincible: boolean;
      instakill: boolean;
      speedy: boolean;
  };
}

export interface Entity {
  id: string;
  pos: Vector2;
  velocity: Vector2;
  radius: number;
  rotation: number;
  dead: boolean;
}

export interface Particle extends Entity {
  life: number;
  maxLife: number;
  color: string;
  size: number;
  type: 'blood' | 'snow' | 'fire' | 'smoke' | 'spark' | 'casing' | 'heart';
}

export interface Projectile extends Entity {
  damage: number;
  color: string;
  rangeRemaining: number;
  tier: ItemTier;
  source: 'player' | 'enemy' | 'turret' | 'clone';
  ammoType: AmmoType;
  weaponType?: WeaponType;
}

export interface PoisonDot {
    damagePerTick: number;
    nextTick: number;
    endTime: number;
}

export interface Enemy extends Entity {
  type: EnemyType;
  hp: number;
  maxHp: number;
  attackCooldown: number;
  slowedUntil: number;
  poisonDots: PoisonDot[];
  spawnOrigin: Vector2;
  wanderTarget?: Vector2;
  // Boss Specific
  lastRedSummon?: number;
  lastBlueSummon?: number;
}

export type GearType = 'shield' | 'pen' | 'turret' | 'snowman' | 'medkit' | 'shoes' | 'lightning' | 'beaker' | 'santa_hat';

export interface GearStats {
    type: GearType;
    hpBonus?: number;
    lastProc?: number; // For cooldowns (Turret/Snowman drop)
}

export interface Turret extends Entity {
    fireCooldown: number;
}

export interface Decoy extends Entity {
    hp: number;
    maxHp: number;
}

export interface Clone extends Entity {
    hp: number;
    maxHp: number;
    lastShotTime: number;
}

export interface WorldMedkit extends Entity {
    // Standard entity
}

export interface WorldKey extends Entity {
    // Standard entity for Key pickups
}

export interface MagicDrop extends Entity {
    value: number;
    tier: 'Common' | 'Uncommon' | 'Rare';
}

export interface Puddle extends Entity {
    endTime: number;
    nextTick: number;
}

export interface LootContent {
  type: 'present' | 'weapon_drop' | 'key' | 'gear';
  weaponType?: WeaponType;
  tier?: ItemTier;
  label?: string;
  color?: string;
  stats?: GearStats;
}

export interface Loot extends Entity {
  type: 'present' | 'weapon_drop' | 'item_drop'; 
  pickupProgress: number; // For presents
  
  // For Weapon Drops
  weaponType?: WeaponType;
  tier?: ItemTier;
  label?: string;
  color?: string;
  
  contents?: LootContent;
}

export interface InventoryItem {
  id: string;
  type: 'present' | 'weapon' | 'key' | 'gear';
  weaponType?: WeaponType; // If weapon
  tier?: ItemTier;
  value: number; // Sell value
  stats?: GearStats;
  label?: string;
}

export type PoiType = 
  | 'frozen_lake' | 'stables' | 'bear_cave' | 'giant_snowman' | 'tree_farm' 
  | 'snowman_trio' | 'elf_cafe' | 'toy_workshop' | 'magic_forest' | 'sled_garage' 
  | 'large_coal' | 'cocoa_springs' | 'radio_tower' | 'wrapping_station' | 'flight_school' 
  | 'elf_paint_shop' | 'small_glacier' | 'mail_center' | 'north_pole' | 'elf_bakery' 
  | 'yeti_cave' | 'storage_depot' | 'reindeer_pen' | 'frozen_pond';

export interface WorldPOI {
    x: number;
    y: number;
    type: PoiType;
    radius?: number; // Circular collision radius
    width?: number;  // Rect collision width
    height?: number; // Rect collision height
}

export interface PlayerState {
    pos: Vector2;
    velocity: Vector2;
    hp: number;
    maxHp: number;
    coins: number;
    keys: number;
    weapon: WeaponType;
    weaponTiers: Record<WeaponType, ItemTier>;
    maxTiers: Record<WeaponType, ItemTier>;
    inventory: InventoryItem[];
    equippedGear: (InventoryItem | null)[];
    ownedWeapons: WeaponType[];
    lastShotTime: number;
    reloadingUntil: number;
    ammo: number;
    angle: number;
    ammoType: AmmoType;
    unlockedAmmo: Set<AmmoType>;
    reviving: boolean;
    reviveProgress: number;
    invulnerableUntil: number;
    lastMedkitWave: number;
}

export interface GameState {
    gamePhase: 'menu' | 'intro' | 'playing' | 'game_over' | 'victory';
    inBunker: boolean;
    bunkerPlayerPos: Vector2;
    playerWorldPos: Vector2;
    activeBunkers: Vector2[]; // Dynamic list of active bunker locations
    worldPois: WorldPOI[];    // Dynamic list of POIs
    unlockedBunkers: Map<number, number>; // Index -> Wave
    bunkerLootWaves: Map<number, number>; // Index -> Last Looted Wave
    activeBunkerIndex: number;
    medicUsedWaves: number;
    healingState: { active: boolean; endTime: number; nextTick: number };
    transferState: { active: boolean; startTime: number; accumulator: number; target: number };
    bossState: { active: boolean; tier: 'Bronze' | 'Silver' | 'Gold' | null; readyToExtract: boolean; summonRequested: boolean; };
    extractionProgress: number;
    summoningProgress: number;
    exitAnim: { active: boolean; offset: Vector2; t: number };

    player: PlayerState;
    ammoProcCooldowns: Map<AmmoType, number>;
    
    enemies: Enemy[];
    projectiles: Projectile[];
    particles: Particle[];
    loot: Loot[];
    floatingTexts: { id: string; pos: Vector2; text: string; color: string; life: number; velocity: Vector2; }[];
    
    turrets: Turret[];
    decoys: Decoy[];
    worldMedkits: WorldMedkit[];
    worldKeys: WorldKey[];
    magicDrops: MagicDrop[];
    clones: Clone[];
    puddles: Puddle[];
    
    camera: Vector2;
    screenShake: number;
    snow: Vector2[];
    
    gameTime: number;
    wave: number;
    waveTimer: number;
    nextSpawnTime: number;
    depositedCoins: number;
    hordeMode: { active: boolean; timeLeft: number };
    
    inputs: {
        keys: Set<string>;
        mouse: Vector2;
    };
}

export interface HeroRecord {
    id: string;
    weapon: WeaponType;
    weaponTier: ItemTier;
    gear: (InventoryItem | null)[]; // 4 slots
    score: number;
}

export interface Loadout {
    weapon: WeaponType;
    weaponTier: ItemTier;
    gear: (InventoryItem | null)[];
}

export interface HUDState {
    hp: number;
    maxHp: number;
    ammo: number;
    maxAmmo: number;
    coins: number;
    keys: number;
    inventory: InventoryItem[];
    equippedGear: (InventoryItem | null)[];
    wave: number;
    waveTimer: number;
    waveDuration: number;
    depositedCoins: number;
    
    showInfuse: boolean;
    showSummon: boolean;
    showCrafting: boolean;
    showSell: boolean;
    showGunsmith: boolean;
    showMedic: boolean;

    weapon: WeaponType;
    weaponTier: ItemTier;
    weaponTiers: Record<WeaponType, ItemTier>;
    maxTiers: Record<WeaponType, ItemTier>;
    ownedWeapons: WeaponType[];
    ammoType: AmmoType;
    unlockedAmmo: AmmoType[];
    hordeTime: number | null;
    transferring: boolean;
    inBunker: boolean;
    bunkerCooldown: number;
    gamePhase: 'menu' | 'intro' | 'playing' | 'game_over' | 'victory';
    bossFight: { active: boolean; readyToExtract: boolean; tier: string | null; };
    victoryData: { medal: string; wave: number; } | null;
    isCombatActive: boolean;
    isMoving: boolean;
    isFiring: boolean;
    activeModal: 'sell' | 'gunsmith' | 'crafting' | null;
}
