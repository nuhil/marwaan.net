/* ==========================================================================
   Lego Capital Builder Game (HTML5 Canvas + Web Audio API Synthesis)
   ========================================================================== */

class GeographyGame {
  constructor(canvas, ctx, audioCtx, parentEngine) {
    this.canvas = canvas;
    this.ctx = ctx;
    this.audioCtx = audioCtx;
    this.parent = parentEngine; // Reference to main games.js engine
    
    // Game state
    this.active = false;
    this.towerHeight = 0;
    this.correctCount = 0;
    this.maxTower = 5;
    this.gameState = 'START'; // START, PLAYING, VICTORY
    
    // Physics arrays
    this.fallingBrits = []; // Falling Lego blocks
    this.stackedBricks = []; // Stacked Lego bricks at the bottom
    this.particles = [];
    
    // Current question state
    this.currentQuest = null;
    
    // Animations
    this.spaceshipY = 0;
    this.spaceshipVy = 0;
    this.spaceshipActive = false;
    this.lastTime = 0;
    this.animationId = null;
    
    // Lego bricks properties
    this.brickWidth = 120;
    this.brickHeight = 35;
    
    // State/Country Capital Database with Cool Kids Facts
    this.database = [
      { type: 'State', name: 'California', capital: 'Sacramento', fact: 'California grows more than 90% of US broccoli! 🥦' },
      { type: 'State', name: 'Texas', capital: 'Austin', fact: 'Texas is the only state to have six different flags fly over it! 🤠' },
      { type: 'State', name: 'New York', capital: 'Albany', fact: 'The Empire State Building has its very own zip code (10118)! 🗽' },
      { type: 'State', name: 'Florida', capital: 'Tallahassee', fact: 'Florida is the only place in the world where both alligators and crocodiles hang out! 🐊' },
      { type: 'State', name: 'Washington', capital: 'Olympia', fact: 'Washington state produces more sweet apples than any other state! 🍎' },
      { type: 'Country', name: 'Japan', capital: 'Tokyo', fact: 'Tokyo is the most crowded city in the world, and Japan has wild snow monkeys! 🐒' },
      { type: 'Country', name: 'France', capital: 'Paris', fact: 'The Eiffel Tower grows taller in the summer because hot weather expands metal! 🗼' },
      { type: 'Country', name: 'Canada', capital: 'Ottawa', fact: 'Canada is the beaver capital, and it has more lakes than any other country! 🦫' },
      { type: 'Country', name: 'United Kingdom', capital: 'London', fact: 'Big Ben is actually the name of the heavy bell inside the tower, not the clock! 🔔' },
      { type: 'Country', name: 'Egypt', capital: 'Cairo', fact: 'Egypt has massive pyramids that were built over 4,500 years ago! 🔺' },
      { type: 'Country', name: 'Australia', capital: 'Canberra', fact: 'Australia is home to kookaburras, and there are more kangaroos than people! 🦘' }
    ];
    
    // Theme colors matching LEGO neo-brutalism
    this.brickColors = ['#e74c3c', '#2ecc71', '#3498db', '#f1c40f'];
    
    // Bind interaction handler
    this.canvasHandler = (e) => this.handlePointerDown(e);
    this.touchHandler = (e) => {
      e.preventDefault();
      this.handlePointerDown(e.touches[0]);
    };
    
    // Load external geography dataset
    this.loadDatabase();
  }
  
  loadDatabase() {
    fetch('data/geography.json')
      .then(res => {
        if (!res.ok) throw new Error('Network response was not ok');
        return res.json();
      })
      .then(data => {
        if (Array.isArray(data) && data.length > 0) {
          this.database = data;
          console.log(`Successfully loaded ${data.length} geography records from JSON.`);
        }
      })
      .catch(err => {
        console.warn('Could not fetch geography JSON, keeping default database:', err);
      });
  }
  
