class Helicopter {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.width = 60;
        this.height = 30;
        this.velocity = 0;
        this.gravity = 0.5;
        this.thrustPower = -8;
        this.rotation = 0;
        this.rotorAngle = 0;
    }

    update() {
        this.velocity += this.gravity;
        this.y += this.velocity;
        this.rotation = Math.max(-30, Math.min(30, this.velocity * 2));
        this.rotorAngle += 30;
    }

    thrust() {
        this.velocity = this.thrustPower;
        game.addParticle(this.x - 20, this.y + 10, 'thrust');
    }

    draw(ctx) {
        ctx.save();
        ctx.translate(this.x + this.width/2, this.y + this.height/2);
        ctx.rotate(this.rotation * Math.PI / 180);
        
        // Helicopter body
        ctx.fillStyle = '#e74c3c';
        ctx.fillRect(-this.width/2, -this.height/2, this.width, this.height);
        
        // Cockpit
        ctx.fillStyle = '#3498db';
        ctx.fillRect(-this.width/2 + 10, -this.height/2 + 5, 25, 20);
        
        // Main rotor
        ctx.strokeStyle = '#2c3e50';
        ctx.lineWidth = 3;
        ctx.save();
        ctx.rotate(this.rotorAngle * Math.PI / 180);
        ctx.beginPath();
        ctx.moveTo(-40, -20);
        ctx.lineTo(40, -20);
        ctx.stroke();
        ctx.restore();
        
        // Tail rotor
        ctx.save();
        ctx.translate(25, 5);
        ctx.rotate(this.rotorAngle * 3 * Math.PI / 180);
        ctx.beginPath();
        ctx.moveTo(-8, 0);
        ctx.lineTo(8, 0);
        ctx.stroke();
        ctx.restore();
        
        ctx.restore();
    }

    getBounds() {
        return {
            x: this.x,
            y: this.y,
            width: this.width,
            height: this.height
        };
    }
}

class Obstacle {
    constructor(x, gapY, gapSize) {
        this.x = x;
        this.gapY = gapY;
        this.gapSize = gapSize;
        this.width = 50;
        this.speed = 3;
        this.passed = false;
    }

    update() {
        this.x -= this.speed;
    }

    draw(ctx) {
        ctx.fillStyle = '#2c3e50';
        // Top obstacle
        ctx.fillRect(this.x, 0, this.width, this.gapY);
        // Bottom obstacle
        ctx.fillRect(this.x, this.gapY + this.gapSize, this.width, ctx.canvas.height - (this.gapY + this.gapSize));
        
        // Add some detail
        ctx.fillStyle = '#34495e';
        for(let i = 0; i < this.gapY; i += 20) {
            ctx.fillRect(this.x + 5, i, this.width - 10, 15);
        }
        for(let i = this.gapY + this.gapSize; i < ctx.canvas.height; i += 20) {
            ctx.fillRect(this.x + 5, i, this.width - 10, 15);
        }
    }

    collidesWith(helicopter) {
        const heli = helicopter.getBounds();
        return (heli.x < this.x + this.width &&
                heli.x + heli.width > this.x &&
                (heli.y < this.gapY || heli.y + heli.height > this.gapY + this.gapSize));
    }
}

class Powerup {
    constructor(x, y, type) {
        this.x = x;
        this.y = y;
        this.type = type;
        this.width = 25;
        this.height = 25;
        this.speed = 3;
        this.collected = false;
        this.bounce = 0;
    }

    update() {
        this.x -= this.speed;
        this.bounce += 0.2;
        this.y += Math.sin(this.bounce) * 0.5;
    }

    draw(ctx) {
        ctx.save();
        ctx.translate(this.x + this.width/2, this.y + this.height/2);
        
        if(this.type === 'fuel') {
            ctx.fillStyle = '#f39c12';
            ctx.fillRect(-this.width/2, -this.height/2, this.width, this.height);
            ctx.fillStyle = '#e67e22';
            ctx.fillRect(-this.width/2 + 3, -this.height/2 + 3, this.width - 6, this.height - 6);
            ctx.fillStyle = '#fff';
            ctx.font = '14px Arial';
            ctx.textAlign = 'center';
            ctx.fillText('F', 0, 4);
        }
        
        ctx.restore();
    }

