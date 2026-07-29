/* ============================================================
   game.js — كل شي بالبيت (جدران/أبواب/نوافذ/أثاث) هندسة حقيقية
   بنفس خط الرسم (Raycasting)، فمافي "بيلبورد يناظرك" ولا مسافة غلط.
   أبو جمال بحجم طبيعي، يفتح الأبواب لحاله، والأبواب صارت أعرض (ما يعلق).
   يعتمد على دوال ومتغيرات معرّفة مسبقًا في menu.js
   ============================================================ */

/* ---------- خريطة البيت ----------
   0 أرضية | 1 جدار | 2 باب خروج(يحتاج مفتاح) | 5 باب داخلي(زر فتح) | 11 نافذة
   20 كاونتر | 21 ثلاجة | 22 طاولة | 23 سرير | 24 دولاب
   25 مرحاض | 26 مغسلة | 27 بانيو | 28 كنبة | 29 تلفزيون+ستاند */
const COLS=18, ROWS=13;
let map=[]; for(let r=0;r<ROWS;r++) map.push(new Array(COLS).fill(1));
function carve(x0,y0,x1,y1){ for(let r=y0;r<=y1;r++) for(let c=x0;c<=x1;c++) map[r][c]=0; }

carve(1,1,6,5);    // مطبخ
carve(11,1,16,5);  // غرفة نوم
carve(1,7,6,11);   // حمام
carve(11,7,16,11); // صالة/تلفزيون
carve(8,1,9,11);   // ممر مركزي

// أبواب داخلية عريضة (صفّين) — عشان محد يعلق فيها
const doorCells = [ [3,7],[4,7], [3,10],[4,10], [8,7],[9,7], [8,10],[9,10] ];
doorCells.forEach(([r,c])=>{ map[r][c]=5; });

const doorRow=12, doorCol=8;
map[doorRow][doorCol]=2;

const windowCells = [ [0,3],[0,14],[12,3],[12,14],[3,0],[3,17],[9,0],[9,17] ];
windowCells.forEach(([r,c])=>{ map[r][c]=11; });

// أثاث — مكانه منطقي ملاصق للحيطان، وهو جزء من الهندسة (مو ملصق)
const FURN = [
  [1,2,20],[1,3,20],       // كاونتر مطبخ (حيط فوق)
  [1,5,21],                // ثلاجة (زاوية)
  [4,3,22],                // طاولة مطبخ
  [1,14,23],[1,15,23],     // سرير (حيط فوق)
  [4,16,24],               // دولاب (حيط يمين)
  [7,2,25],                // مرحاض (حيط فوق)
  [7,5,26],                // مغسلة (حيط فوق)
  [10,2,27],[10,3,27],     // بانيو (حيط تحت)
  [10,13,28],[10,14,28],   // كنبة (حيط تحت)
  [7,14,29],                // تلفزيون (حيط فوق، مقابل الكنبة)
];
FURN.forEach(([r,c,v])=>{ map[r][c]=v; });

const keyCandidates = [
  {r:4,c:4, real:false, taken:false},
  {r:4,c:14, real:false, taken:false},
  {r:9,c:4, real:false, taken:false},
];
keyCandidates.forEach(k=> k.real = Math.random() < 0.35);
if(!keyCandidates.some(k=>k.real)) pick(keyCandidates).real = true;

const throwItems = [
  {r:9,c:13, taken:false},
  {r:2,c:5, taken:false},
  {r:6,c:8, taken:false},
];

/* ---------- اللاعب ---------- */
const player = {
  x: doorCol+0.5, y: doorRow-1.6, angle: Math.PI/2,
  r:0.22, speed:0.042, hasKey:false, noise:0, distAccum:0, throwables:0
};
let pitchOffset = 0;

/* ---------- أبو جمال — حجم طبيعي، أبطأ من اللاعب ---------- */
const jamal = {
  x:8.5, y:6, angle:0, r:0.26, speed: player.speed*0.34,
  state:'patrol', target:null, visionDist:5.5, visionAngle:Math.PI*0.55,
  walkPhase:0, resting:false, restTimeLeft:0, restTimer: 15*60+Math.random()*15*60,
  hitStun:false, hitStunLeft:0
};
function randomFloorCell(){
  let r,c;
  do{ r=1+Math.floor(Math.random()*(ROWS-2)); c=1+Math.floor(Math.random()*(COLS-2)); }
  while(map[r][c]!==0);
  return [r,c];
}
function pickJamalTarget(){ const [r,c]=randomFloorCell(); jamal.target={x:c+0.5,y:r+0.5}; }
pickJamalTarget();

