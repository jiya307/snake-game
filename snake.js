
(() => {

  const canvas = document.getElementById("game");
  const ctx = canvas.getContext("2d");

  const scoreEl = document.getElementById("score");
  const highScoreEl = document.getElementById("highScore");
  const finalScoreEl = document.getElementById("finalScore");

  const startScreen = document.getElementById("startScreen");
  const gameOverScreen = document.getElementById("gameOverScreen");
  const pauseScreen = document.getElementById("pauseScreen");

  const startBtn = document.getElementById("startBtn");
  const restartBtn = document.getElementById("restartBtn");
  const pauseBtn = document.getElementById("pauseBtn");
  const themeBtn = document.getElementById("themeBtn");


  const GRID = 20;
  const CELL = canvas.width / GRID; // 15

  
  let snake, dir, nextDir, food, score, speed, tickTimer;
  let running = false;
  let paused = false;
  const BASE_SPEED = 160; // ms per move (lower = faster)
  const MIN_SPEED = 60;

  let highScore = parseInt(localStorage.getItem("snakeHighScore") || "0", 10);
  highScoreEl.textContent = highScore;

 
  let audioCtx;
  function beep(freq, duration = 0.08, type = "square", volume = 0.15) {
    try {
      if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = type;
      osc.frequency.value = freq;
      gain.gain.value = volume;
      osc.connect(gain).connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + duration);
    } catch (e) { /* ignore */ }
  }
  const eatSound = () => beep(880, 0.07);
  const gameOverSound = () => {
    beep(330, 0.15);
    setTimeout(() => beep(220, 0.2), 140);
    setTimeout(() => beep(140, 0.3), 320);
  };

  function resetGame() {
    snake = [
      { x: 9, y: 10 },
      { x: 8, y: 10 },
      { x: 7, y: 10 },
    ];
    dir = { x: 1, y: 0 };
    nextDir = dir;
    score = 0;
    speed = BASE_SPEED;
    placeFood();
    updateScore();
  }

  function placeFood() {
    while (true) {
      const fx = Math.floor(Math.random() * GRID);
      const fy = Math.floor(Math.random() * GRID);
      if (!snake.some(s => s.x === fx && s.y === fy)) {
        food = { x: fx, y: fy };
        return;
      }
    }
  }

  function updateScore() {
    scoreEl.textContent = score;
    if (score > highScore) {
      highScore = score;
      highScoreEl.textContent = highScore;
      localStorage.setItem("snakeHighScore", String(highScore));
    }
  }

  function tick() {
    // Apply queued direction (prevents 180° reversal in one frame)
    if ((nextDir.x !== -dir.x || nextDir.y !== -dir.y)) dir = nextDir;

    const head = { x: snake[0].x + dir.x, y: snake[0].y + dir.y };

    // Wall collision
    if (head.x < 0 || head.x >= GRID || head.y < 0 || head.y >= GRID) {
      return endGame();
    }
    // Self collision
    if (snake.some(s => s.x === head.x && s.y === head.y)) {
      return endGame();
    }

    snake.unshift(head);

    // Food?
    if (head.x === food.x && head.y === food.y) {
      score += 10;
      eatSound();
      updateScore();
      placeFood();
      // Increase difficulty
      speed = Math.max(MIN_SPEED, BASE_SPEED - Math.floor(score / 20) * 8);
      restartLoop();
    } else {
      snake.pop();
    }

    draw();
  }

  function restartLoop() {
    clearInterval(tickTimer);
    tickTimer = setInterval(tick, speed);
  }

  // ---------- Rendering ----------
  function draw() {
    // Faint LCD background dots for retro feel
    ctx.fillStyle = getCssVar("--screen");
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const pixel = getCssVar("--pixel-on");

    // Subtle grid (off-pixels)
    ctx.fillStyle = withAlpha(pixel, 0.06);
    for (let x = 0; x < GRID; x++) {
      for (let y = 0; y < GRID; y++) {
        ctx.fillRect(x * CELL + 6, y * CELL + 6, 3, 3);
      }
    }

    // Food
    ctx.fillStyle = pixel;
    drawCell(food.x, food.y);

    // Snake
    snake.forEach((seg, i) => {
      ctx.fillStyle = pixel;
      drawCell(seg.x, seg.y, i === 0 ? 0 : 1);
    });
  }

  function drawCell(x, y, pad = 1) {
    ctx.fillRect(x * CELL + pad, y * CELL + pad, CELL - pad * 2, CELL - pad * 2);
  }

  function getCssVar(name) {
    return getComputedStyle(document.body).getPropertyValue(name).trim();
  }
  function withAlpha(color, a) {
    // assume hex like #rrggbb
    if (color.startsWith("#") && color.length === 7) {
      const r = parseInt(color.slice(1, 3), 16);
      const g = parseInt(color.slice(3, 5), 16);
      const b = parseInt(color.slice(5, 7), 16);
      return `rgba(${r},${g},${b},${a})`;
    }
    return color;
  }

  // ---------- Flow control ----------
  function startGame() {
    resetGame();
    startScreen.classList.add("hidden");
    gameOverScreen.classList.add("hidden");
    pauseScreen.classList.add("hidden");
    running = true;
    paused = false;
    pauseBtn.textContent = "II";
    restartLoop();
    draw();
  }

  function endGame() {
    clearInterval(tickTimer);
    running = false;
    gameOverSound();
    finalScoreEl.textContent = score;
    gameOverScreen.classList.remove("hidden");
  }

  function togglePause() {
    if (!running) return;
    paused = !paused;
    if (paused) {
      clearInterval(tickTimer);
      pauseScreen.classList.remove("hidden");
      pauseBtn.textContent = "▶";
    } else {
      pauseScreen.classList.add("hidden");
      pauseBtn.textContent = "II";
      restartLoop();
    }
  }

  // ---------- Input ----------
  const DIRS = {
    up: { x: 0, y: -1 },
    down: { x: 0, y: 1 },
    left: { x: -1, y: 0 },
    right: { x: 1, y: 0 },
  };

  function setDir(name) {
    const d = DIRS[name];
    if (!d) return;
    // prevent reversing onto self
    if (d.x === -dir.x && d.y === -dir.y) return;
    nextDir = d;
  }

  // Keyboard
  window.addEventListener("keydown", (e) => {
    switch (e.key) {
      case "ArrowUp": case "w": case "W": setDir("up"); e.preventDefault(); break;
      case "ArrowDown": case "s": case "S": setDir("down"); e.preventDefault(); break;
      case "ArrowLeft": case "a": case "A": setDir("left"); e.preventDefault(); break;
      case "ArrowRight": case "d": case "D": setDir("right"); e.preventDefault(); break;
      case " ": togglePause(); e.preventDefault(); break;
    }
  });

  // D-pad buttons (touch + click)
  document.querySelectorAll(".dpad-btn[data-dir]").forEach(btn => {
    const handler = (e) => {
      e.preventDefault();
      setDir(btn.dataset.dir);
    };
    btn.addEventListener("click", handler);
    btn.addEventListener("touchstart", handler, { passive: false });
  });

  // Swipe support on the canvas
  let touchStart = null;
  canvas.addEventListener("touchstart", (e) => {
    touchStart = { x: e.touches[0].clientX, y: e.touches[0].clientY };
  }, { passive: true });
  canvas.addEventListener("touchend", (e) => {
    if (!touchStart) return;
    const t = e.changedTouches[0];
    const dx = t.clientX - touchStart.x;
    const dy = t.clientY - touchStart.y;
    if (Math.abs(dx) > Math.abs(dy)) {
      setDir(dx > 0 ? "right" : "left");
    } else {
      setDir(dy > 0 ? "down" : "up");
    }
    touchStart = null;
  });

  // Buttons
  startBtn.addEventListener("click", startGame);
  restartBtn.addEventListener("click", startGame);
  pauseBtn.addEventListener("click", togglePause);


    

  // Initial paint behind the splash so screen isn't blank
  resetGame();
  draw();
})();
