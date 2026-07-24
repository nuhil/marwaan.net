/* ==========================================================================
   Game Coordinator (Responsive Arcade Interface + Balloon Pop Game Engine)
   ========================================================================== */

// Speed slider levels -> movement multiplier applied to both games.
// Medium (2) is the default and preserves the original tuning; Slow is
// gentler for younger toddlers, Fast is a light challenge boost.
const SPEED_LEVELS = { 1: 0.3, 2: 1.0, 3: 1.6 };
const SPEED_LABELS = { 1: 'Slow 🐢', 2: 'Medium 🚶', 3: 'Fast 🐇' };

class GameEngine {
  constructor() {
    this.canvas = document.getElementById('game-canvas');
    if (!this.canvas) return;
    this.ctx = this.canvas.getContext('2d');
    
    // Scoreboard elements
    this.scoreValEl = document.getElementById('score-val');
    this.highValEl = document.getElementById('high-val');
    this.timerValEl = document.getElementById('timer-val');
    
    // UI Screen Overlays
    this.lobbyOverlay = document.getElementById('lobby-overlay');
    this.startOverlay = document.getElementById('start-overlay');
    this.gameoverOverlay = document.getElementById('gameover-overlay');
    this.finalScoreEl = document.getElementById('final-score');
    
    this.geoStartOverlay = document.getElementById('geo-start-overlay');
    this.geoGameoverOverlay = document.getElementById('geo-gameover-overlay');
    
    this.gameTitleEl = document.getElementById('game-page-title');
    
    // Selection Buttons
    this.btnSelectPop = document.getElementById('btn-select-pop');
    this.btnSelectGeo = document.getElementById('btn-select-geo');
    
    // Control Buttons
    this.btnStart = document.getElementById('btn-start-game');
    this.btnRestart = document.getElementById('btn-restart-game');
    
    // Audio Context
    this.audioCtx = null;
    
    // Game variables
    this.score = 0;
    this.highScore = parseInt(localStorage.getItem('lego_balloon_high') || '0', 10);
    this.timer = 30; // 30 seconds game round
    this.gameState = 'START'; // START, PLAYING, GAMEOVER
    
    // Balloon Pop Arrays
    this.balloons = [];
    this.particles = [];
    this.lastTime = 0;
    this.spawnTimer = 0;
    this.spawnInterval = 800; // ms between spawns
    this.gameTimerInterval = null;
    
    // Set colors from our LEGO design palette
    this.balloonColors = [
      '#3498db', // Sky Blue
      '#f1c40f', // Sunny Yellow
      '#2ecc71', // Lime Green
      '#e74c3c'  // Bright Coral
    ];
    
    // Active game tracker: null (Lobby), 'POP' (Balloon Pop), 'GEO' (Geography Game)
    this.activeGame = null;

    // Movement speed multiplier shared by both games (set via the speed slider)
    this.speedMultiplier = 1.0;
    
    // Initial setup
    this.highValEl.textContent = this.highScore;
    this.resizeCanvas();
    window.addEventListener('resize', () => this.resizeCanvas());
    
    // Instantiate sub-game GeographyGame
    // Passes context and coordinates back to coordinator
    this.geoGame = new GeographyGame(this.canvas, this.ctx, null, this);

    // Wire up the shared speed slider (must run after geoGame exists so the
    // initial multiplier can be synced into it)
    this.setupSpeedControl();

    // Bind Selection events
    this.btnSelectPop.addEventListener('click', () => this.selectGame('POP'));
    this.btnSelectGeo.addEventListener('click', () => this.selectGame('GEO'));
    
    // Bind Balloon Pop Control events
    this.btnStart.addEventListener('click', () => this.startGame());
    this.btnRestart.addEventListener('click', () => this.startGame());
    
    // Bind Lobby Redirect buttons
    document.getElementById('btn-lobby-pop-start').addEventListener('click', () => this.showLobby());
    document.getElementById('btn-lobby-pop-over').addEventListener('click', () => this.showLobby());
    document.getElementById('btn-lobby-geo-start').addEventListener('click', () => this.showLobby());
    document.getElementById('btn-lobby-geo-over').addEventListener('click', () => this.showLobby());
    
    // Bind Geography Controls
    document.getElementById('btn-start-geo').addEventListener('click', () => this.geoGame.startGame());
    document.getElementById('btn-restart-geo').addEventListener('click', () => this.geoGame.startGame());
    
    // Interaction coordinates click/touch for Balloon Pop
    this.canvas.addEventListener('mousedown', (e) => {
      if (this.activeGame === 'POP') this.handlePointerDown(e);
    });
    this.canvas.addEventListener('touchstart', (e) => {
      e.preventDefault(); // Stop mouse emulation
      if (this.activeGame === 'POP') this.handlePointerDown(e.touches[0]);
    }, { passive: false });
    
    // Initialize frames
    requestAnimationFrame((t) => this.loop(t));
  }
  
