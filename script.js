// --- INITIAL SETUP & FAVICON ---
function createFavicon(color = '#00FFCC') {
    const favCanvas = document.createElement('canvas');
    favCanvas.width = 32; favCanvas.height = 32;
    const fctx = favCanvas.getContext('2d');
    fctx.fillStyle = color;
    fctx.beginPath(); fctx.roundRect(0, 0, 32, 32, 6); fctx.fill();
    fctx.fillStyle = '#000'; fctx.font = 'bold 18px Arial';
    fctx.textAlign = 'center'; fctx.textBaseline = 'middle';
    fctx.fillText('ZG', 16, 16);
    let link = document.querySelector("link[rel~='icon']");
    if (!link) {
        link = document.createElement('link');
        link.rel = 'icon';
        document.head.appendChild(link);
    }
    link.href = favCanvas.toDataURL();
}

// --- GLOBAL VARIABLES ---
let playerColor = '#00FFCC';
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const progressFill = document.getElementById('progress-fill');
const progressText = document.getElementById('progress-text') || document.getElementById('percentage-text'); 
const levelText = document.getElementById('level-indicator');
const menuLayer = document.getElementById('menu-layer');
const hardModeBtn = document.getElementById('hard-mode-btn');

const bgMusic = new Audio('music.mp3');
const warpSound = new Audio('https://assets.mixkit.co/active_storage/sfx/2571/2571-preview.mp3');
const explosionSound = new Audio('https://assets.mixkit.co/active_storage/sfx/1697/1697-preview.mp3');
bgMusic.loop = true;

let width, height, groundY;
let gameActive = false, gameWon = false, isTransitioning = false, musicStarted = false;
let currentLevel = 1, deaths = 0, isHardMode = false;

// UPDATED: Increased max levels to 10
const maxLevels = 10, levelLength = 10000;
let gameSpeed = 0, gameMode = 'cube', isGravityFlipped = false, distanceTraveled = 0;

// UPDATED: Extended level names array to accommodate 10 levels
const levelNames = [
    "Neon Plains", "Gravity Grove", "Wave Wasteland", "Inferno Vault", "Abyssal Core",
    "Electro Dynamic", "Matrix Madness", "Quantum Leap", "Sonic Wavefront", "Supernova Blast"
];

let obstacles = [], specialPortals = [], hazards = [], trail = [];
let shakeIntensity = 0, flashAlpha = 0;

// PHYSICS
const gravity = 1.1; 
const jumpForce = 18; 

const player = { x: 150, y: 0, w: 50, h: 50, dy: 0, jumped: false, rotation: 0, scale: 1 };
const portal = { x: -1000, y: 0, w: 80, h: 160, active: false };

// --- INPUT & RESIZE ---

window.setSkin = (color) => {
    playerColor = color;
    if (progressFill) progressFill.style.background = color;
};

if (hardModeBtn) {
    hardModeBtn.onclick = () => {
        isHardMode = !isHardMode;
        hardModeBtn.innerText = isHardMode ? "Hard Mode: ON" : "Hard Mode: OFF";
        hardModeBtn.style.color = isHardMode ? "#FF3366" : "white";
        hardModeBtn.style.borderColor = isHardMode ? "#FF3366" : playerColor;
    };
}

function resize() {
    width = window.innerWidth; height = window.innerHeight;
    canvas.width = width; canvas.height = height;
    groundY = height * 0.75;
    if (!gameActive) player.y = groundY - player.h;
}
window.addEventListener('resize', resize);
resize();

window.addEventListener('keydown', (e) => {
    if (e.code === 'Space') {
        if (gameWon) { location.reload(); return; }
        if (!gameActive && musicStarted && !isTransitioning) { resetLevel(); return; }
        if (!musicStarted) { bgMusic.play().catch(()=>{}); musicStarted = true; }
        
        if (!gameActive && !isTransitioning) {
            gameActive = true;
            if (menuLayer) menuLayer.style.display = 'none';
            gameSpeed = isHardMode ? 21 : 16;
            spawnObstacle();
        } else if (gameActive && !isTransitioning) {
            if (gameMode === 'cube' && !player.jumped) {
                player.dy = isGravityFlipped ? jumpForce : -jumpForce;
                player.jumped = true;
            } else if (gameMode === 'wave') {
                player.dy = isGravityFlipped ? 11 : -11;
            }
        }
    }
});

