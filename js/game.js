// ==================== ИГРОВЫЕ ОБЪЕКТЫ ====================
let units = [];
let bullets = [];
let grenades = [];
let explosions = [];
let particles = [];

// ==================== БАЗОВЫЙ КЛАСС ЮНИТА ====================
class Unit {
    constructor(config, x, y, formationOffset = null) {
        this.side = config.side;
        this.color = config.color;
        this.shape = config.shape;
        this.radius = config.radius;
        this.maxHp = config.hp;
        this.hp = config.hp;
        this.speed = config.speed;
        this.accuracy = config.accuracy;
        this.fireRate = config.fireRate;
        this.detectRange = config.detectRange;
        this.fireRange = config.fireRange;
        this.respawnDelay = config.respawnDelay;
        this.boltColor = config.boltColor;
        this.boltSpeed = config.boltSpeed;
        
        this.x = x;
        this.y = y;
        this.formationOffset = formationOffset;
        this.cooldown = Math.random() * config.fireRate;
        this.alive = true;
        this.respawnTimer = 0;
        this.target = null;
        
        this.wanderAngle = Math.random() * Math.PI * 2;
        this.wanderTimer = 0;
        
        // Гранаты (только для клонов)
        this.empGrenades = 0;
        this.thermalGrenades = 0;
        this.grenadeCooldown = 0;
        
        // Для дроидов
        this.inFormation = false;
        this.fireIndex = 0;
    }

    assignGrenades() {
        if (this.side !== 'republic') return;
        this.empGrenades = GRENADE_CONFIG.emp.count;
        this.thermalGrenades = GRENADE_CONFIG.thermal.count;
    }

    respawn(baseX, baseY) {
        this.hp = this.maxHp;
        this.alive = true;
        this.cooldown = Math.random() * this.fireRate;
        this.x = baseX + (Math.random() - 0.5) * 100;
        this.y = baseY + (Math.random() - 0.5) * 100;
        this.assignGrenades();
        this.grenadeCooldown = 0;
    }

    findNearestEnemy() {
        let nearest = null;
        let minDist = Infinity;
        for (const u of units) {
            if (u.alive && u.side !== this.side) {
                const d = Math.hypot(u.x - this.x, u.y - this.y);
                if (d < minDist) {
                    minDist = d;
                    nearest = u;
                }
            }
        }
        return { unit: nearest, dist: minDist };
    }

    findMedic() {
        let nearest = null;
        let minDist = Infinity;
        for (const u of units) {
            if (u.alive && u.side === this.side && u.isMedic) {
                const d = Math.hypot(u.x - this.x, u.y - this.y);
                if (d < minDist) {
                    minDist = d;
                    nearest = u;
                }
            }
        }
        return { medic: nearest, dist: minDist };
    }

    findWoundedAlly() {
        let nearest = null;
        let minDist = Infinity;
        for (const u of units) {
            if (u.alive && u.side === this.side && u.hp < u.maxHp && !u.isMedic) {
                const d = Math.hypot(u.x - this.x, u.y - this.y);
                if (d < minDist) {
                    minDist = d;
                    nearest = u;
                }
            }
        }
        return { ally: nearest, dist: minDist };
    }

    countEnemiesInRange(range) {
        let count = 0;
        for (const u of units) {
            if (u.alive && u.side !== this.side) {
                const d = Math.hypot(u.x - this.x, u.y - this.y);
                if (d < range) count++;
            }
        }
        return count;
    }

    update() {
        if (!this.alive) {
            this.respawnTimer--;
            if (this.respawnTimer <= 0) {
                const base = bases[this.side];
                this.respawn(base.x, base.y);
            }
            return;
        }

        const { unit: enemy, dist } = this.findNearestEnemy();
        this.target = enemy;

        if (this.side === 'republic') {
            this.updateCloneBehavior(enemy, dist);
        } else {
            this.updateDroidBehavior(enemy, dist);
        }

        // Ограничение границами карты
        this.x = Math.max(this.radius, Math.min(MAP_WIDTH - this.radius, this.x));
        this.y = Math.max(this.radius, Math.min(MAP_HEIGHT - this.radius, this.y));

        // Стрельба
        this.cooldown--;
        if (this.cooldown <= 0 && enemy && dist < this.fireRange) {
            this.shoot(enemy);
            this.cooldown = this.fireRate + Math.random() * 20;
        }

        if (this.grenadeCooldown > 0) this.grenadeCooldown--;
    }

