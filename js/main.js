// ==================== CANVAS И КОНТЕКСТ ====================
const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');

// ==================== ПЕРЕМЕННЫЕ КАМЕРЫ ====================
let cameraX = MAP_WIDTH / 2 - window.innerWidth / 2;
let cameraY = MAP_HEIGHT / 2 - window.innerHeight / 2;
let zoom = 1;

let isDragging = false;
let lastX = 0, lastY = 0;
let initialPinchDistance = 0, initialZoom = 1;

// ==================== РАЗМЕР ЭКРАНА ====================
function resize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}
window.addEventListener('resize', resize);
resize();

// ==================== ОТРИСОВКА ЗДАНИЙ ====================
function drawBuilding(x, y, width, height, color, name) {
    // Тень
    ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
    ctx.fillRect(x + 8, y + 8, width, height);
    
    // Основное здание
    ctx.fillStyle = color;
    ctx.fillRect(x, y, width, height);
    
    // Обводка
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 3;
    ctx.strokeRect(x, y, width, height);
    
    // Внутренняя деталь
    ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
    ctx.fillRect(x + 15, y + 15, width - 30, height - 30);
    
    // Название
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 20px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(name, x + width / 2, y - 15);
}

// ==================== ОТРИСОВКА ТОЧКИ ЗАХВАТА ====================
function drawCapturePoint() {
    const { x, y, radius } = capturePoint;
    const pulseSize = Math.sin(capturePoint.pulsePhase) * 10;

    // Внешнее пульсирующее кольцо
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(x, y, radius + 20 + pulseSize, 0, Math.PI * 2);
    ctx.stroke();

    // Основное кольцо
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.stroke();

    // Заполнение
    ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fill();

    // Центральная точка
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(x, y, 15, 0, Math.PI * 2);
    ctx.fill();

    // Надпись
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 24px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('ЗАХВАТ', x, y - radius - 30);
}