// --- CORE LOGIC ---

function resetLevel() {
    distanceTraveled = 0; obstacles = []; specialPortals = []; hazards = []; trail = [];
    isGravityFlipped = false; gameMode = 'cube';
    player.y = groundY - player.h; player.dy = 0; player.jumped = false; player.rotation = 0;
    portal.active = false; portal.x = -1000;
    gameActive = true; 
    gameSpeed = isHardMode ? (21 + (currentLevel * 1.5)) : (16 + (currentLevel * 1.5));
    bgMusic.currentTime = 0;
    bgMusic.play().catch(()=>{});
    spawnObstacle();
}

function spawnObstacle() {
    if (!gameActive || isTransitioning || distanceTraveled >= (levelLength - 2000)) return;
    
    // UPDATED: Drastically lowered skip chance so obstacles generate much more frequently
    let skipChance = isHardMode ? 0.15 : 0.25;
    
    if (Math.random() > skipChance) {
        if (Math.random() > 0.85 && currentLevel >= 2) {
            specialPortals.push({ x: width + 300, y: isGravityFlipped ? 0 : groundY - 180, w: 40, h: 120, type: Math.random() > 0.5 ? 'gravity' : 'wave' });
        } else {
            const type = Math.random() > 0.5 ? 'block' : 'spike';
            obstacles.push({ x: width + 300, y: type === 'block' ? (isGravityFlipped ? 0 : groundY - 110) : (isGravityFlipped ? 0 : groundY - 50), w: 50, h: type === 'block' ? 110 : 50, type: type });
        }
    }

    // UPDATED: Shortened delay time between spawns to make obstacles pack closer together
    let spawnRate = isHardMode ? 500 : 750; 
    setTimeout(spawnObstacle, spawnRate + Math.random() * 600);
}

function update() {
    if (shakeIntensity > 0) shakeIntensity *= 0.9;
    if (flashAlpha > 0) flashAlpha -= 0.05;

    if (isTransitioning) {
        player.scale *= 0.92; player.rotation += 25;
        player.x += (portal.x + 40 - player.x) * 0.15;
        player.y += (portal.y + 80 - player.y) * 0.15;
        portal.x -= gameSpeed;
        return;
    }

    if (!gameActive) return;

    distanceTraveled += gameSpeed;
    
    let percentage = Math.min(Math.floor((distanceTraveled / levelLength) * 100), 100);
    if (progressFill) progressFill.style.width = percentage + "%";
    if (progressText) progressText.innerText = percentage + "%";
    
    trail.push({ x: player.x, y: player.y, rotation: player.rotation });
    if (trail.length > 8) trail.shift();

    player.dy += isGravityFlipped ? -gravity : gravity;
    player.y += player.dy;

    if (player.y + player.h >= groundY) { 
        player.y = groundY - player.h; player.dy = 0; player.jumped = false; player.rotation = 0; 
    } else if (player.y <= 0) { 
        player.y = 0; player.dy = 0; player.jumped = false; player.rotation = 0;
    } else { 
        player.rotation += (gameSpeed * 0.7); 
    }

    hazards.forEach(h => h.x -= gameSpeed);
    
    obstacles.forEach(obs => {
        obs.x -= gameSpeed;
        let padding = obs.type === 'spike' ? 10 : 4; 
        if (player.x + padding < obs.x + obs.w - padding && player.x + player.w - padding > obs.x + padding && 
            player.y + padding < obs.y + obs.h - padding && player.y + player.h - padding > obs.y + padding) {
            
            let onTop = (!isGravityFlipped && player.dy >= 0 && player.y + player.h < obs.y + 35);
            let onBottom = (isGravityFlipped && player.dy <= 0 && player.y > obs.y + obs.h - 35);
            
            if (obs.type === 'block' && (onTop || onBottom)) {
                player.y = isGravityFlipped ? obs.y + obs.h : obs.y - player.h;
                player.dy = 0; player.jumped = false; player.rotation = 0;
            } else { die(); }
        }
    });

    specialPortals.forEach((p, i) => {
        p.x -= gameSpeed;
        if (player.x < p.x + p.w && player.x + player.w > p.x && player.y < p.y + p.h && player.y + player.h > p.y) {
            if (p.type === 'gravity') isGravityFlipped = !isGravityFlipped;
            else gameMode = (gameMode === 'cube' ? 'wave' : 'cube');
            specialPortals.splice(i, 1); flashAlpha = 0.5; warpSound.play();
        }
    });

    if (distanceTraveled >= levelLength && !portal.active) {
        portal.active = true; portal.x = width + 500; portal.y = isGravityFlipped ? 0 : groundY - 160;
    }
    if (portal.active) {
        portal.x -= gameSpeed;
        if (player.x < portal.x + 80 && player.x + 50 > portal.x && player.y < portal.y + 160 && player.y + 50 > portal.y) winLevel();
    }
}

