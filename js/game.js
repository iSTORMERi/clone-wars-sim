// ==================== ИГРОВЫЕ ОБЪЕКТЫ ====================
let units = [];
let squads = [];
let bullets = [];
let grenades = [];
let explosions = [];
let particles = [];

// ==================== КЛАСС ОТРЯДА (SQUAD) ====================
class Squad {
    constructor(baseX, baseY, id) {
        this.id = id;
        this.baseX = baseX;
        this.baseY = baseY;
        this.members = [];
        this.commander = null;
        this.isOriginalCommanderAlive = true;
        this.state = 'FORMING';
        
        this.slots = [];
        let slotId = 0;
        for (let r = 0; r < SQUAD_CONFIG.rows; r++) {
            for (let c = 0; c < SQUAD_CONFIG.cols; c++) {
                const offsetX = (c - 1) * SQUAD_CONFIG.colSpacing;
                const offsetY = (r - 7) * SQUAD_CONFIG.rowSpacing;
                this.slots.push({ id: slotId++, x: offsetX, y: offsetY, isCommanderSlot: (c === 1 && r === 7) });
            }
        }
    }

    addMember(droid, slotIndex) {
        this.members.push(droid);
        droid.squad = this;
        droid.slotIndex = slotIndex;
        
        // Дроид становится командиром ТОЛЬКО если в отряде еще нет командира
        if (!this.commander) {
            this.commander = droid;
            droid.isCommander = true;
            // Если это первый дроид в новом отряде, он оригинальный командир
            if (this.members.length === 1) {
                droid.isOriginalCommander = true;
            }
        }
    }

    removeMember(droid) {
        this.members = this.members.filter(m => m !== droid);
        
        if (droid === this.commander) {
            this.isOriginalCommanderAlive = false;
            
            if (this.members.length > 0) {
                // Выбираем случайного выжившего преемником
                const successor = this.members[Math.floor(Math.random() * this.members.length)];
                successor.isCommander = true;
                successor.isOriginalCommander = false;
                this.commander = successor;
            } else {
                this.commander = null; // Отряд пуст, следующий респавн создаст нового командира
            }
        }
    }

    getFillPercentage() {
        return this.members.length / SQUAD_CONFIG.maxSize;
    }

    shouldAttack() {
        const threshold = this.isOriginalCommanderAlive ? SQUAD_CONFIG.attackThresholdOriginal : SQUAD_CONFIG.attackThresholdSuccessor;
        return this.getFillPercentage() >= threshold;
    }

    update() {
        if (!this.commander) return;

        if (this.state === 'FORMING' && this.shouldAttack()) {
            this.state = 'MARCHING';
        }

        const enemy = this.commander.findNearestEnemy();
        if (enemy.unit && enemy.dist < this.commander.detectRange) {
            this.state = 'ENGAGING';
        } else if (this.state === 'ENGAGING' && (!enemy.unit || enemy.dist > this.commander.detectRange * 1.5)) {
            this.state = 'MARCHING';
        }

        let targetX, targetY;
        if (this.state === 'FORMING') {
            targetX = this.baseX;
            targetY = this.baseY;
        } else {
            targetX = capturePoint.x;
            targetY = capturePoint.y;
        }

        const dx = targetX - this.commander.x;
        const dy = targetY - this.commander.y;
        const dist = Math.hypot(dx, dy);

        if (dist > 10) {
            this.commander.x += (dx / dist) * this.commander.speed;
            this.commander.y += (dy / dist) * this.commander.speed;
        }

        this.commander.x = Math.max(this.commander.radius, Math.min(MAP_WIDTH - this.commander.radius, this.commander.x));
        this.commander.y = Math.max(this.commander.radius, Math.min(MAP_HEIGHT - this.commander.radius, this.commander.y));
    }
}