  setupSpeedControl() {
    this.speedSlider = document.getElementById('speed-slider');
    this.speedValueEl = document.getElementById('speed-value');

    // Restore the saved preference (default to Medium)
    let level = parseInt(localStorage.getItem('lego_game_speed') || '2', 10);
    if (!SPEED_LEVELS[level]) level = 2;

    this.applySpeedLevel(level);

    if (this.speedSlider) {
      this.speedSlider.value = level;
      this.speedSlider.addEventListener('input', () => {
        const lvl = parseInt(this.speedSlider.value, 10);
        this.applySpeedLevel(lvl);
        localStorage.setItem('lego_game_speed', lvl);
      });
    }
  }

  applySpeedLevel(level) {
    this.speedMultiplier = SPEED_LEVELS[level] || 1.0;
    if (this.speedValueEl) {
      this.speedValueEl.textContent = SPEED_LABELS[level] || SPEED_LABELS[2];
    }
    // Keep the geography sub-game in sync
    if (this.geoGame) {
      this.geoGame.speedMultiplier = this.speedMultiplier;
    }
  }

  initAudio() {
    if (!this.audioCtx) {
      this.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (this.audioCtx.state === 'suspended') {
      this.audioCtx.resume();
    }
    // Update sub game's audio context
    if (this.geoGame) {
      this.geoGame.audioCtx = this.audioCtx;
    }
  }
  
  resizeCanvas() {
    const rect = this.canvas.getBoundingClientRect();
    this.canvas.width = rect.width;
    this.canvas.height = rect.height;
  }
  
  selectGame(type) {
    this.initAudio();
    this.activeGame = type;
    this.lobbyOverlay.style.display = 'none';
    
    if (type === 'POP') {
      this.canvas.classList.add('game-canvas-pop');
      this.canvas.classList.remove('game-canvas-geo');
      this.startOverlay.style.display = 'flex';
      this.gameTitleEl.textContent = 'Lego Balloon Pop! 🎈';
      
      // Reset Scoreboard to Pop defaults
      document.getElementById('label-score').textContent = 'Score';
      this.scoreValEl.textContent = '0';
      document.getElementById('label-timer').textContent = 'Time Left';
      this.timerValEl.textContent = '30';
      document.getElementById('label-high').textContent = 'High Score';
      this.highValEl.textContent = this.highScore;
    } else if (type === 'GEO') {
      this.canvas.classList.add('game-canvas-geo');
      this.canvas.classList.remove('game-canvas-pop');
      this.gameTitleEl.textContent = 'Lego Capital Builder! 🗺️';
      this.geoGame.activate();
    }
  }
  
  showLobby() {
    // Stop pop updates
    if (this.gameTimerInterval) clearInterval(this.gameTimerInterval);
    this.gameState = 'START';
    this.balloons = [];
    this.particles = [];
    
    // Reset canvas cursors
    this.canvas.classList.remove('game-canvas-pop', 'game-canvas-geo');
    
    // Deactivate geography game
    this.geoGame.deactivate();
    
    // Hide static geography fact card
    const factCard = document.getElementById('geo-fact-card');
    if (factCard) factCard.style.display = 'none';
    
    // Remove dynamic fact banner if present
    const banner = document.getElementById('geo-fact-banner');
    if (banner) banner.remove();
    
    this.activeGame = null;
    this.gameTitleEl.textContent = "Marwaan's Lego Arcade! 🎮";
    
    // Hide all overlays
    this.startOverlay.style.display = 'none';
    this.gameoverOverlay.style.display = 'none';
    this.geoStartOverlay.style.display = 'none';
    this.geoGameoverOverlay.style.display = 'none';
    
    // Show lobby selection screen
    this.lobbyOverlay.style.display = 'flex';
    
    // Reset Scoreboard layout
    document.getElementById('label-score').textContent = 'Score';
    this.scoreValEl.textContent = '0';
    document.getElementById('label-timer').textContent = 'Time Left';
    this.timerValEl.textContent = '30';
    document.getElementById('label-high').textContent = 'High Score';
    this.highValEl.textContent = this.highScore;
  }
  
  startGame() {
    this.initAudio();
    this.score = 0;
    this.timer = 30;
    this.balloons = [];
    this.particles = [];
    this.gameState = 'PLAYING';
    
    this.scoreValEl.textContent = this.score;
    this.timerValEl.textContent = this.timer;
    
    this.startOverlay.style.display = 'none';
    this.gameoverOverlay.style.display = 'none';
    
    // Start countdown
    if (this.gameTimerInterval) clearInterval(this.gameTimerInterval);
    this.gameTimerInterval = setInterval(() => {
      if (this.gameState === 'PLAYING') {
        this.timer--;
        this.timerValEl.textContent = this.timer;
        if (this.timer <= 0) {
          this.endGame();
        }
      }
    }, 1000);
  }
  
  endGame() {
    this.gameState = 'GAMEOVER';
    clearInterval(this.gameTimerInterval);
    
    // Save high score
    if (this.score > this.highScore) {
      this.highScore = this.score;
      localStorage.setItem('lego_balloon_high', this.highScore);
      this.highValEl.textContent = this.highScore;
      this.playWinSound();
    } else {
      this.playGameOverSound();
    }
    
    this.finalScoreEl.textContent = this.score;
    this.gameoverOverlay.style.display = 'flex';
  }
  
  playPopSound() {
    if (!this.audioCtx) return;
    const osc = this.audioCtx.createOscillator();
    const gain = this.audioCtx.createGain();
    
    osc.connect(gain);
    gain.connect(this.audioCtx.destination);
    
    // Pop chime - quick rising pitch sweep
    osc.type = 'sine';
    osc.frequency.setValueAtTime(160, this.audioCtx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(700, this.audioCtx.currentTime + 0.12);
    
    gain.gain.setValueAtTime(0.25, this.audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.audioCtx.currentTime + 0.12);
    
    osc.start();
    osc.stop(this.audioCtx.currentTime + 0.12);
  }
  
  playWinSound() {
    if (!this.audioCtx) return;
    const now = this.audioCtx.currentTime;
    
    // High score fanfare arpeggio
    const playTone = (freq, delay, dur) => {
      const osc = this.audioCtx.createOscillator();
      const gain = this.audioCtx.createGain();
      osc.connect(gain);
      gain.connect(this.audioCtx.destination);
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now + delay);
      gain.gain.setValueAtTime(0.2, now + delay);
      gain.gain.exponentialRampToValueAtTime(0.01, now + delay + dur);
      osc.start(now + delay);
      osc.stop(now + delay + dur);
    };
    
    playTone(261.63, 0, 0.15); // C4
    playTone(329.63, 0.15, 0.15); // E4
    playTone(392.00, 0.3, 0.15); // G4
    playTone(523.25, 0.45, 0.4); // C5
  }
  
  playGameOverSound() {
    if (!this.audioCtx) return;
    const now = this.audioCtx.currentTime;
    
    // Game over sound (falling pitch)
    const osc = this.audioCtx.createOscillator();
    const gain = this.audioCtx.createGain();
    
    osc.connect(gain);
    gain.connect(this.audioCtx.destination);
    
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(220, now);
    osc.frequency.linearRampToValueAtTime(110, now + 0.5);
    
    gain.gain.setValueAtTime(0.15, now);
    gain.gain.linearRampToValueAtTime(0.01, now + 0.5);
    
    osc.start();
    osc.stop(now + 0.5);
  }
  
  spawnBalloon() {
    const radius = Math.floor(Math.random() * 15) + 30; // 30-45px radius
    const x = Math.floor(Math.random() * (this.canvas.width - radius * 2)) + radius;
    const y = this.canvas.height + radius;
    // Base speed accelerates as score rises, then scaled by the speed slider
    const speed = ((Math.random() * 2) + 1.5 + (this.score * 0.05)) * this.speedMultiplier;
    const color = this.balloonColors[Math.floor(Math.random() * this.balloonColors.length)];
    
    this.balloons.push({ x, y, radius, speed, color });
  }
  
  spawnParticles(x, y, color) {
    const particleCount = 12;
    for (let i = 0; i < particleCount; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = (Math.random() * 4) + 2;
      this.particles.push({
        x: x,
        y: y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        radius: (Math.random() * 4) + 3,
        color: color,
        alpha: 1.0,
        decay: (Math.random() * 0.03) + 0.02
      });
    }
  }
  
  handlePointerDown(pointer) {
    if (this.gameState !== 'PLAYING') return;
    
    const rect = this.canvas.getBoundingClientRect();
    const clickX = pointer.clientX - rect.left;
    const clickY = pointer.clientY - rect.top;
    
    // Check hit collisions bottom-to-top
    for (let i = this.balloons.length - 1; i >= 0; i--) {
      const balloon = this.balloons[i];
      const dist = Math.hypot(clickX - balloon.x, clickY - balloon.y);
      
      // Let children pop balloons easily: give 10px extra margin
      if (dist <= balloon.radius + 10) {
        this.playPopSound();
        this.spawnParticles(balloon.x, balloon.y, balloon.color);
        this.balloons.splice(i, 1);
        this.score++;
        this.scoreValEl.textContent = this.score;
        break; // pop only one balloon per touch
      }
    }
  }
  
  loop(timestamp) {
    const dt = timestamp - this.lastTime;
    this.lastTime = timestamp;
    
    if (this.activeGame === 'POP') {
      this.update(dt);
      this.draw();
    } else if (this.activeGame === null) {
      // Lobby mode - draw idle pretty background and clouds
      this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
      this.drawSkyBackground();
    }
    
    requestAnimationFrame((t) => this.loop(t));
  }
  
  update(dt) {
    if (this.gameState !== 'PLAYING') {
      this.updateParticles();
      return;
    }
    
    // Spawning balloons
    this.spawnTimer += dt;
    if (this.spawnTimer >= this.spawnInterval) {
      this.spawnBalloon();
      this.spawnTimer = 0;
    }
    
    // Update active balloons
    for (let i = this.balloons.length - 1; i >= 0; i--) {
      const balloon = this.balloons[i];
      balloon.y -= balloon.speed; // move up
      
      // Remove balloon if floats out
      if (balloon.y < -balloon.radius * 2) {
        this.balloons.splice(i, 1);
      }
    }
    
    // Update active explosion particles
    this.updateParticles();
  }
  
  updateParticles() {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.05; // light gravity fall
      p.alpha -= p.decay;
      
      if (p.alpha <= 0) {
        this.particles.splice(i, 1);
      }
    }
  }
  
