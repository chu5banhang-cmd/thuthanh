// game.js - Hệ thống cân bằng Hardcore 30 Rounds (60s/Round) & Chuyển động Mượt (Smooth Steering)

let gameState = {
    screen: "START", 
    round: 1,
    maxRounds: GAME_CONFIG.totalRounds,
    roundTimeLeft: GAME_CONFIG.roundDuration,
    lastTimerUpdate: 0,
    overtimeEnrage: false,
    baseHp: GAME_CONFIG.baseMaxHp,
    maxBaseHp: GAME_CONFIG.baseMaxHp,
    workers: 2,
    maxWorkers: GAME_CONFIG.maxWorkers,
    soldiers: 0,
    resources: {
        wood: 60,
        stone: 0,
        iron: 0,
        steel: 0
    },
    allocation: {
        wood: 2,
        stone: 0,
        iron: 0,
        steel: 0
    },
    selectedTool: null 
};

let monsters = [];
let walls = [];
let towers = [];
let bullets = [];
let villagers = [];
let soldiersList = [];
let waveSchedule = [];
let floatingTexts = []; // Chữ bay hiển thị tài nguyên thu hoạch & sát thương

let resourceNodes = [
    { type: 'wood', x: 860, y: 420, color: '#5d4037' },  
    { type: 'stone', x: 950, y: 180, color: '#607d8b' }, 
    { type: 'iron', x: 150, y: 180, color: '#a04000' },  
    { type: 'steel', x: 150, y: 580, color: '#1f618d' }  
];

function spawnFloatingText(x, y, text, color = "#ffd54f", size = 13) {
    floatingTexts.push({
        x: x,
        y: y,
        text: text,
        color: color,
        size: size,
        alpha: 1.0,
        vy: -0.75,
        life: 48
    });
}

function initVillagers() {
    villagers = [];
    let assignedCount = 0;
    let idxCounter = 0;
    
    for (let type in gameState.allocation) {
        let count = gameState.allocation[type];
        let node = resourceNodes.find(n => n.type === type);
        
        for (let i = 0; i < count; i++) {
            let angle = (idxCounter / Math.max(1, gameState.workers)) * Math.PI * 2;
            villagers.push({
                x: 550 + Math.cos(angle) * 28,
                y: 385 + Math.sin(angle) * 20,
                vx: 0, vy: 0,
                kbX: 0, kbY: 0,
                targetNode: node ? { x: node.x + (i % 3 - 1) * 14, y: node.y + ((i % 2) * 12 - 6), type: node.type } : resourceNodes[0],
                speed: MINING_CONFIG.walkSpeed,
                carrying: null,
                workTimer: 0,
                maxWorkTimer: MINING_CONFIG.workFrames[type] || 190,
                hp: 85,
                maxHp: 85,
                hitCooldown: 0,
                resourceType: type,
                walkPhase: Math.random() * Math.PI * 2,
                beardColor: idxCounter % 2 === 0 ? "#d35400" : "#f1c40f",
                facing: 1
            });
            assignedCount++;
            idxCounter++;
        }
    }

    for (let i = assignedCount; i < gameState.workers; i++) {
        let angle = (idxCounter / Math.max(1, gameState.workers)) * Math.PI * 2;
        villagers.push({
            x: 550 + Math.cos(angle) * 28,
            y: 385 + Math.sin(angle) * 20,
            vx: 0, vy: 0,
            kbX: 0, kbY: 0,
            targetNode: null,
            speed: MINING_CONFIG.walkSpeed,
            carrying: null,
            workTimer: 0,
            maxWorkTimer: 190,
            hp: 85,
            maxHp: 85,
            hitCooldown: 0,
            resourceType: null,
            walkPhase: Math.random() * Math.PI * 2,
            beardColor: idxCounter % 2 === 0 ? "#d35400" : "#f1c40f",
            facing: 1
        });
        idxCounter++;
    }

    soldiersList = [];
    for (let i = 0; i < gameState.soldiers; i++) {
        let patrolAngle = (i / Math.max(1, gameState.soldiers)) * Math.PI * 2;
        soldiersList.push({
            x: 550 + Math.cos(patrolAngle) * 62,
            y: 380 + Math.sin(patrolAngle) * 52,
            vx: 0, vy: 0,
            patrolX: 550 + Math.cos(patrolAngle) * 65,
            patrolY: 380 + Math.sin(patrolAngle) * 55,
            hp: 240,
            maxHp: 240,
            damage: 28, // Sát thương mỗi nhát bổ rìu chuẩn xác theo Cooldown
            speed: 0.85,
            range: 85,
            walkPhase: Math.random() * Math.PI * 2,
            attackCooldown: 0,
            facing: Math.cos(patrolAngle) >= 0 ? 1 : -1
        });
    }
}