/* ---------- رسم أبو جمال حيّ (رجلين تتحركان)، بحجم متناسق مع الغرفة ---------- */
function drawJamalLive(screenX, groundY, size, shade, pose){
  const s = size/170;
  const top = groundY - 162*s;
  const cx = screenX;
  ctx.save();
  ctx.filter = `brightness(${Math.max(0.55,shade)})`;

  const legSwing = pose==='walk' ? Math.sin(jamal.walkPhase)*7*s : 0;
  const legLenL = (pose==='walk' ? 32+Math.sin(jamal.walkPhase)*5 : 20) * s;
  const legLenR = (pose==='walk' ? 32+Math.sin(jamal.walkPhase+Math.PI)*5 : 20) * s;
  const armSwing = pose==='walk' ? Math.sin(jamal.walkPhase+Math.PI)*6*s : 0;

  ctx.fillStyle='rgba(0,0,0,0.3)';
  ctx.beginPath(); ctx.ellipse(cx, top+162*s, 30*s, 7*s, 0,0,Math.PI*2); ctx.fill();

  ctx.fillStyle='#3a2a20';
  ctx.fillRect(cx-24*s+legSwing, top+130*s, 16*s, legLenL);
  ctx.fillRect(cx+8*s-legSwing, top+130*s, 16*s, legLenR);

  ctx.fillStyle='#7a4632';
  ctx.beginPath(); ctx.ellipse(cx, top+108*s, 46*s, 42*s, 0,0,Math.PI*2); ctx.fill();
  ctx.strokeStyle='rgba(0,0,0,0.2)'; ctx.lineWidth=Math.max(1,3*s);
  ctx.beginPath(); ctx.moveTo(cx-30*s, top+95*s); ctx.quadraticCurveTo(cx, top+130*s, cx+30*s, top+95*s); ctx.stroke();

  ctx.fillStyle='#66392a';
  ctx.beginPath(); ctx.ellipse(cx, top+62*s, 34*s, 26*s, 0,0,Math.PI*2); ctx.fill();
  ctx.beginPath(); ctx.ellipse(cx-40*s, top+90*s+armSwing, 13*s, 30*s, 0.3,0,Math.PI*2); ctx.fill();
  ctx.beginPath(); ctx.ellipse(cx+40*s, top+90*s-armSwing, 13*s, 30*s, -0.3,0,Math.PI*2); ctx.fill();

  ctx.fillStyle='#d99a6c';
  ctx.beginPath(); ctx.arc(cx, top+30*s, 24*s, 0, Math.PI*2); ctx.fill();
  ctx.fillStyle='#2b1f16';
  ctx.beginPath(); ctx.arc(cx, top+20*s, 24*s, Math.PI, Math.PI*2); ctx.fill();
  ctx.strokeStyle='#2b1f16'; ctx.lineWidth=Math.max(1,3*s);
  ctx.beginPath(); ctx.moveTo(cx-14*s, top+28*s); ctx.lineTo(cx-4*s, top+24*s); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(cx+14*s, top+28*s); ctx.lineTo(cx+4*s, top+24*s); ctx.stroke();
  ctx.fillStyle = pose==='still' ? '#d02020' : '#4a2f22';
  ctx.beginPath(); ctx.arc(cx-8*s, top+33*s, 3.4*s, 0, Math.PI*2); ctx.fill();
  ctx.beginPath(); ctx.arc(cx+8*s, top+33*s, 3.4*s, 0, Math.PI*2); ctx.fill();
  ctx.strokeStyle='#2b1f16'; ctx.lineWidth=Math.max(1,4*s); ctx.lineCap='round';
  ctx.beginPath(); ctx.moveTo(cx-14*s, top+42*s); ctx.lineTo(cx-2*s, top+45*s); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(cx+14*s, top+42*s); ctx.lineTo(cx+2*s, top+45*s); ctx.stroke();

  ctx.restore();
}

/* ---------- التحكم ---------- */
const keysDown={};
document.addEventListener('keydown', e=>{ keysDown[e.key.toLowerCase()]=true; });
document.addEventListener('keyup', e=>{ keysDown[e.key.toLowerCase()]=false; });

let moveVec={x:0,y:0};
const joystick=document.getElementById('joystick'), stick=document.getElementById('stick');
let joyActive=false, joyId=null, joyCenter={x:0,y:0};
function joyStart(cx,cy,id){ const rect=joystick.getBoundingClientRect(); joyCenter={x:rect.left+rect.width/2,y:rect.top+rect.height/2}; joyActive=true; joyId=id; joyMove(cx,cy); }
function joyMove(cx,cy){
  if(!joyActive) return;
  let dx=cx-joyCenter.x, dy=cy-joyCenter.y; const max=38;
  const dist=Math.min(Math.hypot(dx,dy),max); const ang=Math.atan2(dy,dx);
  stick.style.marginLeft=(Math.cos(ang)*dist)+'px'; stick.style.marginTop=(Math.sin(ang)*dist)+'px';
  const norm = dist>6 ? dist/max : 0;
  moveVec.x = norm ? (dx/(dist||1))*norm : 0;
  moveVec.y = norm ? (dy/(dist||1))*norm : 0;
}
function joyEnd(){ joyActive=false; joyId=null; moveVec.x=0; moveVec.y=0; stick.style.marginLeft='0px'; stick.style.marginTop='0px'; }
joystick.addEventListener('touchstart', e=>{ e.preventDefault(); const tt=e.changedTouches[0]; joyStart(tt.clientX,tt.clientY,tt.identifier); }, {passive:false});
joystick.addEventListener('touchmove', e=>{ e.preventDefault(); for(const tt of e.changedTouches){ if(tt.identifier===joyId) joyMove(tt.clientX,tt.clientY); } }, {passive:false});
joystick.addEventListener('touchend', e=>{ e.preventDefault(); joyEnd(); }, {passive:false});
joystick.addEventListener('touchcancel', e=>{ e.preventDefault(); joyEnd(); }, {passive:false});
joystick.addEventListener('mousedown', e=>{ joyStart(e.clientX,e.clientY,'mouse'); });
window.addEventListener('mousemove', e=>{ if(joyActive) joyMove(e.clientX,e.clientY); });
window.addEventListener('mouseup', ()=>{ if(joyActive) joyEnd(); });