// ==================== БАЗОВЫЙ КЛАСС ЮНИТА ====================
class Unit {
    constructor(config, x, y) {
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
        this.cooldown = Math.random() * config.fireRate;
        this.alive = true;
        this.respawnTimer = 0;
        this.target = null;
        
        this.wanderAngle = Math.random() * Math.PI * 2;
        this.wanderTimer = 0;
        this.empGrenades = 0;
        this.thermalGrenades = 0;
        this.grenadeCooldown = 0;
    }

    assignGrenades() {
        if (this.side !== 'republic') return;
        this.empGrenades = GRENADE_CONFIG.emp.count;
        this.thermalGrenades = GRENADE_CONFIG.thermal.count;
    }

    findNearestEnemy() {
        let nearest = null, minDist = Infinity;
        for (const u of units) {
            if (u.alive && u.side !== this.side) {
                const d = Math.hypot(u.x - this.x, u.y - this.y);
                if (d < minDist) { minDist = d; nearest = u; }
            }
        }
        return { unit: nearest, dist: minDist };
    }

    findMedic() {
        let nearest = null, minDist = Infinity;
        for (const u of units) {
            if (u.alive && u.side === this.side && u.isMedic) {
                const d = Math.hypot(u.x - this.x, u.y - this.y);
                if (d < minDist) { minDist = d; nearest = u; }
            }
        }
        return { medic: nearest, dist: minDist };
    }

    findWoundedAlly() {
        let nearest = null, minDist = Infinity;
        for (const u of units) {
            if (u.alive && u.side === this.side && u.hp < u.maxHp && !u.isMedic) {
                const d = Math.hypot(u.x - this.x, u.y - this.y);
                if (d < minDist) { minDist = d; nearest = u; }
            }
        }
        return { ally: nearest, dist: minDist };
    }

    countEnemiesInRange(range) {
        let count = 0;
        for (const u of units) {
            if (u.alive && u.side !== this.side && Math.hypot(u.x - this.x, u.y - this.y) < range) count++;
        }
        return count;
    }

    update() {
        if (!this.alive) {
            this.respawnTimer--;
            if (this.respawnTimer <= 0) handleRespawn(this);
            return;
        }

        const { unit: enemy, dist } = this.findNearestEnemy();
        this.target = enemy;

        if (this.side === 'republic') this.updateCloneBehavior(enemy, dist);
        else this.updateDroidBehavior(enemy, dist);

        this.x = Math.max(this.radius, Math.min(MAP_WIDTH - this.radius, this.x));
        this.y = Math.max(this.radius, Math.min(MAP_HEIGHT - this.radius, this.y));

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
            const tx = enemy.x + (Math.random() - 0.5) * spread;
            const ty = enemy.y + (Math.random() - 0.5) * spread;
            const dx = tx - this.x, dy = ty - this.y, len = Math.hypot(dx, dy);
            bullets.push({ x: this.x, y: this.y, vx: (dx/len)*this.boltSpeed, vy: (dy/len)*this.boltSpeed, side: this.side, color: this.boltColor, life: BULLET_CONFIG.life });
            return;
        }
        const dx = enemy.x - this.x, dy = enemy.y - this.y, len = Math.hypot(dx, dy);
        bullets.push({ x: this.x, y: this.y, vx: (dx/len)*this.boltSpeed, vy: (dy/len)*this.boltSpeed, side: this.side, color: this.boltColor, life: BULLET_CONFIG.life, target: enemy });
    }
}

// ==================== КЛОН ====================
class Clone extends Unit {
    constructor(config, x, y, isMedic = false) {
        super(config, x, y);
        this.isMedic = isMedic;
    }

