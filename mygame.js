const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

canvas.width = 600;
canvas.height = 800;

let score = 0;
let gameActive = true;
let lastTime = 0;
let ruleTimer = 0;
let ruleDuration = 0;
let activeRule = null;
let displayedRule = null;
let shakeTime = 0;

const ruleElement = document.getElementById('rule');
const scoreElement = document.getElementById('score');
const bodyElement = document.body;

function updateRule() {
    const actions = ['catch', 'avoid'];
    
    let categories = ['color'];
    if (score >= 50) {
        categories = ['color', 'shape'];
    }

    let colors = ['red', 'blue'];
    if (score >= 50) {
        colors = ['red', 'blue', 'yellow', 'green'];
    }
    if (score >= 150) {
        colors = ['red', 'blue', 'yellow', 'green', 'purple', 'orange'];
    }
    
    let types = ['circle'];
    if (score >= 50) {
        types = ['circle', 'square', 'triangle'];
    }
    if (score >= 150) {
        types = ['circle', 'square', 'triangle', 'diamond', 'pentagon'];
    }

    const action = actions[Math.floor(Math.random() * actions.length)];
    const category = categories[Math.floor(Math.random() * categories.length)];
    
    let target;
    if (category === 'color') {
        target = colors[Math.floor(Math.random() * colors.length)];
    } else {
        target = types[Math.floor(Math.random() * types.length)];
    }

    const nextRule = { type: action, target: target, category: category };
    
    let isSimonSays = true; 
    
    if (score >= 100) {
        isSimonSays = Math.random() > 0.4;
    }
    
    if (isSimonSays) {
        activeRule = nextRule;
    } else {
        activeRule = {
            type: action === 'catch' ? 'avoid' : 'catch',
            target: target,
            category: category
        };
    }
    
    displayedRule = nextRule;
    
    const minSeconds = 5;
    const maxSeconds = 12;
    ruleDuration = Math.random() * (maxSeconds - minSeconds) + minSeconds;
    ruleTimer = ruleDuration;
    
    let prefix = "";
    if (score >= 100) {
        prefix = isSimonSays ? "SIMON SAYS " : "";
    } else {
        prefix = "SIMON SAYS ";
    }
    
    if (action === 'catch') {
        ruleElement.dataset.baseText = `${prefix}CATCH ONLY ${target.toUpperCase()}S!`;
    } else {
        ruleElement.dataset.baseText = `${prefix}AVOID ${target.toUpperCase()}S!`;
    }
    
    ruleElement.style.color = category === 'color' ? target : 'white';

    let bgColor = '#222';
    if (category === 'color') {
        const colorMap = {
            'red': '#300',
            'blue': '#003',
            'yellow': '#330',
            'green': '#030',
            'purple': '#303',
            'orange': '#310'
        };
        bgColor = colorMap[target] || '#222';
    }
    bodyElement.style.backgroundColor = bgColor;
    shakeTime = 0.3;
    
    if (gameActive) playSound('newrule');
}

function checkCollision(player, shape) {
    return (
        player.x < shape.x + shape.size &&
        player.x + player.width > shape.x &&
        player.y < shape.y + shape.size &&
        player.y + player.height > shape.y
    );
}

function handleCollision(shape) {
    if (shape.type === 'star') {
        player.isShielded = true;
        player.shieldTimer = 5;
        playSound('catch');
        spawnParticles(shape.x + shape.size/2, shape.y + shape.size/2, 'gold');
        return;
    }

    let isCorrect = false;
    let isMatch = false;
    
    if (activeRule.category === 'color') {
        if (shape.color === activeRule.target) {
            isMatch = true;
        }
    } else if (activeRule.category === 'shape') {
        if (shape.type === activeRule.target) {
            isMatch = true;
        }
    }

    if (activeRule.type === 'catch') {
        if (isMatch) {
            isCorrect = true;
        } else {
            isCorrect = false;
        }
    } else { 
        if (isMatch) {
            isCorrect = false; 
        } else {
            isCorrect = true; 
        }
    }

    if (isCorrect) {
        score += 10;
        scoreElement.textContent = `Score: ${score}`;
        spawnParticles(shape.x + shape.size / 2, shape.y + shape.size / 2, shape.color);
        playSound('catch');
        shakeTime = 0.2;
    } else {
        if (player.isShielded) {
            player.isShielded = false;
            spawnParticles(shape.x + shape.size/2, shape.y + shape.size/2, 'white');
            playSound('gameover');
            return;
        }
        
        playSound('gameover');
        gameOver();
    }
}

