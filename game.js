const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

let bgImage = new Image();
bgImage.src = "img/fondo.png";

let gameData = JSON.parse(localStorage.getItem("surviveGameDataV8")) || {
    coins: 0,
    selectedChar: 0,
    unlockedChars: [true, false, false, false, false],
    maxHpBonus: 0,
    damageBonus: 0,
    statsGames: 0,
    statsKills: 0
};

function saveGame() {
    localStorage.setItem("surviveGameDataV8", JSON.stringify(gameData));
}

// 5 Personajes con sus armas configuradas
const characters = [
    { 
        name: "Pebble", 
        price: 0, 
        weapon: "lineal", 
        desc: "Gomera directa",
        lore: "Le arrebataron a sus padres apenas al nacer, sobrevivió a base de pura astucia y una gomera que cruelmente robó a un niño. ¡Peligro de bolsillo!",
        icon: "img/personaje1.png",
        cardImg: "img/ficha1.png"
    },
    { 
        name: "Deuce", 
        price: 50, 
        weapon: "doble_pegado", 
        desc: "Doble revólver",
        lore: "Su mente quedó atrapada en otra época, impone su ley a puro plomo con sus revólveres gemelos. Dos cañones que no perdonan.",
        icon: "img/personaje2.png",
        cardImg: "img/ficha2.png"
    },
    { 
        name: "Slug", 
        price: 100, 
        weapon: "lenta_grande", 
        desc: "Escopeta pesada",
        lore: "La más fiel defensa de su familia. Si te metes con ellos, te metes con Slug (y su escopeta).",
        icon: "img/personaje3.png",
        cardImg: "img/ficha3.png"
    },
    { 
        name: "Blast", 
        price: 200, 
        weapon: "onda_expansiva", 
        desc: "Onda circular",
        lore: "Tiene una obsesión con la tecnología basura. Diseñó su propio generador de pulsos para espantar a cualquiera que se acerque a su taller.",
        icon: "img/personaje4.png",
        cardImg: "img/ficha4.png"
    },
    { 
        name: "Gatling", 
        price: 350, 
        weapon: "doble_cuadruple", 
        desc: "Doble Minigun",
        lore: "Quien manda en el grupo sin discusión. Con blindaje militar y un rifle pesado hecho a medida, arrasa con todo a su paso.",
        icon: "img/personaje5.png",
        cardImg: "img/ficha5.png"
    }
];

let charImages = characters.map(c => {
    let img = new Image();
    img.src = c.icon;
    return img;
});

let player = {
    x: canvas.width / 2,
    y: canvas.height / 2,
    size: 20,
    speed: 210, // Pixeles por segundo (independiente de los Hz)
    maxHp: 100 + gameData.maxHpBonus,
    hp: 100 + gameData.maxHpBonus,
    attackSpeedMultiplier: 1,
    extraProjectiles: 0,
    hasShield: false,
    hasMagnet: false
};

let keys = {};
window.addEventListener("keydown", (e) => keys[e.key] = true);
window.addEventListener("keyup", (e) => keys[e.key] = false);

let enemies = [];
let bullets = [];
let coins = [];
let expGems = [];
let confettiParticles = [];
let gameTime = 0;
let shootTimer = 0;
let isPaused = false;
let gameRunning = false;

let playerLevel = 1;
let playerExp = 0;
let maxExp = 5;

let bossSpawned = false;
let boss = null;

// Control de tiempo (Delta Time)
let lastTime = 0;

function renderLoreCards() {
    let leftContainer = document.getElementById("leftLore");
    let rightContainer = document.getElementById("rightLore");
    
    leftContainer.innerHTML = "";
    rightContainer.innerHTML = "";

    let loreItems = [...characters, { 
        name: "Coming Soon", 
        lore: "Próximamente un nuevo héroe misterioso se unirá a la resistencia mapache. ¡Prepara tus monedas!", 
        cardImg: null 
    }];

    loreItems.forEach((item, index) => {
        let cardHTML = `
            <div class="lore-card" onclick="this.classList.toggle('flipped')">
                <div class="lore-card-inner">
                    <div class="lore-front">
                        ${item.cardImg ? `<img src="${item.cardImg}" alt="${item.name}">` : `<div style="font-size:2.5rem; margin: auto;">❓</div>`}
                        <h4>${item.name}</h4>
                    </div>
                    <div class="lore-back">
                        <p>${item.lore}</p>
                    </div>
                </div>
            </div>
        `;

        if (index < 3) {
            leftContainer.innerHTML += cardHTML;
        } else {
            rightContainer.innerHTML += cardHTML;
        }
    });
}