  draw() {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    
    // Draw sky clouds background
    this.drawSkyBackground();
    
    // Draw balloons
    this.balloons.forEach(balloon => {
      this.drawBalloon(balloon);
    });
    
    // Draw explosion particles
    this.particles.forEach(p => {
      this.ctx.save();
      this.ctx.globalAlpha = p.alpha;
      this.ctx.fillStyle = p.color;
      this.ctx.strokeStyle = '#1a1a1a';
      this.ctx.lineWidth = 2;
      this.ctx.beginPath();
      this.ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
      this.ctx.fill();
      this.ctx.stroke();
      this.ctx.restore();
    });
  }
  
  drawSkyBackground() {
    this.ctx.fillStyle = '#b3e5fc';
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    
    this.ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
    const drawCloud = (cx, cy, scale) => {
      this.ctx.beginPath();
      this.ctx.arc(cx, cy, 20 * scale, 0, Math.PI * 2);
      this.ctx.arc(cx + 15 * scale, cy - 10 * scale, 25 * scale, 0, Math.PI * 2);
      this.ctx.arc(cx + 35 * scale, cy, 20 * scale, 0, Math.PI * 2);
      this.ctx.fill();
    };
    
    drawCloud(this.canvas.width * 0.2, this.canvas.height * 0.2, 1.0);
    drawCloud(this.canvas.width * 0.8, this.canvas.height * 0.35, 1.3);
    drawCloud(this.canvas.width * 0.5, this.canvas.height * 0.15, 0.8);
  }
  