  activate() {
    this.active = true;
    this.gameState = 'START';
    this.towerHeight = 0;
    this.correctCount = 0;
    this.fallingBrits = [];
    this.stackedBricks = [];
    this.particles = [];
    this.spaceshipActive = false;
    this.spaceshipY = 0;
    this.spaceshipVy = 0;
    
    // Update Scoreboard labels
    document.getElementById('label-score').textContent = 'Tower Height';
    document.getElementById('score-val').textContent = '0 / ' + this.maxTower;
    document.getElementById('label-timer').textContent = 'Correct';
    document.getElementById('timer-val').textContent = '0';
    document.getElementById('label-high').textContent = 'Best Tower';
    
    const bestTower = localStorage.getItem('lego_geo_high') || '0';
    document.getElementById('high-val').textContent = bestTower;
    
    // Register listeners
    this.canvas.addEventListener('mousedown', this.canvasHandler);
    this.canvas.addEventListener('touchstart', this.touchHandler, { passive: false });
    
    // Start animation loop
    this.lastTime = performance.now();
    this.loop(this.lastTime);
    
    // Display the start screen overlay
    document.getElementById('geo-start-overlay').style.display = 'flex';
    document.getElementById('geo-gameover-overlay').style.display = 'none';
    document.getElementById('lobby-overlay').style.display = 'none';
  }
  