// Tính toán thông số độ khó cho từng Round từ 1 -> 30
function getRoundDifficulty(r) {
    let totalMonsters = Math.round(10 + r * 3.5 + Math.pow(r, 1.55));
    let tierMultiplier = 1;
    if (r >= 4) tierMultiplier *= 1.25;
    if (r >= 8) tierMultiplier *= 1.35;
    if (r >= 15) tierMultiplier *= 1.55;
    if (r >= 23) tierMultiplier *= 1.45;

    let baseHp = Math.round((45 + r * 22 + Math.pow(r, 2.05) * 1.8) * tierMultiplier);
    let baseSpeed = Math.min(0.66, 0.32 + r * 0.011);

    let tankChance = r < 3 ? 0 : Math.min(0.32, 0.14 + (r - 3) * 0.008);
    let fastChance = r < 5 ? 0 : Math.min(0.35, 0.15 + (r - 5) * 0.008);
    let hasBoss = (r % 5 === 0);

    return { totalMonsters, baseHp, baseSpeed, tankChance, fastChance, hasBoss };
}

function createMonsterEntity(roundNum, forceType = null) {
    const diff = getRoundDifficulty(roundNum);
    let edge = Math.floor(Math.random() * 4);
    let x, y;
    // Xuất hiện ở y = 74 cho cạnh Bắc để không bị thanh HUD (cao 66px) che khuất
    if (edge === 0) { x = Math.random() * 1020 + 40; y = 74; }
    else if (edge === 1) { x = Math.random() * 1020 + 40; y = 695; }
    else if (edge === 2) { x = 12; y = Math.random() * 590 + 85; }
    else { x = 1088; y = Math.random() * 590 + 85; }

    let type = forceType || "normal";
    if (!forceType) {
        let rand = Math.random();
        if (rand < diff.tankChance) type = "tank";
        else if (rand < diff.tankChance + diff.fastChance) type = "fast";
    }

    let hp = diff.baseHp;
    let speed = diff.baseSpeed;
    let size = 20;
    let wallDmg = 14 + roundNum * 1.1; // Sát thương mỗi đòn đập tường (theo Cooldown)
    let unitDmg = 20 + roundNum * 1.2; // Sát thương mỗi phát cắn Dân/Lính
    let baseDmg = 15;

    if (type === "tank") {
        hp = Math.round(diff.baseHp * 2.8);
        speed = diff.baseSpeed * 0.65;
        size = 28;
        wallDmg *= 2.6;
        unitDmg *= 1.5;
        baseDmg = 25;
    } else if (type === "fast") {
        hp = Math.round(diff.baseHp * 0.65);
        speed = Math.min(1.18, diff.baseSpeed * 1.65);
        size = 18;
        wallDmg *= 0.7;
        unitDmg *= 1.1;
        baseDmg = 12;
    } else if (type === "boss") {
        hp = Math.round(diff.baseHp * (7.5 + roundNum * 0.15));
        speed = Math.min(0.46, diff.baseSpeed * 0.58);
        size = 36;
        wallDmg *= 4.2;
        unitDmg *= 2.4;
        baseDmg = 60;
    }

    if (gameState.overtimeEnrage) {
        speed *= 1.35;
    }

    monsters.push({
        x: x, y: y,
        vx: 0, vy: 0,
        speed: speed,
        hp: hp, maxHp: hp,
        type: type,
        size: size,
        wallDmg: wallDmg,
        unitDmg: unitDmg,
        baseDmg: baseDmg,
        attackCooldown: 0,
        walkPhase: Math.random() * Math.PI * 2,
        facing: x < 550 ? 1 : -1,
        spawnFlash: 15
    });
}

