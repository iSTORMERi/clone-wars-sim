// ==================== НАСТРОЙКИ КАРТЫ ====================
const MAP_WIDTH = 4000;
const MAP_HEIGHT = 2400;

// ==================== БАЗЫ ====================
const bases = {
    republic: { x: 3400, y: 1200, color: '#ff3030', name: 'РЕСПУБЛИКА', buildingSize: 180 },
    cis: { x: 600, y: 1200, color: '#4a9eff', name: 'КНС', buildingSize: 180 }
};

// ==================== ТОЧКА ЗАХВАТА ====================
const capturePoint = { x: 2000, y: 1200, radius: 80, pulsePhase: 0 };

// ==================== ПАРАМЕТРЫ КЛОНОВ ====================
const CLONE_CONFIG = {
    side: 'republic', color: '#ffffff', shape: 'circle', radius: 7, hp: 3, speed: 1.8,
    accuracy: 0.85, fireRate: 40, detectRange: 350, fireRange: 320, respawnDelay: 180,
    boltColor: '#4a9eff', boltSpeed: 8, medicHealRate: 0.02, baseHealRate: 0.01, medicFireChance: 0.3
};

// ==================== ПАРАМЕТРЫ ДРОИДА B1 (обычный) ====================
const DROID_CONFIG = {
    side: 'cis', color: '#c9a96e', shape: 'oval', radius: 6, hp: 1, speed: 1.0,
    accuracy: 0.40, fireRate: 50, detectRange: 340, fireRange: 310, respawnDelay: 120,
    boltColor: '#ff3030', boltSpeed: 6
};

// ==================== ПАРАМЕТРЫ ДРОИДА-КОМАНДИРА B1 ====================
const COMMANDER_DROID_CONFIG = {
    side: 'cis', color: '#c9a96e', shape: 'oval', radius: 7, hp: 2, speed: 0.9,
    accuracy: 0.60, fireRate: 45, detectRange: 340, fireRange: 310, respawnDelay: 120,
    boltColor: '#ff3030', boltSpeed: 6,
    diamondColor: '#ffcc00'
};

// ==================== НАСТРОЙКИ ОТРЯДОВ (SQUADS) ====================
const SQUAD_CONFIG = {
    maxSize: 32,
    cols: 8,
    rows: 4,
    colSpacing: 18,
    rowSpacing: 18,
    attackThresholdOriginal: 0.70,
    attackThresholdSuccessor: 0.50,
    formationToleranceOriginal: 25,
    formationToleranceSuccessor: 40,
    commanderRow: 3,
    commanderCol: 3
};

// ==================== ПАРАМЕТРЫ ГРАНАТ, ПУЛЬ, ЧАСТИЦ, ВЗРЫВОВ, КАМЕРЫ ====================
const GRENADE_CONFIG = {
    emp: { count: 3, radius: 100, flightSpeed: 4, flightTime: 90, color: '#00aaff', requiredEnemies: 5, cooldown: 180 },
    thermal: { count: 2, radius: 80, flightSpeed: 4, flightTime: 90, color: '#ff6600', damage: 2 },
    checkRadius: 200, empChance: 0.6
};
const BULLET_CONFIG = { life: 60, missSpread: 30, hitRadius: 3 };
const PARTICLE_CONFIG = { explosionCount: 8, explosionLife: 35, deathCount: 15, sizeMin: 2, sizeMax: 5, speedMax: 4 };
const EXPLOSION_CONFIG = {
    emp: { life: 60, color: '0, 200, 255', lightningCount: 8 },
    thermal: { life: 90, fireColor: '255, 100, 0', smokeColor: '100, 100, 100', coreColor: '255, 255, 200' }
};
const CAMERA_CONFIG = { minZoom: 0.3, maxZoom: 3, zoomStep: 0.1 };