    collidesWith(helicopter) {
        const heli = helicopter.getBounds();
        return (heli.x < this.x + this.width &&
                heli.x + heli.width > this.x &&
                heli.y < this.y + this.height &&
                heli.y + heli.height > this.y);
    }
}

class Particle {
    constructor(x, y, type) {
        this.x = x;
        this.y = y;
        this.type = type;
        this.life = 30;
        this.maxLife = 30;
        
        if(type === 'thrust') {
            this.vx = Math.random() * -4 - 2;
            this.vy = Math.random() * 4 - 2;
            this.color = `hsl(${Math.random() * 60 + 15}, 100%, 50%)`;
        } else if(type === 'explosion') {
            this.vx = Math.random() * 10 - 5;
            this.vy = Math.random() * 10 - 5;
            this.color = `hsl(${Math.random() * 60}, 100%, 50%)`;
        }
    }

    update() {
        this.x += this.vx;
        this.y += this.vy;
        this.life--;
        
        if(this.type === 'thrust') {
            this.vy += 0.1;
        }
    }

    draw(ctx) {
        const alpha = this.life / this.maxLife;
        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.fillStyle = this.color;
        ctx.fillRect(this.x, this.y, 4, 4);
        ctx.restore();
    }
}

class Game {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.setupCanvas();
        
        this.helicopter = new Helicopter(100, 300);
        this.obstacles = [];
        this.powerups = [];
        this.particles = [];
        
        this.score = 0;
        this.bestScore = localStorage.getItem('helicopterBest') || 0;
        this.fuel = 100;
        this.gameState = 'menu'; // menu, playing, gameOver
        