    shoot(enemy) {
        if (Math.random() > this.accuracy) {
            const spread = BULLET_CONFIG.missSpread;
            const targetX = enemy.x + (Math.random() - 0.5) * spread;
            const targetY = enemy.y + (Math.random() - 0.5) * spread;
            const dx = targetX - this.x;
            const dy = targetY - this.y;
            const len = Math.hypot(dx, dy);
            bullets.push({
                x: this.x, y: this.y,
                vx: (dx / len) * this.boltSpeed,
                vy: (dy / len) * this.boltSpeed,
                side: this.side,
                color: this.boltColor,
                life: BULLET_CONFIG.life
            });
            return;
        }

        const dx = enemy.x - this.x;
        const dy = enemy.y - this.y;
        const len = Math.hypot(dx, dy);
        bullets.push({
            x: this.x, y: this.y,
            vx: (dx / len) * this.boltSpeed,
            vy: (dy / len) * this.boltSpeed,
            side: this.side,
            color: this.boltColor,
            life: BULLET_CONFIG.life,
            target: enemy
        });
    }
}

// ==================== КЛОН ====================
class Clone extends Unit {
    constructor(config, x, y, isMedic = false) {
        super(config, x, y);
        this.isMedic = isMedic;
    }

    updateCloneBehavior(enemy, dist) {
        // Медик ищет раненых
        if (this.isMedic) {
            const { ally, dist: allyDist } = this.findWoundedAlly();
            if (ally && allyDist < this.detectRange) {
                const dx = ally.x - this.x;
                const dy = ally.y - this.y;
                const len = Math.hypot(dx, dy);
                if (len > 15) {
                    this.x += (dx / len) * this.speed;
                    this.y += (dy / len) * this.speed;
                }
                // Лечение при контакте
                if (len <= 15 && ally.hp < ally.maxHp) {
                    ally.hp = Math.min(ally.maxHp, ally.hp + CLONE_CONFIG.medicHealRate);
                    return;
                }
            } else {
                this.moveToCapturePoint();
            }
            return;
        }

        // Раненый клон ищет медика
        if (this.hp < this.maxHp) {
            const { medic, dist: medicDist } = this.findMedic();
            if (medic && medicDist < this.detectRange) {
                const dx = medic.x - this.x;
                const dy = medic.y - this.y;
                const len = Math.hypot(dx, dy);
                if (len > 15) {
                    this.x += (dx / len) * this.speed;
                    this.y += (dy / len) * this.speed;
                }
                return;
            } else {
                const base = bases.republic;
                const dx = base.x - this.x;
                const dy = base.y - this.y;
                const len = Math.hypot(dx, dy);
                if (len > 50) {
                    this.x += (dx / len) * this.speed;
                    this.y += (dy / len) * this.speed;
                } else {
                    this.hp = Math.min(this.maxHp, this.hp + CLONE_CONFIG.baseHealRate);
                }
                return;
            }
        }

        // Здоровый клон - бросаем гранаты
        this.tryThrowGrenade();
        this.moveToCapturePoint();

        // Подстраховка: отталкивание от союзников
        for (const u of units) {
            if (u.alive && u.side === this.side && u !== this) {
                const d = Math.hypot(u.x - this.x, u.y - this.y);
                if (d < 25 && d > 0) {
                    const pushX = (this.x - u.x) / d;
                    const pushY = (this.y - u.y) / d;
                    this.x += pushX * 0.5;
                    this.y += pushY * 0.5;
                }
            }
        }
    }

    moveToCapturePoint() {
        const tx = capturePoint.x;
        const ty = capturePoint.y;
        const dx = tx - this.x;
        const dy = ty - this.y;
        const len = Math.hypot(dx, dy);

        if (len > 30) {
            this.wanderTimer--;
            if (this.wanderTimer <= 0) {
                this.wanderAngle = (Math.random() - 0.5) * 1.5;
                this.wanderTimer = 30 + Math.random() * 60;
            }

            const perpX = -dy / len;
            const perpY = dx / len;
            const wanderStrength = 0.4;

            this.x += ((dx / len) + perpX * Math.sin(this.wanderAngle) * wanderStrength) * this.speed;
            this.y += ((dy / len) + perpY * Math.sin(this.wanderAngle) * wanderStrength) * this.speed;
        }
    }