function updateSidePanel() {
    let container = document.getElementById("characterList");
    container.innerHTML = "";
    characters.forEach((char, index) => {
        let isUnlocked = gameData.unlockedChars[index];
        let isSelected = gameData.selectedChar === index;
        
        container.innerHTML += `
            <button class="char-btn ${isSelected ? 'active' : ''}" 
                onclick="${isUnlocked ? `selectChar(${index})` : `buyChar(${index})`}">
                ${isUnlocked ? (isSelected ? '✓ ' : '') : char.price + ' 🪙'} - ${char.name}
            </button>
        `;
    });

    document.getElementById("statGames").innerText = gameData.statsGames;
    document.getElementById("statKills").innerText = gameData.statsKills;
    document.getElementById("coinCount").innerText = gameData.coins;
}

window.selectChar = function(index) {
    gameData.selectedChar = index;
    saveGame();
    updateSidePanel();
};

window.buyChar = function(index) {
    let char = characters[index];
    if (gameData.coins >= char.price) {
        gameData.coins -= char.price;
        gameData.unlockedChars[index] = true;
        gameData.selectedChar = index;
        saveGame();
        updateSidePanel();
    } else {
        alert("¡Necesitas más monedas para desbloquear a este mapache!");
    }
};

window.buyUpgrade = function(type) {
    if (type === 'hp' && gameData.coins >= 50) {
        gameData.coins -= 50;
        gameData.maxHpBonus += 20;
        saveGame();
        updateSidePanel();
        alert("¡Salud aumentada!");
    } else if (type === 'damage' && gameData.coins >= 75) {
        gameData.coins -= 75;
        gameData.damageBonus += 1;
        saveGame();
        updateSidePanel();
        alert("¡Daño aumentado!");
    } else {
        alert("¡Monedas insuficientes!");
    }
};

window.startGame = function() {
    document.getElementById("startScreen").classList.add("hidden");
    document.getElementById("gameScreen").classList.remove("hidden");
    
    gameData.statsGames++;
    saveGame();
    
    player.maxHp = 100 + gameData.maxHpBonus;
    player.hp = player.maxHp;
    player.speed = 210;
    player.attackSpeedMultiplier = 1;
    player.extraProjectiles = 0;
    player.hasShield = false;
    player.hasMagnet = false;
    player.x = canvas.width / 2;
    player.y = canvas.height / 2;
    
    enemies = [];
    bullets = [];
    coins = [];
    expGems = [];
    confettiParticles = [];
    gameTime = 0;
    playerLevel = 1;
    playerExp = 0;
    maxExp = 5;
    bossSpawned = false;
    boss = null;
    
    gameRunning = true;
    updateSidePanel();
    updateHUDDisplay();
};

window.togglePause = function() {
    isPaused = !isPaused;
    document.getElementById("pauseBtn").innerText = isPaused ? "Play" : "Pausa";
};

// Generador de Enemigos normales
setInterval(() => {
    if (!gameRunning || isPaused || bossSpawned) return;
    enemies.push({
        x: Math.random() < 0.5 ? 0 : canvas.width,
        y: Math.random() * canvas.height,
        size: 14,
        speed: 95, // Pixeles por segundo
        hp: 2
    });
}, 1200);

// Contador de Tiempo y aparición del Jefe a los 3 minutos (180s)
setInterval(() => {
    if (!gameRunning || isPaused) return;
    gameTime++;
    document.getElementById("timeCount").innerText = gameTime + "s";

    if (gameTime === 180 && !bossSpawned) {
        bossSpawned = true;
        spawnBoss();
    }
}, 1000);

function spawnBoss() {
    boss = {
        x: canvas.width / 2,
        y: -50,
        size: 45,
        speed: 55, // Pixeles por segundo
        maxHp: 120,
        hp: 120
    };
    enemies.push(boss);
}