const lookLayer=document.getElementById('lookLayer');
let lookActive=false, lookId=null, lastLookX=0, lastLookY=0;
const LOOK_SENS=0.0038, PITCH_SENS=1.15;
lookLayer.addEventListener('touchstart', e=>{
  e.preventDefault(); const tt=e.changedTouches[0];
  lookActive=true; lookId=tt.identifier; lastLookX=tt.clientX; lastLookY=tt.clientY;
}, {passive:false});
lookLayer.addEventListener('touchmove', e=>{
  e.preventDefault();
  for(const tt of e.changedTouches){
    if(tt.identifier===lookId){
      player.angle += (tt.clientX-lastLookX)*LOOK_SENS;
      pitchOffset -= (tt.clientY-lastLookY)*PITCH_SENS;
      lastLookX=tt.clientX; lastLookY=tt.clientY;
    }
  }
}, {passive:false});
lookLayer.addEventListener('touchend', ()=>{ lookActive=false; lookId=null; });
lookLayer.addEventListener('touchcancel', ()=>{ lookActive=false; lookId=null; });
let mouseLookDown=false;
lookLayer.addEventListener('mousedown', e=>{ mouseLookDown=true; lastLookX=e.clientX; lastLookY=e.clientY; });
window.addEventListener('mousemove', e=>{
  if(mouseLookDown){
    player.angle += (e.clientX-lastLookX)*LOOK_SENS;
    pitchOffset -= (e.clientY-lastLookY)*PITCH_SENS;
    lastLookX=e.clientX; lastLookY=e.clientY;
  }
});
window.addEventListener('mouseup', ()=>{ mouseLookDown=false; });

/* ---------- أزرار السياق ---------- */
const btnDoor = document.getElementById('btnDoor');
const btnThrow = document.getElementById('btnThrow');
let nearDoor = null;

function tryOpenDoor(){
  if(!nearDoor) return;
  map[nearDoor.r][nearDoor.c] = 0;
  nearDoor = null;
  playDoorSound();
  showMsg(t('doorOpenMsg'));
}
function tryThrow(){
  if(player.throwables<=0) return;
  player.throwables--;
  updateThrowUI();
  projectiles.push({x:player.x,y:player.y,angle:player.angle,speed:0.16});
  playSweep(700,300,0.15,'sine',0.18);
}
btnDoor.addEventListener('click', tryOpenDoor);
btnThrow.addEventListener('click', tryThrow);
document.addEventListener('keydown', e=>{
  if(e.key===' ') tryOpenDoor();
  if(e.key.toLowerCase()==='q') tryThrow();
});

function updateThrowUI(){
  const el = document.getElementById('i-throw');
  el.querySelector('span').textContent = `🎯 ${player.throwables}`;
  el.classList.toggle('have', player.throwables>0);
  btnThrow.style.display = player.throwables>0 ? 'flex' : 'none';
}

/* ---------- تصادم: كل شي (جدار/باب مقفول/نافذة/أثاث) عائق حقيقي ---------- */
function getCell(cx,cy){ if(cx<0||cx>=COLS||cy<0||cy>=ROWS) return 1; return map[cy][cx]; }
function isFurniture(v){ return v>=20 && v<=29; }
function isRayBlocking(v){ return v===1 || v===5 || v===11 || (v===2 && !player.hasKey) || isFurniture(v); }
function isWallAt(x,y){ return isRayBlocking(getCell(Math.floor(x),Math.floor(y))); }
function canStand(x,y,rad){ return !isWallAt(x-rad,y) && !isWallAt(x+rad,y) && !isWallAt(x,y-rad) && !isWallAt(x,y+rad); }

/* ---------- أبو جمال: يعدي من الأبواب الداخلية لحاله (بيته)، ما يعلق ---------- */
function jamalIsWallAt(x,y){
  const v=getCell(Math.floor(x),Math.floor(y));
  if(v===1 || v===2 || v===11) return true;
  if(isFurniture(v)) return true;
  return false; // الأبواب الداخلية (5) مو عائق له
}
function jamalCanStand(x,y,rad){ return !jamalIsWallAt(x-rad,y) && !jamalIsWallAt(x+rad,y) && !jamalIsWallAt(x,y-rad) && !jamalIsWallAt(x,y+rad); }
function jamalOpenDoorsNear(x,y){
  const cx=Math.floor(x), cy=Math.floor(y);
  for(let dr=-1;dr<=1;dr++) for(let dc=-1;dc<=1;dc++){
    const rr=cy+dr, cc=cx+dc;
    if(rr>=0&&rr<ROWS&&cc>=0&&cc<COLS&&map[rr][cc]===5) map[rr][cc]=0;
  }
}

let projectiles = [];
let gameOver=false;