    tryThrowGrenade() {
        if (this.grenadeCooldown > 0) return;
        if (this.empGrenades <= 0 && this.thermalGrenades <= 0) return;

        const enemyCount = this.countEnemiesInRange(this.detectRange);
        if (enemyCount < GRENADE_CONFIG.emp.requiredEnemies) return;

        const grenadeInArea = grenades.some(g => {
            const d = Math.hypot(g.x - this.x, g.y - this.y);
            return d < GRENADE_CONFIG.checkRadius && g.side === this.side;
        });
        if (grenadeInArea) return;

        const enemy = this.target;
        if (!enemy) return;

        if (this.empGrenades > 0 && Math.random() < GRENADE_CONFIG.empChance) {
            this.throwGrenade('emp', enemy.x, enemy.y);
            this.empGrenades--;
        } else if (this.thermalGrenades > 0) {
            this.throwGrenade('thermal', enemy.x, enemy.y);
            this.thermalGrenades--;
        }

        this.grenadeCooldown = GRENADE_CONFIG.emp.cooldown;
    }

    throwGrenade(type, targetX, targetY) {
        const dx = targetX - this.x;
        const dy = targetY - this.y;
        const len = Math.hypot(dx, dy);
        const config = type === 'emp' ? GRENADE_CONFIG.emp : GRENADE_CONFIG.thermal;
        grenades.push({
            x: this.x,
            y: this.y,
            vx: (dx / len) * config.flightSpeed,
            vy: (dy / len) * config.flightSpeed,
            type: type,
            side: this.side,
            life: config.flightTime,
            targetX: targetX,
            targetY: targetY
        });
    }

    shoot(enemy) {
        const fireChance = this.isMedic ? CLONE_CONFIG.medicFireChance : 1.0;
        if (Math.random() > fireChance) return;
        super.shoot(enemy);
    }
}

// ==================== ДРОИД B1 ====================
class Droid extends Unit {
    constructor(config, x, y, formationOffset, fireIndex) {
        super(config, x, y, formationOffset);
        this.fireIndex = fireIndex;
    }

    updateDroidBehavior(enemy, dist) {
        const formationStatus = this.checkFormation();
        this.inFormation = formationStatus.inPosition;

        const tx = capturePoint.x;
        const ty = capturePoint.y;

        let targetX = tx;
        let targetY = ty;
        if (this.formationOffset) {
            targetX += this.formationOffset.x;
            targetY += this.formationOffset.y;
        }

        const dx = targetX - this.x;
        const dy = targetY - this.y;
        const len = Math.hypot(dx, dy);

        if (len > 20) {
            this.x += (dx / len) * this.speed;
            this.y += (dy / len) * this.speed;
        }

        if (this.formationOffset && len <= 20) {
            const idealX = tx + this.formationOffset.x;
            const idealY = ty + this.formationOffset.y;
            const idX = idealX - this.x;
            const idY = idealY - this.y;
            const idLen = Math.hypot(idX, idY);
            if (idLen > 5) {
                this.x += (idX / idLen) * this.speed * 0.3;
                this.y += (idY / idLen) * this.speed * 0.3;
            }
        }
    }

    checkFormation() {
        if (!this.formationOffset) return { inPosition: false };
        
        const tx = capturePoint.x;
        const ty = capturePoint.y;
        const idealX = tx + this.formationOffset.x;
        const idealY = ty + this.formationOffset.y;
        const d = Math.hypot(idealX - this.x, idealY - this.y);
        
        return {
            inPosition: d < DROID_CONFIG.formation.formationThreshold,
            distance: d
        };
    }
}

// ==================== СОЗДАНИЕ АРМИЙ ====================
function createArmies() {
    units = [];

    // Республика: 9 клонов
    const repBase = bases.republic;
    for (let i = 0; i < 9; i++) {
        const angle = (i / 9) * Math.PI * 2;
        const x = repBase.x + Math.cos(angle) * 60;
        const y = repBase.y + Math.sin(angle) * 60;
        const isMedic = (i === 0);
        const unit = new Clone(CLONE_CONFIG, x, y, isMedic);
        unit.assignGrenades();
        units.push(unit);
    }

    // КНС: 32 дроида в формации 4×8
    const cisBase = bases.cis;
    const { cols, rows, colSpacing, rowSpacing } = DROID_CONFIG.formation;
    const startX = cisBase.x - ((cols - 1) * colSpacing) / 2;
    const startY = cisBase.y - ((rows - 1) * rowSpacing) / 2;

    let fireIndex = 0;
    for (let row = 0; row < rows; row++) {
        for (let col = 0; col < cols; col++) {
            const x = startX + col * colSpacing;
            const y = startY + row * rowSpacing;
            const formationOffset = {
                x: (col - (cols - 1) / 2) * colSpacing,
                y: (row - (rows - 1) / 2) * rowSpacing
            };
            const unit = new Droid(DROID_CONFIG, x, y, formationOffset, fireIndex++);
            units.push(unit);
        }
    }
}

