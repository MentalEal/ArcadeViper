const GAME_CONFIG = {
  gridSize: 35,
  storageKey: "arcade-viper-save-v2",
  legacyScoreboardKey: "arcade-viper-scoreboard-v1",
  lastTagKey: "arcade-viper-last-tag",
  difficultyUnlockLevel: 10,
  highscoreLimit: 10,
  levelGoalFormula: "ceil((difficultyBase + (level - 1) * levelIncrease) * mapFactor)",
  rewardBands: { levels: 10, coins: 5 },
  enemyCoins: { enabled: true, snakeCanEat: false, eatReward: 10, hitLossPercent: 25, hitLossMinimum: 1, minSpawnDistance: 8, respawnMs: 5000, protectionMs: 1500, spawnAttempts: 300 },
  coin: { lifetimeMs: 7000, spawnAttempts: 300 },
  difficulties: {
    easy: { label: "Leicht", tickMs: 120, goalBase: 10, goalIncrease: 2, coinSpawnTicks: 46, levelOneCoinSpawnTicks: 100, enemies: [0, 1], enemyMoveTicks: 8 },
    medium: { label: "Mittel", tickMs: 95, goalBase: 15, goalIncrease: 3, coinSpawnTicks: 30, levelOneCoinSpawnTicks: 30, enemies: [1, 2], enemyMoveTicks: 5 },
    hard: { label: "Schwer", tickMs: 75, goalBase: 20, goalIncrease: 4, coinSpawnTicks: 18, levelOneCoinSpawnTicks: 18, enemies: [2, 4], enemyMoveTicks: 3 },
  },
  maps: [
    { id: "neon", name: "Neon-Grid", theme: "neon", goalFactor: 1, enemyCountBonus: 0, enemyTempoFactor: 1, obstacles: [] },
    { id: "desert", name: "Wüste", theme: "desert", goalFactor: 1.2, enemyCountBonus: 0, enemyTempoFactor: 1, obstacles: [{ x: 5, y: 6, w: 2, h: 4 }, { x: 27, y: 7, w: 3, h: 2 }, { x: 8, y: 27, w: 3, h: 2 }, { x: 26, y: 25, w: 2, h: 4 }, { x: 16, y: 5, w: 3, h: 2 }, { x: 16, y: 28, w: 3, h: 2 }] },
    { id: "ice", name: "Eisfeld", theme: "ice", goalFactor: 1.4, enemyCountBonus: 1, enemyTempoFactor: 0.9, obstacles: [{ x: 5, y: 5, w: 3, h: 3 }, { x: 27, y: 5, w: 3, h: 3 }, { x: 5, y: 27, w: 3, h: 3 }, { x: 27, y: 27, w: 3, h: 3 }, { x: 16, y: 4, w: 3, h: 2 }, { x: 16, y: 29, w: 3, h: 2 }] },
  ],
  shopItems: [
    { id: "map-neon", type: "map", mapId: "neon", name: "Neon-Grid", price: 0, description: "Dunkles Neon-Gitter ohne Hindernisse." },
    { id: "map-desert", type: "map", mapId: "desert", name: "Wüste", price: 100, description: "Sandfarbenes Feld mit Kakteen." },
    { id: "map-ice", type: "map", mapId: "ice", name: "Eisfeld", price: 150, description: "Kühle Farben und Eisblöcke." },
  ],
};