function update(dt){
  if(gameOver || !gameActive) return;

  let fwd=0, strafe=0;
  if(keysDown['w']||keysDown['arrowup']) fwd=1;
  if(keysDown['s']||keysDown['arrowdown']) fwd=-1;
  if(keysDown['d']) strafe=1;
  if(keysDown['a']) strafe=-1;
  if(keysDown['arrowleft']) player.angle -= 0.035*dt;
  if(keysDown['arrowright']) player.angle += 0.035*dt;
  if(moveVec.x||moveVec.y){ fwd=-moveVec.y; strafe=moveVec.x; }

  const moving = fwd||strafe;
  if(moving){
    const mag=Math.hypot(fwd,strafe)||1, f=fwd/mag, s=strafe/mag;
    const dx=(Math.cos(player.angle)*f + Math.cos(player.angle+Math.PI/2)*s) * player.speed * dt;
    const dy=(Math.sin(player.angle)*f + Math.sin(player.angle+Math.PI/2)*s) * player.speed * dt;
    let moved=0;
    if(canStand(player.x+dx, player.y, player.r)){ player.x+=dx; moved+=Math.abs(dx); }
    if(canStand(player.x, player.y+dy, player.r)){ player.y+=dy; moved+=Math.abs(dy); }
    player.noise = Math.min(10, player.noise+0.15*dt);
    player.distAccum += moved;
    if(player.distAccum > 0.85){ player.distAccum=0; playFootstep(); }
  } else {
    player.noise = Math.max(0, player.noise-0.1*dt);
  }

  nearDoor = null;
  let bestD = 1.1;
  doorCells.forEach(([r,c])=>{
    if(map[r][c]!==5) return;
    const d = Math.hypot(player.x-(c+0.5), player.y-(r+0.5));
    if(d<bestD){ bestD=d; nearDoor={r,c}; }
  });
  btnDoor.style.display = nearDoor ? 'flex' : 'none';

  if(!player.hasKey){
    keyCandidates.forEach(k=>{
      if(k.taken) return;
      const d=Math.hypot(player.x-(k.c+0.5), player.y-(k.r+0.5));
      if(d<0.5){
        k.taken=true;
        if(k.real){
          player.hasKey=true;
          document.getElementById('i-key').classList.add('have');
          showMsg(t('keyMsg'));
          playJingle([392,494,587],0.12);
        } else {
          showMsg(t('fakeKeyMsg'));
          playSweep(300,150,0.25,'square',0.18);
        }
      }
    });
  }
  throwItems.forEach(it=>{
    if(it.taken) return;
    const d=Math.hypot(player.x-(it.c+0.5), player.y-(it.r+0.5));
    if(d<0.5){
      it.taken=true; player.throwables++; updateThrowUI();
      showMsg(t('pickThrowMsg'));
    }
  });

  if(player.hasKey){
    const d=Math.hypot(player.x-(doorCol+0.5), player.y-doorRow);
    if(d<0.8) winGame();
  }

  updateProjectiles(dt);
  updateJamal(dt);
  const dCatch=Math.hypot(jamal.x-player.x, jamal.y-player.y);
  if(dCatch < player.r+jamal.r+0.15 && !jamal.hitStun) loseGame();
}

function updateProjectiles(dt){
  for(let i=projectiles.length-1;i>=0;i--){
    const p=projectiles[i];
    const nx=p.x+Math.cos(p.angle)*p.speed*dt, ny=p.y+Math.sin(p.angle)*p.speed*dt;
    if(isWallAt(nx,ny)){ projectiles.splice(i,1); continue; }
    p.x=nx; p.y=ny;
    const d=Math.hypot(jamal.x-p.x, jamal.y-p.y);
    if(d < jamal.r+0.3){ onJamalHit(); projectiles.splice(i,1); continue; }
  }
}

function onJamalHit(){
  jamal.resting=false;
  jamal.hitStun=true;
  jamal.hitStunLeft = 90+Math.random()*90;
  showJamalBubble(pick(t('hitMsgs')), 2000);
  playSweep(220,90,0.3,'sawtooth',0.25);
}

function angDiff(a,b){ let d=a-b; while(d>Math.PI)d-=Math.PI*2; while(d<-Math.PI)d+=Math.PI*2; return d; }
function hasLineOfSight(x0,y0,x1,y1){
  const dist=Math.hypot(x1-x0,y1-y0); const steps=Math.ceil(dist*5);
  for(let i=1;i<steps;i++){ const tt=i/steps; if(isWallAt(x0+(x1-x0)*tt, y0+(y1-y0)*tt)) return false; }
  return true;
}

let phraseTimer=0;
function updateJamal(dt){
  if(jamal.hitStun){
    jamal.hitStunLeft -= dt;
    if(jamal.hitStunLeft<=0){ jamal.hitStun=false; jamal.state='patrol'; pickJamalTarget(); }
    return;
  }

  const dist=Math.hypot(jamal.x-player.x, jamal.y-player.y);
  const angToPlayer=Math.atan2(player.y-jamal.y, player.x-jamal.x);
  const withinCone=Math.abs(angDiff(angToPlayer, jamal.angle)) < jamal.visionAngle/2;
  const canSee = dist<jamal.visionDist && withinCone && hasLineOfSight(jamal.x,jamal.y,player.x,player.y);
  const heard = player.noise>6.5 && dist<jamal.visionDist*0.6;

  if(jamal.resting && canSee){ jamal.resting=false; }

  if(jamal.resting){
    jamal.restTimeLeft -= dt;
    if(jamal.restTimeLeft<=0){ jamal.resting=false; jamal.restTimer=(15*60)+Math.random()*15*60; pickJamalTarget(); }
    return;
  }

  if(jamal.state==='patrol'){
    jamal.restTimer -= dt;
    if(jamal.restTimer<=0){
      jamal.resting=true;
      jamal.restTimeLeft = 60+Math.random()*240;
      showJamalBubble(pick(t('restMsgs')), 2000);
      return;
    }
  }

  if(jamal.state==='patrol' && (canSee||heard)){
    jamal.state='chase';
    showMsg(pick(t('chaseMsgs')));
    playSweep(320,900,0.35,'square',0.22);
  } else if(jamal.state==='chase' && dist>jamal.visionDist*1.6 && !canSee){
    jamal.state='patrol'; pickJamalTarget();
    showMsg(pick(t('loseTrackMsgs')));
  }

  let tx,ty;
  if(jamal.state==='chase'){ tx=player.x; ty=player.y; }
  else {
    if(!jamal.target || Math.hypot(jamal.target.x-jamal.x, jamal.target.y-jamal.y)<0.3) pickJamalTarget();
    tx=jamal.target.x; ty=jamal.target.y;
  }
  const ang=Math.atan2(ty-jamal.y, tx-jamal.x);
  jamal.angle=ang;
  const nx=jamal.x+Math.cos(ang)*jamal.speed*dt, ny=jamal.y+Math.sin(ang)*jamal.speed*dt;
  jamalOpenDoorsNear(nx,ny);
  if(jamalCanStand(nx,jamal.y,jamal.r)) jamal.x=nx; else pickJamalTarget();
  if(jamalCanStand(jamal.x,ny,jamal.r)) jamal.y=ny; else pickJamalTarget();
  jamal.walkPhase += dt*(jamal.state==='chase'?0.5:0.25);

  phraseTimer+=dt;
  if(phraseTimer>380 && Math.random()<0.02){ phraseTimer=0; showMsg(pick(t('ambientMsgs')),1800); }
}

