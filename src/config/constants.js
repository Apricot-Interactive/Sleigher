// ==========================================
// >>> SLEIGHER - DESIGNER TUNING SHEET <<<
// ==========================================
// All "magic numbers" live here for easy balancing

// --- 1. WORLD & PHYSICS ---
export const PLAYER_SIZE = 128;
export const MAP_SIZE = 150 * PLAYER_SIZE; // 19,200px square
export const ROTATION_SPEED = 720; // degrees per second
export const CAMERA_LERP = 0.1; // 0.1s lag
export const CAMERA_ZOOM = 1.0;

// --- 2. WAVE LOGIC ---
export const WAVE_DURATION = 45; // seconds
export const SPAWN_PHASE_DURATION = 30; // seconds (0-30s)
export const REST_PHASE_DURATION = 15; // seconds (30-45s)
export const SPAWN_RATE = 3; // seconds between spawns
export const SPAWN_DISTANCE_MIN = 640; // 5 player heights
export const SPAWN_DISTANCE_MAX = 2560; // 20 player heights
export const LOOT_DESPAWN_DIST = 5120; // 40 player heights

// --- 3. ECONOMY & COSTS ---
export const CURRENCY_NAME = "Holiday Magic"; // HM
export const DOOR_BASE_COST = 250;
export const DOOR_COST_INCREMENT = 500;

export const EXTRACTION_COSTS = {
    BRONZE: 500,
    SILVER: 1500,
    GOLD: 2500
};

export const INFUSION_SPEED_MIN = 5; // HM/sec
export const INFUSION_SPEED_MAX = 50; // HM/sec
export const INFUSION_RAMP_TIME = 5; // seconds
export const TETHER_RADIUS = 896; // 7 player heights

export const UPGRADE_COSTS = {
    GREY_TO_GREEN: 300,
    GREEN_TO_BLUE: 800
};

export const SELL_VALUES = {
    GREY: 50,
    GREEN: 150,
    BLUE: 400,
    RED: 1000
};

// --- 4. PLAYER STATS ---
export const PLAYER_HP = 100;
export const PLAYER_SPEED = 250; // px/sec

// --- 5. ENEMY STATS ---
export const ENEMIES = {
    ZOMBIE_ELF: {
        hp: 30,
        speed: 100,
        damage: 10,
        color: '#65a30d',
        radius: 16
    },
    CRAZED_REINDEER: {
        hp: 50,
        speed: 400, // charge speed
        damage: 15,
        chargePauseTime: 1, // seconds
        retreatDistance: 2 * PLAYER_SIZE,
        color: '#78350f',
        radius: 20
    },
    TANGLER_ELF: {
        hp: 40,
        speed: 120,
        pullDistance: 3 * PLAYER_SIZE,
        fireRate: 4, // seconds
        color: '#06b6d4',
        radius: 18,
        range: 400
    },
    BAKER_ELF: {
        hp: 40,
        speed: 110,
        damage: 5, // per second in pool
        fireRate: 5, // seconds
        poolRadius: 2 * PLAYER_SIZE,
        poolDuration: 3, // seconds
        color: '#fff',
        radius: 18,
        range: 350
    },
    YETI: {
        hp: 300,
        speed: 80,
        damage: 20,
        knockbackDistance: 4 * PLAYER_SIZE,
        slamRange: 1.5 * PLAYER_SIZE,
        color: '#e2e8f0',
        radius: 40
    }
};

// --- 6. ENEMY SPAWN TABLES ---
export const WAVE_SPAWN_TABLES = {
    '1-3': {
        enemiesPerSpawn: { min: 3, max: 5 },
        composition: {
            ZOMBIE_ELF: 0.80,
            CRAZED_REINDEER: 0.15,
            TANGLER_ELF: 0.05
        }
    },
    '4-7': {
        enemiesPerSpawn: { min: 5, max: 8 },
        composition: {
            ZOMBIE_ELF: 0.50,
            CRAZED_REINDEER: 0.25,
            TANGLER_ELF: 0.15,
            BAKER_ELF: 0.10
        }
    },
    '8+': {
        enemiesPerSpawn: { min: 8, max: 12 },
        composition: {
            ZOMBIE_ELF: 0.30,
            CRAZED_REINDEER: 0.20,
            TANGLER_ELF: 0.20,
            BAKER_ELF: 0.20,
            YETI: 0.10
        }
    }
};

// --- 7. PRESENT RARITY UNLOCKS ---
export const PRESENT_RARITY_WAVES = {
    GREY_UNLOCK: 1,
    GREEN_UNLOCK: 4,
    BLUE_UNLOCK: 8
};

// --- 8. PRESENT SPAWNING ---
export const PRESENT_CONFIG = {
    TOTAL_PRESENTS: 75,
    RESPAWN_DISTANCE: 40 * PLAYER_SIZE,
    WEAPON_CHANCE: 0.50,
    GEAR_CHANCE: 0.50,
    MAGIC_VALUES: {
        GREY: 20,
        GREEN: 50,
        BLUE: 200
    }
};