function setupRoundWaves(roundNum) {
    monsters = [];
    bullets = [];
    waveSchedule = [];
    gameState.roundTimeLeft = GAME_CONFIG.roundDuration;
    gameState.lastTimerUpdate = performance.now();
    gameState.overtimeEnrage = false;

    const diff = getRoundDifficulty(roundNum);
    const total = diff.totalMonsters;

    const waveTimes = [59.5, 50, 40, 30, 20, 10];
    const waveWeights = [0.14, 0.15, 0.16, 0.17, 0.18, 0.20];

    waveTimes.forEach((sec, idx) => {
        let count = Math.max(2, Math.round(total * waveWeights[idx]));
        waveSchedule.push({
            triggerTime: sec,
            count: count,
            spawned: false,
            isBossWave: (diff.hasBoss && idx === 3)
        });
    });
}

function updateRoundTimerAndSpawns() {
    if (gameState.screen !== "COMBAT") return;

    let now = performance.now();
    // Giới hạn dt tối đa 0.1s để khi người chơi Alt+Tab hoặc chuyển cửa sổ không bị nhảy cóc đồng hồ
    let dt = Math.min(0.1, (now - gameState.lastTimerUpdate) / 1000);
    gameState.lastTimerUpdate = now;

    if (gameState.roundTimeLeft > 0) {
        gameState.roundTimeLeft = Math.max(0, gameState.roundTimeLeft - dt);

        waveSchedule.forEach(w => {
            if (!w.spawned && gameState.roundTimeLeft <= w.triggerTime) {
                w.spawned = true;
                for (let i = 0; i < w.count; i++) {
                    createMonsterEntity(gameState.round);
                }
                if (w.isBossWave) {
                    createMonsterEntity(gameState.round, "boss");
                    spawnFloatingText(550, 140, "⚠️ BOSS CHÚA TỂ NIDHOGG XUẤT HIỆN!", "#ff0054", 16);
                }
            }
        });
    } else if (!gameState.overtimeEnrage && monsters.length > 0) {
        gameState.overtimeEnrage = true;
        monsters.forEach(m => { m.speed *= 1.35; });
        spawnFloatingText(550, 140, "⚠️ HẾT 60 GIÂY - QUÁI HÓA CUỒNG NỘ!", "#ff1744", 16);
    }
}

// Lực tách nhau mềm mại (Soft Separation) giúp Dân, Lính và Quái không bị chồng khít lên nhau
function applySeparation(unit, list, minSepDist, pushStrength) {
    let pushX = 0, pushY = 0;
    for (let i = 0; i < list.length; i++) {
        let other = list[i];
        if (other === unit) continue;
        let dx = unit.x - other.x;
        let dy = unit.y - other.y;
        let d = Math.hypot(dx, dy);
        if (d > 0.01 && d < minSepDist) {
            let factor = (minSepDist - d) / minSepDist;
            pushX += (dx / d) * factor * pushStrength;
            pushY += (dy / d) * factor * pushStrength;
        }
    }
    unit.x += pushX;
    unit.y += pushY;
}