function winGame(){
  gameOver=true;
  document.getElementById('ovTitle').textContent=t('winTitle');
  document.getElementById('ovText').textContent=t('winText');
  document.getElementById('overlay').style.display='flex';
  playJingle([392,494,587,784],0.14);
  spawnConfetti();
}
function loseGame(){
  gameOver=true;
  document.getElementById('ovTitle').textContent=t('loseTitle');
  document.getElementById('ovText').textContent=pick(t('catchMsgs'));
  document.getElementById('overlay').style.display='flex';
  playSweep(500,110,0.4,'sawtooth',0.28);
  document.getElementById('stage').classList.add('wobble');
  setTimeout(()=> document.getElementById('stage').classList.remove('wobble'), 550);
}
document.getElementById('ovBtn').addEventListener('click', ()=> location.reload());

/* ---------- الرسم (Raycasting DDA) ---------- */
const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const stageEl = document.getElementById('stage');
const FOV = 66*Math.PI/180;
const MAX_DEPTH = 24;
const QUALITY_SCALE = { low:0.42, medium:0.7, high:1.05 };
let W=480, H=300, horizonY=150;

function resizeCanvas(){
  const rect = stageEl.getBoundingClientRect();
  const scale = QUALITY_SCALE[settings.quality] || 0.7;
  W = Math.max(160, Math.round(rect.width*scale));
  H = Math.max(100, Math.round(rect.height*scale));
  canvas.width=W; canvas.height=H;
}
window.addEventListener('resize', ()=> resizeCanvas());
window.addEventListener('orientationchange', ()=> setTimeout(resizeCanvas,300));

function playDoorSound(){ playSweep(260,130,0.4,'sawtooth',0.22); }
function shadeColor(c,s){ return `rgb(${Math.min(255,Math.max(0,Math.floor(c[0]*s+10)))},${Math.min(255,Math.max(0,Math.floor(c[1]*s+10)))},${Math.min(255,Math.max(0,Math.floor(c[2]*s+10)))})`; }

function castRay(rayAngle){
  const dirX=Math.cos(rayAngle), dirY=Math.sin(rayAngle);
  let mapX=Math.floor(player.x), mapY=Math.floor(player.y);
  const deltaDistX = dirX===0 ? 1e30 : Math.abs(1/dirX);
  const deltaDistY = dirY===0 ? 1e30 : Math.abs(1/dirY);
  let stepX,stepY,sideDistX,sideDistY;
  if(dirX<0){ stepX=-1; sideDistX=(player.x-mapX)*deltaDistX; } else { stepX=1; sideDistX=(mapX+1-player.x)*deltaDistX; }
  if(dirY<0){ stepY=-1; sideDistY=(player.y-mapY)*deltaDistY; } else { stepY=1; sideDistY=(mapY+1-player.y)*deltaDistY; }
  let side=0, hitVal=1, steps=0;
  while(steps<64){
    steps++;
    if(sideDistX<sideDistY){ sideDistX+=deltaDistX; mapX+=stepX; side=0; } else { sideDistY+=deltaDistY; mapY+=stepY; side=1; }
    if(mapX<0||mapX>=COLS||mapY<0||mapY>=ROWS){ hitVal=1; break; }
    const v=map[mapY][mapX];
    if(isRayBlocking(v)){ hitVal=v; break; }
  }
  let perpDist = side===0 ? (mapX-player.x+(1-stepX)/2)/dirX : (mapY-player.y+(1-stepY)/2)/dirY;
  if(perpDist<=0) perpDist=0.0001;
  let hitX = player.x+perpDist*dirX, hitY = player.y+perpDist*dirY;
  let wallX = side===0 ? hitY : hitX;
  wallX -= Math.floor(wallX);
  return { dist: Math.min(perpDist,MAX_DEPTH), side, hitVal, mapX, mapY, wallX };
}

function drawSprite(wx,wy,zbuffer,drawFn,sizeScale){
  const dx=wx-player.x, dy=wy-player.y;
  const dist=Math.hypot(dx,dy);
  let angTo=Math.atan2(dy,dx)-player.angle;
  while(angTo>Math.PI) angTo-=2*Math.PI;
  while(angTo<-Math.PI) angTo+=2*Math.PI;
  if(Math.abs(angTo) > FOV/2+0.35) return null;
  const screenX=(0.5+angTo/FOV)*W;
  const col=Math.max(0,Math.min(W-1,Math.floor(screenX)));
  if(dist > zbuffer[col]+0.15) return null;
  const size=Math.min(H*1.6, (H/(dist+0.0001))*sizeScale*4.2);
  const shade=Math.max(0.55, Math.min(1, 1-dist/16));
  const groundY = horizonY + (H/(dist+0.0001))*0.425;
  drawFn(screenX,size,shade,groundY);
  return {screenX,size,shade,dist,groundY};
}