(function () {
  "use strict";

  const GRID_SIZE = GAME_CONFIG.gridSize;
  const DIRS = { up: { x: 0, y: -1 }, down: { x: 0, y: 1 }, left: { x: -1, y: 0 }, right: { x: 1, y: 0 } };
  const OPPOSITE = { up: "down", down: "up", left: "right", right: "left" };
  const TRACKS = {
    easy: [
      { title: "Chill Gaming Relaxing Ambient Background", file: "music/easy.mp3" },
      { title: "Pixel Dreams", file: "music/easy-pixel-dreams.mp3" },
      { title: "Pixel Fantasia", file: "music/easy-pixel-fantasia.mp3" },
      { title: "Pixel Paradise 2.0", file: "music/easy-pixel-paradise.mp3" },
      { title: "Retro Arcade Game Music", file: "music/easy-retro-arcade.mp3" },
    ],
    medium: [
      { title: "Chiptune Video Game Games Music", file: "music/medium.mp3" },
      { title: "Retro Game Arcade", file: "music/medium-retro-game-arcade.mp3" },
      { title: "8-bit Arcade Mode", file: "music/medium-arcade-mode.mp3" },
      { title: "Play Again - Classic Arcade Game", file: "music/medium-play-again.mp3" },
      { title: "356 | 8-Bit Chiptune Game Music", file: "music/medium-356.mp3" },
    ],
    hard: [
      { title: "Fast-Paced 8bit Chiptune for Retro Gaming", file: "music/hard.mp3" },
      { title: "The Return Of The 8-bit Era", file: "music/hard-return-8bit-era.mp3" },
      { title: "Combat | Fast-Paced 8-Bit Chiptune", file: "music/hard-combat.mp3" },
      { title: "Pixify", file: "music/hard-pixify.mp3" },
    ],
  };

  const $ = (id) => document.getElementById(id);
  const gridEl = $("grid");
  const cells = [];
  const scoreEl = $("score");
  const statusEl = $("status");
  const difficultySelect = $("difficultySelect");
  const levelHud = $("levelHud");
  const progressHud = $("progressHud");
  const runCoinsHud = $("runCoinsHud");
  const walletHud = $("walletHud");
  const mapHud = $("mapHud");
  const recordHud = $("recordHud");
  const shopList = $("shopList");
  const menuWallet = $("menuWallet");
  const difficultyHint = $("difficultyHint");
  const introOverlay = $("introOverlay");
  $("resetSaveBtn").remove();
  const scoreboardPanel = $("scoreboardPanel");
  const scoreboardList = $("scoreboardList");
  const nameEntryModal = $("nameEntryModal");
  const nameEntryInput = $("nameEntryInput");
  const nameEntryHint = $("nameEntryHint");
  const saveNameEntryBtn = $("saveNameEntryBtn");
  const musicAudio = new Audio();
  musicAudio.loop = false;
  musicAudio.preload = "auto";
  const volumeRange = $("volumeRange");
  musicAudio.volume = Math.max(0, Math.min(1, Number(volumeRange.value) / 100));

  gridEl.style.setProperty("--grid-size", String(GRID_SIZE));
  for (let i = 0; i < GRID_SIZE * GRID_SIZE; i += 1) {
    const cell = document.createElement("div");
    cell.className = "cell";
    gridEl.appendChild(cell);
    cells.push(cell);
  }

  function key(x, y) { return x + "," + y; }
  function mapInfo(id) { return GAME_CONFIG.maps.find((item) => item.id === id) || GAME_CONFIG.maps[0]; }
  function levelKey(mapId, difficulty, level) { return mapId + ":" + difficulty + ":" + level; }
  function emptyDifficultyValues(value) { return { easy: value, medium: value, hard: value }; }

  function defaultSave() {
    const progress = {};
    const highscores = {};
    const selectedDifficulty = {};
    GAME_CONFIG.maps.forEach((map) => {
      progress[map.id] = emptyDifficultyValues(1);
      highscores[map.id] = emptyDifficultyValues(0);
      selectedDifficulty[map.id] = "easy";
    });
    return { coins: 0, ownedMaps: ["neon"], ownedItems: [], equippedShopItems: {}, selectedMap: "neon", progress, selectedDifficulty, highscores, completed: {}, scoreboard: {} };
  }

  function readLegacyScoreboard() {
    try {
      const data = JSON.parse(localStorage.getItem(GAME_CONFIG.legacyScoreboardKey) || "null");
      return data && typeof data === "object" ? data : {};
    } catch (error) { return {}; }
  }

  function loadSave() {
    const fallback = defaultSave();
    try {
      const raw = JSON.parse(localStorage.getItem(GAME_CONFIG.storageKey) || "null");
      if (!raw || typeof raw !== "object") {
        const legacy = readLegacyScoreboard();
        if (legacy.easy || legacy.medium || legacy.hard) fallback.scoreboard.neon = legacy;
        return fallback;
      }
      const data = defaultSave();
      data.coins = Number.isFinite(raw.coins) && raw.coins >= 0 ? Math.floor(raw.coins) : 0;
      data.ownedMaps = Array.isArray(raw.ownedMaps) ? raw.ownedMaps.filter((id) => GAME_CONFIG.maps.some((map) => map.id === id)) : ["neon"];
      if (!data.ownedMaps.includes("neon")) data.ownedMaps.unshift("neon");
      data.ownedItems = Array.isArray(raw.ownedItems) ? raw.ownedItems.filter((id) => typeof id === "string") : [];
      data.equippedShopItems = raw.equippedShopItems && typeof raw.equippedShopItems === "object" ? raw.equippedShopItems : {};
      data.selectedMap = data.ownedMaps.includes(raw.selectedMap) ? raw.selectedMap : "neon";
      GAME_CONFIG.maps.forEach((map) => {
        const selected = raw.selectedDifficulty && raw.selectedDifficulty[map.id];
        if (["easy", "medium", "hard"].includes(selected)) data.selectedDifficulty[map.id] = selected;
        ["easy", "medium", "hard"].forEach((difficulty) => {
          const value = raw.progress && raw.progress[map.id] && Number(raw.progress[map.id][difficulty]);
          if (Number.isFinite(value) && value >= 1) data.progress[map.id][difficulty] = Math.floor(value);
          const record = raw.highscores && raw.highscores[map.id] && Number(raw.highscores[map.id][difficulty]);
          if (Number.isFinite(record) && record >= 0) data.highscores[map.id][difficulty] = Math.floor(record);
          const entries = raw.scoreboard && raw.scoreboard[map.id] && raw.scoreboard[map.id][difficulty];
          if (Array.isArray(entries)) {
            if (!data.scoreboard[map.id]) data.scoreboard[map.id] = emptyDifficultyValues([]);
            data.scoreboard[map.id][difficulty] = entries.filter((entry) => entry && typeof entry.name === "string" && Number.isFinite(entry.score) && Number.isFinite(entry.durationMs) && typeof entry.createdAt === "string").slice(0, GAME_CONFIG.highscoreLimit);
          }
        });
      });
      data.completed = raw.completed && typeof raw.completed === "object" ? raw.completed : {};
      if (!Object.keys(data.scoreboard).length) {
        const legacy = readLegacyScoreboard();
        if (legacy.easy || legacy.medium || legacy.hard) data.scoreboard.neon = legacy;
      }
      return data;
    } catch (error) { return fallback; }
  }

  let saveData = loadSave();
  function saveGameData() {
    try { localStorage.setItem(GAME_CONFIG.storageKey, JSON.stringify(saveData)); }
    catch (error) { console.warn("Spielstand konnte nicht gespeichert werden.", error); }
  }

  let currentMapId = saveData.selectedMap;
  let currentDifficulty = saveData.selectedDifficulty[currentMapId] || "easy";
  let scoreboardDifficulty = currentDifficulty;
  let state;
  let runStartedAt = null;
  let runFinishedHandled = false;
  let pendingScoreEntry = null;
  let timerId = null;
  let currentTrack = null;
  let musicEnabled = true;
  let audioUnlocked = false;
  let musicAvailable = true;
  let coinTicks = 0;
  let newRecordThisRun = false;
  let gameClockMs = 0;
  let gameClockAnchor = Date.now();
  let gameClockSuspended = true;
  const failedTracks = { easy: new Set(), medium: new Set(), hard: new Set() };
  const settings = { colorblindMode: false };

  function unlocked(mapId, difficulty) {
    if (difficulty === "easy") return true;
    const prior = difficulty === "medium" ? "easy" : "medium";
    return saveData.progress[mapId][prior] > GAME_CONFIG.difficultyUnlockLevel;
  }

  function levelFor(mapId, difficulty) { return saveData.progress[mapId][difficulty]; }
  function gameNow() {
    return gameClockMs + (gameClockSuspended ? 0 : Date.now() - gameClockAnchor);
  }

  function syncGameClock() {
    const shouldSuspend = !state || !state.started || state.paused || state.gameOver
      || !scoreboardPanel.hidden || !nameEntryModal.hidden || !$("settingsPanel").hidden;
    if (shouldSuspend && !gameClockSuspended) {
      gameClockMs += Date.now() - gameClockAnchor;
      gameClockSuspended = true;
    } else if (!shouldSuspend && gameClockSuspended) {
      gameClockAnchor = Date.now();
      gameClockSuspended = false;
    }
  }

  function goalFor(mapId, difficulty, level) {
    const rule = GAME_CONFIG.difficulties[difficulty];
    return Math.ceil((rule.goalBase + (level - 1) * rule.goalIncrease) * mapInfo(mapId).goalFactor);
  }

  function buildObstacles(mapId) {
    const occupied = new Set();
    mapInfo(mapId).obstacles.forEach((rect) => {
      for (let y = rect.y; y < rect.y + rect.h; y += 1) {
        for (let x = rect.x; x < rect.x + rect.w; x += 1) {
          if (x >= 0 && y >= 0 && x < GRID_SIZE && y < GRID_SIZE) occupied.add(key(x, y));
        }
      }
    });
    return occupied;
  }

  function randomFreeCell(randomFn, blocked) {
    const candidates = [];
    for (let y = 0; y < GRID_SIZE; y += 1) {
      for (let x = 0; x < GRID_SIZE; x += 1) if (!blocked.has(key(x, y))) candidates.push({ x, y });
    }
    if (!candidates.length) return null;
    return candidates[Math.floor(randomFn() * candidates.length)];
  }

  function spawnFood(snake, randomFn, obstacles, coin, enemies) {
    const blocked = new Set(obstacles);
    snake.forEach((part) => blocked.add(key(part.x, part.y)));
    if (coin) blocked.add(key(coin.x, coin.y));
    (enemies || []).filter((enemy) => enemy.alive).forEach((enemy) => blocked.add(key(enemy.x, enemy.y)));
    return randomFreeCell(randomFn, blocked);
  }

  function spawnCoin(randomFn, gameState) {
    const blocked = new Set(gameState.obstacles);
    gameState.snake.forEach((part) => blocked.add(key(part.x, part.y)));
    if (gameState.food) blocked.add(key(gameState.food.x, gameState.food.y));
    gameState.enemies.filter((enemy) => enemy.alive).forEach((enemy) => blocked.add(key(enemy.x, enemy.y)));
    for (let attempt = 0; attempt < GAME_CONFIG.coin.spawnAttempts; attempt += 1) {
      const pos = randomFreeCell(randomFn, blocked);
      if (pos) return { ...pos, expiresAt: gameNow() + GAME_CONFIG.coin.lifetimeMs };
    }
    return null;
  }

  function spawnEnemy(randomFn, gameState, protection = true) {
    const blocked = new Set(gameState.obstacles);
    gameState.snake.forEach((part) => blocked.add(key(part.x, part.y)));
    if (gameState.food) blocked.add(key(gameState.food.x, gameState.food.y));
    if (gameState.coin) blocked.add(key(gameState.coin.x, gameState.coin.y));
    gameState.enemies.filter((enemy) => enemy.alive).forEach((enemy) => blocked.add(key(enemy.x, enemy.y)));
    const head = gameState.snake[0];
    const valid = [];
    for (let y = 0; y < GRID_SIZE; y += 1) {
      for (let x = 0; x < GRID_SIZE; x += 1) {
        const distance = Math.abs(head.x - x) + Math.abs(head.y - y);
        if (!blocked.has(key(x, y)) && distance >= GAME_CONFIG.enemyCoins.minSpawnDistance) valid.push({ x, y });
      }
    }
    if (!valid.length) return null;
    const pos = valid[Math.floor(randomFn() * valid.length)];
    return { ...pos, alive: true, moveIn: 1, protectedUntil: protection ? gameNow() + GAME_CONFIG.enemyCoins.protectionMs : 0, respawnAt: null };
  }

  function enemyCountFor(mapId, difficulty, randomFn) {
    const range = GAME_CONFIG.difficulties[difficulty].enemies;
    const count = range[0] + Math.floor(randomFn() * (range[1] - range[0] + 1));
    return count + mapInfo(mapId).enemyCountBonus;
  }

  function createInitialState(randomFn, started = false) {
    const obstacles = buildObstacles(currentMapId);
    const start = { x: Math.floor(GRID_SIZE / 2), y: Math.floor(GRID_SIZE / 2) };
    const gameState = {
      snake: [start], dir: "right", nextDir: "right", food: null, score: 0,
      gameOver: false, paused: false, started, level: levelFor(currentMapId, currentDifficulty),
      runCoins: 0, coin: null, enemies: [], obstacles, levelComplete: false,
    };
    gameState.food = spawnFood(gameState.snake, randomFn, obstacles, null, []);
    if (GAME_CONFIG.enemyCoins.enabled) {
      const count = enemyCountFor(currentMapId, currentDifficulty, randomFn);
      for (let index = 0; index < count; index += 1) {
        const enemy = spawnEnemy(randomFn, gameState);
        if (enemy) gameState.enemies.push(enemy);
      }
    }
    return gameState;
  }

  function setNextDirection(gameState, direction) {
    if (!DIRS[direction] || OPPOSITE[gameState.dir] === direction) return gameState;
    return { ...gameState, nextDir: direction };
  }

  function collectCoin(gameState) {
    gameState.runCoins += 1;
    saveData.coins += 1;
    saveGameData();
  }

  function enemyHitsSnake(gameState, enemy) {
    if (!enemy.alive || gameNow() < enemy.protectedUntil) return false;
    if (currentDifficulty === "hard") {
      gameState.gameOver = true;
      return true;
    }
    const loss = gameState.runCoins > 0
      ? Math.max(GAME_CONFIG.enemyCoins.hitLossMinimum, Math.floor(gameState.runCoins * GAME_CONFIG.enemyCoins.hitLossPercent / 100))
      : 0;
    gameState.runCoins -= loss;
    saveData.coins = Math.max(0, saveData.coins - loss);
    enemy.alive = false;
    enemy.respawnAt = gameNow() + GAME_CONFIG.enemyCoins.respawnMs;
    saveGameData();
    return true;
  }

  function enemyMovePeriod() {
    return Math.max(1, Math.round(GAME_CONFIG.difficulties[currentDifficulty].enemyMoveTicks * mapInfo(currentMapId).enemyTempoFactor));
  }

  function moveEnemies(gameState, randomFn) {
    if (!GAME_CONFIG.enemyCoins.enabled || gameState.gameOver) return;
    gameState.enemies.forEach((enemy) => {
      if (gameState.gameOver) return;
      if (!enemy.alive) {
        if (enemy.respawnAt !== null && gameNow() >= enemy.respawnAt) {
          const replacement = spawnEnemy(randomFn, gameState);
          if (replacement) Object.assign(enemy, replacement);
        }
        return;
      }
      enemy.moveIn -= 1;
      if (enemy.moveIn > 0) return;
      enemy.moveIn = enemyMovePeriod();
      const directions = Object.keys(DIRS).sort(() => randomFn() - 0.5);
      for (const direction of directions) {
        const delta = DIRS[direction];
        const x = enemy.x + delta.x;
        const y = enemy.y + delta.y;
        if (x < 0 || y < 0 || x >= GRID_SIZE || y >= GRID_SIZE || gameState.obstacles.has(key(x, y))) continue;
        if (gameState.enemies.some((other) => other !== enemy && other.alive && other.x === x && other.y === y)) continue;
        const onSnake = gameState.snake.some((part) => part.x === x && part.y === y);
        if (onSnake) {
          enemy.x = x;
          enemy.y = y;
          enemyHitsSnake(gameState, enemy);
          break;
        }
        enemy.x = x;
        enemy.y = y;
        break;
      }
    });
  }

  function step(gameState, randomFn) {
    if (!gameState.started || gameState.gameOver || gameState.paused) return gameState;
    const direction = gameState.nextDir;
    const delta = DIRS[direction];
    const head = gameState.snake[0];
    const nextHead = { x: head.x + delta.x, y: head.y + delta.y };
    if (nextHead.x < 0 || nextHead.y < 0 || nextHead.x >= GRID_SIZE || nextHead.y >= GRID_SIZE || gameState.obstacles.has(key(nextHead.x, nextHead.y))) {
      return { ...gameState, dir: direction, gameOver: true };
    }

    const hitsEnemy = GAME_CONFIG.enemyCoins.enabled && gameState.enemies.find((enemy) => enemy.alive && enemy.x === nextHead.x && enemy.y === nextHead.y);
    if (hitsEnemy && GAME_CONFIG.enemyCoins.snakeCanEat) {
      hitsEnemy.alive = false;
      hitsEnemy.respawnAt = gameNow() + GAME_CONFIG.enemyCoins.respawnMs;
      gameState.runCoins += GAME_CONFIG.enemyCoins.eatReward;
      saveData.coins += GAME_CONFIG.enemyCoins.eatReward;
      saveGameData();
    } else if (hitsEnemy) {
      enemyHitsSnake(gameState, hitsEnemy);
      if (gameState.gameOver) return { ...gameState, dir: direction };
    }

    const willGrow = gameState.food && nextHead.x === gameState.food.x && nextHead.y === gameState.food.y;
    const collectedCoin = gameState.coin && nextHead.x === gameState.coin.x && nextHead.y === gameState.coin.y;
    const nextSnake = [nextHead, ...gameState.snake];
    if (!willGrow) nextSnake.pop();
    if (nextSnake.slice(1).some((part) => part.x === nextHead.x && part.y === nextHead.y)) return { ...gameState, dir: direction, snake: nextSnake, gameOver: true };

    gameState.snake = nextSnake;
    gameState.dir = direction;
    if (collectedCoin) {
      collectCoin(gameState);
      gameState.coin = null;
    }
    if (willGrow) {
      gameState.score += 1;
      gameState.food = spawnFood(gameState.snake, randomFn, gameState.obstacles, gameState.coin, gameState.enemies);
    }
    if (gameState.coin && gameNow() >= gameState.coin.expiresAt) gameState.coin = null;

    coinTicks += 1;
    const difficultyConfig = GAME_CONFIG.difficulties[currentDifficulty];
    const spawnEvery = gameState.level === 1 && currentDifficulty === "easy"
      ? difficultyConfig.levelOneCoinSpawnTicks
      : difficultyConfig.coinSpawnTicks;
    if (!gameState.coin && coinTicks >= spawnEvery) {
      gameState.coin = spawnCoin(randomFn, gameState);
      coinTicks = 0;
    }

    moveEnemies(gameState, randomFn);
    if (!gameState.gameOver && gameState.score >= goalFor(currentMapId, currentDifficulty, gameState.level)) {
      gameState.gameOver = true;
      gameState.levelComplete = true;
    } else if (!gameState.gameOver && !gameState.food) {
      gameState.gameOver = true;
    }
    return gameState;
  }

  function formatDuration(durationMs) {
    const totalSeconds = Math.max(0, Math.floor(durationMs / 1000));
    return String(Math.floor(totalSeconds / 60)).padStart(2, "0") + ":" + String(totalSeconds % 60).padStart(2, "0");
  }
  function formatDate(iso) { return new Date(iso).toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "2-digit" }); }
  function normalizeTag(value) { return value.normalize("NFKC").toUpperCase().replace(/[^\p{L}0-9]/gu, "").slice(0, 5); }
  function scoreSort(a, b) { return b.score - a.score || a.durationMs - b.durationMs || new Date(a.createdAt) - new Date(b.createdAt); }

  function scoreboardFor(mapId, difficulty) {
    if (!saveData.scoreboard[mapId]) saveData.scoreboard[mapId] = emptyDifficultyValues([]);
    if (!Array.isArray(saveData.scoreboard[mapId][difficulty])) saveData.scoreboard[mapId][difficulty] = [];
    return saveData.scoreboard[mapId][difficulty];
  }

  function qualifiesForScoreboard(entries, entry) {
    const list = entries.slice().sort(scoreSort);
    if (list.length < GAME_CONFIG.highscoreLimit) return true;
    const worst = list[list.length - 1];
    return entry.score > worst.score || (entry.score === worst.score && entry.durationMs < worst.durationMs);
  }

  function renderScoreboard() {
    document.querySelectorAll("[data-board-difficulty]").forEach((button) => {
      button.classList.toggle("active", button.getAttribute("data-board-difficulty") === scoreboardDifficulty);
    });
    const entries = scoreboardFor(currentMapId, scoreboardDifficulty).slice().sort(scoreSort);
    scoreboardList.innerHTML = "";
    const context = $("boardContext");
    if (context) context.textContent = mapInfo(currentMapId).name + " // " + GAME_CONFIG.difficulties[scoreboardDifficulty].label;
    if (!entries.length) {
      const empty = document.createElement("div");
      empty.className = "scoreboard-empty";
      empty.textContent = "Noch keine Runs gespeichert. Hol dir den ersten Platz.";
      scoreboardList.appendChild(empty);
      return;
    }
    entries.forEach((entry, index) => {
      const item = document.createElement("li");
      item.className = "scoreboard-item";
      const rank = document.createElement("div");
      rank.className = "scoreboard-rank";
      rank.textContent = String(index + 1).padStart(2, "0");
      const main = document.createElement("div");
      main.className = "scoreboard-main";
      const name = document.createElement("div");
      name.className = "scoreboard-name";
      name.textContent = entry.name;
      const meta = document.createElement("div");
      meta.className = "scoreboard-meta";
      meta.textContent = formatDuration(entry.durationMs) + " // " + formatDate(entry.createdAt);
      main.append(name, meta);
      const points = document.createElement("div");
      points.className = "scoreboard-points";
      points.textContent = entry.score + " pts";
      item.append(rank, main, points);
      scoreboardList.appendChild(item);
    });
  }

  function renderShop() {
    menuWallet.textContent = String(saveData.coins);
    shopList.innerHTML = "";
    GAME_CONFIG.shopItems.forEach((item) => {
      const card = document.createElement("div");
      card.className = "shop-item";
      const owned = item.type === "map" ? saveData.ownedMaps.includes(item.mapId) : saveData.ownedItems.includes(item.id);
      const selected = item.type === "map" ? currentMapId === item.mapId : saveData.equippedShopItems[item.type] === item.id;
      const record = item.type === "map" ? saveData.highscores[item.mapId][currentDifficulty] : null;
      const action = document.createElement("button");
      const title = document.createElement("strong");
      title.textContent = item.name;
      const description = document.createElement("p");
      description.textContent = item.description + (record === null ? "" : " Rekord auf " + GAME_CONFIG.difficulties[currentDifficulty].label + ": " + record + ".");
      const price = document.createElement("p");
      price.textContent = item.price === 0 ? "Kostenlos" : item.price + " Münzen";
      action.textContent = owned ? (selected ? "Ausgewählt" : (item.type === "map" ? "Map auswählen" : "Ausrüsten")) : "Kaufen";
      action.disabled = (owned && selected) || (!owned && saveData.coins < item.price);
      action.addEventListener("click", () => {
        if (!owned) {
          if (saveData.coins < item.price) return;
          saveData.coins -= item.price;
          if (item.type === "map") saveData.ownedMaps.push(item.mapId);
          else saveData.ownedItems.push(item.id);
        }
        if (item.type === "map") {
          currentMapId = item.mapId;
          saveData.selectedMap = currentMapId;
          if (!unlocked(currentMapId, currentDifficulty)) currentDifficulty = "easy";
          saveData.selectedDifficulty[currentMapId] = currentDifficulty;
        } else {
          saveData.equippedShopItems[item.type] = item.id;
        }
        saveGameData();
        refreshDifficultyOptions();
        startLoop();
        prepareRandomTrack(true);
        updateTheme();
        state = createInitialState(Math.random);
        render(state);
        renderShop();
      });
      card.append(title, description, price, action);
      shopList.appendChild(card);
    });
  }

  function refreshDifficultyOptions() {
    const previous = currentDifficulty;
    difficultySelect.innerHTML = "";
    ["easy", "medium", "hard"].forEach((difficulty) => {
      const option = document.createElement("option");
      option.value = difficulty;
      const available = unlocked(currentMapId, difficulty);
      option.textContent = GAME_CONFIG.difficulties[difficulty].label + (available ? "" : " (gesperrt: Level 10 " + (difficulty === "medium" ? "Leicht" : "Mittel") + ")");
      option.disabled = !available;
      difficultySelect.appendChild(option);
    });
    if (!unlocked(currentMapId, currentDifficulty)) currentDifficulty = "easy";
    difficultySelect.value = currentDifficulty;
    saveData.selectedDifficulty[currentMapId] = currentDifficulty;
    const mediumDone = Math.max(0, levelFor(currentMapId, "easy") - 1);
    const hardDone = Math.max(0, levelFor(currentMapId, "medium") - 1);
    difficultyHint.textContent = "Mittel: Level " + GAME_CONFIG.difficultyUnlockLevel + " auf Leicht abschließen (" + Math.min(mediumDone, GAME_CONFIG.difficultyUnlockLevel) + "/" + GAME_CONFIG.difficultyUnlockLevel + "). Schwer: Level " + GAME_CONFIG.difficultyUnlockLevel + " auf Mittel abschließen (" + Math.min(hardDone, GAME_CONFIG.difficultyUnlockLevel) + "/" + GAME_CONFIG.difficultyUnlockLevel + ").";
    if (previous !== currentDifficulty) scoreboardDifficulty = currentDifficulty;
  }

  function updateTheme() {
    document.body.classList.remove("map-neon", "map-desert", "map-ice");
    document.body.classList.add("map-" + mapInfo(currentMapId).theme);
  }

  function updateIntroVisibility() { introOverlay.hidden = state.started; }

  function render(currentState) {
    syncGameClock();
    for (const cell of cells) cell.className = "cell";
    currentState.obstacles.forEach((position) => {
      const [x, y] = position.split(",").map(Number);
      cells[y * GRID_SIZE + x].classList.add("obstacle");
    });
    if (currentState.food) cells[currentState.food.y * GRID_SIZE + currentState.food.x].classList.add("food");
    if (currentState.coin) cells[currentState.coin.y * GRID_SIZE + currentState.coin.x].classList.add("coin");
    currentState.enemies.filter((enemy) => enemy.alive).forEach((enemy) => cells[enemy.y * GRID_SIZE + enemy.x].classList.add("enemy"));
    currentState.snake.forEach((part, index) => {
      const cell = cells[part.y * GRID_SIZE + part.x];
      cell.classList.add("snake");
      if (index === 0) cell.classList.add("snake-head", "head-" + (currentState.started ? currentState.dir : currentState.nextDir));
    });
    scoreEl.textContent = String(currentState.score);
    const target = goalFor(currentMapId, currentDifficulty, currentState.level);
    levelHud.textContent = String(currentState.level);
    progressHud.textContent = Math.min(currentState.score, target) + "/" + target;
    runCoinsHud.textContent = String(currentState.runCoins);
    walletHud.textContent = String(saveData.coins);
    mapHud.textContent = mapInfo(currentMapId).name + " · " + GAME_CONFIG.difficulties[currentDifficulty].label;
    recordHud.textContent = String(saveData.highscores[currentMapId][currentDifficulty]);
    recordHud.classList.toggle("new-record", newRecordThisRun);
    difficultySelect.disabled = currentState.started && (!currentState.gameOver || currentState.levelComplete);
    $("pauseBtn").textContent = currentState.paused ? "Weiter" : "Pause";
    $("menuBtn").disabled = currentState.started && !currentState.gameOver;
    $("restartBtn").textContent = currentState.gameOver && currentState.levelComplete ? "Nächstes Level" : (currentState.gameOver ? "Nochmal" : "Neu");
    if (!currentState.started) statusEl.textContent = "Bereit. Wähle Map und Schwierigkeit, dann starte den Run.";
    else if (currentState.gameOver && currentState.levelComplete) statusEl.textContent = "Level geschafft! Der nächste Versuch startet mit Level " + levelFor(currentMapId, currentDifficulty) + ". " + (currentState.levelReward > 0 ? "+" + currentState.levelReward + " Münzen Levelbelohnung. " : "Keine erneute Levelbelohnung. ") + (newRecordThisRun ? "Neuer Rekord!" : "");
    else if (currentState.gameOver) statusEl.textContent = "Run beendet. Level " + currentState.level + " startet beim nächsten Versuch erneut." + (newRecordThisRun ? " Neuer Rekord!" : "");
    else if (currentState.paused) statusEl.textContent = "Pausiert.";
    else statusEl.textContent = "Läuft. Ziel für Level " + currentState.level + ": " + target + " Punkte.";
    updateIntroVisibility();
  }

  function updateMusicUi() {
    const label = GAME_CONFIG.difficulties[currentDifficulty].label.toUpperCase();
    $("musicToggleBtn").textContent = musicAvailable ? (musicEnabled ? "Musik: An" : "Musik: Aus") : "Musik fehlt";
    $("trackName").textContent = label + " // " + (musicAvailable && currentTrack ? currentTrack.title + " // Shuffle" : "Keine verfuegbare Playlist");
  }
  function stopAllMusic() { musicAudio.pause(); musicAudio.currentTime = 0; }
  function chooseRandomTrack(difficulty, exclude) {
    const tracks = TRACKS[difficulty].filter((track) => !failedTracks[difficulty].has(track.file) && (!exclude || track.file !== exclude || TRACKS[difficulty].length === 1));
    return tracks.length ? tracks[Math.floor(Math.random() * tracks.length)] : null;
  }
  function loadTrack(track) {
    currentTrack = track;
    if (!track) { musicAvailable = false; stopAllMusic(); updateMusicUi(); return; }
    musicAvailable = true;
    musicAudio.src = track.file;
    musicAudio.load();
    updateMusicUi();
  }
  function prepareRandomTrack(forceDifferent) {
    loadTrack(chooseRandomTrack(currentDifficulty, forceDifferent && currentTrack ? currentTrack.file : null));
  }
  function unlockAudioIfNeeded() {
    if (audioUnlocked) return;
    audioUnlocked = true;
    if (!currentTrack) prepareRandomTrack(false);
    else if (musicEnabled) musicAudio.play().catch(() => {});
  }

  function pauseForOverlayIfNeeded() {
    if (state.started && !state.paused && !state.gameOver) { state.paused = true; render(state); }
  }
  function openScoreboardPanel(difficulty = currentDifficulty) {
    scoreboardDifficulty = difficulty;
    pauseForOverlayIfNeeded();
    renderScoreboard();
    scoreboardPanel.hidden = false;
    $("modalBackdrop").hidden = false;
  }
  function closeScoreboardPanel() {
    scoreboardPanel.hidden = true;
    $("modalBackdrop").hidden = scoreboardPanel.hidden && nameEntryModal.hidden;
    if (state.paused && !state.gameOver) { state.paused = false; render(state); }
  }
  function openSettings() { pauseForOverlayIfNeeded(); $("settingsPanel").hidden = false; }
  function closeSettings() {
    $("settingsPanel").hidden = true;
    if (state.paused && !state.gameOver && scoreboardPanel.hidden && nameEntryModal.hidden) { state.paused = false; render(state); }
  }
  function sanitizeNameInput() {
    nameEntryInput.value = normalizeTag(nameEntryInput.value);
    const ready = nameEntryInput.value.length >= 1;
    saveNameEntryBtn.disabled = !ready;
    nameEntryHint.textContent = ready ? "Bereit zum Speichern." : "Mindestens 1 Zeichen. Aktuell: " + nameEntryInput.value.length + "/5";
  }
  function openNameEntry(entry) {
    pendingScoreEntry = entry;
    nameEntryInput.value = normalizeTag(localStorage.getItem(GAME_CONFIG.lastTagKey) || "VIPER");
    $("nameEntryCopy").textContent = "Neuer Top Run auf " + mapInfo(entry.mapId).name + " / " + GAME_CONFIG.difficulties[entry.difficulty].label + ". Score " + entry.score + " // Zeit " + formatDuration(entry.durationMs);
    nameEntryModal.hidden = false;
    $("modalBackdrop").hidden = false;
    sanitizeNameInput();
  }
  function closeNameEntry(saveEntry) {
    if (saveEntry && pendingScoreEntry && nameEntryInput.value.length >= 1) {
      const entries = scoreboardFor(pendingScoreEntry.mapId, pendingScoreEntry.difficulty);
      entries.push({ name: normalizeTag(nameEntryInput.value), score: pendingScoreEntry.score, durationMs: pendingScoreEntry.durationMs, createdAt: new Date().toISOString() });
      entries.sort(scoreSort);
      entries.splice(GAME_CONFIG.highscoreLimit);
      localStorage.setItem(GAME_CONFIG.lastTagKey, normalizeTag(nameEntryInput.value));
      saveGameData();
    }
    pendingScoreEntry = null;
    nameEntryModal.hidden = true;
    $("modalBackdrop").hidden = scoreboardPanel.hidden;
    if (saveEntry) openScoreboardPanel(scoreboardDifficulty);
  }

  function rewardForLevel(level) {
    return GAME_CONFIG.rewardBands.coins * (Math.floor(level / GAME_CONFIG.rewardBands.levels) + 1);
  }
  function finishLevel(currentState) {
    currentState.levelReward = 0;
    if (currentState.levelComplete) {
      const marker = levelKey(currentMapId, currentDifficulty, currentState.level);
      if (!saveData.completed[marker]) {
        const reward = rewardForLevel(currentState.level);
        saveData.coins += reward;
        currentState.runCoins += reward;
        currentState.levelReward = reward;
        saveData.completed[marker] = true;
      }
      saveData.progress[currentMapId][currentDifficulty] = Math.max(saveData.progress[currentMapId][currentDifficulty], currentState.level + 1);
    }
    const priorRecord = saveData.highscores[currentMapId][currentDifficulty];
    newRecordThisRun = currentState.score > priorRecord;
    if (newRecordThisRun) saveData.highscores[currentMapId][currentDifficulty] = currentState.score;
    const entry = { mapId: currentMapId, difficulty: currentDifficulty, score: currentState.score, durationMs: runStartedAt === null ? 0 : Date.now() - runStartedAt };
    runFinishedHandled = true;
    saveGameData();
    renderShop();
    if (qualifiesForScoreboard(scoreboardFor(currentMapId, currentDifficulty), entry)) openNameEntry(entry);
  }

  function startGame() {
    if (state.started) return;
    unlockAudioIfNeeded();
    state.started = true;
    state.paused = false;
    runStartedAt = Date.now();
    runFinishedHandled = false;
    newRecordThisRun = false;
    render(state);
  }
  function restartGame() {
    unlockAudioIfNeeded();
    state = createInitialState(Math.random, true);
    runStartedAt = Date.now();
    runFinishedHandled = false;
    newRecordThisRun = false;
    coinTicks = 0;
    render(state);
  }
  function goToMenu() {
    if (state.started && !state.gameOver) return;
    state = createInitialState(Math.random);
    runStartedAt = null;
    runFinishedHandled = false;
    renderShop();
    refreshDifficultyOptions();
    render(state);
  }
  function startLoop() {
    if (timerId !== null) clearInterval(timerId);
    timerId = setInterval(() => {
      const wasGameOver = state.gameOver;
      state = step(state, Math.random);
      if (!wasGameOver && state.gameOver && !runFinishedHandled) finishLevel(state);
      render(state);
    }, GAME_CONFIG.difficulties[currentDifficulty].tickMs);
  }
  function handleDirectionInput(direction) {
    if (state.gameOver) return;
    unlockAudioIfNeeded();
    if (!state.started) startGame();
    state = setNextDirection(state, direction);
    render(state);
  }

  musicAudio.addEventListener("error", () => {
    if (currentTrack) failedTracks[currentDifficulty].add(currentTrack.file);
    loadTrack(chooseRandomTrack(currentDifficulty, currentTrack && currentTrack.file));
  });
  musicAudio.addEventListener("canplay", () => {
    musicAvailable = true;
    updateMusicUi();
    if (musicEnabled && audioUnlocked) musicAudio.play().catch(() => {});
  });
  musicAudio.addEventListener("ended", () => prepareRandomTrack(true));

  document.addEventListener("keydown", (event) => {
    const pressed = event.key.toLowerCase();
    if (pressed === "escape") {
      if (!nameEntryModal.hidden) closeNameEntry(false);
      else if (!scoreboardPanel.hidden) closeScoreboardPanel();
      else if (!$("settingsPanel").hidden) closeSettings();
      else openSettings();
      return;
    }
    if (!nameEntryModal.hidden) {
      if (pressed === "enter" && !saveNameEntryBtn.disabled) closeNameEntry(true);
      return;
    }
    if (!scoreboardPanel.hidden || !$("settingsPanel").hidden) return;
    if (pressed === "arrowup" || pressed === "w") { event.preventDefault(); handleDirectionInput("up"); }
    else if (pressed === "arrowdown" || pressed === "s") { event.preventDefault(); handleDirectionInput("down"); }
    else if (pressed === "arrowleft" || pressed === "a") { event.preventDefault(); handleDirectionInput("left"); }
    else if (pressed === "arrowright" || pressed === "d") { event.preventDefault(); handleDirectionInput("right"); }
    else if (pressed === " " && !state.gameOver) {
      event.preventDefault();
      if (!state.started) startGame();
      else { state.paused = !state.paused; render(state); }
    } else if (pressed === "r") restartGame();
  });

  document.querySelectorAll("[data-dir]").forEach((button) => button.addEventListener("click", () => handleDirectionInput(button.getAttribute("data-dir"))));
  $("startBtn").addEventListener("click", startGame);
  $("scoreboardBtn").addEventListener("click", () => openScoreboardPanel(currentDifficulty));
  $("quickScoresBtn").addEventListener("click", () => openScoreboardPanel(currentDifficulty));
  $("introScoreboardBtn").addEventListener("click", () => openScoreboardPanel(currentDifficulty));
  $("closeScoreboardBtn").addEventListener("click", closeScoreboardPanel);
  $("settingsBtn").addEventListener("click", openSettings);
  $("introSettingsBtn").addEventListener("click", openSettings);
  $("closeSettingsBtn").addEventListener("click", closeSettings);
  $("pauseBtn").addEventListener("click", () => {
    unlockAudioIfNeeded();
    if (!state.started) startGame();
    else if (!state.gameOver) { state.paused = !state.paused; render(state); }
  });
  $("restartBtn").addEventListener("click", restartGame);
  $("menuBtn").addEventListener("click", goToMenu);

  difficultySelect.addEventListener("change", function () {
    if (state.started && (!state.gameOver || state.levelComplete)) { this.value = currentDifficulty; return; }
    const value = this.value;
    if (!GAME_CONFIG.difficulties[value] || !unlocked(currentMapId, value)) { this.value = currentDifficulty; return; }
    currentDifficulty = value;
    scoreboardDifficulty = value;
    saveData.selectedDifficulty[currentMapId] = value;
    saveGameData();
    state = createInitialState(Math.random);
    startLoop();
    prepareRandomTrack(true);
    renderScoreboard();
    renderShop();
    render(state);
  });

  $("musicToggleBtn").addEventListener("click", () => {
    unlockAudioIfNeeded();
    if (!musicAvailable) return;
    musicEnabled = !musicEnabled;
    updateMusicUi();
    if (!musicEnabled) stopAllMusic();
    else if (currentTrack) musicAudio.play().catch(() => {});
    else prepareRandomTrack(false);
  });
  volumeRange.addEventListener("input", function () { musicAudio.volume = Math.max(0, Math.min(1, Number(this.value) / 100)); });
  $("colorblindToggle").addEventListener("change", function () {
    settings.colorblindMode = this.checked;
    document.body.classList.toggle("colorblind-mode", settings.colorblindMode);
  });
  document.querySelectorAll("[data-board-difficulty]").forEach((button) => button.addEventListener("click", () => {
    scoreboardDifficulty = button.getAttribute("data-board-difficulty");
    renderScoreboard();
  }));
  nameEntryInput.addEventListener("input", sanitizeNameInput);
  $("cancelNameEntryBtn").addEventListener("click", () => closeNameEntry(false));
  saveNameEntryBtn.addEventListener("click", () => { if (!saveNameEntryBtn.disabled) closeNameEntry(true); });
  $("modalBackdrop").addEventListener("click", () => { if (nameEntryModal.hidden) closeScoreboardPanel(); });
  window.addEventListener("beforeunload", () => {
    if (timerId !== null) clearInterval(timerId);
    stopAllMusic();
    saveGameData();
  });

  updateTheme();
  refreshDifficultyOptions();
  state = createInitialState(Math.random);
  renderShop();
  startLoop();
  updateMusicUi();
  prepareRandomTrack(false);
  renderScoreboard();
  render(state);
})();