function updateUnits() {
    if (gameState.screen === "COMBAT") {
        villagers.forEach(v => {
            if (v.hitCooldown > 0) v.hitCooldown--;

            // Giảm dần lực đẩy lùi (Knockback) mượt mà
            if (Math.abs(v.kbX) > 0.05 || Math.abs(v.kbY) > 0.05) {
                v.x += v.kbX;
                v.y += v.kbY;
                v.kbX *= 0.82;
                v.kbY *= 0.82;
            }

            if (gameState.overtimeEnrage || !v.targetNode) {
                let dx = 550 - v.x, dy = 385 - v.y;
                let d = Math.hypot(dx, dy);
                if (d > 26) {
                    let desiredVx = (dx / d) * v.speed;
                    let desiredVy = (dy / d) * v.speed;
                    v.vx = v.vx * 0.8 + desiredVx * 0.2;
                    v.vy = v.vy * 0.8 + desiredVy * 0.2;
                    v.x += v.vx;
                    v.y += v.vy;
                    v.walkPhase += 0.22;
                    if (Math.abs(v.vx) > 0.08) v.facing = v.vx >= 0 ? 1 : -1;
                } else {
                    v.vx *= 0.7;
                    v.vy *= 0.7;
                }
                applySeparation(v, villagers, 14, 0.35);
                return;
            }

            if (v.workTimer > 0) {
                v.workTimer--;
                v.vx *= 0.5;
                v.vy *= 0.5;
                v.walkPhase += 0.28; // Nhịp vung cuốc/rìu khi đang khai thác
                return;
            }

            let targetX = v.targetNode.x;
            let targetY = v.targetNode.y;

            let dx = targetX - v.x;
            let dy = targetY - v.y;
            let dist = Math.hypot(dx, dy);

            if (dist > 8) {
                let desiredVx = (dx / dist) * v.speed;
                let desiredVy = (dy / dist) * v.speed;
                // Nội suy vận tốc (Smooth Steering) giúp đổi hướng cực mượt
                v.vx = v.vx * 0.82 + desiredVx * 0.18;
                v.vy = v.vy * 0.82 + desiredVy * 0.18;
                v.x += v.vx;
                v.y += v.vy;
                v.walkPhase += 0.22;
                if (Math.abs(v.vx) > 0.08) v.facing = v.vx >= 0 ? 1 : -1;
                applySeparation(v, villagers, 14, 0.3);
            } else {
                v.vx = 0;
                v.vy = 0;
                if (v.carrying === null) {
                    v.carrying = v.resourceType;
                    v.maxWorkTimer = MINING_CONFIG.workFrames[v.resourceType] || 190;
                    v.workTimer = v.maxWorkTimer;
                    v.targetNode = { x: 550, y: 385 };
                } else {
                    if (v.carrying) {
                        let amount = MINING_CONFIG.yieldPerTrip[v.carrying] || 2;
                        gameState.resources[v.carrying] += amount;
                        let icon = v.carrying === 'wood' ? '🪵' : v.carrying === 'stone' ? '🪨' : v.carrying === 'iron' ? '⛏️' : '⚡';
                        spawnFloatingText(v.x, v.y - 16, `+${amount} ${icon}`, "#00e676", 12);
                    }
                    v.carrying = null;
                    let baseNode = resourceNodes.find(n => n.type === v.resourceType);
                    v.targetNode = baseNode ? {
                        x: baseNode.x + (Math.random() * 20 - 10),
                        y: baseNode.y + (Math.random() * 16 - 8),
                        type: baseNode.type
                    } : null;
                }
            }
        });

        for (let sIdx = soldiersList.length - 1; sIdx >= 0; sIdx--) {
            let s = soldiersList[sIdx];
            if (s.attackCooldown > 0) s.attackCooldown--;

            let closestMonster = null;
            let minDist = 270;

            monsters.forEach(m => {
                let dist = Math.hypot(m.x - s.x, m.y - s.y);
                if (dist < minDist) {
                    minDist = dist;
                    closestMonster = m;
                }
            });

            if (closestMonster) {
                let dx = closestMonster.x - s.x;
                let dy = closestMonster.y - s.y;
                if (Math.abs(dx) > 0.1) s.facing = dx >= 0 ? 1 : -1;

                if (minDist > 20) {
                    let desiredVx = (dx / minDist) * s.speed;
                    let desiredVy = (dy / minDist) * s.speed;
                    s.vx = s.vx * 0.8 + desiredVx * 0.2;
                    s.vy = s.vy * 0.8 + desiredVy * 0.2;
                    s.x += s.vx;
                    s.y += s.vy;
                    s.walkPhase += 0.25;
                } else {
                    s.vx *= 0.6;
                    s.vy *= 0.6;
                }

                // Chém quái đúng theo Cooldown đòn đánh (26 frames / nhát bổ)
                if (minDist < 28 && s.attackCooldown === 0) {
                    s.attackCooldown = 26;
                    closestMonster.hp -= s.damage;
                    spawnFloatingText(closestMonster.x, closestMonster.y - 14, `-${s.damage}`, "#ffd54f", 11);
                    if (typeof playSound === 'function') playSound('hit');

                    if (closestMonster.hp <= 0) {
                        let mIdx = monsters.indexOf(closestMonster);
                        if (mIdx > -1) monsters.splice(mIdx, 1);
                    }
                }
            } else {
                let dx = s.patrolX - s.x, dy = s.patrolY - s.y;
                let d = Math.hypot(dx, dy);
                if (d > 8) {
                    let desiredVx = (dx / d) * (s.speed * 0.7);
                    let desiredVy = (dy / d) * (s.speed * 0.7);
                    s.vx = s.vx * 0.82 + desiredVx * 0.18;
                    s.vy = s.vy * 0.82 + desiredVy * 0.18;
                    s.x += s.vx;
                    s.y += s.vy;
                    s.walkPhase += 0.18;
                    if (Math.abs(s.vx) > 0.08) s.facing = s.vx >= 0 ? 1 : -1;
                } else {
                    s.vx *= 0.7;
                    s.vy *= 0.7;
                }
            }
            applySeparation(s, soldiersList, 18, 0.4);
        }
    } else {
        villagers.forEach(v => {
            let dx = 550 - v.x, dy = 385 - v.y;
            if (Math.hypot(dx, dy) > 42) {
                v.x += dx * 0.05;
                v.y += dy * 0.05;
                v.walkPhase += 0.15;
            }
            applySeparation(v, villagers, 15, 0.3);
        });
        soldiersList.forEach(s => {
            let dx = s.patrolX - s.x, dy = s.patrolY - s.y;
            if (Math.hypot(dx, dy) > 6) {
                s.x += dx * 0.08;
                s.y += dy * 0.08;
                s.walkPhase += 0.15;
            }
            applySeparation(s, soldiersList, 18, 0.35);
        });
    }
}

