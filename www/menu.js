/* ============================================================
   menu.js — القائمة، الإعدادات، الترجمة، والصوت (مشترك مع game.js)
   ============================================================ */

/* ---------- الترجمة ---------- */
const translations = {
  ar: {
    title:'🏚️ اهرب من أبو جمال', menuSub:'دخلت بيته... وهسا لازم تطلع قبل ما يمسكك!',
    startBtn:'▶ بدء اللعبة', settingsBtn:'⚙ الإعدادات', settingsTitle:'⚙ الإعدادات', back:'⬅ رجوع',
    langLabel:'اللغة', qualityLabel:'الجودة', soundLabel:'🚶 صوت المشي', musicLabel:'🎵 الموسيقى',
    qualityLow:'منخفضة', qualityMed:'متوسطة', qualityHigh:'عالية',
    keyLabel:'🔑 المفتاح', retry:'🔁 إعادة المحاولة', rotateMsg:'🔄 دوّر جوالك عشان تلعب أحسن',
    statusFindKey:'تابع البوصلة فوق عشان تلاقي المفتاح',
    statusHaveKey:'✅ عندك المفتاح — تابع البوصلة لباب الخروج',
    statusChase:'😅 شافك أبو جمال! أنت أسرع منه بكثير، اهرب!',
    compassKey:'المفتاح', compassDoor:'باب الخروج',
    winTitle:'🎉 نجحت بالهروب!', winText:'طلعت من بيت أبو جمال بسلامة... وبالمفتاح الصح!',
    loseTitle:'😂 أمسكك أبو جمال!',
    keyMsg:'🔑 لقيت المفتاح! روح لباب الخروج المضيء.', initialMsg:'مين دخل بيتي؟ 😆',
    chaseMsgs:['مين دخل بيتي؟!','شفتك! 👀','تعال لا تخاف 😆'],
    loseTrackMsgs:['وينك راح؟','طيب بدور بمكان ثاني...'],
    ambientMsgs:['شايف رجلك 👀','والله ما أضرب كثير','تعال هون بابا','وين رايح؟ ما في مطرح تروحله'],
    restMsgs:['اخخخ تعبت 😮‍💨','ياخي انت سريع 😤','ياليتني ما اكلت شاورما 🥙','خلوني بس التقط أنفاسي','هاي الكرشة مو مساعدة 😅'],
    catchMsgs:['قلتلك لا تدخل بيتي 😂','خخخ لحقتك أخيرًا!','طلعت أسرع مني بس أنا أذكى 😏'],
    doorOpenMsg:'🚪 فتحت الباب...', fakeKeyMsg:'❌ مفتاح مزيف... جرب غرفة تانية.',
    pickThrowMsg:'🎯 اخذت شي تقدر ترميه على أبو جمال!',
    hitMsgs:['ليش ترمي علي؟! 😠','ايش هالوقاحة؟!','خلص خلص بلاش رمي! 😤','آآخ! ليش هيك؟','طيب طيب هدّي شوي']
  },
  en: {
    title:'🏚️ Escape Abu Jamal', menuSub:"You snuck into his house... now get out before he catches you!",
    startBtn:'▶ Start Game', settingsBtn:'⚙ Settings', settingsTitle:'⚙ Settings', back:'⬅ Back',
    langLabel:'Language', qualityLabel:'Quality', soundLabel:'🚶 Footstep Volume', musicLabel:'🎵 Music',
    qualityLow:'Low', qualityMed:'Medium', qualityHigh:'High',
    keyLabel:'🔑 Key', retry:'🔁 Try Again', rotateMsg:'🔄 Rotate your phone for the best experience',
    statusFindKey:'Follow the compass above to find the key',
    statusHaveKey:"✅ You have the key — follow the compass to the exit",
    statusChase:"😅 Abu Jamal spotted you! You're way faster, run!",
    compassKey:'Key', compassDoor:'Exit Door',
    winTitle:'🎉 You escaped!', winText:"You got out of Abu Jamal's house safe... with the right key!",
    loseTitle:'😂 Abu Jamal got you!',
    keyMsg:'🔑 Got the key! Head to the glowing exit door.', initialMsg:"Who's in my house? 😆",
    chaseMsgs:["Who's in my house?!",'I see you! 👀',"Come here, don't be scared 😆"],
    loseTrackMsgs:["Where'd you go?","Fine, I'll look somewhere else..."],
    ambientMsgs:['I can see your feet 👀',"I swear I won't hit hard","C'mere buddy","Where you going? Nowhere to run"],
    restMsgs:["Ugh, I'm exhausted 😮‍💨","Dude you're fast 😤","I wish I hadn't eaten that shawarma 🥙","Just let me catch my breath","This belly isn't helping 😅"],
    catchMsgs:["Told you not to come in 😂","Ha, finally got you!","You're faster but I'm smarter 😏"],
    doorOpenMsg:'🚪 Opened the door...', fakeKeyMsg:'❌ Fake key... try another room.',
    pickThrowMsg:'🎯 Picked up something to throw at Abu Jamal!',
    hitMsgs:["Why are you throwing stuff at me?! 😠","How rude is that?!","Stop it, no more throwing! 😤","Ouch! Why would you do that?","Okay okay, easy now"]
  }
};