/* ---------- عمود نافذة: سما+شمس+عشب+زهور، إطار بسيط ---------- */
function drawWindowColumn(i, top, wallH, wallX, shade){
  const frameShade = Math.min(1,shade+0.15);
  ctx.fillStyle = shadeColor([196,160,112],frameShade);
  ctx.fillRect(i, top, 1, wallH);

  const paneTop = top+wallH*0.20, paneBottom = top+wallH*0.86, paneH = paneBottom-paneTop;
  const b1=paneTop, b2=paneTop+paneH*0.28, b3=paneTop+paneH*0.50, b4=paneTop+paneH*0.62, b5=paneBottom;

  ctx.fillStyle = '#8ecbe9'; ctx.fillRect(i,b1,1,b2-b1);
  ctx.fillStyle = (wallX>0.38 && wallX<0.64) ? '#ffdd66' : '#8ecbe9';
  ctx.fillRect(i,b2,1,b3-b2);
  ctx.fillStyle='#a9dcef'; ctx.fillRect(i,b3,1,b4-b3);

  let grassColor='#6fbf4a';
  if((wallX>0.16&&wallX<0.27)||(wallX>0.72&&wallX<0.83)) grassColor='#ff9fc7';
  ctx.fillStyle=grassColor; ctx.fillRect(i,b4,1,b5-b4);

  if(wallX<0.07 || wallX>0.93){
    ctx.fillStyle=shadeColor([120,80,46],shade);
    ctx.fillRect(i,paneTop,1,paneH);
  }
  ctx.fillStyle=shadeColor([120,80,46],shade);
  ctx.fillRect(i,paneTop-2,1,3); ctx.fillRect(i,paneBottom-1,1,3);
}

/* ---------- عمود باب: مستطيل مضبوط العرض (مو عريض كامل الخلية)، لوحين ومقبض ---------- */
function drawDoorColumn(i, top, wallH, wallX, shade, isExit, time){
  const insetLo=0.17, insetHi=0.83;
  if(wallX<insetLo || wallX>insetHi){
    ctx.fillStyle=shadeColor([201,180,150],shade);
    ctx.fillRect(i, top, 1, wallH);
    return;
  }
  const localX=(wallX-insetLo)/(insetHi-insetLo);
  let base;
  if(isExit){ const pulse=0.75+Math.sin(time/240)*0.25; base=[80*pulse+140,150*pulse+55,60*pulse+40]; }
  else base=[150,104,64];

  const doorTop=top+wallH*0.04, doorBottom=top+wallH*0.99, doorH=doorBottom-doorTop;
  ctx.fillStyle=shadeColor(base,shade); ctx.fillRect(i, doorTop, 1, doorH);

  const panelTopA=doorTop+doorH*0.08, panelBotA=doorTop+doorH*0.46;
  const panelTopB=doorTop+doorH*0.54, panelBotB=doorTop+doorH*0.92;
  if(localX>0.12 && localX<0.88){
    const panelColor = base.map(v=>Math.min(255,v*1.16));
    ctx.fillStyle=shadeColor(panelColor,shade);
    ctx.fillRect(i,panelTopA,1,panelBotA-panelTopA);
    ctx.fillRect(i,panelTopB,1,panelBotB-panelTopB);
  }
  ctx.fillStyle=shadeColor(base.map(v=>v*0.5),shade);
  ctx.fillRect(i, doorTop+doorH*0.485, 1, doorH*0.045);

  if(localX>0.72 && localX<0.86){
    ctx.fillStyle = isExit ? 'rgba(255,240,180,0.95)' : 'rgba(230,200,120,0.95)';
    ctx.fillRect(i, doorTop+doorH*0.46, 1, doorH*0.06);
  }
  if(localX<0.06 || localX>0.94){
    ctx.fillStyle=shadeColor(base.map(v=>v*0.42),shade);
    ctx.fillRect(i, doorTop, 1, doorH);
  }
}