const player = {
    x: canvas.width / 2,
    y: canvas.height - 50,
    width: 60,
    height: 20,
    color: '#00ff00',
    speed: 5,
    trail: [],
    isShielded: false,
    shieldTimer: 0,
    inverted: false,
    glitchTimer: 0,
    glitchWarning: false,
    glitchWarningTimer: 0,
    lastMouseX: 0
};

function updatePlayerTrail(deltaTime) {
    player.trail.push({
        x: player.x, 
        y: player.y, 
        alpha: 0.5,
        color: player.isShielded ? 'gold' : '#00ff00'
    });
    
    if (player.trail.length > 10) {
        player.trail.shift();
    }
    
    if (player.isShielded) {
        player.shieldTimer -= deltaTime;
        if (player.shieldTimer <= 0) {
            player.isShielded = false;
        }
    }
    
    for (const t of player.trail) {
        t.alpha -= deltaTime * 2;
    }
    player.trail = player.trail.filter(t => t.alpha > 0);
}

function drawPlayer() {
    for (const t of player.trail) {
        const color = t.color || 'rgba(0, 255, 0, 1)'; 
        
        ctx.globalAlpha = t.alpha;
        ctx.fillStyle = color;
        ctx.fillRect(t.x, t.y, player.width, player.height);
        ctx.globalAlpha = 1.0;
    }
    
    let drawColor = player.color;
    
    if (player.inverted) {
        drawColor = '#ff00ff';
    } else if (player.glitchWarning) {
        drawColor = Math.floor(Date.now() / 200) % 2 === 0 ? '#ff00ff' : '#00ff00';
    }
    
    if (player.isShielded) drawColor = 'gold';
    
    ctx.fillStyle = drawColor;
    ctx.fillRect(player.x, player.y, player.width, player.height);
    
    if (player.isShielded) {
        ctx.strokeStyle = `rgba(255, 215, 0, ${Math.abs(Math.sin(Date.now() / 100))})`;
        ctx.lineWidth = 3;
        ctx.strokeRect(player.x - 5, player.y - 5, player.width + 10, player.height + 10);
    }
    
    ctx.font = '14px Arial';
    ctx.textAlign = 'center';
    
    if (player.glitchWarning) {
        ctx.fillStyle = '#ff00ff';
        const timeLeft = Math.ceil(player.glitchWarningTimer);
        ctx.fillText(`⚠ GLITCH IN ${timeLeft}... ⚠`, player.x + player.width/2, player.y - 15);
    } else if (player.inverted) {
        ctx.fillStyle = '#ff00ff';
        ctx.fillText('⚠ CONTROLS INVERTED ⚠', player.x + player.width/2, player.y - 15);
    }
}

const shapes = [];
const spawnRate = 1.0;
let spawnTimer = 0;