  drawBalloon(b) {
    this.ctx.save();
    
    // Draw balloon string
    this.ctx.beginPath();
    this.ctx.moveTo(b.x, b.y + b.radius);
    this.ctx.bezierCurveTo(
      b.x - 5, b.y + b.radius + b.radius * 0.4,
      b.x + 5, b.y + b.radius + b.radius * 0.8,
      b.x, b.y + b.radius * 2
    );
    this.ctx.lineWidth = 3;
    this.ctx.strokeStyle = '#555555';
    this.ctx.stroke();
    
    // Draw balloon body
    this.ctx.beginPath();
    this.ctx.ellipse(b.x, b.y, b.radius * 0.8, b.radius, 0, 0, Math.PI * 2);
    this.ctx.fillStyle = b.color;
    this.ctx.fill();
    this.ctx.lineWidth = 4;
    this.ctx.strokeStyle = '#1a1a1a';
    this.ctx.stroke();
    
    // Draw balloon knot triangle
    this.ctx.beginPath();
    this.ctx.moveTo(b.x, b.y + b.radius);
    this.ctx.lineTo(b.x - 6, b.y + b.radius + 6);
    this.ctx.lineTo(b.x + 6, b.y + b.radius + 6);
    this.ctx.closePath();
    this.ctx.fillStyle = b.color;
    this.ctx.fill();
    this.ctx.stroke();
    
    // Draw 3D reflective highlight bubble
    this.ctx.beginPath();
    this.ctx.ellipse(
      b.x - b.radius * 0.3,
      b.y - b.radius * 0.4,
      b.radius * 0.15,
      b.radius * 0.3,
      -Math.PI / 6,
      0,
      Math.PI * 2
    );
    this.ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
    this.ctx.fill();
    
    this.ctx.restore();
  }
}

// Instantiate engine when page loads
window.addEventListener('load', () => {
  window.gameEngine = new GameEngine();
});