    updateCloneBehavior(enemy, dist) {
        if (this.isMedic) {
            const { ally, dist: allyDist } = this.findWoundedAlly();
            if (ally && allyDist < this.detectRange) {
                const dx = ally.x - this.x, dy = ally.y - this.y, len = Math.hypot(dx, dy);
                if (len > 15) { this.x += (dx/len)*this.speed; this.y += (dy/len)*this.speed; }
                if (len <= 15 && ally.hp < ally.maxHp) { ally.hp = Math.min(ally.maxHp, ally.hp + CLONE_CONFIG.medicHealRate); return; }
            } else this.moveToCapturePoint();
            return;
        }

        if (this.hp < this.maxHp) {
            const { medic, dist: medicDist } = this.findMedic();
            if (medic && medicDist < this.detectRange) {
                const dx = medic.x - this.x, dy = medic.y - this.y, len = Math.hypot(dx, dy);
                if (len > 15) { this.x += (dx/len)*this.speed; this.y += (dy/len)*this.speed; }
                return;
            } else {
                const base = bases.republic;
                const dx = base.x - this.x, dy = base.y - this.y, len = Math.hypot(dx, dy);
                if (len > 50) { this.x += (dx/len)*this.speed; this.y += (dy/len)*this.speed; }
                else this.hp = Math.min(this.maxHp, this.hp + CLONE_CONFIG.baseHealRate);
                return;
            }
        }

        this.tryThrowGrenade();
        this.moveToCapturePoint();

        for (const u of units) {
            if (u.alive && u.side === this.side && u !== this) {
                const d = Math.hypot(u.x - this.x, u.y - this.y);
                if (d < 25 && d > 0) { this.x += ((this.x - u.x)/d)*0.5; this.y += ((this.y - u.y)/d)*0.5; }
            }
        }
    }

    moveToCapturePoint() {
        const tx = capturePoint.x, ty = capturePoint.y;
        const dx = tx - this.x, dy = ty - this.y, len = Math.hypot(dx, dy);
        if (len > 30) {
            this.wanderTimer--;
            if (this.wanderTimer <= 0) { this.wanderAngle = (Math.random() - 0.5) * 1.5; this.wanderTimer = 30 + Math.random() * 60; }
            const perpX = -dy / len, perpY = dx / len, wanderStrength = 0.4;
            this.x += ((dx/len) + perpX * Math.sin(this.wanderAngle) * wanderStrength) * this.speed;
            this.y += ((dy/len) + perpY * Math.sin(this.wanderAngle) * wanderStrength) * this.speed;
        }
    }

    tryThrowGrenade() {
        if (this.grenadeCooldown > 0 || (this.empGrenades <= 0 && this.thermalGrenades <= 0)) return;
        if (this.countEnemiesInRange(this.detectRange) < GRENADE_CONFIG.emp.requiredEnemies) return;
        if (grenades.some(g => Math.hypot(g.x - this.x, g.y - this.y) < GRENADE_CONFIG.checkRadius && g.side === this.side)) return;
        
        const enemy = this.target;
        if (!enemy) return;

        if (this.empGrenades > 0 && Math.random() < GRENADE_CONFIG.empChance) {
            this.throwGrenade('emp', enemy.x, enemy.y); this.empGrenades--;
        } else if (this.thermalGrenades > 0) {
            this.throwGrenade('thermal', enemy.x, enemy.y); this.thermalGrenades--;
        }
        this.grenadeCooldown = GRENADE_CONFIG.emp.cooldown;
    }

    throwGrenade(type, targetX, targetY) {
        const dx = targetX - this.x, dy = targetY - this.y, len = Math.hypot(dx, dy);
        const config = type === 'emp' ? GRENADE_CONFIG.emp : GRENADE_CONFIG.thermal;
        grenades.push({ x: this.x, y: this.y, vx: (dx/len)*config.flightSpeed, vy: (dy/len)*config.flightSpeed, type, side: this.side, life: config.flightTime });
    }

    shoot(enemy) {
        if (this.isMedic && Math.random() > CLONE_CONFIG.medicFireChance) return;
        super.shoot(enemy);
    }
}

// ==================== ДРОИД B1 ====================
class Droid extends Unit {
    constructor(config, x, y) {
        super(config, x, y);
        this.squad = null;
        this.slotIndex = -1;
        this.isCommander = false;
        this.isOriginalCommander = false;
    }