// ==================== ОТРИСОВКА ЮНИТА ====================
function drawUnit(u) {
    if (!u.alive) return;

    // Тень
    ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
    ctx.beginPath();
    ctx.ellipse(u.x, u.y + u.radius, u.radius, u.radius * 0.4, 0, 0, Math.PI * 2);
    ctx.fill();

    if (u.shape === 'circle') {
        // Клон — белый кружок
        ctx.fillStyle = u.color;
        ctx.strokeStyle = '#cccccc';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(u.x, u.y, u.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // Красный крест для медика
        if (u.isMedic) {
            ctx.fillStyle = '#ff0000';
            ctx.fillRect(u.x - 2, u.y - 5, 4, 10);
            ctx.fillRect(u.x - 5, u.y - 2, 10, 4);
        }
    } else {
        // Дроид — овал
        ctx.fillStyle = u.color;
        ctx.strokeStyle = '#8b7355';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.ellipse(u.x, u.y, u.radius * 0.7, u.radius * 1.4, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // Зелёная точка — индикатор "в строю"
        if (u.inFormation) {
            ctx.fillStyle = '#00ff00';
            ctx.beginPath();
            ctx.arc(u.x, u.y - u.radius * 1.4 - 5, 3, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    // Полоска HP (только если ранен)
    if (u.hp < u.maxHp) {
        const bw = 14, bh = 2;
        ctx.fillStyle = '#000';
        ctx.fillRect(u.x - bw / 2, u.y - u.radius - 8, bw, bh);
        ctx.fillStyle = u.hp > 1 ? '#0f0' : '#f00';
        ctx.fillRect(u.x - bw / 2, u.y - u.radius - 8, bw * (u.hp / u.maxHp), bh);
    }
}

// ==================== ОТРИСОВКА ПУЛИ ====================
function drawBullet(b) {
    const angle = Math.atan2(b.vy, b.vx);
    const length = 14;
    const width = 4;

    ctx.save();
    ctx.translate(b.x, b.y);
    ctx.rotate(angle);

    ctx.fillStyle = b.color;
    ctx.shadowBlur = 8;
    ctx.shadowColor = b.color;

    // Ромбовидная форма (заострённые концы)
    ctx.beginPath();
    ctx.moveTo(length / 2, 0);
    ctx.lineTo(0, width / 2);
    ctx.lineTo(-length / 2, 0);
    ctx.lineTo(0, -width / 2);
    ctx.closePath();
    ctx.fill();

    ctx.shadowBlur = 0;
    ctx.restore();
}

// ==================== ОТРИСОВКА ГРАНАТЫ ====================
function drawGrenade(g) {
    ctx.save();
    ctx.translate(g.x, g.y);

    if (g.type === 'emp') {
        // Синий цилиндр с молнией
        ctx.fillStyle = '#00aaff';
        ctx.shadowBlur = 10;
        ctx.shadowColor = '#00aaff';
        ctx.fillRect(-6, -4, 12, 8);
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(-3, -2);
        ctx.lineTo(0, 0);
        ctx.lineTo(-2, 2);
        ctx.lineTo(2, 0);
        ctx.stroke();
    } else {
        // Серебристый шар с красным индикатором
        ctx.fillStyle = '#cccccc';
        ctx.shadowBlur = 5;
        ctx.shadowColor = '#ff0000';
        ctx.beginPath();
        ctx.arc(0, 0, 6, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#ff0000';
        ctx.beginPath();
        ctx.arc(0, 0, 2, 0, Math.PI * 2);
        ctx.fill();
    }

    ctx.shadowBlur = 0;
    ctx.restore();
}

// ==================== ОТРИСОВКА ВЗРЫВА ====================
function drawExplosion(e) {
    const progress = 1 - (e.life / e.maxLife);
    const currentRadius = e.radius * progress;

    ctx.save();
    ctx.translate(e.x, e.y);

    if (e.type === 'emp') {
        // Электрическое поле
        ctx.strokeStyle = `rgba(${EXPLOSION_CONFIG.emp.color}, ${e.life / e.maxLife})`;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(0, 0, currentRadius, 0, Math.PI * 2);
        ctx.stroke();

        // Молнии
        ctx.strokeStyle = `rgba(255, 255, 255, ${e.life / e.maxLife})`;
        ctx.lineWidth = 2;
        for (let i = 0; i < EXPLOSION_CONFIG.emp.lightningCount; i++) {
            const angle = (i / EXPLOSION_CONFIG.emp.lightningCount) * Math.PI * 2 + progress * 10;
            const length = currentRadius * (0.5 + Math.random() * 0.5);
            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.lineTo(Math.cos(angle) * length, Math.sin(angle) * length);
            ctx.stroke();
        }
    } else {
        // Огонь и дым
        const fireRadius = currentRadius * 0.6;
        const smokeRadius = currentRadius;

        // Дым
        ctx.fillStyle = `rgba(${EXPLOSION_CONFIG.thermal.smokeColor}, ${e.life / e.maxLife * 0.5})`;
        ctx.beginPath();
        ctx.arc(0, 0, smokeRadius, 0, Math.PI * 2);
        ctx.fill();

        // Огонь
        ctx.fillStyle = `rgba(${EXPLOSION_CONFIG.thermal.fireColor}, ${e.life / e.maxLife})`;
        ctx.beginPath();
        ctx.arc(0, 0, fireRadius, 0, Math.PI * 2);
        ctx.fill();

        // Яркий центр
        ctx.fillStyle = `rgba(${EXPLOSION_CONFIG.thermal.coreColor}, ${e.life / e.maxLife})`;
        ctx.beginPath();
        ctx.arc(0, 0, fireRadius * 0.3, 0, Math.PI * 2);
        ctx.fill();
    }

    ctx.restore();
}

// ==================== ГЛАВНАЯ ФУНКЦИЯ ОТРИСОВКИ ====================
function drawMap() {
    // Очистка экрана
    ctx.fillStyle = '#1a2332';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.save();

    // Применяем камеру и зум
    ctx.translate(canvas.width / 2, canvas.height / 2);
    ctx.scale(zoom, zoom);
    ctx.translate(-canvas.width / 2, -canvas.height / 2);
    ctx.translate(-cameraX, -cameraY);

    // Карта
    ctx.fillStyle = '#1a2332';
    ctx.fillRect(0, 0, MAP_WIDTH, MAP_HEIGHT);
    ctx.strokeStyle = '#2a3b4c';
    ctx.lineWidth = 4;
    ctx.strokeRect(0, 0, MAP_WIDTH, MAP_HEIGHT);

    // Базы
    const repBase = bases.republic;
    const cisBase = bases.cis;
    const bs = repBase.buildingSize;
    drawBuilding(cisBase.x - bs / 2, cisBase.y - bs / 2, bs, bs, cisBase.color, cisBase.name);
    drawBuilding(repBase.x - bs / 2, repBase.y - bs / 2, bs, bs, repBase.color, repBase.name);

    // Точка захвата
    drawCapturePoint();

    // Юниты
    for (const u of units) drawUnit(u);

    // Пули
    for (const b of bullets) drawBullet(b);

    // Гранаты
    for (const g of grenades) drawGrenade(g);

    // Взрывы
    for (const e of explosions) drawExplosion(e);

    // Частицы
    for (const p of particles) {
        ctx.globalAlpha = p.life / 35;
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
    }
    ctx.globalAlpha = 1;

    ctx.restore();
}

// ==================== УПРАВЛЕНИЕ КАМЕРОЙ ====================
function getDistance(t1, t2) {
    return Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY);
}

canvas.addEventListener('touchstart', (e) => {
    if (e.touches.length === 1) {
        isDragging = true;
        lastX = e.touches[0].clientX;
        lastY = e.touches[0].clientY;
    } else if (e.touches.length === 2) {
        isDragging = false;
        initialPinchDistance = getDistance(e.touches[0], e.touches[1]);
        initialZoom = zoom;
    }
});

canvas.addEventListener('touchmove', (e) => {
    e.preventDefault();
    if (e.touches.length === 1 && isDragging) {
        const cx = e.touches[0].clientX;
        const cy = e.touches[0].clientY;
        cameraX -= (cx - lastX) / zoom;
        cameraY -= (cy - lastY) / zoom;
        lastX = cx;
        lastY = cy;
    } else if (e.touches.length === 2) {
        const d = getDistance(e.touches[0], e.touches[1]);
        zoom = Math.max(CAMERA_CONFIG.minZoom, Math.min(CAMERA_CONFIG.maxZoom, initialZoom * (d / initialPinchDistance)));
    }
});

canvas.addEventListener('touchend', (e) => {
    if (e.touches.length < 2) isDragging = false;
});

canvas.addEventListener('mousedown', (e) => {
    isDragging = true;
    lastX = e.clientX;
    lastY = e.clientY;
});

canvas.addEventListener('mousemove', (e) => {
    if (!isDragging) return;
    cameraX -= (e.clientX - lastX) / zoom;
    cameraY -= (e.clientY - lastY) / zoom;
    lastX = e.clientX;
    lastY = e.clientY;
});

canvas.addEventListener('mouseup', () => isDragging = false);
canvas.addEventListener('mouseleave', () => isDragging = false);

canvas.addEventListener('wheel', (e) => {
    e.preventDefault();
    if (e.deltaY < 0) zoom = Math.min(CAMERA_CONFIG.maxZoom, zoom + CAMERA_CONFIG.zoomStep);
    else zoom = Math.max(CAMERA_CONFIG.minZoom, zoom - CAMERA_CONFIG.zoomStep);
});

// ==================== ГЛАВНЫЙ ЦИКЛ ====================
function update() {
    for (const u of units) u.update();
    updateBullets();
    updateGrenades();
    updateParticles();
    updateExplosions();
    capturePoint.pulsePhase += 0.05;
}

function updateUI() {
    const repAlive = units.filter(u => u.side === 'republic' && u.alive).length;
    const cisAlive = units.filter(u => u.side === 'cis' && u.alive).length;
    document.getElementById('repCount').textContent = repAlive;
    document.getElementById('cisCount').textContent = cisAlive;
    document.getElementById('zoomLevel').textContent = Math.round(zoom * 100) + '%';
}

function loop() {
    update();
    drawMap();
    updateUI();
    requestAnimationFrame(loop);
}

// ==================== ЗАПУСК ====================
createArmies();
loop();
