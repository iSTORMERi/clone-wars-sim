// ==================== НАСТРОЙКИ КАРТЫ ====================
const MAP_WIDTH = 4000;
const MAP_HEIGHT = 2400;

// ==================== БАЗЫ ====================
const bases = {
    republic: { 
        x: 3400, 
        y: 1200, 
        color: '#ff3030', 
        name: 'РЕСПУБЛИКА',
        buildingSize: 180
    },
    cis: { 
        x: 600, 
        y: 1200, 
        color: '#4a9eff', 
        name: 'КНС',
        buildingSize: 180
    }
};

// ==================== ТОЧКА ЗАХВАТА ====================
const capturePoint = {
    x: 2000,
    y: 1200,
    radius: 80
};

// ==================== ПАРАМЕТРЫ КЛОНОВ ====================
const CLONE_CONFIG = {
    side: 'republic',
    color: '#ffffff',
    shape: 'circle',
    radius: 7,
    hp: 3,
    speed: 1.8,
    accuracy: 0.85,
    fireRate: 40,           // кадров между выстрелами
    detectRange: 250,       // радиус обнаружения врага
    fireRange: 220,         // радиус эффективной стрельбы
    respawnDelay: 180,      // 3 секунды при 60fps
    boltColor: '#4a9eff',
    boltSpeed: 8,
    medicRatio: 1 / 9,      // 1 медик на 9 клонов
    medicHealRate: 0.02,    // HP за кадр при лечении
    baseHealRate: 0.01,     // HP за кадр на базе
    medicFireChance: 0.3    // шанс выстрела для медика
};

// ==================== ПАРАМЕТРЫ ДРОИДОВ B1 ====================
const DROID_CONFIG = {
    side: 'cis',
    color: '#c9a96e',       // жёлто-коричневый/кожаный
    shape: 'oval',
    radius: 6,
    hp: 1,
    speed: 1.0,
    accuracy: 0.40,
    fireRate: 50,
    detectRange: 200,
    fireRange: 180,
    respawnDelay: 120,      // 2 секунды
    boltColor: '#ff3030',
    boltSpeed: 6,
    formation: {
        cols: 4,
        rows: 8,
        colSpacing: 20,
        rowSpacing: 20,
        formationThreshold: 30, // дистанция для считания "в строю"
        requiredPercentage: 0.70 // 70% в строю для начала атаки
    }
};

// ==================== ПАРАМЕТРЫ ГРАНАТ ====================
const GRENADE_CONFIG = {
    emp: {
        count: 3,           // количество на юнита
        radius: 100,        // радиус поражения
        flightSpeed: 4,
        flightTime: 90,     // кадров полёта
        color: '#00aaff',
        requiredEnemies: 5, // минимум врагов для броска
        cooldown: 180       // задержка между бросками
    },
    thermal: {
        count: 2,
        radius: 80,
        flightSpeed: 4,
        flightTime: 90,
        color: '#ff6600',
        damage: 2
    },
    checkRadius: 200,       // радиус проверки "не летит ли уже граната"
    empChance: 0.6          // шанс бросить EMP вместо термальной
};

// ==================== ПАРАМЕТРЫ ПУЛЬ ====================
const BULLET_CONFIG = {
    life: 60,               // время жизни пули в кадрах
    missSpread: 30,         // разброс при промахе (px)
    hitRadius: 3            // дополнительный радиус попадания
};

// ==================== ПАРАМЕТРЫ ЧАСТИЦ ====================
const PARTICLE_CONFIG = {
    explosionCount: 8,
    explosionLife: 35,
    deathCount: 15,
    sizeMin: 2,
    sizeMax: 5,
    speedMax: 4
};

// ==================== ПАРАМЕТРЫ ВЗРЫВОВ ====================
const EXPLOSION_CONFIG = {
    emp: {
        life: 60,
        color: '0, 200, 255',
        lightningCount: 8
    },
    thermal: {
        life: 90,
        fireColor: '255, 100, 0',
        smokeColor: '100, 100, 100',
        coreColor: '255, 255, 200'
    }
};

// ==================== ПАРАМЕТРЫ КАМЕРЫ ====================
const CAMERA_CONFIG = {
    minZoom: 0.3,
    maxZoom: 3,
    zoomStep: 0.1
};