    updateDroidBehavior(enemy, dist) {
        if (!this.squad || !this.squad.commander) {
            this.moveToTarget(capturePoint.x, capturePoint.y);
            return;
        }

        const tolerance = this.squad.isOriginalCommanderAlive ? SQUAD_CONFIG.formationToleranceOriginal : SQUAD_CONFIG.formationToleranceSuccessor;
        const slot = this.squad.slots[this.slotIndex];
        
        const targetX = this.squad.commander.x + slot.x;
        const targetY = this.squad.commander.y + slot.y;

        const dx = targetX - this.x;
        const dy = targetY - this.y;
        const distToSlot = Math.hypot(dx, dy);

        if (distToSlot > tolerance) {
            this.x += (dx / distToSlot) * this.speed;
            this.y += (dy / distToSlot) * this.speed;
        } else {
            if (this.squad.state === 'ENGAGING' && enemy && dist < this.fireRange) {
                this.x += (Math.random() - 0.5) * 0.5;
                this.y += (Math.random() - 0.5) * 0.5;
            }
        }
    }

    moveToTarget(tx, ty) {
        const dx = tx - this.x, dy = ty - this.y, len = Math.hypot(dx, dy);
        if (len > 10) { this.x += (dx/len)*this.speed; this.y += (dy/len)*this.speed; }
    }
}

// ==================== ЛОГИКА РЕСПАВНА ====================
function handleRespawn(unit) {
    const base = bases[unit.side];
    unit.hp = unit.maxHp;
    unit.alive = true;
    unit.cooldown = Math.random() * unit.fireRate;
    unit.assignGrenades();
    unit.grenadeCooldown = 0;
    // Сбрасываем флаги командира при респавне, они назначатся заново если нужно
    unit.isCommander = false;
    unit.isOriginalCommander = false;

    if (unit.side === 'cis') {
        let formingSquad = squads.find(s => s.state === 'FORMING' && s.members.length < SQUAD_CONFIG.maxSize);
        
        if (formingSquad) {
            const occupiedSlots = formingSquad.members.map(m => m.slotIndex);
            let freeSlot = formingSquad.slots.findIndex((s, idx) => !occupiedSlots.includes(idx));
            
            if (freeSlot !== -1) {
                unit.x = base.x + (Math.random() - 0.5) * 50;
                unit.y = base.y + (Math.random() - 0.5) * 50;
                formingSquad.addMember(unit, freeSlot);
            } else {
                createNewSquadForDroid(unit, base);
            }
        } else {
            createNewSquadForDroid(unit, base);
        }
    } else {
        unit.x = base.x + (Math.random() - 0.5) * 100;
        unit.y = base.y + (Math.random() - 0.5) * 100;
    }
}

function createNewSquadForDroid(droid, base) {
    const newSquad = new Squad(base.x, base.y, squads.length + 1);
    squads.push(newSquad);
    
    droid.x = base.x;
    droid.y = base.y;
    
    const commanderSlotIndex = newSquad.slots.findIndex(s => s.isCommanderSlot);
    newSquad.addMember(droid, commanderSlotIndex);
}

// ==================== СОЗДАНИЕ АРМИЙ ====================
function createArmies() {
    units = [];
    squads = [];

    const repBase = bases.republic;
    for (let i = 0; i < 9; i++) {
        const angle = (i / 9) * Math.PI * 2;
        const unit = new Clone(CLONE_CONFIG, repBase.x + Math.cos(angle)*60, repBase.y + Math.sin(angle)*60, i === 0);
        unit.assignGrenades();
        units.push(unit);
    }

    const cisBase = bases.cis;
    const firstSquad = new Squad(cisBase.x, cisBase.y, 1);
    squads.push(firstSquad);

    for (let i = 0; i < SQUAD_CONFIG.maxSize; i++) {
        const slot = firstSquad.slots[i];
        const x = cisBase.x + slot.x + (Math.random()-0.5)*10;
        const y = cisBase.y + slot.y + (Math.random()-0.5)*10;
        const droid = new Droid(DROID_CONFIG, x, y);
        firstSquad.addMember(droid, i);
        units.push(droid);
    }
}

