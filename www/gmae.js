if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => navigator.serviceWorker.register('./sw.js').catch(() => {}));
}

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');

let W = canvas.width;
let H = canvas.height;

function resizeGame() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  W = canvas.width;
  H = canvas.height;
  NUM_RAYS = canvas.width;
}

window.addEventListener("resize", resizeGame);

const FOV = 66 * Math.PI / 180;
let NUM_RAYS = canvas.width;
const MAX_DEPTH = 20;

resizeGame();

// ===== مولد أصوات =====
let audioCtx = null;

function initAudio() {
  if (audioCtx) return;
  audioCtx = new (window.AudioContext || window.webkitAudioContext)();
}

function beep(freq, time, vol, type = "square") {
  if (!audioCtx) return;
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  gain.gain.value = vol;
  osc.connect(gain);
  gain.connect(audioCtx.destination);
  osc.start();
  gain.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + time);
  osc.stop(audioCtx.currentTime + time);
}

function stepSound() {
  beep(120, 0.05, .03, "square");
  setTimeout(() => { beep(90, 0.04, .02, "square"); }, 35);
}

function keySound() {
  beep(900, .08, .08, "triangle");
  setTimeout(() => { beep(1200, .08, .06, "triangle"); }, 60);
}

function doorSound() {
  beep(180, .15, .06, "sawtooth");
}

function loseSound() {
  beep(300, .12, .08);
  setTimeout(() => beep(220, .18, .08), 120);
  setTimeout(() => beep(140, .30, .08), 260);
}

function winSound() {
  beep(700, .08, .07, "triangle");
  setTimeout(() => beep(900, .08, .07, "triangle"), 80);
  setTimeout(() => beep(1200, .15, .07, "triangle"), 160);
}

let heartbeatTimer = 0;
function heartbeat(dt) {
  heartbeatTimer += dt;
  if (heartbeatTimer > 45) {
    heartbeatTimer = 0;
    beep(80, .05, .04);
    setTimeout(() => { beep(70, .05, .03); }, 120);
  }
}

// ---------- الخريطة ----------
const COLS = 14, ROWS = 10;
let map = [];
for (let r = 0; r < ROWS; r++) { map.push(new Array(COLS).fill(1)); }
function carve(x0, y0, x1, y1) { for (let r = y0; r <= y1; r++) for (let c = x0; c <= x1; c++) map[r][c] = 0; }

const rooms = [
  { x0: 1, y0: 1, x1: 5, y1: 8 },
  { x0: 8, y0: 1, x1: 12, y1: 4 },
  { x0: 8, y0: 6, x1: 12, y1: 8 },
];
rooms.forEach(r => carve(r.x0, r.y0, r.x1, r.y1));
carve(6, 1, 7, 8);

const doorRow = 9, doorCol = 10;
map[doorRow][doorCol] = 2;

function floorCellsInRoom(room) {
  const arr = [];
  for (let r = room.y0; r <= room.y1; r++) for (let c = room.x0; c <= room.x1; c++) arr.push([r, c]);
  return arr;
}
const keyRoomPool = [rooms[0], rooms[1]];
const keyRoom = keyRoomPool[Math.floor(Math.random() * keyRoomPool.length)];
const keyCells = floorCellsInRoom(keyRoom);
const [keyR, keyC] = keyCells[Math.floor(Math.random() * keyCells.length)];
let keyPos = { r: keyR, c: keyC, taken: false };

// ---------- اللاعب ----------
const player = {
  x: doorCol + 0.5, y: doorRow - 1.3,
  angle: -Math.PI / 2,
  r: 0.22,
  speed: 0.042,
  hasKey: false,
  noise: 0
};

// ---------- أبو جمال ----------
const jamal = {
  x: 6.5, y: 4.5,
  angle: 0,
  r: 0.3,
  speed: player.speed * 0.34,
  state: 'patrol',
  target: null,
  visionDist: 5.5,
  visionAngle: Math.PI * 0.55,
  bob: 0
};