function die() { gameActive = false; deaths++; bgMusic.pause(); bgMusic.currentTime = 0; explosionSound.play(); shakeIntensity = 15; }

function winLevel() {
    if (isTransitioning) return;
    warpSound.play(); flashAlpha = 1.0; gameActive = false; isTransitioning = true;
    setTimeout(() => {
        if (currentLevel >= maxLevels) { gameWon = true; isTransitioning = false; }
        else {
            currentLevel++; distanceTraveled = 0; obstacles = []; hazards = []; specialPortals = [];
            isGravityFlipped = false; gameMode = 'cube'; player.scale = 1; player.x = 150;
            portal.active = false; portal.x = -1000;
            levelText.innerText = `Level ${currentLevel}: ${levelNames[currentLevel-1]}`;
            gameSpeed = isHardMode ? (21 + (currentLevel * 1.5)) : (16 + (currentLevel * 1.5));
            isTransitioning = false; gameActive = true; spawnObstacle();
        }
    }, 1500);
}

function draw() {
    if (gameWon) {
        ctx.fillStyle = "#000"; ctx.fillRect(0, 0, width, height);
        ctx.fillStyle = "gold"; ctx.textAlign = "center"; ctx.font = "bold 60px Arial";
        ctx.fillText("GRAND CHAMPION", width/2, height/2 - 20);
        ctx.fillStyle = "white"; ctx.font = "24px Arial";
        ctx.fillText(`Total Deaths: ${deaths}`, width/2, height/2 + 40);
        ctx.fillText("Press Space to Restart", width/2, height/2 + 80);
        return;
    }
    ctx.save();
    if (shakeIntensity > 0.5) ctx.translate((Math.random()-0.5)*shakeIntensity, (Math.random()-0.5)*shakeIntensity);
    ctx.fillStyle = `hsl(${(currentLevel * 36)}, 30%, 10%)`; // Dynamic level styling
    ctx.fillRect(0, 0, width, height);
    ctx.fillStyle = "#000"; ctx.fillRect(0, groundY, width, height - groundY);
    ctx.strokeStyle = playerColor; ctx.lineWidth = 3; ctx.strokeRect(0, groundY, width, 2);

    trail.forEach((t, i) => {
        ctx.save(); ctx.globalAlpha = i/10; ctx.translate(t.x+25, t.y+25); ctx.rotate(t.rotation*Math.PI/180);
        ctx.fillStyle = playerColor; ctx.fillRect(-25, -25, 50, 50); ctx.restore();
    });

    obstacles.forEach(obs => {
        ctx.fillStyle = obs.type === 'spike' ? "#FF3366" : "#FFCC00";
        if (obs.type === 'spike') {
            ctx.beginPath(); ctx.moveTo(obs.x, obs.y + (isGravityFlipped?0:obs.h));
            ctx.lineTo(obs.x+25, obs.y + (isGravityFlipped?obs.h:0));
            ctx.lineTo(obs.x+50, obs.y + (isGravityFlipped?0:obs.h)); ctx.fill();
        } else ctx.fillRect(obs.x, obs.y, obs.w, obs.h);
    });

    if (portal.active) {
        ctx.fillStyle = "cyan"; ctx.beginPath(); ctx.ellipse(portal.x+40, portal.y+80, 40, 80, 0, 0, Math.PI*2); ctx.fill();
    }
    specialPortals.forEach(p => { ctx.fillStyle = p.type === 'gravity' ? "#0066FF" : "#FF00FF"; ctx.fillRect(p.x, p.y, p.w, p.h); });

    ctx.save(); ctx.translate(player.x+25, player.y+25); ctx.scale(player.scale, player.scale);
    ctx.rotate(player.rotation*Math.PI/180); ctx.fillStyle = playerColor; ctx.fillRect(-25,-25,50,50);
    ctx.strokeStyle = "white"; ctx.strokeRect(-25,-25,50,50); ctx.restore();

    if (!gameActive && musicStarted && !isTransitioning) {
        ctx.fillStyle = "rgba(0,0,0,0.8)"; ctx.fillRect(0,0,width,height);
        ctx.fillStyle = "white"; ctx.textAlign = "center"; ctx.font = "30px Arial";
        ctx.fillText(`CRASHED! Deaths: ${deaths}`, width/2, height/2);
        ctx.font = "20px Arial"; ctx.fillText("Press Space to Retry!", width/2, height/2 + 40);
    }
    if (flashAlpha > 0) { ctx.fillStyle = `rgba(255,255,255,${flashAlpha})`; ctx.fillRect(0,0,width,height); }
    ctx.restore();
}