function startGame() {
    gameState.screen = "REST_MENU";
    gameState.round = 1;
    gameState.roundTimeLeft = GAME_CONFIG.roundDuration;
    gameState.baseHp = GAME_CONFIG.baseMaxHp;
    gameState.resources = { wood: 60, stone: 0, iron: 0, steel: 0 };
    gameState.allocation = { wood: 2, stone: 0, iron: 0, steel: 0 };
    gameState.workers = 2;
    gameState.soldiers = 0;
    walls = [];
    towers = [];
    monsters = [];
    bullets = [];
    waveSchedule = [];
    floatingTexts = [];
    initVillagers();
}

function startCombat() {
    gameState.screen = "COMBAT";
    gameState.selectedTool = null;
    setupRoundWaves(gameState.round);
}

function endCombatPhase() {
    // Tự động nộp toàn bộ tài nguyên mà Dân làng đang vác trên vai lúc kết thúc Round
    villagers.forEach(v => {
        if (v.carrying) {
            let amount = MINING_CONFIG.yieldPerTrip[v.carrying] || 2;
            gameState.resources[v.carrying] += amount;
            v.carrying = null;
        }
    });

    monsters = [];
    bullets = [];
    waveSchedule = [];
    gameState.overtimeEnrage = false;
    
    if (gameState.round >= gameState.maxRounds) {
        alert("🏆 VALHALLA BẤT DIỆT! Bạn đã sống sót qua toàn bộ 30 Mùa Đông Ragnarok (60s/Round) ở độ khó Hardcore!");
        gameState.screen = "START";
        return;
    }

    gameState.round++;
    gameState.resources.wood += 15;
    if (gameState.round >= 4) gameState.resources.stone += 8;
    if (gameState.round >= 8) gameState.resources.iron += 5;
    if (gameState.round >= 15) gameState.resources.steel += 3;

    initVillagers();
    gameState.screen = "REST_MENU";
}