/* ---------- عمود أثاث: هندسة حقيقية بارتفاع مناسب لكل نوع، واقفة على الأرض ---------- */
const FURN_TYPES = {
  20:{h:0.5,  color:[196,150,92]},   // كاونتر
  21:{h:0.82, color:[228,231,235]},  // ثلاجة
  22:{h:0.3,  color:[150,100,60]},   // طاولة
  23:{h:0.38, color:[90,130,190]},   // سرير
  24:{h:0.85, color:[108,70,42]},    // دولاب
  25:{h:0.38, color:[235,238,240]},  // مرحاض
  26:{h:0.46, color:[235,238,240]},  // مغسلة
  27:{h:0.28, color:[232,236,239]},  // بانيو
  28:{h:0.4,  color:[150,58,68]},    // كنبة
  29:{h:0.62, color:[40,35,30]},     // تلفزيون
};
function drawFurnitureColumn(i, top, wallH, wallX, shade, val, time){
  const info = FURN_TYPES[val];
  const bottom = top+wallH;
  const objH = wallH*info.h;
  const objTop = bottom-objH;

  if(val===20){
    ctx.fillStyle=shadeColor(info.color,shade); ctx.fillRect(i,objTop,1,objH);
    ctx.fillStyle=shadeColor([225,196,150],shade); ctx.fillRect(i,objTop,1,objH*0.16);
  } else if(val===21){
    ctx.fillStyle=shadeColor(info.color,shade); ctx.fillRect(i,objTop,1,objH);
    ctx.fillStyle=shadeColor([170,175,180],shade); ctx.fillRect(i,objTop+objH*0.42,1,objH*0.03);
    if(wallX>0.76&&wallX<0.86) ctx.fillStyle=shadeColor([150,155,160],shade), ctx.fillRect(i,objTop+objH*0.1,1,objH*0.22);
  } else if(val===22){
    ctx.fillStyle=shadeColor(info.color,shade); ctx.fillRect(i,objTop,1,objH);
    ctx.fillStyle=shadeColor([190,140,85],shade); ctx.fillRect(i,objTop,1,objH*0.24);
  } else if(val===23){
    ctx.fillStyle=shadeColor([120,85,55],shade); ctx.fillRect(i,objTop,1,objH*0.22);
    ctx.fillStyle=shadeColor(info.color,shade); ctx.fillRect(i,objTop+objH*0.22,1,objH*0.78);
    if(wallX<0.24) ctx.fillStyle=shadeColor([245,240,228],shade), ctx.fillRect(i,objTop+objH*0.22,1,objH*0.3);
  } else if(val===24){
    ctx.fillStyle=shadeColor(info.color,shade); ctx.fillRect(i,objTop,1,objH);
    if(wallX>0.47&&wallX<0.53) ctx.fillStyle=shadeColor([28,18,10],shade), ctx.fillRect(i,objTop,1,objH);
  } else if(val===29){
    ctx.fillStyle=shadeColor(info.color,shade); ctx.fillRect(i,objTop+objH*0.55,1,objH*0.45);
    const flick = Math.sin(time/380+wallX*9)*0.5+0.5;
    const flick2 = Math.sin(time/210+wallX*15)*0.5+0.5;
    const scr = [Math.floor(35+flick*110), Math.floor(70+flick2*130), Math.floor(130+flick*115)];
    ctx.fillStyle=shadeColor(scr, Math.max(0.75,shade)); ctx.fillRect(i,objTop,1,objH*0.55);
    ctx.fillStyle=shadeColor([15,13,11],shade); ctx.fillRect(i,objTop,1,objH*0.035);
  } else if(val===28){
    ctx.fillStyle=shadeColor(info.color,shade); ctx.fillRect(i,objTop,1,objH);
    if(wallX<0.14||wallX>0.86) ctx.fillStyle=shadeColor([118,40,50],shade), ctx.fillRect(i,objTop-objH*0.2,1,objH*0.25);
  } else {
    ctx.fillStyle=shadeColor(info.color,shade); ctx.fillRect(i,objTop,1,objH);
  }
}