function randomFloorCell() {
  let r, c;
  do {
    r = 1 + Math.floor(Math.random() * (ROWS - 2));
    c = 1 + Math.floor(Math.random() * (COLS - 2));
  } while (map[r][c] !== 0);
  return [r, c];
}
function pickJamalTarget() { const [r, c] = randomFloorCell(); jamal.target = { x: c + 0.5, y: r + 0.5 }; }
pickJamalTarget();

// ---------- رسم مجسم أبو جمال ----------
const jamalCanvas = document.createElement('canvas');
jamalCanvas.width = 140; jamalCanvas.height = 170;
(function drawJamalSprite() {
  const c = jamalCanvas.getContext('2d');
  const cx = 70;
  c.clearRect(0, 0, 140, 170);
  c.fillStyle = 'rgba(0,0,0,0.4)';
  c.beginPath(); c.ellipse(cx, 162, 30, 7, 0, 0, Math.PI * 2); c.fill();
  c.fillStyle = '#3a2a20';
  c.fillRect(cx - 24, 130, 16, 32);
  c.fillRect(cx + 8, 130, 16, 32);
  c.fillStyle = '#6a3a2a';
  c.beginPath(); c.ellipse(cx, 108, 46, 42, 0, 0, Math.PI * 2); c.fill();
  c.strokeStyle = 'rgba(0,0,0,0.25)'; c.lineWidth = 3;
  c.beginPath(); c.moveTo(cx - 30, 95); c.quadraticCurveTo(cx, 130, cx + 30, 95); c.stroke();
  c.fillStyle = '#5a2f22';
  c.beginPath(); c.ellipse(cx, 62, 34, 26, 0, 0, Math.PI * 2); c.fill();
  c.beginPath(); c.ellipse(cx - 40, 90, 13, 30, 0.3, 0, Math.PI * 2); c.fill();
  c.beginPath(); c.ellipse(cx + 40, 90, 13, 30, -0.3, 0, Math.PI * 2); c.fill();
  c.fillStyle = '#c98a5e';
  c.beginPath(); c.arc(cx, 30, 24, 0, Math.PI * 2); c.fill();
  c.fillStyle = '#241a12';
  c.beginPath(); c.arc(cx, 20, 24, Math.PI, Math.PI * 2); c.fill();
  c.strokeStyle = '#241a12'; c.lineWidth = 3;
  c.beginPath(); c.moveTo(cx - 14, 28); c.lineTo(cx - 4, 24); c.stroke();
  c.beginPath(); c.moveTo(cx + 14, 28); c.lineTo(cx + 4, 24); c.stroke();
  c.fillStyle = '#d02020';
  c.beginPath(); c.arc(cx - 8, 33, 3.4, 0, Math.PI * 2); c.fill();
  c.beginPath(); c.arc(cx + 8, 33, 3.4, 0, Math.PI * 2); c.fill();
  c.strokeStyle = '#241a12'; c.lineWidth = 4; c.lineCap = 'round';
  c.beginPath(); c.moveTo(cx - 14, 42); c.lineTo(cx - 2, 45); c.stroke();
  c.beginPath(); c.moveTo(cx + 14, 42); c.lineTo(cx + 2, 45); c.stroke();
})();

// ---------- التحكم ----------
const keysDown = {};
document.addEventListener('keydown', e => { initAudio(); keysDown[e.key.toLowerCase()] = true; });
document.addEventListener('keyup', e => { keysDown[e.key.toLowerCase()] = false; });

let moveVec = { x: 0, y: 0 };
const joystick = document.getElementById('joystick');
const stick = document.getElementById('stick');
let joyActive = false, joyId = null, joyCenter = { x: 0, y: 0 };