        this.setupControls();
        this.updateUI();
    }

    setupCanvas() {
        this.canvas.width = Math.min(window.innerWidth - 40, 800);
        this.canvas.height = Math.min(window.innerHeight - 40, 600);
    }

    setupControls() {
        document.addEventListener('keydown', (e) => {
            if(e.code === 'Space' && this.gameState === 'playing') {
                e.preventDefault();
                this.helicopter.thrust();
                this.fuel = Math.max(0, this.fuel - 0.5);
            }
        });

        this.canvas.addEventListener('mousedown', () => {
            if(this.gameState === 'playing') {
                this.helicopter.thrust();
                this.fuel = Math.max(0, this.fuel - 0.5);
            }
        });

        this.canvas.addEventListener('touchstart', (e) => {
            e.preventDefault();
            if(this.gameState === 'playing') {
                this.helicopter.thrust();
                this.fuel = Math.max(0, this.fuel - 0.5);
            }
        });
    }

    start() {
        this.gameState = 'playing';
        this.score = 0;
        this.fuel = 100;
        this.helicopter = new Helicopter(100, 300);
        this.obstacles = [];
        this.powerups = [];
        this.particles = [];
        
        document.getElementById('instructions').classList.add('hidden');
        this.gameLoop();
    }

    restart() {
        document.getElementById('gameOver').classList.add('hidden');
        this.start();
    }

    gameLoop() {
        if(this.gameState !== 'playing') return;
        
        this.update();
        this.draw();
        requestAnimationFrame(() => this.gameLoop());
    }

    update() {
        this.helicopter.update();
        
        // Check boundaries
        if(this.helicopter.y <= 0 || this.helicopter.y >= this.canvas.height - this.helicopter.height || this.fuel <= 0) {
            this.gameOver();
            return;
        }
        
        // Spawn obstacles
        if(this.obstacles.length === 0 || this.obstacles[this.obstacles.length - 1].x < this.canvas.width - 300) {
            const gapSize = Math.max(120, 180 - this.score * 2);
            const gapY = Math.random() * (this.canvas.height - gapSize - 100) + 50;
            this.obstacles.push(new Obstacle(this.canvas.width, gapY, gapSize));
        }
        
        // Spawn powerups
        if(Math.random() < 0.008 && this.fuel < 80) {
            const y = Math.random() * (this.canvas.height - 100) + 50;
            this.powerups.push(new Powerup(this.canvas.width, y, 'fuel'));
        }
        
        // Update obstacles
        this.obstacles = this.obstacles.filter(obstacle => {
            obstacle.update();
            
            if(!obstacle.passed && obstacle.x + obstacle.width < this.helicopter.x) {
                obstacle.passed = true;
                this.score++;
                this.updateUI();
            }
            
            if(obstacle.collidesWith(this.helicopter)) {
                this.gameOver();
                return false;
            }
            
            return obstacle.x > -obstacle.width;
        });
        
        // Update powerups
        this.powerups = this.powerups.filter(powerup => {
            powerup.update();
            
            if(powerup.collidesWith(this.helicopter) && !powerup.collected) {
                powerup.collected = true;
                this.fuel = Math.min(100, this.fuel + 25);
                this.addParticle(powerup.x, powerup.y, 'explosion');
                return false;
            }
            
            return powerup.x > -powerup.width;
        });
        
        // Update particles
        this.particles = this.particles.filter(particle => {
            particle.update();
            return particle.life > 0;
        });
        
        this.updateUI();
    }

    draw() {
        // Clear canvas with gradient
        const gradient = this.ctx.createLinearGradient(0, 0, 0, this.canvas.height);
        gradient.addColorStop(0, '#87CEEB');
        gradient.addColorStop(1, '#98FB98');
        this.ctx.fillStyle = gradient;
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Draw clouds
        this.drawClouds();
        
        // Draw particles
        this.particles.forEach(particle => particle.draw(this.ctx));
        
        // Draw game objects
        this.obstacles.forEach(obstacle => obstacle.draw(this.ctx));
        this.powerups.forEach(powerup => powerup.draw(this.ctx));
        this.helicopter.draw(this.ctx);
    }

    drawClouds() {
        this.ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
        const cloudOffset = this.score * 2;
        
        for(let i = 0; i < 5; i++) {
            const x = (i * 200 - cloudOffset) % (this.canvas.width + 100);
            const y = 50 + i * 30;
            this.drawCloud(x, y);
        }
    }

    drawCloud(x, y) {
        this.ctx.beginPath();
        this.ctx.arc(x, y, 15, 0, Math.PI * 2);
        this.ctx.arc(x + 15, y, 20, 0, Math.PI * 2);
        this.ctx.arc(x + 30, y, 15, 0, Math.PI * 2);
        this.ctx.arc(x + 15, y - 10, 15, 0, Math.PI * 2);
        this.ctx.fill();
    }

    addParticle(x, y, type) {
        for(let i = 0; i < (type === 'explosion' ? 8 : 3); i++) {
            this.particles.push(new Particle(x, y, type));
        }
    }

    updateUI() {
        document.getElementById('score').textContent = this.score;
        document.getElementById('best').textContent = this.bestScore;
        document.getElementById('fuelFill').style.width = this.fuel + '%';
    }

    gameOver() {
        this.gameState = 'gameOver';
        
        // Add explosion particles
        this.addParticle(this.helicopter.x + this.helicopter.width/2, this.helicopter.y + this.helicopter.height/2, 'explosion');
        
        // Update best score
        if(this.score > this.bestScore) {
            this.bestScore = this.score;
            localStorage.setItem('helicopterBest', this.bestScore);
        }
        
        document.getElementById('finalScore').textContent = this.score;
        document.getElementById('finalBest').textContent = this.bestScore;
        document.getElementById('gameOver').classList.remove('hidden');
    }
}

// Initialize game when page loads
let game;
window.addEventListener('load', () => {
    game = new Game();
});

window.addEventListener('resize', () => {
    if(game) {
        game.setupCanvas();
    }
});