function render(time){
  const q = settings.quality;
  horizonY = H/2 + pitchOffset;
  const maxPitch = H*0.42;
  pitchOffset = Math.max(-maxPitch, Math.min(maxPitch, pitchOffset));

  const skyGrad = ctx.createLinearGradient(0,0,0,Math.max(1,horizonY));
  skyGrad.addColorStop(0,'#f2ece0'); skyGrad.addColorStop(1,'#e4dac6');
  ctx.fillStyle=skyGrad; ctx.fillRect(0,0,W,Math.max(0,horizonY));

  const floorGrad = ctx.createLinearGradient(0,horizonY,0,H);
  floorGrad.addColorStop(0,'#c9a06f'); floorGrad.addColorStop(1,'#a67a4c');
  ctx.fillStyle=floorGrad; ctx.fillRect(0,Math.max(0,horizonY),W,H);

  const zbuffer = new Array(W);

  for(let i=0;i<W;i++){
    const rayAngle=(player.angle-FOV/2)+(i/W)*FOV;
    const {dist,side,hitVal,mapX,mapY,wallX}=castRay(rayAngle);
    const correctedDist = dist*Math.cos(rayAngle-player.angle);
    zbuffer[i]=correctedDist;

    const wallH = Math.min(H*1.6, (H/(correctedDist+0.0001))*0.85);
    const top=horizonY-wallH/2;

    let shadeExp = q==='high' ? 1.0 : (q==='low' ? 1.25 : 1.1);
    let shade = Math.pow(Math.max(0,1-correctedDist/13), shadeExp);
    shade = Math.max(0.55, Math.min(1, shade + 0.28));

    if(hitVal===11){ drawWindowColumn(i, top, wallH, wallX, shade); continue; }
    if(hitVal===5){ drawDoorColumn(i, top, wallH, wallX, shade, false, time); continue; }
    if(hitVal===2){ drawDoorColumn(i, top, wallH, wallX, shade, true, time); continue; }
    if(isFurniture(hitVal)){ drawFurnitureColumn(i, top, wallH, wallX, shade, hitVal, time); continue; }

    let baseColor = side ? [224,203,172] : [201,180,150];
    if(q==='high'){
      const hash = Math.sin(mapX*12.9898+mapY*78.233)*43758.5453;
      const jitter = (hash-Math.floor(hash))*10-5;
      baseColor = baseColor.map(v=>v+jitter);
    }
    ctx.fillStyle=shadeColor(baseColor,shade);
    ctx.fillRect(i,top,1,wallH);
  }

  windowCells.forEach(([r,c])=>{
    drawSprite(c+0.5, r+0.5, zbuffer, (screenX,size,shade,groundY)=>{
      ctx.save(); ctx.globalAlpha = 0.3*shade;
      const glow=ctx.createRadialGradient(screenX,groundY-size*0.4,0,screenX,groundY-size*0.4,size*0.8);
      glow.addColorStop(0,'rgba(255,250,220,0.6)'); glow.addColorStop(1,'rgba(255,250,220,0)');
      ctx.fillStyle=glow; ctx.beginPath(); ctx.arc(screenX,groundY-size*0.4,size*0.8,0,Math.PI*2); ctx.fill();
      ctx.restore();
    }, 0.3);
  });

  drawSprite(doorCol+0.5, doorRow-1.35, zbuffer, (screenX,size,shade,groundY)=>{
    ctx.save(); ctx.globalAlpha=Math.max(0.5,shade);
    const glow=ctx.createRadialGradient(screenX,groundY-size*0.85,0,screenX,groundY-size*0.85,size*0.7);
    glow.addColorStop(0,'rgba(255,235,150,0.85)'); glow.addColorStop(1,'rgba(255,235,150,0)');
    ctx.fillStyle=glow; ctx.beginPath(); ctx.arc(screenX,groundY-size*0.85,size*0.7,0,Math.PI*2); ctx.fill();
    ctx.restore();
  }, 0.22);

  keyCandidates.forEach(k=>{
    if(k.taken) return;
    drawSprite(k.c+0.5, k.r+0.5, zbuffer, (screenX,size,shade,groundY)=>{
      const bob=Math.sin(time/300+k.r)*4;
      const y = groundY - size*0.32 + bob;
      ctx.save();
      const glow=ctx.createRadialGradient(screenX,y,0,screenX,y,size*1.4);
      glow.addColorStop(0,`rgba(255,225,100,${0.55*shade})`); glow.addColorStop(1,'rgba(255,225,100,0)');
      ctx.fillStyle=glow; ctx.beginPath(); ctx.arc(screenX,y,size*1.4,0,Math.PI*2); ctx.fill();
      ctx.translate(screenX,y); ctx.rotate(time/500);
      ctx.fillStyle=`rgba(255,220,70,${Math.max(0.6,shade)})`;
      ctx.beginPath(); ctx.arc(0,0,size*0.4,0,Math.PI*2); ctx.fill();
      ctx.fillRect(-size*0.08,0,size*0.16,size*0.5);
      ctx.restore();
    }, 0.16);
  });

  throwItems.forEach(it=>{
    if(it.taken) return;
    drawSprite(it.c+0.5, it.r+0.5, zbuffer, (screenX,size,shade,groundY)=>{
      const bob=Math.sin(time/260+it.c)*3;
      const y = groundY - size*0.22 + bob;
      ctx.save(); ctx.globalAlpha=Math.max(0.6,shade);
      ctx.fillStyle='#c9c9c9';
      ctx.beginPath(); ctx.ellipse(screenX,y,size*0.32,size*0.13,0,0,Math.PI*2); ctx.fill();
      ctx.fillStyle='#888';
      ctx.beginPath(); ctx.ellipse(screenX,y,size*0.15,size*0.06,0,0,Math.PI*2); ctx.fill();
      ctx.restore();
    }, 0.13);
  });

  projectiles.forEach(p=>{
    drawSprite(p.x,p.y,zbuffer,(screenX,size,shade,groundY)=>{
      ctx.save(); ctx.globalAlpha=Math.max(0.6,shade);
      ctx.fillStyle='#eee';
      ctx.beginPath(); ctx.ellipse(screenX,groundY-size*0.3,size*0.2,size*0.08,performance.now()/80,0,Math.PI*2); ctx.fill();
      ctx.restore();
    }, 0.08);
  });

  const pose = (jamal.resting || jamal.hitStun) ? 'still' : 'walk';
  const jSprite = drawSprite(jamal.x, jamal.y, zbuffer, (screenX,size,shade,groundY)=>{
    drawJamalLive(screenX, groundY, size, shade, pose);
  }, 0.14);

  if(jSprite && performance.now() < bubbleUntil && bubbleText){
    jamalBubble.textContent = bubbleText;
    jamalBubble.style.left = jSprite.screenX*(stageEl.clientWidth/W) + 'px';
    jamalBubble.style.top = (jSprite.groundY-jSprite.size)*(stageEl.clientHeight/H) + 'px';
    jamalBubble.classList.add('show');
  } else {
    jamalBubble.classList.remove('show');
  }

  const vgAlpha = q==='low' ? 0.12 : 0.08;
  const vg = ctx.createRadialGradient(W/2,horizonY,H*0.5,W/2,horizonY,W*0.75);
  vg.addColorStop(0,'rgba(0,0,0,0)'); vg.addColorStop(1,`rgba(60,40,20,${vgAlpha})`);
  ctx.fillStyle=vg; ctx.fillRect(0,0,W,H);
}

const compassArrow=document.getElementById('compassArrow');
const compassLabel=document.getElementById('compassLabel');
function updateCompass(){
  let tx,ty,label;
  if(!player.hasKey){
    let best=null, bestD=1e9;
    keyCandidates.forEach(k=>{ if(k.taken) return; const d=Math.hypot(player.x-(k.c+0.5), player.y-(k.r+0.5)); if(d<bestD){bestD=d; best=k;} });
    if(best){ tx=best.c+0.5; ty=best.r+0.5; } else { tx=doorCol+0.5; ty=doorRow; }
    label='🔑 '+t('compassKey');
  } else { tx=doorCol+0.5; ty=doorRow; label='🚪 '+t('compassDoor'); }
  const bearing=Math.atan2(ty-player.y, tx-player.x);
  const rel=angDiff(bearing, player.angle);
  compassArrow.style.transform=`rotate(${rel}rad)`;
  compassLabel.textContent=label;
}

let lastTime=performance.now();
function loop(time){
  let dt=(time-lastTime)/16.6667; dt=Math.max(0.2,Math.min(2.5,dt)); lastTime=time;

  if(gameActive){
    update(dt);
    render(time);
    updateCompass();
    document.getElementById('statusText').textContent = jamal.state==='chase'
      ? t('statusChase')
      : (player.hasKey ? t('statusHaveKey') : t('statusFindKey'));
  }
  requestAnimationFrame(loop);
}

resizeCanvas();
requestAnimationFrame(loop);