function joyStart(cx, cy, id) {
  initAudio();
  const rect = joystick.getBoundingClientRect();
  joyCenter = { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
  joyActive = true; joyId = id; joyMove(cx, cy);
}
function joyMove(cx, cy) {
  if (!joyActive) return;
  let dx = cx - joyCenter.x, dy = cy - joyCenter.y;
  const max = 40;
  const dist = Math.min(Math.hypot(dx, dy), max);
  const ang = Math.atan2(dy, dx);
  const sx = Math.cos(ang) * dist, sy = Math.sin(ang) * dist;
  stick.style.marginLeft = sx + 'px'; stick.style.marginTop = sy + 'px';
  const norm = dist > 6 ? dist / max : 0;
  moveVec.x = norm ? (dx / (dist || 1)) * norm : 0;
  moveVec.y = norm ? (dy / (dist || 1)) * norm : 0;
}
function joyEnd() { joyActive = false; joyId = null; moveVec.x = 0; moveVec.y = 0; stick.style.marginLeft = '0px'; stick.style.marginTop = '0px'; }

joystick.addEventListener('touchstart', e => { e.preventDefault(); const t = e.changedTouches[0]; joyStart(t.clientX, t.clientY, t.identifier); }, { passive: false });
joystick.addEventListener('touchmove', e => { e.preventDefault(); for (const t of e.changedTouches) { if (t.identifier === joyId) joyMove(t.clientX, t.clientY); } }, { passive: false });
joystick.addEventListener('touchend', e => { e.preventDefault(); joyEnd(); }, { passive: false });
joystick.addEventListener('touchcancel', e => { e.preventDefault(); joyEnd(); }, { passive: false });
joystick.addEventListener('mousedown', e => { joyStart(e.clientX, e.clientY, 'mouse'); });
window.addEventListener('mousemove', e => { if (joyActive) joyMove(e.clientX, e.clientY); });
window.addEventListener('mouseup', () => { if (joyActive) joyEnd(); });

const lookLayer = document.getElementById('lookLayer');
let lookActive = false, lookId = null, lastLookX = 0;
const LOOK_SENS = 0.0038;

lookLayer.addEventListener('touchstart', e => {
  e.preventDefault();
  initAudio();
  const t = e.changedTouches[0];
  lookActive = true; lookId = t.identifier; lastLookX = t.clientX;
}, { passive: false });

lookLayer.addEventListener('touchmove', e => {
  e.preventDefault();
  for (const t of e.changedTouches) {
    if (t.identifier === lookId) {
      const dx = t.clientX - lastLookX;
      player.angle += dx * LOOK_SENS;
      lastLookX = t.clientX;
    }
  }
}, { passive: false });

lookLayer.addEventListener('touchend', () => { lookActive = false; lookId = null; });
lookLayer.addEventListener('touchcancel', () => { lookActive = false; lookId = null; });
let mouseLookDown = false;
lookLayer.addEventListener('mousedown', e => { initAudio(); mouseLookDown = true; lastLookX = e.clientX; });
window.addEventListener('mousemove', e => { if (mouseLookDown) { player.angle += (e.clientX - lastLookX) * LOOK_SENS; lastLookX = e.clientX; } });
window.addEventListener('mouseup', () => { mouseLookDown = false; });

function showMsg(text, ms = 2200) {
  const b = document.getElementById('banner');
  if(!b) return;
  const d = document.createElement('div');
  d.className = 'msg'; d.textContent = text;
  b.appendChild(d);
  requestAnimationFrame(() => d.classList.add('show'));
  setTimeout(() => { d.classList.remove('show'); setTimeout(() => d.remove(), 400); }, ms);
}

function getCell(cx, cy) {
  if (cx < 0 || cx >= COLS || cy < 0 || cy >= ROWS) return 1;
  return map[cy][cx];
}
function isWallAt(x, y) {
  const v = getCell(Math.floor(x), Math.floor(y));
  if (v === 1) return true;
  if (v === 2 && !player.hasKey) return true;
  return false;
}
function canStand(x, y, rad) {
  return !isWallAt(x - rad, y) && !isWallAt(x + rad, y) && !isWallAt(x, y - rad) && !isWallAt(x, y + rad);
}

let gameOver = false;
let stepTimer = 0;
let gameStarted = false;

function update(dt) {
  if (gameOver) return;
  let fwd = 0, strafe = 0;
  if (keysDown['w'] || keysDown['arrowup']) fwd = 1;
  if (keysDown['s'] || keysDown['arrowdown']) fwd = -1;
  if (keysDown['d']) strafe = 1;
  if (keysDown['a']) strafe = -1;
  if (keysDown['arrowleft']) player.angle -= 0.035 * dt;
  if (keysDown['arrowright']) player.angle += 0.035 * dt;

  if (moveVec.x || moveVec.y) { fwd = -moveVec.y; strafe = moveVec.x; }

  const moving = fwd || strafe;
  if (moving) {
    const mag = Math.hypot(fwd, strafe) || 1;
    const f = fwd / mag, s = strafe / mag;
    const dx = (Math.cos(player.angle) * f + Math.cos(player.angle + Math.PI / 2) * s) * player.speed * dt;
    const dy = (Math.sin(player.angle) * f + Math.sin(player.angle + Math.PI / 2) * s) * player.speed * dt;
    if (canStand(player.x + dx, player.y, player.r)) player.x += dx;
    if (canStand(player.x, player.y + dy, player.r)) player.y += dy;
    player.noise = Math.min(10, player.noise + 0.15 * dt);

    stepTimer += dt;
    if (stepTimer > 18) {
      stepTimer = 0;
      stepSound();
    }
  } else {
    stepTimer = 0;
    player.noise = Math.max(0, player.noise - 0.1 * dt);
  }

  if (!player.hasKey && !keyPos.taken) {
    const d = Math.hypot(player.x - (keyPos.c + 0.5), player.y - (keyPos.r + 0.5));
    if (d < 0.5) {
      keyPos.taken = true; player.hasKey = true;
      keySound();
      const keyElem = document.getElementById('i-key');
      if(keyElem) keyElem.classList.add('have');
      showMsg('🔑 لقيت المفتاح! روح لباب الخروج المضيء.');
    }
  }
  if (player.hasKey) {
    const d = Math.hypot(player.x - (doorCol + 0.5), player.y - doorRow);
    if (d < 0.8) winGame();
  }

  updateJamal(dt);
  const dCatch = Math.hypot(jamal.x - player.x, jamal.y - player.y);
  if (dCatch < player.r + jamal.r + 0.15) loseGame();
}

function angDiff(a, b) { let d = a - b; while (d > Math.PI) d -= Math.PI * 2; while (d < -Math.PI) d += Math.PI * 2; return d; }

function hasLineOfSight(x0, y0, x1, y1) {
  const dist = Math.hypot(x1 - x0, y1 - y0);
  const steps = Math.ceil(dist * 5);
  for (let i = 1; i < steps; i++) {
    const t = i / steps;
    if (isWallAt(x0 + (x1 - x0) * t, y0 + (y1 - y0) * t)) return false;
  }
  return true;
}

let phraseTimer = 0;
function updateJamal(dt) {
  const dist = Math.hypot(jamal.x - player.x, jamal.y - player.y);
  const angToPlayer = Math.atan2(player.y - jamal.y, player.x - jamal.x);
  const withinCone = Math.abs(angDiff(angToPlayer, jamal.angle)) < jamal.visionAngle / 2;
  const canSee = dist < jamal.visionDist && withinCone && hasLineOfSight(jamal.x, jamal.y, player.x, player.y);
  const heard = player.noise > 6.5 && dist < jamal.visionDist * 0.6;

  if (jamal.state === 'patrol' && (canSee || heard)) {
    jamal.state = 'chase';
    showMsg(pick(['مين دخل بيتي؟! ', 'شفتك!', 'تعال لا تخاف 😈']));
  } else if (jamal.state === 'chase' && dist > jamal.visionDist * 1.6 && !canSee) {
    jamal.state = 'patrol'; pickJamalTarget();
    showMsg(pick(['وينك راح؟', 'طيب بدور بمكان ثاني...']));
  }

  let tx, ty;
  if (jamal.state === 'chase') { tx = player.x; ty = player.y; }
  else {
    if (!jamal.target || Math.hypot(jamal.target.x - jamal.x, jamal.target.y - jamal.y) < 0.3) pickJamalTarget();
    tx = jamal.target.x; ty = jamal.target.y;
  }
  const ang = Math.atan2(ty - jamal.y, tx - jamal.x);
  jamal.angle = ang;
  const nx = jamal.x + Math.cos(ang) * jamal.speed * dt;
  const ny = jamal.y + Math.sin(ang) * jamal.speed * dt;
  if (canStand(nx, jamal.y, jamal.r)) jamal.x = nx; else pickJamalTarget();
  if (canStand(jamal.x, ny, jamal.r)) jamal.y = ny; else pickJamalTarget();

  jamal.bob += (jamal.state === 'chase' ? 0.25 : 0.1) * dt;

  phraseTimer += dt;
  if (phraseTimer > 380 && Math.random() < 0.02) {
    phraseTimer = 0;
    showMsg(pick(['شايف رجلك 👀', 'والله ما أضرب كثير', 'تعال هون بابا', 'وين رايح؟ ما في مطرح تروحله']), 1800);
  }
}
function pick(a) { return a[Math.floor(Math.random() * a.length)]; }

function winGame() {
  gameOver = true;
  winSound();
  document.getElementById('ovTitle').textContent = '🎉 نجحت بالهروب!';
  document.getElementById('ovText').textContent = 'طلعت من بيت أبو جمال بسلامة... وبالمفتاح الصح!';
  document.getElementById('overlay').style.display = 'flex';
}
function loseGame() {
  gameOver = true;
  loseSound();
  document.getElementById('ovTitle').textContent = '😱 أمسكك أبو جمال!';
  document.getElementById('ovText').textContent = '"قلتلك لا تدخل بيتي."';
  document.getElementById('overlay').style.display = 'flex';
}

const ovBtn = document.getElementById('ovBtn');
if(ovBtn) ovBtn.addEventListener('click', () => location.reload());

// ---------- Raycasting DDA ----------
function castRay(rayAngle) {
  const dirX = Math.cos(rayAngle), dirY = Math.sin(rayAngle);
  let mapX = Math.floor(player.x), mapY = Math.floor(player.y);
  const deltaDistX = dirX === 0 ? 1e30 : Math.abs(1 / dirX);
  const deltaDistY = dirY === 0 ? 1e30 : Math.abs(1 / dirY);
  let stepX, stepY, sideDistX, sideDistY;
  if (dirX < 0) { stepX = -1; sideDistX = (player.x - mapX) * deltaDistX; } else { stepX = 1; sideDistX = (mapX + 1 - player.x) * deltaDistX; }
  if (dirY < 0) { stepY = -1; sideDistY = (player.y - mapY) * deltaDistY; } else { stepY = 1; sideDistY = (mapY + 1 - player.y) * deltaDistY; }

  let side = 0, hitVal = 1, steps = 0;
  while (steps < 48) {
    steps++;
    if (sideDistX < sideDistY) { sideDistX += deltaDistX; mapX += stepX; side = 0; }
    else { sideDistY += deltaDistY; mapY += stepY; side = 1; }

    if (mapX < 0 || mapX >= COLS || mapY < 0 || mapY >= ROWS) { hitVal = 1; break; }
    const v = map[mapY][mapX];
    if (v === 1) { hitVal = 1; break; }
    if (v === 2 && !player.hasKey) { hitVal = 2; break; }
  }
  let perpDist = side === 0 ? (mapX - player.x + (1 - stepX) / 2) / dirX : (mapY - player.y + (1 - stepY) / 2) / dirY;
  if (perpDist <= 0) perpDist = 0.0001;
  return { dist: Math.min(perpDist, MAX_DEPTH), side, hitVal };
}

function render(time) {
  const flicker = 1 + Math.sin(time / 220) * 0.02 + Math.sin(time / 57) * 0.01;

  const skyGrad = ctx.createLinearGradient(0, 0, 0, H / 2);
  skyGrad.addColorStop(0, '#1c1c22');
  skyGrad.addColorStop(1, '#101014');
  ctx.fillStyle = skyGrad;
  ctx.fillRect(0, 0, W, H / 2);

  const floorGrad = ctx.createLinearGradient(0, H / 2, 0, H);
  floorGrad.addColorStop(0, '#151210');
  floorGrad.addColorStop(1, '#0a0908');
  ctx.fillStyle = floorGrad;
  ctx.fillRect(0, H / 2, W, H / 2);

  const zbuffer = new Array(W);

  for (let i = 0; i < NUM_RAYS; i++) {
    const rayAngle = (player.angle - FOV / 2) + (i / NUM_RAYS) * FOV;
    const { dist, side, hitVal } = castRay(rayAngle);
    const correctedDist = dist * Math.cos(rayAngle - player.angle);
    zbuffer[i] = correctedDist;

    const wallH = Math.min(H * 1.5, (H / (correctedDist + 0.0001)) * 0.85);
    const top = (H - wallH) / 2;

    let shade = Math.pow(Math.max(0, 1 - correctedDist / 10), 1.25) * flicker;
    shade = Math.max(0.06, Math.min(1, shade));

    let baseColor;
    if (hitVal === 2) {
      const pulse = 0.75 + Math.sin(time / 260) * 0.25;
      baseColor = [70 * pulse + 120, 160 * pulse, 60 * pulse + 30];
    } else {
      baseColor = side ? [88, 66, 50] : [66, 50, 38];
    }
    const rC = Math.min(255, Math.floor(baseColor[0] * shade + 10));
    const gC = Math.min(255, Math.floor(baseColor[1] * shade + 8));
    const bC = Math.min(255, Math.floor(baseColor[2] * shade + 8));
    ctx.fillStyle = `rgb(${rC},${gC},${bC})`;
    ctx.fillRect(i, top, 1, wallH);
  }

  // مصباح الباب
  drawSprite(doorCol + 0.5, doorRow - 1.35, zbuffer, (screenX, size, shade) => {
    ctx.save();
    ctx.globalAlpha = Math.max(0.3, shade);
    const glow = ctx.createRadialGradient(screenX, H / 2 - size * 0.3, 0, screenX, H / 2 - size * 0.3, size * 0.9);
    glow.addColorStop(0, 'rgba(255,225,140,0.9)');
    glow.addColorStop(1, 'rgba(255,225,140,0)');
    ctx.fillStyle = glow;
    ctx.beginPath(); ctx.arc(screenX, H / 2 - size * 0.3, size * 0.9, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }, 0.22);

  // المفتاح
  if (!keyPos.taken) {
    drawSprite(keyPos.c + 0.5, keyPos.r + 0.5, zbuffer, (screenX, size, shade) => {
      const bob = Math.sin(time / 300) * 4;
      ctx.save();
      const glow = ctx.createRadialGradient(screenX, H / 2 + bob, 0, screenX, H / 2 + bob, size * 1.6);
      glow.addColorStop(0, `rgba(255,220,90,${0.55 * shade})`);
      glow.addColorStop(1, 'rgba(255,220,90,0)');
      ctx.fillStyle = glow;
      ctx.beginPath(); ctx.arc(screenX, H / 2 + bob, size * 1.6, 0, Math.PI * 2); ctx.fill();

      ctx.translate(screenX, H / 2 + bob);
      ctx.rotate(time / 500);
      ctx.fillStyle = `rgba(255,215,60,${Math.max(0.5, shade)})`;
      ctx.beginPath(); ctx.arc(0, 0, size * 0.42, 0, Math.PI * 2); ctx.fill();
      ctx.fillRect(-size * 0.09, 0, size * 0.18, size * 0.55);
      ctx.restore();
    }, 0.16);
  }

  // أبو جمال
  drawSprite(jamal.x, jamal.y, zbuffer, (screenX, size, shade) => {
    const bobOff = Math.sin(jamal.bob) * 3;
    const sw = size * 0.85, sh = size * 1.15;
    ctx.save();
    ctx.filter = `brightness(${Math.max(0.15, shade)})`;
    ctx.drawImage(jamalCanvas, screenX - sw / 2, H / 2 - sh / 2 + size * 0.12 + bobOff * 0.2, sw, sh);
    ctx.restore();
  }, 0.8);

  const warm = ctx.createRadialGradient(W / 2, H * 0.85, 0, W / 2, H * 0.85, W * 0.55);
  warm.addColorStop(0, `rgba(255,180,90,${0.10 * flicker})`);
  warm.addColorStop(1, 'rgba(255,180,90,0)');
  ctx.fillStyle = warm;
  ctx.fillRect(0, 0, W, H);

  const vg = ctx.createRadialGradient(W / 2, H / 2, H * 0.32, W / 2, H / 2, W * 0.62);
  vg.addColorStop(0, 'rgba(0,0,0,0)');
  vg.addColorStop(1, `rgba(0,0,0,${0.52 + (1 - flicker) * 2})`);
  ctx.fillStyle = vg;
  ctx.fillRect(0, 0, W, H);
}

function drawSprite(wx, wy, zbuffer, drawFn, sizeScale) {
  const dx = wx - player.x, dy = wy - player.y;
  const dist = Math.hypot(dx, dy);
  let angTo = Math.atan2(dy, dx) - player.angle;
  while (angTo > Math.PI) angTo -= 2 * Math.PI;
  while (angTo < -Math.PI) angTo += 2 * Math.PI;
  if (Math.abs(angTo) > FOV / 2 + 0.35) return;
  const screenX = (0.5 + angTo / FOV) * W;
  const col = Math.max(0, Math.min(W - 1, Math.floor(screenX)));
  if (dist > zbuffer[col] + 0.15) return;
  const size = Math.min(H * 1.6, (H / (dist + 0.0001)) * sizeScale * 4.2);
  const shade = Math.max(0.12, Math.min(1, 1 - dist / 11));
  drawFn(screenX, size, shade);
}

// ---------- البوصلة ----------
const compassArrow = document.getElementById('compassArrow');
const compassLabel = document.getElementById('compassLabel');
function updateCompass() {
  if(!compassArrow || !compassLabel) return;
  let tx, ty, label;
  if (!player.hasKey && !keyPos.taken) { tx = keyPos.c + 0.5; ty = keyPos.r + 0.5; label = 'المفتاح'; }
  else { tx = doorCol + 0.5; ty = doorRow; label = 'باب الخروج'; }
  const bearing = Math.atan2(ty - player.y, tx - player.x);
  const rel = angDiff(bearing, player.angle);
  compassArrow.style.transform = `rotate(${rel}rad)`;
  compassLabel.textContent = label;
}

let lastTime = performance.now();
function loop(time) {
  if (gameStarted === false) {
    gameStarted = true;
  }

  let dt = (time - lastTime) / 16.6667;
  dt = Math.max(0.2, Math.min(2.5, dt));
  lastTime = time;

  update(dt);
  render(time);
  updateCompass();

  const statusElem = document.getElementById('status');
  if(statusElem) {
    statusElem.textContent = jamal.state === 'chase'
      ? '⚠️ شافك أبو جمال! أنت أسرع منه بكثير، اهرب!'
      : (player.hasKey ? '✅ عندك المفتاح — تابع البوصلة لباب الخروج' : 'تابع البوصلة فوق عشان تلاقي المفتاح');
  }

  requestAnimationFrame(loop);
}

function startGame() {
  showMsg("مين دخل بيتي؟", 2500);
  lastTime = performance.now();
  requestAnimationFrame(loop);
}

window.addEventListener('DOMContentLoaded', startGame);