/* ---------- الإعدادات (محفوظة محليًا) ---------- */
function loadSettings(){
  try{
    const s = JSON.parse(localStorage.getItem('abuJamalSettings'));
    return Object.assign({lang:'ar', quality:'medium', sound:0.8, music:0.5}, s||{});
  }catch(e){ return {lang:'ar', quality:'medium', sound:0.8, music:0.5}; }
}
let settings = loadSettings();
function saveSettings(){ try{ localStorage.setItem('abuJamalSettings', JSON.stringify(settings)); }catch(e){} }
function t(key){ return translations[settings.lang][key]; }
function pick(a){ return a[Math.floor(Math.random()*a.length)]; }

function applyLanguage(){
  document.documentElement.lang = settings.lang;
  document.documentElement.dir = settings.lang==='ar' ? 'rtl' : 'ltr';
  document.querySelectorAll('[data-i18n]').forEach(el=>{
    el.textContent = t(el.getAttribute('data-i18n'));
  });
}

/* ---------- التنقل بين الشاشات ---------- */
const menuScreen = document.getElementById('menuScreen');
const settingsScreen = document.getElementById('settingsScreen');
const gameScreen = document.getElementById('gameScreen');
let cameFromGame = false;
let gameActive = false; // يستخدمها game.js لإيقاف/تشغيل الحلقة

function showScreen(name){
  menuScreen.style.display = name==='menu' ? 'flex' : 'none';
  settingsScreen.style.display = name==='settings' ? 'flex' : 'none';
  gameScreen.style.display = name==='game' ? 'flex' : 'none';
}

function syncSettingsUI(){
  document.querySelectorAll('.lang-btn').forEach(b=> b.classList.toggle('active', b.dataset.lang===settings.lang));
  document.querySelectorAll('.quality-btn').forEach(b=> b.classList.toggle('active', b.dataset.quality===settings.quality));
  document.getElementById('soundSlider').value = settings.sound;
  document.getElementById('musicSlider').value = settings.music;
}

document.querySelectorAll('.lang-btn').forEach(b=> b.addEventListener('click', ()=>{
  settings.lang = b.dataset.lang; saveSettings(); applyLanguage(); syncSettingsUI();
}));
document.querySelectorAll('.quality-btn').forEach(b=> b.addEventListener('click', ()=>{
  settings.quality = b.dataset.quality; saveSettings(); syncSettingsUI();
  if(typeof resizeCanvas === 'function') resizeCanvas();
}));
document.getElementById('soundSlider').addEventListener('input', e=>{ settings.sound=parseFloat(e.target.value); saveSettings(); });
document.getElementById('musicSlider').addEventListener('input', e=>{ settings.music=parseFloat(e.target.value); setMusicVolume(settings.music); saveSettings(); });

document.getElementById('btnSettings').addEventListener('click', ()=>{ cameFromGame=false; syncSettingsUI(); showScreen('settings'); });
document.getElementById('btnBack').addEventListener('click', ()=> showScreen(cameFromGame ? 'game' : 'menu'));
document.getElementById('btnPause').addEventListener('click', ()=>{ cameFromGame=true; syncSettingsUI(); showScreen('settings'); });

document.getElementById('btnStart').addEventListener('click', startGame);

function startGame(){
  try{
    const el = document.documentElement;
    if(el.requestFullscreen) el.requestFullscreen().catch(()=>{});
    if(screen.orientation && screen.orientation.lock) screen.orientation.lock('landscape').catch(()=>{});
  }catch(e){}
  ensureAudio(); startMusic();
  showScreen('game');
  if(typeof resizeCanvas === 'function') resizeCanvas();
  gameActive = true;
  if(typeof showMsg === 'function') showMsg(t('initialMsg'), 2500);
}