// --- 9. MEDKIT CONFIG ---
export const MEDKIT_DROP_CHANCE = 0.02;
export const MEDKIT_HEAL_RATE = 0.03; // 3% max HP per second
export const MEDKIT_DURATION = 10; // seconds

// --- 10. WEAPON DEFINITIONS ---
export const WEAPONS = {
    // Starter
    SNOWBALL: {
        tier: 'WHITE',
        clip: 1,
        damage: 5,
        fireRate: 1000, // ms
        range: 500,
        projectileSpeed: 300,
        knockback: 200,
        reloadTime: 1000
    },

    // Grey Tier
    SWORD: {
        tier: 'GREY',
        clip: 9999,
        damage: 20,
        fireRate: 500, // 0.5s swing cooldown
        range: PLAYER_SIZE,
        projectileSpeed: 0, // melee
        reloadTime: 0
    },
    PISTOL: {
        tier: 'GREY',
        clip: 12,
        damage: 15,
        fireRate: 400,
        range: 8 * PLAYER_SIZE,
        projectileSpeed: 600,
        reloadTime: 1000
    },
    SHOTGUN: {
        tier: 'GREY',
        clip: 2,
        damage: 8, // per pellet
        pellets: 5,
        fireRate: 900,
        range: 4 * PLAYER_SIZE,
        projectileSpeed: 400,
        spread: 0.3,
        reloadTime: 1800
    },

    // Green Tier
    CHAINSAW: {
        tier: 'GREEN',
        clip: 30,
        damage: 10, // every 0.2s
        fireRate: 200,
        range: 1.5 * PLAYER_SIZE,
        projectileSpeed: 0,
        ammoConsumption: 5, // per second
        reloadTime: 2000
    },
    AR: {
        tier: 'GREEN',
        clip: 30,
        damage: 12,
        fireRate: 110,
        range: 6 * PLAYER_SIZE,
        projectileSpeed: 600,
        reloadTime: 1400
    },
    BOOMERANG: {
        tier: 'GREEN',
        clip: 1,
        damage: 25,
        fireRate: 1000,
        range: 4 * PLAYER_SIZE,
        projectileSpeed: 600, // outbound
        returnSpeed: 800,
        pierce: true,
        reloadTime: 400
    },

    // Blue Tier
    GRENADE_LAUNCHER: {
        tier: 'BLUE',
        clip: 6,
        damage: 40,
        splashRadius: 2 * PLAYER_SIZE,
        fireRate: 400,
        range: 10 * PLAYER_SIZE,
        projectileSpeed: 400,
        reloadTime: 2500,
        arc: true
    },
    SNIPER: {
        tier: 'BLUE',
        clip: 5,
        damage: 60,
        fireRate: 1500,
        range: 12 * PLAYER_SIZE,
        projectileSpeed: 900,
        pierce: true, // infinite
        reloadTime: 1000
    },

    // Red Tier (Boss Drops)
    FLAMETHROWER: {
        tier: 'RED',
        clip: 100,
        damage: 15, // every 0.1s
        fireRate: 100,
        range: 4 * PLAYER_SIZE,
        projectileSpeed: 240,
        coneAngle: 90, // degrees
        ammoConsumption: 10, // per second
        duration: 500, // continuous fire duration
        reloadTime: 2500
    },
    BEAM: {
        tier: 'RED',
        clip: 10,
        damage: 80, // total over duration
        fireRate: 2000,
        range: Infinity, // pierces infinitely
        beamDuration: 500, // ms
        pierce: true,
        reloadTime: 2000
    },
    ARC_TASER: {
        tier: 'RED',
        clip: 8,
        damage: 50,
        fireRate: 400,
        range: 8 * PLAYER_SIZE,
        chainRange: 3 * PLAYER_SIZE,
        maxChains: 5,
        reloadTime: 1400
    }
};