let lastTime = 0;
function gameLoop(timestamp) {
    const deltaTime = timestamp - lastTime;
    if (deltaTime >= (1000/60)) {
        update(); draw(); lastTime = timestamp - (deltaTime % (1000/60));
    }
    requestAnimationFrame(gameLoop);
}

document.title = 'Dash';
const DASH_LOGO = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAIAAAACACAIAAABMXPacAAASy0lEQVR42u2ae3RXV5XHv/uc8/vlZQjhWQhkgGlogPAKrU0BKU4pqEPbcayCCNhqWRVbM1OX9QG2dUpxagWkVdqyfEBEGCsMndauapW4WmQEtVBKAgkPSQmvBJGGkJD87j3n7Pnj/H43byCdWTPOWuezgHX53dd57L3Pd+9zAY/H4/F4PB6Px+PxeDwej8fj8Xg8Ho/H4/F4PB6Px+PxeDwej8fj8Xg8Ho/H4/F4PB6Px+PxeDwej8fj8Xg8Ho/nrxn6n32ckPI9PJGZrbXv4XVSSiJiZmNML/pMJIQg6l1LrbXWWiKSUnY6ZYxh5h7HRAghRK9u+b8whO46dsXr0X4Er3E0e/uW/xceQG4wABKws2bNisVizBYgZ5vu38jWu76xubm5pqamtrY2GsermgYBJIS19oEHHhg1ctQf/vD7F372MyHI2ivdKIRwfpaXN3TGjFvHjRsXj8fd64jIvZUZRCCAU+0lIm10RkZGZWXlD3/4wzGFhf/4sY+FYSiEAMEaI6Xatm3b0aNHBZHt2HL3xptvvnn27NlhGLoOGmPi8firr766b9++rp5x7YMuIBREmzW5o1WrVnHvudR4aefOnfPmzbtGc1ZKAVj6uaXu9ncvXMjN7UtEV7jRdTU7O3v16tUXLlx4D42cOXMmgIe/9KWup2688UYAUshu21m2sazrLbNnz3YhtFc+LyAUSHb+vd8oFH1cTP+6iGWkp6cfOFChtQ6CQHci7HgQtp2JmvXCCy9kZ2dfeQ5co4uLi1tbW8MwvNx8mZkXLvxU1OGeRj8/P3/fvn3uRWEYBkEQJIIgcEcpEkHQ8b+XL7cwc2Qc69evD8Ow5XJLkAgSrYkwDGtra3tqs/vlP3ftCsOwpaUlCIJEIhGGYV1dff9+/QDQ1TyAQBJCgTpep9Jp6CS66bP00R/EHnybHmvGv7L6Dqff+giAD942yzJrrY2x1lob/esOrLXuhPvFGGuMMUZrHSQCZi4v/016enpPi6RbP/v06VNdXc3MWusw1Gzt66+/TqmB7uGWnAMHDjBzIpEw2rQ1LMJ0ObA2DENmXrduHYBYLEaEXbt2MbMOdXT29ddfB9C1ue6Hvn371tfXM7PRmq111rZ79253Qbdm1oOlp2VT/s1UUio+/gKVHqPHLX2b8RTTk4yVjMcDWhHQ8ouy3ygAG8t+zMytLa1a67Aj7f+vtTbGWGvZsut2ojXBzKtWrerWPSll45t/spmZwyA0xrjR1FpPmjSp27vcL9///g+YOdGaiOZed8F09NREIsHMe/fuTUtLk1ISkJube/bsWWY22jg3YubvPvNMt84nhQAwZcqUNrMzNgwCZn6m3S2qw1oKgC2YwRYA4hl03XjkTxX5M+ygycgdwXEwAAMYjcsGzEwASYJgHaDP+8ScVdg6/+GHH559++1Dhlx3jQJUSulWPRVTxpjS0tINP/rRwUOHomUz2SWltNafu//+BZ9aoEMtlWRmEmS0UTG1cOHC/fv3dzIqIYQxZtKkyffee6+7DAAE2PJV46+UsvFi48KFCxOJRCwWM8YMz88fNGgQM4PalMLefXu7jx5CwNqioiIi0mEokzNEAN588822aNKmT9wT07Jp8DjkT0P+rZT3fu43mGMwADSgAQsIQAExBahILjAAziABU/BRyhr653PvlJaWlv7TF4JEoKRywsdaCwaDAQgS1to+OX2Ki4ullNZYEuS80lobi8XmzZ//6KOPtp8AKaXWekpx8dq1TxtjhCAwBBGIhBRgzJ8//4knVlxsuNhedxEJwC5Zcp+UIgxCJRQAWBZCnDp1qqGhQbjo2ikUMLTR8Xj8kUceraqqUlK6BxbecIObUSEEW3arbnV1tZv1TnPvRMGECRMRaSpAKmmtPXDgQHJAAAU3ihn96PqpGDqNBr6fB45EWhas5eAS154TNmQYMJPV4JDYsDVgA2a2hqxlNhy2wFoIYRvq0FQHYNu2rdu2bb2qB5SUlJSVlRUUFFhrXQR3wzd92jQANpVeCSJmzsrK+vGPN6WlpxljiERq4plA2ui8vLy5fz/3J5s3Kym11inNp5VSt946E4CQAgRjjFLqV7/61d13393c3NRV8TqjUlIKKRKJQAihjXHhYvLkya5VggQIJOjcuXPVVcnVqNNznO6cOHFCpALYspDi9OnTR48ejdS2Sk6PSeB0BZ/Yz+G3EbbAJFLTxpG27lZjO2EvABsdEwYOHpQ3bDizFUIm51mpw0eOXGpsjCIPEQmiPXv2LFq0aNeuXW0ajkFEw/Pz09PSWhMJNx9CSq31+ufXjx03NnJnZqaOprto8eKfbN4cOY27d+jQvJEjR7QlGZYBVFZWNjU1paWl6TAEKBVSkvkAAaHW0Mm2AmBrAYwdMzblVWDLEHjnnXcMc79+/aLshYgAJhLGmKysrDFjxkQOZtkKiIMHK5ubmztF117lXAJCQcYg4xCqLTMCoNJVZi6Axx9f4aRCe+U7ZUpx+0WSAAIpKQHs2fP7pLQw1uXotbW1WVlZrj9J1b90qVv3ktrJWmOMW7o5pV4SrYmionGRxbl3TZs2za00SfVlrTU2CIJjx44dPnykW6qrD7/xxhvLly/vm5MTPU0pdejQIWbWRqf0m2253FJXV1dXX1ffnnP19fX1dXV158+fby+ugiBg5hUrVvSgmIlSI9nlTzTuosttGf0xYipKviA/ujHtnw+rCYsA/Gzrv0eD5YTXmTNncnJyugZKKQURvfzyy07VWGuN1sxcWVkppAQQUxLAxIkTm5ubnWriVI+Y2ekZd+BU7JNPPhl1z03ArNtuS82uiabqGpOvt99+e1heXpRGNDc3u7pTSkqZqz7BWrbGWGusScrWu+66q70hqvaKpHt7B8MaICWNiKjfKAwrFsNKeMgUGjDWZA+EgjEQFrbhJAHXFxQk/Y6SLn/8+PGLFy86D+9Y4WJmzu2bm3whYJgFcObMGWuMUtIysrKyNm/enJmZqbUWQrh0n5mXLVv29a8/kp39PmstgaSSAObNm7dixYrLl5ujpfjU6dNhECqlQKkoSmBrk2UDdh1NXkxuGAgAtNYTJkxY+/TTd999N4CCgoLMzEyjjRCUWreJXfUj9TelJNuOU0GSAFZKJRKJgwcr25dbVPeDzuyW2eSgyxgNGM1DbxL505B3Ew8YjewM4/SoBbRFGIKUSVy25w4OHtB3xN/kt8VKZgAHKw9GSqa9TmDm3Nzc0TeMdistiJzhvLX/LQBSqkQisXbt2nHjxulQO6sxxsRisZUrVz711FNz594xffo0Y6xSkkBamxEjRsyZM2f79u1KSa01ER07dqyioqJ4SnEQJCUZETGRALFbcCiafW7vobFYzFr7kY98ZNTIkcdrasYXFaXiuGpTjik7A4n29SO0e6S7hBkE1NTUnDhRe4UJ4HaDrmhQIfJvEfnT7aBi9C9ARhoD7JKApgRYQzglSgRiyWg8gdY/j5pUkts3x1qb7BgRgIrKim6FttZ6xowZgwYNMloLIZlZkCCinW+8QUSJRGLhwoX33XdfcvQJRptYLLZjR/k3vvENIUTZxo0f+MB0QQQQs9MBuOeee7Zv3+6WOCGE1vorX/3KL3/5S1d6a3N3gkhl+GwZBCLhCs7t7SMjI2PkqFHHa2rGT5iQ7E5Uq3NP4I5VzVQJ0gnNpEIFjLVCioqKijAMpZRR/bxtAkjGOHMgDR5Dw6cibxrnTaFBAzgOa8AaMCnfigFxBVJAWqSN2IAyIJvrLDC6cKzTalIpQrKThw4d6lTmlClx/eUvf9kpEBCstUKKU6dO/fa3u5h5TOGYdeuetcYmS4/WCinOnz//2c9+xnnSiy+++OS3vjVgQH+nzd0zb591+6hRo44fPx5p9h07dsyZM2fZsq8VF0+J6jaU8jZnq+7ACXyidhJQwOUoKQlEkVYlIsvM1goSKQ0EWDdQllPulHwROErB2i+EyTyAMgfQyGncv5D6j6S0fpx4F0dfsVWtZDVbCxIQIuUfzkUsANgQEAAhbIFKo9O7ARQWFraFeGYhREtLS03N8ag1RGALZwLPPPPM1KlTtU6GF2uslLKsrKyxsTEjI2PTpk19+mS3nbU2FostWbKktrZWKcXMF9698ItfvLpo0SK2TJLYsjY6PSP9kws+ufKJlVFiEY/FysvLy8vL8/OH5+T0dYs/c5QXQgihlAqCYPny5Z/4xCe01lJIEIQUzHz2zNn09PTrC66PvMdYq5R69tln161b55Jky5aSoYbj8XgiCD4050Nr1qw22iQlmRAA9u/f3329nSi5tPx39hPcuv7zn/88KYGsdUrUJX6d7ioqKtq6datLYZykM8YYY+rr64cPywOw7nvrooKPZRsGITOvWfOd9iKHiGbNmpVUJsbaVLWrqqoqFov1ds8LwMYNG9vpMcPMZ8+ejcfjEydOdMrHvci95a677rzCox559FFmDoIg0tZNTU3Dhw9Hx6KhSk2qZQAk2haQ7jZP0P4aa2B1NJWUOdAkGmNkCpISiMAgQWAMuW5IeflvpBTR/kxOTs748eOVUsYYFzeYk6vr17627OSp0ws+ueDzD3w+sn1Xxtm7d+9Xv/qVKIA6Jbpz586jR48VFFxvtJFKChLGmMLCwpkfnLnj1zuWLFkyY8YMJ8CFEFIIdvskzGB2oszNk9Zm4MABc+fOZWYnqKy1JOitt94KgmDypElEpLV2p6SQYRgePXbMbTd2SqmEENaaD0yfnhyHlBT805/+dPr0aTfavdstTBWlu5Qn+wzD6A/T3/2LXPyb+OerofoMGzL40qUmZ5JsLVvLPWvuMAxdcuTqlMy8adMmADeMvqGhoaF9pVOH+tKlS+PGjetkPlIqAN/85jcjs7U2mRBs2bIFwB133NHbjZdOtejFixcDWL16tTPnZNeYT9S8E6WKXavQGRkZNTXvJP079SjXu2vbhCGC6HYnII2uG083fob+Yb1c+qZY1oiVjCeZnuK0Bw8DuHXGjLZUJeqMMckCdNBWiHa/u1F2HXvppZczMzLS09J+97vdUR7Hll3wufeee7smkG4yxo8f7x5otIn8vaGhYciQIQB+/esdYRi63ZsgCMIguQHjDsLUJkyyVal9CxdkDh8+7Eb5tddei+KqG83y8vKkdO5u82fMmLFuo8I9zXXwoYce6toF1VOZGJz6ziA9hwYV0rASHnoLDZ7MA69HhmCC0YAGacOtCWSk4XwlgDFji5JrqZLglE6OtsK5Lby5hciFHSFFWVnZ0qVLW1pa1qxZc8stJa7aDIbWWsXU5s2bN2zcoJQyHWteTudVVlb+8Q9/LLmlxLJ12y/GmJycnDvvvHP9+vXPP//crFm3EZEgwS494nYhNgq0DCJyy7Jx5TagtLS0ubk5MzMzGVc7VpPcVyC2Y5NcRJo4cYJLRJRSbFn0vAKrbmw/lkW5wzF0IuWXYOhN6FeEPn2YwACHgAZaTDL9sJYFkYixJHvuAIDCsWPd1gYzO9XDaNuXj/bcBQkXTIUQJ0+efOyxxzZs2ADgwx/6cGlpaSKRECSssa4mfOTI0S88+KAbVu4hmfi3n/705pKbQx0qpWBgjGbm+fPmr1+//pVXXnn77QNFReOCIEhuIUT5KadyXyIniYQQUgpXtV76uaWvvfYaEeUNHTp48GCttQun1hpjxP79b/VUoAQwvmi829WxlgEWQjQ2NrYvgvY0AUSDx+JvZ4rrJouBo3Q8m2QGXzrJDYZICZVOKsYyDpXJSjEpkjEGWEkVgz1XBWDq1KlKqZ72ZjtUa4PwQMWBLVu2lJWV/eUvf5FSFhYWbn9xu5QyipJuvD796cXvNjRIKbstH7ofX3rpP55+em16enqyVzEFYOYHZ5aUlOzZs+f555977rnnrnEH3Fq7e/fvHnvssfLy8rR4PBEEU6bcmJmZ2Wmrvaq6urv6TbI9t98+q9M41J09e+bMGSLijr3onAlz/SGqO2gA05ZVAAQWcZYxCAkZg0iHikHFOZYFlQ4SnPY+PvVHQfS97z7dv39/o7UQbbkJW7bWstMt1oZheO7cucOHDx89coRTSX8YhlmZWQ998YvNTU1KKWcnUqmTtbV79uxx5t/TeAE4ceLEggUL8vLyWltbhRDO10iIpqYmAFu2bG5NJKIaQadlM+UGTERNTU1VVVUVFRXOO0OtXRp///33B0HgppABtrbq4KHo7V2j4o82bHjp5Ze01lIqY4ySqrq6yp3iaxL3JJJ/evPhUO9lN6RSV1Xr1/LxzHuQ/Ffdj/zf+aqQencZdb0rlZpbC7BLjq5lKzjiyp/wXftnh92+2imia/8gLlKiV/22UBuDnj8g69qY3n4/6fF4PB6Px+PxeDwej8fj8Xg8Ho/H4/F4PB6Px+PxeDwej8fj8Xg8Ho/H4/F4PB6Px+PxeDwej8fj8Xg8Ho/H4/H8dfBf1VzQz/1cwwUAAAAASUVORK5CYII=';
(function () {
    document.querySelectorAll("link[rel~='icon']").forEach(l => l.remove());
    const link = document.createElement('link');
    link.rel = 'icon'; link.type = 'image/png'; link.href = DASH_LOGO;
    document.head.appendChild(link);
})();
requestAnimationFrame(gameLoop);