function spawnShape() {
    const size = 30;
    
    if (Math.random() < 0.05) {
        shapes.push({
            x: Math.random() * (canvas.width - size),
            y: -size,
            size: size,
            type: 'star',
            color: 'gold',
            speed: 150
        });
        return;
    }
    
    let availableTypes = ['circle'];
    let availableColors = ['red', 'blue'];
    
    if (score >= 50) {
        availableTypes = ['circle', 'square', 'triangle'];
        availableColors = ['red', 'blue', 'yellow', 'green'];
    }
    
    if (score >= 150) {
        availableTypes = ['circle', 'square', 'triangle', 'diamond', 'pentagon'];
        availableColors = ['red', 'blue', 'yellow', 'green', 'purple', 'orange'];
    }
    
    shapes.push({
        x: Math.random() * (canvas.width - size),
        y: -size,
        size: size,
        type: availableTypes[Math.floor(Math.random() * availableTypes.length)],
        color: availableColors[Math.floor(Math.random() * availableColors.length)],
        speed: (100 + Math.random() * 100)
    });
}

const particles = [];

function spawnParticles(x, y, color) {
    for (let i = 0; i < 10; i++) {
        particles.push({
            x: x,
            y: y,
            vx: (Math.random() - 0.5) * 400,
            vy: (Math.random() - 0.5) * 400,
            life: 0.5,
            color: color
        });
    }
}

function updateParticles(deltaTime) {
    for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.x += p.vx * deltaTime;
        p.y += p.vy * deltaTime;
        p.life -= deltaTime;

        if (p.life <= 0) {
            particles.splice(i, 1);
        }
    }
}

function drawParticles() {
    for (const p of particles) {
        ctx.fillStyle = p.color;
        ctx.fillRect(p.x, p.y, 4, 4);
    }
}

function updateShapes(deltaTime) {
    updateParticles(deltaTime);

    for (let i = shapes.length - 1; i >= 0; i--) {
        const s = shapes[i];
        s.y += s.speed * deltaTime;

        if (checkCollision(player, s)) {
            handleCollision(s);
            shapes.splice(i, 1);
            continue;
        }

        if (s.y > canvas.height) {
            shapes.splice(i, 1);
        }
    }
}

function drawShapes() {
    for (const s of shapes) {
        ctx.fillStyle = s.color;
        ctx.beginPath();
        if (s.type === 'square') {
            ctx.fillRect(s.x, s.y, s.size, s.size);
        } else if (s.type === 'circle') {
            ctx.arc(s.x + s.size/2, s.y + s.size/2, s.size/2, 0, Math.PI * 2);
            ctx.fill();
        } else if (s.type === 'triangle') {
            ctx.moveTo(s.x, s.y + s.size);
            ctx.lineTo(s.x + s.size / 2, s.y);
            ctx.lineTo(s.x + s.size, s.y + s.size);
            ctx.fill();
        } else if (s.type === 'diamond') {
            ctx.moveTo(s.x + s.size/2, s.y);
            ctx.lineTo(s.x + s.size, s.y + s.size/2);
            ctx.lineTo(s.x + s.size/2, s.y + s.size);
            ctx.lineTo(s.x, s.y + s.size/2);
            ctx.fill();
        } else if (s.type === 'pentagon') {
            const cx = s.x + s.size/2;
            const cy = s.y + s.size/2;
            const r = s.size/2;
            for (let i = 0; i < 5; i++) {
                const angle = (Math.PI * 2 * i / 5) - Math.PI/2;
                const x = cx + r * Math.cos(angle);
                const y = cy + r * Math.sin(angle);
                if (i === 0) ctx.moveTo(x, y);
                else ctx.lineTo(x, y);
            }
            ctx.fill();
        } else if (s.type === 'star') {
            const cx = s.x + s.size/2;
            const cy = s.y + s.size/2;
            const spikes = 5;
            const outerRadius = s.size/2;
            const innerRadius = s.size/4;
            let rot = Math.PI / 2 * 3;
            let x = cx;
            let y = cy;
            const step = Math.PI / spikes;

            ctx.moveTo(cx, cy - outerRadius);
            for (let i = 0; i < spikes; i++) {
                x = cx + Math.cos(rot) * outerRadius;
                y = cy + Math.sin(rot) * outerRadius;
                ctx.lineTo(x, y);
                rot += step;

                x = cx + Math.cos(rot) * innerRadius;
                y = cy + Math.sin(rot) * innerRadius;
                ctx.lineTo(x, y);
                rot += step;
            }
            ctx.lineTo(cx, cy - outerRadius);
            ctx.fill();
        }
        ctx.closePath();
    }
}