/* ---------- الصوت (مُولّد بالكامل بالكود، بدون ملفات صوت خارجية) ---------- */
let audioCtx=null, musicGain=null, musicInterval=null;
function ensureAudio(){
  if(!audioCtx) audioCtx = new (window.AudioContext||window.webkitAudioContext)();
  if(audioCtx.state==='suspended') audioCtx.resume();
}
function playFootstep(){
  if(!audioCtx || settings.sound<=0) return;
  const t0 = audioCtx.currentTime;
  const osc = audioCtx.createOscillator(), gain = audioCtx.createGain();
  osc.type='triangle';
  osc.frequency.value = 85+Math.random()*25;
  gain.gain.setValueAtTime(0.0001, t0);
  gain.gain.linearRampToValueAtTime(settings.sound*0.4, t0+0.01);
  gain.gain.exponentialRampToValueAtTime(0.001, t0+0.11);
  osc.connect(gain); gain.connect(audioCtx.destination);
  osc.start(t0); osc.stop(t0+0.12);
}
function playSweep(f0,f1,dur,type,vol){
  if(!audioCtx) return;
  const t0=audioCtx.currentTime;
  const osc=audioCtx.createOscillator(), g=audioCtx.createGain();
  osc.type=type;
  osc.frequency.setValueAtTime(f0,t0);
  osc.frequency.exponentialRampToValueAtTime(Math.max(f1,20),t0+dur);
  g.gain.setValueAtTime(Math.max(settings.sound,0.05)*vol,t0);
  g.gain.exponentialRampToValueAtTime(0.001,t0+dur);
  osc.connect(g); g.connect(audioCtx.destination);
  osc.start(t0); osc.stop(t0+dur+0.02);
}
function playJingle(freqs, dur){
  if(!audioCtx) return;
  freqs.forEach((f,i)=>{
    const t0 = audioCtx.currentTime + i*dur;
    const osc=audioCtx.createOscillator(), g=audioCtx.createGain();
    osc.type='triangle'; osc.frequency.value=f;
    g.gain.setValueAtTime(0.0001,t0);
    g.gain.linearRampToValueAtTime(Math.max(settings.sound,0.3)*0.3,t0+0.02);
    g.gain.exponentialRampToValueAtTime(0.001,t0+dur);
    osc.connect(g); g.connect(audioCtx.destination);
    osc.start(t0); osc.stop(t0+dur+0.02);
  });
}
function startMusic(){
  if(musicInterval) return;
  const notes = [261.6,329.6,392.0,329.6,293.7,349.2,440.0,349.2,261.6,392.0,329.6,293.7];
  let idx=0;
  musicGain = audioCtx.createGain();
  musicGain.gain.value = settings.music*0.2;
  musicGain.connect(audioCtx.destination);
  musicInterval = setInterval(()=>{
    if(document.hidden || !audioCtx) return;
    const t0=audioCtx.currentTime;
    const osc=audioCtx.createOscillator(), g=audioCtx.createGain();
    osc.type='triangle'; osc.frequency.value=notes[idx%notes.length];
    g.gain.setValueAtTime(0.0001,t0);
    g.gain.linearRampToValueAtTime(1,t0+0.02);
    g.gain.exponentialRampToValueAtTime(0.001,t0+0.26);
    osc.connect(g); g.connect(musicGain);
    osc.start(t0); osc.stop(t0+0.28);
    idx++;
  }, 250);
}
function setMusicVolume(v){ if(musicGain) musicGain.gain.value = v*0.2; }

/* ---------- بانرات الرسائل وفقاعة كلام أبو جمال ---------- */
function showMsg(text, ms=2200){
  const b=document.getElementById('banner');
  const d=document.createElement('div'); d.className='msg'; d.textContent=text;
  b.appendChild(d);
  requestAnimationFrame(()=> d.classList.add('show'));
  setTimeout(()=>{ d.classList.remove('show'); setTimeout(()=>d.remove(),400); }, ms);
}
const jamalBubble = document.getElementById('jamalBubble');
let bubbleText='', bubbleUntil=0;
function showJamalBubble(text, ms=2200){ bubbleText=text; bubbleUntil=performance.now()+ms; showMsg(text, ms); }

/* ---------- كونفيتي الفوز ---------- */
function spawnConfetti(){
  const layer=document.getElementById('confettiLayer');
  const colors=['#e0763f','#ffd25c','#4ab0e8','#7ac25a','#e85a7a'];
  for(let i=0;i<36;i++){
    const el=document.createElement('div'); el.className='confetti';
    el.style.left=(Math.random()*100)+'%';
    el.style.background=colors[Math.floor(Math.random()*colors.length)];
    el.style.animationDuration=(1.6+Math.random()*1.4)+'s';
    el.style.animationDelay=(Math.random()*0.4)+'s';
    layer.appendChild(el);
    setTimeout(()=> el.remove(), 3500);
  }
}

/* ---------- التشغيل الأولي لواجهة القائمة ---------- */
applyLanguage();
syncSettingsUI();