// ==================== ОБНОВЛЕНИЕ СИСТЕМ ====================
function updateBullets() {
    for (const b of bullets) {
        b.x += b.vx; b.y += b.vy; b.life--;
        if (b.target && b.target.alive) {
            if (Math.hypot(b.target.x - b.x, b.target.y - b.y) < b.target.radius + BULLET_CONFIG.hitRadius) {
                b.target.hp--; b.life = 0;
                createExplosion(b.x, b.y, b.color);
                if (b.target.hp <= 0) killUnit(b.target);
            }
        } else {
            for (const u of units) {
                if (u.alive && u.side !== b.side && Math.hypot(u.x - b.x, u.y - b.y) < u.radius + BULLET_CONFIG.hitRadius) {
                    u.hp--; b.life = 0; createExplosion(b.x, b.y, b.color);
                    if (u.hp <= 0) killUnit(u);
                    break;
                }
            }
        }
    }
    bullets = bullets.filter(b => b.life > 0 && b.x > 0 && b.x < MAP_WIDTH && b.y > 0 && b.y < MAP_HEIGHT);
}

function killUnit(u) {
    u.alive = false;
    u.respawnTimer = u.respawnDelay;
    createExplosion(u.x, u.y, u.color, PARTICLE_CONFIG.deathCount);
    
    if (u.side === 'cis' && u.squad) {
        u.squad.removeMember(u);
        if (u.squad.members.length === 0) {
            squads = squads.filter(s => s !== u.squad);
        }
    }
}

function updateGrenades() {
    for (const g of grenades) {
        g.x += g.vx; g.y += g.vy; g.life--;
        if (g.life <= 0) {
            if (g.type === 'emp') {
                explosions.push({ x: g.x, y: g.y, type: 'emp', radius: GRENADE_CONFIG.emp.radius, life: EXPLOSION_CONFIG.emp.life, maxLife: EXPLOSION_CONFIG.emp.life });
                for (const u of units) {
                    if (u.alive && u.side === 'cis' && Math.hypot(u.x - g.x, u.y - g.y) < GRENADE_CONFIG.emp.radius) killUnit(u);
                }
            } else {
                explosions.push({ x: g.x, y: g.y, type: 'thermal', radius: GRENADE_CONFIG.thermal.radius, life: EXPLOSION_CONFIG.thermal.life, maxLife: EXPLOSION_CONFIG.thermal.life });
                for (const u of units) {
                    if (u.alive && Math.hypot(u.x - g.x, u.y - g.y) < GRENADE_CONFIG.thermal.radius) {
                        u.hp -= GRENADE_CONFIG.thermal.damage;
                        createExplosion(u.x, u.y, '#ff6600', 10);
                        if (u.hp <= 0) killUnit(u);
                    }
                }
            }
        }
    }
    grenades = grenades.filter(g => g.life > 0);
}

function createExplosion(x, y, color, count = PARTICLE_CONFIG.explosionCount) {
    for (let i = 0; i < count; i++) {
        particles.push({ x, y, vx: (Math.random()-0.5)*PARTICLE_CONFIG.speedMax, vy: (Math.random()-0.5)*PARTICLE_CONFIG.speedMax, life: PARTICLE_CONFIG.explosionLife + Math.random()*15, color, size: PARTICLE_CONFIG.sizeMin + Math.random()*(PARTICLE_CONFIG.sizeMax - PARTICLE_CONFIG.sizeMin) });
    }
}

function updateParticles() {
    for (const p of particles) { p.x += p.vx; p.y += p.vy; p.life--; p.size *= 0.95; }
    particles = particles.filter(p => p.life > 0);
}

function updateExplosions() {
    for (const e of explosions) e.life--;
    explosions = explosions.filter(e => e.life > 0);
}