// Sistema de Ataques
function shootWeapon() {
    let baseDamage = 1 + gameData.damageBonus;
    let weaponType = characters[gameData.selectedChar].weapon;
    let totalProj = player.extraProjectiles;

    if (weaponType === "onda_expansiva") {
        let totalBullets = 8 + totalProj * 2;
        for (let i = 0; i < totalBullets; i++) {
            let angle = (i * Math.PI * 2) / totalBullets;
            bullets.push({
                x: player.x,
                y: player.y,
                dx: Math.cos(angle) * 320, // Pixeles por segundo
                dy: Math.sin(angle) * 320,
                size: 4,
                damage: baseDamage
            });
        }
        return;
    }

    if (enemies.length === 0) return;

    let closestEnemy = enemies[0];
    let minDistance = Math.hypot(player.x - closestEnemy.x, player.y - closestEnemy.y);

    for (let i = 1; i < enemies.length; i++) {
        let dist = Math.hypot(player.x - enemies[i].x, player.y - enemies[i].y);
        if (dist < minDistance) {
            minDistance = dist;
            closestEnemy = enemies[i];
        }
    }

    let angle = Math.atan2(closestEnemy.y - player.y, closestEnemy.x - player.x);
    let speedBullet = 360; // Pixeles por segundo

    if (weaponType === "lineal") {
        bullets.push({ x: player.x, y: player.y, dx: Math.cos(angle) * speedBullet, dy: Math.sin(angle) * speedBullet, size: 6 + totalProj, damage: baseDamage });
    } 
    else if (weaponType === "doble_pegado") {
        let perpAngle = angle + Math.PI / 2;
        let offset = 4;
        bullets.push({ x: player.x + Math.cos(perpAngle) * offset, y: player.y + Math.sin(perpAngle) * offset, dx: Math.cos(angle) * speedBullet, dy: Math.sin(angle) * speedBullet, size: 5, damage: baseDamage });
        bullets.push({ x: player.x - Math.cos(perpAngle) * offset, y: player.y - Math.sin(perpAngle) * offset, dx: Math.cos(angle) * speedBullet, dy: Math.sin(angle) * speedBullet, size: 5, damage: baseDamage });
    } 
    else if (weaponType === "lenta_grande") { 
        bullets.push({ x: player.x, y: player.y, dx: Math.cos(angle) * 210, dy: Math.sin(angle) * 210, size: 14 + (totalProj * 2), damage: baseDamage + 3 });
    }
    else if (weaponType === "doble_cuadruple") { 
        let perpAngle = angle + Math.PI / 2;
        let offset = 6;
        bullets.push({ x: player.x + Math.cos(perpAngle) * offset, y: player.y + Math.sin(perpAngle) * offset, dx: Math.cos(angle) * speedBullet, dy: Math.sin(angle) * speedBullet, size: 5, damage: baseDamage });
        bullets.push({ x: player.x - Math.cos(perpAngle) * offset, y: player.y - Math.sin(perpAngle) * offset, dx: Math.cos(angle) * speedBullet, dy: Math.sin(angle) * speedBullet, size: 5, damage: baseDamage });
        
        let backAngle = angle + Math.PI;
        bullets.push({ x: player.x + Math.cos(perpAngle) * offset, y: player.y + Math.sin(perpAngle) * offset, dx: Math.cos(backAngle) * speedBullet, dy: Math.sin(backAngle) * speedBullet, size: 5, damage: baseDamage });
        bullets.push({ x: player.x - Math.cos(perpAngle) * offset, y: player.y - Math.sin(perpAngle) * offset, dx: Math.cos(backAngle) * speedBullet, dy: Math.sin(backAngle) * speedBullet, size: 5, damage: baseDamage });
    }
}