// ==================== ОБНОВЛЕНИЕ ПУЛЬ ====================
function updateBullets() {
    for (const b of bullets) {
        b.x += b.vx;
        b.y += b.vy;
        b.life--;

        if (b.target && b.target.alive) {
            const d = Math.hypot(b.target.x - b.x, b.target.y - b.y);
            if (d < b.target.radius + BULLET_CONFIG.hitRadius) {
                b.target.hp--;
                b.life = 0;
                createExplosion(b.x, b.y, b.color);
                if (b.target.hp <= 0) {
                    b.target.alive = false;
                    b.target.respawnTimer = b.target.respawnDelay;
                    createExplosion(b.target.x, b.target.y, b.target.color, PARTICLE_CONFIG.deathCount);
                }
            }
        } else {
            for (const u of units) {
                if (u.alive && u.side !== b.side) {
                    const d = Math.hypot(u.x - b.x, u.y - b.y);
                    if (d < u.radius + BULLET_CONFIG.hitRadius) {
                        u.hp--;
                        b.life = 0;
                        createExplosion(b.x, b.y, b.color);
                        if (u.hp <= 0) {
                            u.alive = false;
                            u.respawnTimer = u.respawnDelay;
                            createExplosion(u.x, u.y, u.color, PARTICLE_CONFIG.deathCount);
                        }
                        break;
                    }
                }
            }
        }
    }
    bullets = bullets.filter(b => b.life > 0 && b.x > 0 && b.x < MAP_WIDTH && b.y > 0 && b.y < MAP_HEIGHT);
}

// ==================== ОБНОВЛЕНИЕ ГРАНАТ ====================
function updateGrenades() {
    for (const g of grenades) {
        g.x += g.vx;
        g.y += g.vy;
        g.life--;

        if (g.life <= 0) {
            if (g.type === 'emp') {
                explosions.push({
                    x: g.x, y: g.y,
                    type: 'emp',
                    radius: GRENADE_CONFIG.emp.radius,
                    life: EXPLOSION_CONFIG.emp.life,
                    maxLife: EXPLOSION_CONFIG.emp.life
                });
                for (const u of units) {
                    if (u.alive && u.side === 'cis') {
                        const d = Math.hypot(u.x - g.x, u.y - g.y);
                        if (d < GRENADE_CONFIG.emp.radius) {
                            u.hp = 0;
                            u.alive = false;
                            u.respawnTimer = u.respawnDelay;
                            createExplosion(u.x, u.y, '#00ffff', 20);
                        }
                    }
                }
            } else {
                explosions.push({
                    x: g.x, y: g.y,
                    type: 'thermal',
                    radius: GRENADE_CONFIG.thermal.radius,
                    life: EXPLOSION_CONFIG.thermal.life,
                    maxLife: EXPLOSION_CONFIG.thermal.life
                });
                for (const u of units) {
                    if (u.alive) {
                        const d = Math.hypot(u.x - g.x, u.y - g.y);
                        if (d < GRENADE_CONFIG.thermal.radius) {
                            u.hp -= GRENADE_CONFIG.thermal.damage;
                            createExplosion(u.x, u.y, '#ff6600', 10);
                            if (u.hp <= 0) {
                                u.alive = false;
                                u.respawnTimer = u.respawnDelay;
                                createExplosion(u.x, u.y, u.color, PARTICLE_CONFIG.deathCount);
                            }
                        }
                    }
                }
            }
        }
    }
    grenades = grenades.filter(g => g.life > 0);
}

// ==================== ЧАСТИЦЫ ====================
function createExplosion(x, y, color, count = PARTICLE_CONFIG.explosionCount) {
    for (let i = 0; i < count; i++) {
        particles.push({
            x, y,
            vx: (Math.random() - 0.5) * PARTICLE_CONFIG.speedMax,
            vy: (Math.random() - 0.5) * PARTICLE_CONFIG.speedMax,
            life: PARTICLE_CONFIG.explosionLife + Math.random() * 15,
            color,
            size: PARTICLE_CONFIG.sizeMin + Math.random() * (PARTICLE_CONFIG.sizeMax - PARTICLE_CONFIG.sizeMin)
        });
    }
}

function updateParticles() {
    for (const p of particles) {
        p.x += p.vx;
        p.y += p.vy;
        p.life--;
        p.size *= 0.95;
    }
    particles = particles.filter(p => p.life > 0);
}

function updateExplosions() {
    for (const e of explosions) {
        e.life--;
    }
    explosions = explosions.filter(e => e.life > 0);
}