// --- 11. GEAR DEFINITIONS ---
export const GEAR = {
    // Grey Tier
    VEST: {
        tier: 'GREY',
        type: 'passive',
        hpBonus: 300
    },
    SHOES: {
        tier: 'GREY',
        type: 'passive',
        speedBonus: 0.33 // 33% additive
    },
    MINES: {
        tier: 'GREY',
        type: 'active',
        dropRate: 4, // seconds
        damage: 30,
        radius: 2 * PLAYER_SIZE
    },

    // Green Tier
    SNOWMAN: {
        tier: 'GREEN',
        type: 'active',
        spawnRate: 15, // seconds
        hp: 200
    },
    ELF_HAT: {
        tier: 'GREEN',
        type: 'passive',
        magicMultiplier: 1.33 // multiplicative stacking
    },
    TURRET: {
        tier: 'GREEN',
        type: 'active',
        spawnRate: 20, // seconds
        duration: 10, // seconds
        damage: 10,
        range: 3 * PLAYER_SIZE,
        rotationSpeed: 360 // degrees per second
    },

    // Blue Tier
    REGEN: {
        tier: 'BLUE',
        type: 'passive',
        healRate: 1 // HP per second, additive
    },
    RAPIDFIRE: {
        tier: 'BLUE',
        type: 'passive',
        bulletsBonus: 0.50 // 50% more bullets per shot, additive
    },
    TESLA: {
        tier: 'BLUE',
        type: 'active',
        fireRate: 4, // seconds
        damage: 50, // uses Arc Taser stats
        range: 8 * PLAYER_SIZE,
        chainRange: 3 * PLAYER_SIZE,
        maxChains: 5
    },

    // Red Tier (Boss Drops)
    REVIVE_PEN: {
        tier: 'RED',
        type: 'consumable',
        revives: 1 // only one revive per run
    },
    REINFORCE: {
        tier: 'RED',
        type: 'active',
        spawnRate: 20, // seconds
        minionHp: 30,
        minionDamage: 10,
        countFormula: 'bossWave' // number spawned = active boss wave count or 3
    },
    SLEIGHBELLS: {
        tier: 'RED',
        type: 'active',
        fireRate: 20, // seconds
        damage: 40, // per grenade
        splashRadius: 2 * PLAYER_SIZE
    }
};

// --- 12. BOSS DEFINITIONS ---
export const BOSSES = {
    RUDOLPH: {
        tier: 'BRONZE',
        hp: 800,
        speed: 450,
        damage: 25,
        chargePauseTime: 1.5,
        retreatDistance: 5 * PLAYER_SIZE,
        minionSpawnInterval: 3, // every 3rd charge
        knockbackDistance: 3 * PLAYER_SIZE,
        loot: ['RED_WEAPON', 'REVIVE_PEN']
    },
    ELVES_ON_SHELVES: {
        tier: 'SILVER',
        count: 3,
        hpPerElf: 400,
        speed: 150,
        fireRate: 3, // seconds
        speedBoostOnDeath: 0.5, // 50% boost
        fireRateBoostOnDeath: 0.5,
        loot: ['RED_WEAPON', 'REINFORCE']
    },
    ZOMBIE_SANTA: {
        tier: 'GOLD',
        hp: 2000,
        speed: 120,
        enrageSpeed: 200,
        damage: 40,
        knockbackDistance: 5 * PLAYER_SIZE,
        slamRange: 2 * PLAYER_SIZE,
        minionSpawnInterval: 5, // seconds
        minionCount: 5,
        enrageThreshold: 0.5, // 50% HP
        enrageMinionCount: 10,
        loot: ['RED_WEAPON', 'SLEIGHBELLS']
    }
};

// --- 13. MAP LAYOUT ---
// Sleigh location (SW quadrant of Central Arena)
export const SLEIGH_LOCATION = {
    x: MAP_SIZE * 0.45,
    y: MAP_SIZE * 0.55
};

// Christmas tree (center of Central Arena)
export const TREE_LOCATION = {
    x: MAP_SIZE * 0.5,
    y: MAP_SIZE * 0.5
};

// Arena definitions (approximate positions)
export const ARENAS = {
    CENTRAL: {
        x: MAP_SIZE * 0.5,
        y: MAP_SIZE * 0.5,
        radius: 1500,
        shape: 'donut',
        innerRadius: 300
    },
    CLAUS_MANOR: {
        x: MAP_SIZE * 0.65,
        y: MAP_SIZE * 0.35,
        radius: 1200,
        connections: ['CENTRAL', 'YETI_CAVE', 'LAB']
    },
    REINDEER_STABLES: {
        x: MAP_SIZE * 0.35,
        y: MAP_SIZE * 0.35,
        radius: 1000,
        connections: ['CENTRAL', 'YETI_CAVE', 'FOREST']
    },
    WORKSHOP: {
        x: MAP_SIZE * 0.5,
        y: MAP_SIZE * 0.7,
        radius: 1000,
        connections: ['CENTRAL', 'FOREST', 'LAB']
    },
    YETI_CAVE: {
        x: MAP_SIZE * 0.5,
        y: MAP_SIZE * 0.2,
        radius: 800,
        connections: ['REINDEER_STABLES', 'CLAUS_MANOR']
    },
    FOREST: {
        x: MAP_SIZE * 0.25,
        y: MAP_SIZE * 0.6,
        radius: 800,
        connections: ['REINDEER_STABLES', 'WORKSHOP']
    },
    LAB: {
        x: MAP_SIZE * 0.75,
        y: MAP_SIZE * 0.6,
        radius: 800,
        connections: ['CLAUS_MANOR', 'WORKSHOP']
    }
};

// Player spawn points (randomized at game start)
export const SPAWN_POINTS = [
    'BAKERY', // Part of FOREST arena
    'CLAUS_MANOR',
    'REINDEER_STABLES',
    'CENTRAL',
    'YETI_CAVE'
];