function update(dt) {
    // Las partículas de confeti siempre se actualizan si existen
    confettiParticles.forEach((p, index) => {
        p.x += p.dx * dt;
        p.y += p.dy * dt;
        p.life--;
        if (p.life <= 0) confettiParticles.splice(index, 1);
    });

    if (!gameRunning || isPaused) return;

    if ((keys["ArrowUp"] || keys["w"] || keys["W"]) && player.y > player.size) player.y -= player.speed * dt;
    if ((keys["ArrowDown"] || keys["s"] || keys["S"]) && player.y < canvas.height - player.size) player.y += player.speed * dt;
    if ((keys["ArrowLeft"] || keys["a"] || keys["A"]) && player.x > player.size) player.x -= player.speed * dt;
    if ((keys["ArrowRight"] || keys["d"] || keys["D"]) && player.x < canvas.width - player.size) player.x += player.speed * dt;

    shootTimer += dt;
    let fireInterval = Math.max(0.15, 0.5 / player.attackSpeedMultiplier);
    if (shootTimer >= fireInterval) {
        shootTimer = 0;
        shootWeapon();
    }

    bullets.forEach((b, index) => {
        b.x += b.dx * dt;
        b.y += b.dy * dt;
        if (b.x < 0 || b.x > canvas.width || b.y < 0 || b.y > canvas.height) bullets.splice(index, 1);
    });

    enemies.forEach((e, eIndex) => {
        let angle = Math.atan2(player.y - e.y, player.x - e.x);
        e.x += Math.cos(angle) * e.speed * dt;
        e.y += Math.sin(angle) * e.speed * dt;

        if (Math.hypot(player.x - e.x, player.y - e.y) < player.size + e.size) {
            if (!player.hasShield) {
                player.hp -= (e === boss ? 1.5 : 0.5);
                document.getElementById("hpCount").innerText = Math.max(0, Math.floor(player.hp));
                if (player.hp <= 0) {
                    alert("¡Te han atrapado! Fin de la partida.");
                    gameRunning = false;
                    document.getElementById("startScreen").classList.remove("hidden");
                    document.getElementById("gameScreen").classList.add("hidden");
                    updateSidePanel();
                }
            }
        }

        bullets.forEach((b, bIndex) => {
            if (Math.hypot(b.x - e.x, b.y - e.y) < e.size + b.size) {
                e.hp -= b.damage;
                bullets.splice(bIndex, 1);
            }
        });

        if (e.hp <= 0) {
            gameData.statsKills++;
            
            if (boss && e === boss) {
                triggerConfettiExplosion(boss.x, boss.y);
                gameRunning = false;
                setTimeout(() => {
                    document.getElementById("victoryModal").classList.remove("hidden");
                }, 1500);
            } else {
                if (Math.random() < 0.6) {
                    coins.push({ x: e.x, y: e.y });
                } else {
                    expGems.push({ x: e.x, y: e.y });
                }
            }
            enemies.splice(eIndex, 1);
        }
    });

    let pullRadius = player.hasMagnet ? 180 : (player.size + 12);

    coins.forEach((c, cIndex) => {
        let dist = Math.hypot(player.x - c.x, player.y - c.y);
        if (player.hasMagnet && dist < pullRadius) {
            c.x += (player.x - c.x) * 4 * dt;
            c.y += (player.y - c.y) * 4 * dt;
        }
        if (dist < player.size + 10) {
            gameData.coins++;
            saveGame();
            document.getElementById("coinCount").innerText = gameData.coins;
            coins.splice(cIndex, 1);
        }
    });

    expGems.forEach((gem, gIndex) => {
        let dist = Math.hypot(player.x - gem.x, player.y - gem.y);
        if (player.hasMagnet && dist < pullRadius) {
            gem.x += (player.x - gem.x) * 4 * dt;
            gem.y += (player.y - gem.y) * 4 * dt;
        }
        if (dist < player.size + 10) {
            playerExp++;
            expGems.splice(gIndex, 1);
            
            if (playerExp >= maxExp) {
                triggerLevelUp();
            }
            updateHUDDisplay();
        }
    });
}

function triggerConfettiExplosion(x, y) {
    for (let i = 0; i < 180; i++) {
        confettiParticles.push({
            x: x,
            y: y,
            dx: (Math.random() - 0.5) * 350, // Pixeles por segundo
            dy: (Math.random() - 0.5) * 350,
            color: ['#ecc94b', '#9f7aea', '#4fd1c5', '#f56565', '#ed64a6', '#48bb78'][Math.floor(Math.random() * 6)],
            size: Math.random() * 7 + 3,
            life: 120
        });
    }
}