function gameOver() {
    gameActive = false;
}

function drawGameOverScreen() {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    ctx.fillStyle = 'white';
    ctx.font = '40px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('GAME OVER', canvas.width / 2, canvas.height / 2 - 20);
    
    ctx.font = '24px Arial';
    ctx.fillText(`Final Score: ${score}`, canvas.width / 2, canvas.height / 2 + 20);
    
    ctx.font = '16px Arial';
    ctx.fillText('Click to Restart', canvas.width / 2, canvas.height / 2 + 60);
}

function resetGame() {
    score = 0;
    scoreElement.textContent = 'Score: 0';
    shapes.length = 0;
    gameActive = true;
    lastTime = performance.now();
    activeRule = null; 
    updateRule();
    requestAnimationFrame(gameLoop);
}

canvas.addEventListener('mousedown', () => {
    if (!gameActive) {
        resetGame();
    }
});

canvas.addEventListener('mouseenter', (e) => {
    const rect = canvas.getBoundingClientRect();
    player.lastMouseX = e.clientX - rect.left;
});

canvas.addEventListener('mousemove', (e) => {
    if (!gameActive) return;
    
    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    
    if (player.inverted) {
        const deltaX = mouseX - player.lastMouseX;
        
        player.x -= deltaX;
        
    } else {
        player.x = mouseX - player.width / 2;
    }
    
    player.lastMouseX = mouseX;

    if (player.x < 0) player.x = 0;
    if (player.x + player.width > canvas.width) player.x = canvas.width - player.width;
});

function gameLoop(timestamp) {
    if (!gameActive) return;

    if (!lastTime) lastTime = timestamp;
    const deltaTime = (timestamp - lastTime) / 1000;
    lastTime = timestamp;

    ctx.fillStyle = '#000';
    ctx.save();
    
    if (shakeTime > 0) {
        shakeTime -= deltaTime;
        const shakeIntensity = 10;
        const dx = (Math.random() - 0.5) * shakeIntensity;
        const dy = (Math.random() - 0.5) * shakeIntensity;
        ctx.translate(dx, dy);
    }

    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ruleTimer -= deltaTime;
    const secondsRemaining = Math.ceil(ruleTimer);
    if (ruleElement.dataset.baseText) {
        ruleElement.textContent = `${ruleElement.dataset.baseText} (${secondsRemaining})`;
    }
    if (ruleTimer <= 0) {
        updateRule();
    }
    
    if (player.inverted) {
        player.glitchTimer -= deltaTime;
        if (player.glitchTimer <= 0) {
            player.inverted = false;
            playSound('newrule');
        }
    } else if (player.glitchWarning) {
        player.glitchWarningTimer -= deltaTime;
        if (player.glitchWarningTimer <= 0) {
            player.glitchWarning = false;
            player.inverted = true;
            player.glitchTimer = 5 + Math.random() * 5;
            playSound('gameover');
            shakeTime = 0.5;
        }
    } else {
        if (score > 75 && Math.random() < 0.0005) {
            player.glitchWarning = true;
            player.glitchWarningTimer = 3.0;
            playSound('newrule');
        }
    }

    spawnTimer += deltaTime;
    if (spawnTimer >= spawnRate) {
        spawnShape();
        spawnTimer = 0;
    }

    updateShapes(deltaTime);
    drawShapes();
    drawParticles();

    updatePlayerTrail(deltaTime);
    drawPlayer();

    ctx.restore();

    if (!gameActive) {
        drawGameOverScreen();
    } else {
        requestAnimationFrame(gameLoop);
    }
}

updateRule();
requestAnimationFrame(gameLoop);