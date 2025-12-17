// ==========================================
// >>> ITEM DEFINITIONS <<<
// ==========================================

export const ItemTier = {
    WHITE: -1,
    GREY: 0,
    GREEN: 1,
    BLUE: 2,
    RED: 3
};

export const TierColors = {
    [ItemTier.WHITE]: '#ffffff',
    [ItemTier.GREY]: '#9ca3af',
    [ItemTier.GREEN]: '#22c55e',
    [ItemTier.BLUE]: '#3b82f6',
    [ItemTier.RED]: '#ef4444'
};

export const TierNames = {
    [ItemTier.WHITE]: 'White',
    [ItemTier.GREY]: 'Grey',
    [ItemTier.GREEN]: 'Green',
    [ItemTier.BLUE]: 'Blue',
    [ItemTier.RED]: 'Red'
};

// Gear Score values
export const TierScores = {
    [ItemTier.WHITE]: 0,
    [ItemTier.GREY]: 1,
    [ItemTier.GREEN]: 2,
    [ItemTier.BLUE]: 4,
    [ItemTier.RED]: 8
};

// Weapon Type Enum
export const WeaponType = {
    // Starter
    SNOWBALL: 'SNOWBALL',

    // Grey
    SWORD: 'SWORD',
    PISTOL: 'PISTOL',
    SHOTGUN: 'SHOTGUN',

    // Green
    CHAINSAW: 'CHAINSAW',
    AR: 'AR',
    BOOMERANG: 'BOOMERANG',

    // Blue
    GRENADE_LAUNCHER: 'GRENADE_LAUNCHER',
    SNIPER: 'SNIPER',

    // Red
    FLAMETHROWER: 'FLAMETHROWER',
    BEAM: 'BEAM',
    ARC_TASER: 'ARC_TASER'
};

// Weapon Tier Mapping
export const WeaponTiers = {
    [WeaponType.SNOWBALL]: ItemTier.WHITE,

    [WeaponType.SWORD]: ItemTier.GREY,
    [WeaponType.PISTOL]: ItemTier.GREY,
    [WeaponType.SHOTGUN]: ItemTier.GREY,

    [WeaponType.CHAINSAW]: ItemTier.GREEN,
    [WeaponType.AR]: ItemTier.GREEN,
    [WeaponType.BOOMERANG]: ItemTier.GREEN,

    [WeaponType.GRENADE_LAUNCHER]: ItemTier.BLUE,
    [WeaponType.SNIPER]: ItemTier.BLUE,

    [WeaponType.FLAMETHROWER]: ItemTier.RED,
    [WeaponType.BEAM]: ItemTier.RED,
    [WeaponType.ARC_TASER]: ItemTier.RED
};

// Weapon pools by tier
export const WeaponsByTier = {
    [ItemTier.WHITE]: [WeaponType.SNOWBALL],
    [ItemTier.GREY]: [WeaponType.SWORD, WeaponType.PISTOL, WeaponType.SHOTGUN],
    [ItemTier.GREEN]: [WeaponType.CHAINSAW, WeaponType.AR, WeaponType.BOOMERANG],
    [ItemTier.BLUE]: [WeaponType.GRENADE_LAUNCHER, WeaponType.SNIPER],
    [ItemTier.RED]: [WeaponType.FLAMETHROWER, WeaponType.BEAM, WeaponType.ARC_TASER]
};

// Gear Type Enum
export const GearType = {
    // Grey
    VEST: 'VEST',
    SHOES: 'SHOES',
    MINES: 'MINES',

    // Green
    SNOWMAN: 'SNOWMAN',
    ELF_HAT: 'ELF_HAT',
    TURRET: 'TURRET',

    // Blue
    REGEN: 'REGEN',
    RAPIDFIRE: 'RAPIDFIRE',
    TESLA: 'TESLA',

    // Red
    REVIVE_PEN: 'REVIVE_PEN',
    REINFORCE: 'REINFORCE',
    SLEIGHBELLS: 'SLEIGHBELLS'
};

// Gear Tier Mapping
export const GearTiers = {
    [GearType.VEST]: ItemTier.GREY,
    [GearType.SHOES]: ItemTier.GREY,
    [GearType.MINES]: ItemTier.GREY,

    [GearType.SNOWMAN]: ItemTier.GREEN,
    [GearType.ELF_HAT]: ItemTier.GREEN,
    [GearType.TURRET]: ItemTier.GREEN,

    [GearType.REGEN]: ItemTier.BLUE,
    [GearType.RAPIDFIRE]: ItemTier.BLUE,
    [GearType.TESLA]: ItemTier.BLUE,

    [GearType.REVIVE_PEN]: ItemTier.RED,
    [GearType.REINFORCE]: ItemTier.RED,
    [GearType.SLEIGHBELLS]: ItemTier.RED
};

// Gear pools by tier
export const GearByTier = {
    [ItemTier.GREY]: [GearType.VEST, GearType.SHOES, GearType.MINES],
    [ItemTier.GREEN]: [GearType.SNOWMAN, GearType.ELF_HAT, GearType.TURRET],
    [ItemTier.BLUE]: [GearType.REGEN, GearType.RAPIDFIRE, GearType.TESLA],
    [ItemTier.RED]: [GearType.REVIVE_PEN, GearType.REINFORCE, GearType.SLEIGHBELLS]
};

// Gear Labels
export const GearLabels = {
    [GearType.VEST]: 'Tac-Vest',
    [GearType.SHOES]: 'Speed Shoes',
    [GearType.MINES]: 'Mine Layer',
    [GearType.SNOWMAN]: 'Snowman Decoy',
    [GearType.ELF_HAT]: 'Elf Hat',
    [GearType.TURRET]: 'Auto Turret',
    [GearType.REGEN]: 'Regen Module',
    [GearType.RAPIDFIRE]: 'Rapidfire',
    [GearType.TESLA]: 'Tesla Coil',
    [GearType.REVIVE_PEN]: 'Revive Pen',
    [GearType.REINFORCE]: 'Reinforcements',
    [GearType.SLEIGHBELLS]: 'Sleighbells'
};

// Reserved IDs for future story items (stub)
export const RESERVED_ITEM_IDS = {
    NOTEBOOK: 'notebook',
    STABILIZER: 'stabilizer',
    LETTER: 'letter'
};

export function getRandomWeaponByTier(tier) {
    const pool = WeaponsByTier[tier];
    if (!pool || pool.length === 0) return null;
    return pool[Math.floor(Math.random() * pool.length)];
}

export function getRandomGearByTier(tier) {
    const pool = GearByTier[tier];
    if (!pool || pool.length === 0) return null;
    return pool[Math.floor(Math.random() * pool.length)];
}

export function calculateGearScore(weaponTier, gearTiers) {
    let score = TierScores[weaponTier] || 0;
    gearTiers.forEach(tier => {
        if (tier !== null && tier !== undefined) {
            score += TierScores[tier] || 0;
        }
    });
    return score;
}