function triggerLevelUp() {
    isPaused = true;
    playerLevel++;
    playerExp = 0;
    maxExp = Math.floor(maxExp * 1.5);

    let modal = document.getElementById("levelUpModal");
    let choicesContainer = document.getElementById("levelUpChoices");
    choicesContainer.innerHTML = "";

    let possibleUpgrades = [
        { title: "⚡ Velocidad de Movimiento +", action: () => { player.speed += 45; } },
        { title: "🚀 Velocidad de Ataque +", action: () => { player.attackSpeedMultiplier += 0.3; } },
        { title: "🎯 Aumento de Proyectiles", action: () => { player.extraProjectiles += 1; } },
        { title: "🧲 Imán Temporal (Atracción)", action: () => { player.hasMagnet = true; setTimeout(() => { player.hasMagnet = false; }, 8000); } },
        { title: "🛡️ Escudo Temporal (Invulnerable)", action: () => { player.hasShield = true; setTimeout(() => { player.hasShield = false; }, 5000); } }
    ];

    possibleUpgrades.sort(() => Math.random() - 0.5);
    let selectedChoices = possibleUpgrades.slice(0, 2);

    selectedChoices.forEach(upgrade => {
        let btn = document.createElement("button");
        btn.className = "choice-btn";
        btn.innerText = upgrade.title;
        btn.onclick = () => {
            upgrade.action();
            modal.classList.add("hidden");
            isPaused = false;
            updateSidePanel();
            updateHUDDisplay();
        };
        choicesContainer.appendChild(btn);
    });

    modal.classList.remove("hidden");
}

function updateHUDDisplay() {
    document.getElementById("levelCount").innerText = playerLevel;
    document.getElementById("expCount").innerText = `${playerExp}/${maxExp}`;
    document.getElementById("coinCount").innerText = gameData.coins;
    document.getElementById("hpCount").innerText = Math.max(0, Math.floor(player.hp));
}

function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (bgImage.complete && bgImage.naturalHeight !== 0) {
        ctx.drawImage(bgImage, 0, 0, canvas.width, canvas.height);
    } else {
        ctx.fillStyle = "#0b0714";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
    }

    if (player.hasShield) {
        ctx.strokeStyle = "#4fd1c5";
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(player.x, player.y, player.size + 8, 0, Math.PI * 2);
        ctx.stroke();
    }

    let currentImg = charImages[gameData.selectedChar];
    if (currentImg.complete && currentImg.naturalHeight !== 0) {
        ctx.drawImage(currentImg, player.x - player.size, player.y - player.size, player.size * 2, player.size * 2);
    } else {
        ctx.fillStyle = "#b794f4";
        ctx.beginPath();
        ctx.arc(player.x, player.y, player.size, 0, Math.PI * 2);
        ctx.fill();
    }

    enemies.forEach(e => {
        if (e === boss) {
            ctx.fillStyle = "#d69e2e";
            ctx.beginPath();
            ctx.arc(e.x, e.y, e.size, 0, Math.PI * 2);
            ctx.fill();

            ctx.fillStyle = "#e53e3e";
            ctx.fillRect(e.x - 35, e.y - 60, 70, 7);
            ctx.fillStyle = "#48bb78";
            ctx.fillRect(e.x - 35, e.y - 60, (e.hp / e.maxHp) * 70, 7);
        } else {
            ctx.fillStyle = "#e53e3e";
            ctx.beginPath();
            ctx.arc(e.x, e.y, e.size, 0, Math.PI * 2);
            ctx.fill();
        }
    });

    ctx.fillStyle = "#d6bcfa";
    bullets.forEach(b => {
        ctx.beginPath();
        ctx.arc(b.x, b.y, b.size, 0, Math.PI * 2);
        ctx.fill();
    });

    ctx.fillStyle = "#ecc94b";
    coins.forEach(c => {
        ctx.beginPath();
        ctx.arc(c.x, c.y, 6, 0, Math.PI * 2);
        ctx.fill();
    });

    ctx.fillStyle = "#3182ce";
    expGems.exports = expGems.forEach(g => {
        ctx.beginPath();
        ctx.arc(g.x, g.y, 4, 0, Math.PI * 2);
        ctx.fill();
    });

    confettiParticles.forEach(p => {
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
    });
}

function loop(timestamp) {
    if (!lastTime) lastTime = timestamp;
    let dt = (timestamp - lastTime) / 1000; // Segundos transcurridos desde el último frame
    lastTime = timestamp;

    // Limitar dt máximo por si la pestaña se minimiza para evitar saltos gigantes
    if (dt > 0.1) dt = 0.1;

    update(dt);
    draw();
    requestAnimationFrame(loop);
}

renderLoreCards();
updateSidePanel();
requestAnimationFrame(loop);