  deactivate() {
    this.active = false;
    this.canvas.removeEventListener('mousedown', this.canvasHandler);
    this.canvas.removeEventListener('touchstart', this.touchHandler);
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
    }
    // Hide geography fact card
    const factCard = document.getElementById('geo-fact-card');
    if (factCard) factCard.style.display = 'none';
  }
  
  startGame() {
    this.gameState = 'PLAYING';
    this.towerHeight = 0;
    this.correctCount = 0;
    this.fallingBrits = [];
    this.stackedBricks = [];
    this.particles = [];
    this.spaceshipActive = false;
    this.spaceshipY = 0;
    this.spaceshipVy = 0;
    
    // Hide geography fact card
    const factCard = document.getElementById('geo-fact-card');
    if (factCard) factCard.style.display = 'none';
    
    document.getElementById('score-val').textContent = `0 / ${this.maxTower}`;
    document.getElementById('timer-val').textContent = '0';
    
    document.getElementById('geo-start-overlay').style.display = 'none';
    document.getElementById('geo-gameover-overlay').style.display = 'none';
    
    this.nextQuestion();
  }
  
  nextQuestion() {
    // Select random prompt
    const available = this.database.filter(item => !this.currentQuest || item.name !== this.currentQuest.name);
    this.currentQuest = available[Math.floor(Math.random() * available.length)];
    
    // Gather incorrect capitals
    const wrongCapitals = this.database
      .filter(item => item.capital !== this.currentQuest.capital)
      .map(item => item.capital);
      
    // Shuffle wrong options and pick 2
    this.shuffle(wrongCapitals);
    const selectedWrong = wrongCapitals.slice(0, 2);
    
    // Compile answers
    const answers = [
      { text: this.currentQuest.capital, correct: true },
      { text: selectedWrong[0], correct: false },
      { text: selectedWrong[1], correct: false }
    ];
    this.shuffle(answers);
    
    // Spawn falling blocks
    this.fallingBrits = [];
    const laneWidth = this.canvas.width / 3;
    
    answers.forEach((ans, i) => {
      const x = (laneWidth * i) + (laneWidth / 2);
      const y = -50 - (Math.random() * 80);
      const speed = 1.2 + (this.correctCount * 0.1); // Accelerates slightly
      const color = this.brickColors[i % this.brickColors.length];
      
      this.fallingBrits.push({
        x: x,
        y: y,
        vx: 0,
        vy: speed,
        text: ans.text,
        correct: ans.correct,
        color: color,
        bouncing: false,
        angle: 0,
        spin: 0
      });
    });
  }
  
  playSnapSound() {
    if (!this.audioCtx) return;
    const now = this.audioCtx.currentTime;
    
    const osc = this.audioCtx.createOscillator();
    const gain = this.audioCtx.createGain();
    osc.connect(gain);
    gain.connect(this.audioCtx.destination);
    
    // Snap click sweep
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(120, now);
    osc.frequency.exponentialRampToValueAtTime(1000, now + 0.08);
    
    gain.gain.setValueAtTime(0.25, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.08);
    
    osc.start(now);
    osc.stop(now + 0.08);
  }
  
  playWrongSound() {
    if (!this.audioCtx) return;
    const now = this.audioCtx.currentTime;
    
    const osc = this.audioCtx.createOscillator();
    const gain = this.audioCtx.createGain();
    osc.connect(gain);
    gain.connect(this.audioCtx.destination);
    
    // Buzz/buzz sound
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(180, now);
    osc.frequency.linearRampToValueAtTime(90, now + 0.25);
    
    gain.gain.setValueAtTime(0.18, now);
    gain.gain.linearRampToValueAtTime(0.01, now + 0.25);
    
    osc.start(now);
    osc.stop(now + 0.25);
  }
  
  playLaunchSound() {
    if (!this.audioCtx) return;
    const now = this.audioCtx.currentTime;
    
    // Space launch roar/rumble and chime
    const playRumble = () => {
      const osc = this.audioCtx.createOscillator();
      const gain = this.audioCtx.createGain();
      osc.connect(gain);
      gain.connect(this.audioCtx.destination);
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(60, now);
      osc.frequency.linearRampToValueAtTime(10, now + 1.2);
      gain.gain.setValueAtTime(0.35, now);
      gain.gain.linearRampToValueAtTime(0.01, now + 1.2);
      osc.start(now);
      osc.stop(now + 1.2);
    };
    
    const playArpeggio = (freq, delay, dur) => {
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
    
    playRumble();
    playArpeggio(392.00, 0, 0.15); // G4
    playArpeggio(523.25, 0.15, 0.15); // C5
    playArpeggio(659.25, 0.3, 0.15); // E5
    playArpeggio(783.99, 0.45, 0.6); // G5
  }
  
  spawnPopParticles(x, y, color) {
    const count = 10;
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = (Math.random() * 3) + 1.5;
      this.particles.push({
        x: x,
        y: y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        radius: (Math.random() * 3) + 3,
        color: color,
        alpha: 1.0,
        decay: 0.03
      });
    }
  }
  
  spawnThrusterFire() {
    // Fire particles at bottom of the rocket tower
    const baseX = this.canvas.width / 2;
    const baseY = this.canvas.height - 20 - (this.maxTower * this.brickHeight) + this.spaceshipY;
    
    for (let i = 0; i < 3; i++) {
      this.particles.push({
        x: baseX + (Math.random() * 60 - 30),
        y: baseY + 10,
        vx: (Math.random() * 2 - 1),
        vy: (Math.random() * 4) + 4, // move down
        radius: (Math.random() * 6) + 4,
        color: ['#e74c3c', '#f1c40f', '#f39c12'][Math.floor(Math.random() * 3)],
        alpha: 1.0,
        decay: 0.04
      });
    }
  }
  
  handlePointerDown(pointer) {
    if (this.gameState !== 'PLAYING' || this.spaceshipActive) return;
    
    const rect = this.canvas.getBoundingClientRect();
    const clickX = pointer.clientX - rect.left;
    const clickY = pointer.clientY - rect.top;
    
    // Check click collisions with falling blocks
    for (let i = 0; i < this.fallingBrits.length; i++) {
      const block = this.fallingBrits[i];
      if (block.bouncing) continue; // Skip blocks already clicked and bouncing away
      
      const halfW = this.brickWidth / 2;
      const halfH = this.brickHeight / 2;
      
      const inX = clickX >= block.x - halfW - 10 && clickX <= block.x + halfW + 10;
      const inY = clickY >= block.y - halfH - 10 && clickY <= block.y + halfH + 10;
      
      if (inX && inY) {
        if (block.correct) {
          // CORRECT MATCH!
          this.playSnapSound();
          this.spawnPopParticles(block.x, block.y, block.color);
          
          // Add to stack
          this.stackedBricks.push({
            color: block.color,
            text: block.text
          });
          
          this.towerHeight++;
          this.correctCount++;
          
          document.getElementById('score-val').textContent = `${this.towerHeight} / ${this.maxTower}`;
          document.getElementById('timer-val').textContent = this.correctCount;
          
          // Show fact popup dynamically in parent/UI or overlay
          this.showFactBanner(this.currentQuest.fact);
          
          if (this.towerHeight >= this.maxTower) {
            this.triggerSpaceshipVictory();
          } else {
            this.nextQuestion();
          }
          break; // Exit loop
        } else {
          // WRONG MATCH!
          this.playWrongSound();
          block.bouncing = true;
          block.vx = (Math.random() * 4 - 2) * 2;
          block.vy = -4; // bounce up slightly
          block.spin = (Math.random() * 0.1 - 0.05);
        }
      }
    }
  }
  
  showFactBanner(factText) {
    const card = document.getElementById('geo-fact-card');
    const textEl = document.getElementById('geo-fact-text');
    if (card && textEl) {
      textEl.textContent = factText;
      card.style.display = 'block';
    }
  }
  
  triggerSpaceshipVictory() {
    this.spaceshipActive = true;
    this.spaceshipY = 0;
    this.spaceshipVy = 0;
    this.gameState = 'VICTORY';
    
    this.playLaunchSound();
    
    // Save high score if relevant
    const bestTower = parseInt(localStorage.getItem('lego_geo_high') || '0', 10);
    if (this.correctCount > bestTower) {
      localStorage.setItem('lego_geo_high', this.correctCount);
      document.getElementById('high-val').textContent = this.correctCount;
    }
    
    // Launch after short pause
    setTimeout(() => {
      this.spaceshipVy = -1.5; // Start moving up
    }, 1000);
  }
  
  loop(timestamp) {
    if (!this.active) return;
    
    const dt = timestamp - this.lastTime;
    this.lastTime = timestamp;
    
    this.update(dt);
    this.draw();
    
    this.animationId = requestAnimationFrame((t) => this.loop(t));
  }
  
  update(dt) {
    if (this.gameState === 'PLAYING') {
      // Update falling blocks
      for (let i = this.fallingBrits.length - 1; i >= 0; i--) {
        const block = this.fallingBrits[i];
        if (block.bouncing) {
          block.x += block.vx;
          block.y += block.vy;
          block.vy += 0.25; // gravity pull
          block.angle += block.spin;
          
          if (block.y > this.canvas.height + 50) {
            this.fallingBrits.splice(i, 1);
          }
        } else {
          block.y += block.vy;
          
          // Reached bottom - wrong choices fade/bounce out, correct triggers new turn
          if (block.y > this.canvas.height + 40) {
            if (block.correct) {
              // Missed - spawn a new turn to keep it active
              this.nextQuestion();
              break;
            } else {
              this.fallingBrits.splice(i, 1);
            }
          }
        }
      }
    }
    
    // Spaceship Launch Physics
    if (this.spaceshipActive && this.spaceshipVy !== 0) {
      this.spaceshipVy -= 0.15; // Accelerate upwards
      this.spaceshipY += this.spaceshipVy;
      this.spawnThrusterFire();
      
      // End game once spaceship flies off screen
      if (this.spaceshipY < -this.canvas.height - 200) {
        this.spaceshipActive = false;
        this.spaceshipVy = 0;
        this.endGame();
      }
    }
    
    // Update explosion/thruster particles
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.alpha -= p.decay;
      if (p.alpha <= 0) {
        this.particles.splice(i, 1);
      }
    }
  }
  
  endGame() {
    // Remove fact banner if present
    const existing = document.getElementById('geo-fact-banner');
    if (existing) existing.remove();
    
    document.getElementById('geo-gameover-overlay').style.display = 'flex';
  }
  
  draw() {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    
    // Draw pretty sky background
    this.drawSkyBackground();
    
    // Draw target prompt at the top
    if (this.gameState === 'PLAYING' && this.currentQuest) {
      this.drawQuestionPrompt();
    }
    
    // Draw stacked Lego bricks tower
    this.drawStackedTower();
    
    // Draw falling Lego choices
    if (this.gameState === 'PLAYING') {
      this.fallingBrits.forEach(block => {
        this.drawLegoBrick(block.x, block.y, block.text, block.color, block.angle);
      });
    }
    
    // Draw particles
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
    // Light sky blue to clean clouds
    this.ctx.fillStyle = '#b3e5fc';
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    
    // Statically draw clouds
    this.ctx.fillStyle = 'rgba(255, 255, 255, 0.55)';
    const drawCloud = (cx, cy, scale) => {
      this.ctx.beginPath();
      this.ctx.arc(cx, cy, 20 * scale, 0, Math.PI * 2);
      this.ctx.arc(cx + 15 * scale, cy - 10 * scale, 25 * scale, 0, Math.PI * 2);
      this.ctx.arc(cx + 35 * scale, cy, 20 * scale, 0, Math.PI * 2);
      this.ctx.fill();
    };
    
    drawCloud(this.canvas.width * 0.15, this.canvas.height * 0.2, 0.95);
    drawCloud(this.canvas.width * 0.85, this.canvas.height * 0.35, 1.25);
  }
  
  drawQuestionPrompt() {
    this.ctx.save();
    
    // Draw question card box
    const cardW = this.canvas.width * 0.82;
    const cardH = 80;
    const cardX = (this.canvas.width - cardW) / 2;
    const cardY = 15;
    
    this.ctx.fillStyle = '#ffffff';
    this.ctx.strokeStyle = '#1a1a1a';
    this.ctx.lineWidth = 4;
    
    // Rounded neo-brutalism prompt card
    this.drawRoundedRect(cardX, cardY, cardW, cardH, 15);
    this.ctx.fill();
    this.ctx.stroke();
    
    // Draw prompt shadow
    this.ctx.fillStyle = '#1a1a1a';
    this.ctx.save();
    this.ctx.globalCompositeOperation = 'destination-over';
    this.drawRoundedRect(cardX + 4, cardY + 4, cardW, cardH, 15);
    this.ctx.fill();
    this.ctx.restore();
    
    // Write text
    this.ctx.fillStyle = '#1a1a1a';
    this.ctx.font = '800 1.2rem Outfit, sans-serif';
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';
    
    const query = this.currentQuest.type === 'State' 
      ? `Which is the capital of ${this.currentQuest.name}? 🇺🇸`
      : `Which is the capital of ${this.currentQuest.name}? 🗺️`;
      
    this.ctx.fillText(query, this.canvas.width / 2, cardY + cardH / 2);
    this.ctx.restore();
  }
  
  drawStackedTower() {
    this.ctx.save();
    const centerX = this.canvas.width / 2;
    
    // Calculate vertical offset due to spaceship launch animation
    const shipOffsetY = this.spaceshipY;
    
    // Draw ground base first if tower has not launched
    if (this.spaceshipY === 0) {
      this.ctx.fillStyle = '#27ae60'; // Lego green plate base
      this.ctx.fillRect(centerX - 100, this.canvas.height - 20, 200, 20);
      this.ctx.lineWidth = 4;
      this.ctx.strokeStyle = '#1a1a1a';
      this.ctx.strokeRect(centerX - 100, this.canvas.height - 20, 200, 20);
    }
    
    // Draw stacked blocks
    this.stackedBricks.forEach((brick, index) => {
      const x = centerX;
      const y = this.canvas.height - 20 - (index * this.brickHeight) - (this.brickHeight / 2) + shipOffsetY;
      
      this.drawLegoBrick(x, y, brick.text, brick.color, 0);
    });
    
    // Draw spaceship nose cone & wings if tower is completed (5 bricks)
    if (this.towerHeight >= this.maxTower) {
      const topY = this.canvas.height - 20 - (this.maxTower * this.brickHeight) + shipOffsetY;
      
      this.ctx.fillStyle = '#f1c40f'; // Yellow nose cone
      this.ctx.strokeStyle = '#1a1a1a';
      this.ctx.lineWidth = 4;
      
      // Spaceship nose triangle
      this.ctx.beginPath();
      this.ctx.moveTo(centerX, topY - 40);
      this.ctx.lineTo(centerX - 35, topY);
      this.ctx.lineTo(centerX + 35, topY);
      this.ctx.closePath();
      this.ctx.fill();
      this.ctx.stroke();
      
      // Side wings at bottom brick
      const bottomY = this.canvas.height - 20 - this.brickHeight / 2 + shipOffsetY;
      this.ctx.fillStyle = '#e74c3c'; // red thruster wings
      
      // Left wing
      this.ctx.beginPath();
      this.ctx.moveTo(centerX - this.brickWidth / 2, bottomY - this.brickHeight / 2);
      this.ctx.lineTo(centerX - this.brickWidth / 2 - 25, bottomY + this.brickHeight / 2);
      this.ctx.lineTo(centerX - this.brickWidth / 2, bottomY + this.brickHeight / 2);
      this.ctx.closePath();
      this.ctx.fill();
      this.ctx.stroke();
      
      // Right wing
      this.ctx.beginPath();
      this.ctx.moveTo(centerX + this.brickWidth / 2, bottomY - this.brickHeight / 2);
      this.ctx.lineTo(centerX + this.brickWidth / 2 + 25, bottomY + this.brickHeight / 2);
      this.ctx.lineTo(centerX + this.brickWidth / 2, bottomY + this.brickHeight / 2);
      this.ctx.closePath();
      this.ctx.fill();
      this.ctx.stroke();
    }
    
    this.ctx.restore();
  }
  
  drawLegoBrick(cx, cy, label, color, angle) {
    this.ctx.save();
    this.ctx.translate(cx, cy);
    this.ctx.rotate(angle);
    
    const w = this.brickWidth;
    const h = this.brickHeight;
    const x = -w / 2;
    const y = -h / 2;
    
    // Draw shadow
    this.ctx.fillStyle = '#1a1a1a';
    this.drawRoundedRect(x + 4, y + 4, w, h, 8);
    this.ctx.fill();
    
    // Draw brick body
    this.ctx.fillStyle = color;
    this.ctx.strokeStyle = '#1a1a1a';
    this.ctx.lineWidth = 4;
    this.drawRoundedRect(x, y, w, h, 8);
    this.ctx.fill();
    this.ctx.stroke();
    
    // Draw Lego Studs (4 small circles on top)
    this.ctx.fillStyle = color;
    this.ctx.lineWidth = 3;
    const studSpacing = w / 4;
    const studRadius = 6;
    const studY = y - 6;
    
    for (let i = 0; i < 4; i++) {
      const studX = x + (studSpacing * i) + (studSpacing / 2);
      
      this.ctx.beginPath();
      this.ctx.rect(studX - studRadius, studY, studRadius * 2, 6);
      this.ctx.fill();
      this.ctx.stroke();
      
      // Stud top highlights
      this.ctx.beginPath();
      this.ctx.arc(studX, studY, studRadius, Math.PI, 0);
      this.ctx.stroke();
    }
    
    // Draw label text
    this.ctx.fillStyle = color === '#f1c40f' ? '#1a1a1a' : '#ffffff'; // Dark text on yellow
    this.ctx.font = '700 0.95rem Fredoka, sans-serif';
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';
    this.ctx.fillText(label, 0, 1);
    
    this.ctx.restore();
  }
  
  drawRoundedRect(x, y, width, height, radius) {
    this.ctx.beginPath();
    this.ctx.moveTo(x + radius, y);
    this.ctx.lineTo(x + width - radius, y);
    this.ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    this.ctx.lineTo(x + width, y + height - radius);
    this.ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    this.ctx.lineTo(x + radius, y + height - radius);
    this.ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
    this.ctx.lineTo(x, y + radius);
    this.ctx.quadraticCurveTo(x, y, x + radius, y);
    this.ctx.closePath();
  }
  
  shuffle(array) {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
  }
}
