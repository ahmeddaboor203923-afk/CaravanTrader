// =========================
// Canvas
// =========================

const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");

function resize(){

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

}

window.addEventListener("resize", resize);
resize();


// =========================
// حالات اللعبة
// =========================

const GAME_MENU = 0;
const GAME_LOADING = 1;
const GAME_WORLD = 2;

let gameState = GAME_MENU;

let worldExists =
SaveSystem.data.worldExists;

// =========================
// الموسيقى
// =========================

const menuMusic = new Audio("assets/music/menu.mp3");

menuMusic.loop = true;

menuMusic.volume = 0.7;

const settings = {

language: SaveSystem.data.language,

masterVolume: SaveSystem.data.masterVolume,

musicVolume: SaveSystem.data.musicVolume,

quality: SaveSystem.data.quality

};

function saveSettings(){

SaveSystem.data.language =
settings.language;

SaveSystem.data.masterVolume =
settings.masterVolume;

SaveSystem.data.musicVolume =
settings.musicVolume;

SaveSystem.data.quality =
settings.quality;

SaveSystem.save();

}

function loadSettings(){

settings.language=
localStorage.getItem("language") || "ar";

settings.masterVolume=
Number(localStorage.getItem("masterVolume") || 70);

settings.musicVolume=
Number(localStorage.getItem("musicVolume") || 70);

settings.quality=
localStorage.getItem("quality") || "high";

menuMusic.volume=
settings.masterVolume/100;

}

loadSettings();


function createMenu(){



    const menu = document.createElement("div");
    menu.id = "menu";

    document.body.appendChild(menu);


}

createMenu();

const menu = document.getElementById("menu");

// =========================
// شاشة التحميل
// =========================

const loadingScreen =
document.createElement("div");

loadingScreen.id =
"loadingScreen";

loadingScreen.innerHTML = `

<div id="loadingSpinner"></div>

<div id="loadingText">

جاري إنشاء العالم.

</div>

<div id="loadingBottom">

<span>

HTML / CSS

</span>

<span>

JAVASCRIPT

</span>

</div>

`;

document.body.appendChild(
loadingScreen
);

// =========================
// الأزرار
// =========================

const LANG = {

ar:{

newGame:"لعبة جديدة",

continue:"إكمال",

settings:"الإعدادات",

version:"Version 0.1",

settingsTitle:"⚙️ الإعدادات",

language:"🌍 اللغة",

sound:"🔊 الصوت",

music:"🎵 الموسيقى",

quality:"🖥 الجودة",

back:"رجوع",

qualityHigh:"عالية ▼",
qualityMedium:"متوسطة ▼",
qualityLow:"منخفضة ▼",

},

en:{

newGame:"New Game",

continue:"Continue",

settings:"Settings",

version:"Version 0.1",

settingsTitle:"⚙️ Settings",

language:"🌍 Language",

sound:"🔊 Sound",

music:"🎵 Music",

quality:"🖥 Graphics",

back:"Back",

qualityHigh:"High ▼",
qualityMedium:"Medium ▼",
qualityLow:"Low ▼",

}

};

const newGameBtn = document.createElement("button");
newGameBtn.className = "menuButton";
newGameBtn.innerText =
LANG[settings.language].newGame;

const continueBtn = document.createElement("button");
continueBtn.className = "menuButton";
continueBtn.innerText =
LANG[settings.language].continue;

const settingsBtn = document.createElement("button");
settingsBtn.className = "menuButton";
settingsBtn.innerText =
LANG[settings.language].settings;

menu.appendChild(newGameBtn);
menu.appendChild(continueBtn);
menu.appendChild(settingsBtn);


// =========================
// الإصدار
// =========================

const version = document.createElement("div");
version.id = "version";

menu.appendChild(version);


// =========================
// الأحداث
// =========================

newGameBtn.onclick = ()=>{

if(menuMusic.paused){

menuMusic.play();

}

if(worldExists){

showNewGamePopup();

}else{

SaveSystem.data.worldExists = true;
SaveSystem.save();


worldExists=true;

menuMusic.pause();

menuMusic.currentTime=0;

showLoading(false);

}

};


continueBtn.onclick = ()=>{

if(menuMusic.paused){

menuMusic.play();

}

showLoading(false);

};

settingsBtn.onclick = ()=>{

if(menuMusic.paused){

menuMusic.play();

}

showSettings();

};

// =========================
// دوال مؤقتة
// =========================

function showLoading(isContinue){

menu.style.display = "none";

loadingScreen.style.display = "flex";

gameState = GAME_LOADING;

let dots = 1;

setInterval(()=>{

let text = "";

if(settings.language==="ar"){

text = "جاري إنشاء العالم";

}else{

text = "The world is being built";

}

document.getElementById(
"loadingText"
).innerText =
text + ".".repeat(dots);

dots++;

if(dots>3){

dots=1;

}

},500);

setTimeout(()=>{

loadingScreen.style.display = "none";

gameState = GAME_WORLD;

},10000);

}



// =========================
// نافذة الإعدادات
// =========================

function showSettings(){

const popup = document.createElement("div");

popup.id = "popup";

popup.innerHTML = `

<div id="popupBox">

<h2>${LANG[settings.language].settingsTitle}</h2>

<div class="settingRow">

<span>${LANG[settings.language].language}</span>

<button id="languageBtn">

${settings.language==="ar" ? "العربية ▼" : "English ▼"}

</button>

</div>

<div class="settingRow">

<span>${LANG[settings.language].sound}</span>

<input
id="masterSlider"
type="range"
min="0"
max="100"
value="${settings.masterVolume}">

</div>

<div class="settingRow">

<span>${LANG[settings.language].music}</span>

<input
id="musicSlider"
type="range"
min="0"
max="100"
value="${settings.musicVolume}">

</div>

<div class="settingRow">

<span>${LANG[settings.language].quality}</span>

<button id="qualityBtn">

${
settings.quality==="high"
?
LANG[settings.language].qualityHigh
:
settings.quality==="medium"
?
LANG[settings.language].qualityMedium
:
LANG[settings.language].qualityLow
}

</button>

</div>

<div id="popupButtons">

<button id="closeSettings">

${LANG[settings.language].back}

</button>

</div>

</div>

`;


document.body.appendChild(popup);

const languageBtn =
document.getElementById("languageBtn");

languageBtn.onclick = ()=>{

if(settings.language==="ar"){

settings.language="en";

languageBtn.innerText=
"English ▼";

}else{

settings.language="ar";

languageBtn.innerText=
"العربية ▼";

}

newGameBtn.innerText =
LANG[settings.language].newGame;

continueBtn.innerText =
LANG[settings.language].continue;

settingsBtn.innerText =
LANG[settings.language].settings;

saveSettings();
};

const qualityBtn =
document.getElementById("qualityBtn");

qualityBtn.onclick = ()=>{

if(settings.quality==="high"){

settings.quality="medium";

qualityBtn.innerText =
LANG[settings.language].qualityMedium;

}
else if(settings.quality==="medium"){

settings.quality="low";

qualityBtn.innerText =
LANG[settings.language].qualityLow;

}
else{

settings.quality="high";

qualityBtn.innerText =
LANG[settings.language].qualityHigh;

}

saveSettings();

};

const masterSlider =
document.getElementById("masterSlider");

masterSlider.oninput = ()=>{

settings.masterVolume =
Number(masterSlider.value);

menuMusic.volume =
settings.masterVolume / 100;

saveSettings();

};

document.getElementById(
"closeSettings"
).onclick = ()=>{

popup.remove();

};

}


// =========================
// نافذة التأكيد
// =========================

function showNewGamePopup(){

    const popup = document.createElement("div");
    popup.id = "popup";

    popup.innerHTML = `
    <div id="popupBox">

<h2>

${
settings.language==="ar"
?
"بدء لعبة جديدة"
:
"New Game"
}

</h2>

<p>

${
settings.language==="ar"
?
"هل تريد حذف البيانات القديمة وبدء عالم جديد؟<br><br>⚠ لا يمكن التراجع."
:
"Do you want to delete the old save and create a new world?<br><br>⚠ This cannot be undone."
}

</p>

<div id="popupButtons">

<button id="yesBtn">

${
settings.language==="ar"
?
"نعم"
:
"Yes"
}

</button>

<button id="noBtn">

${
settings.language==="ar"
?
"لا"
:
"No"
}

</button>

</div>

</div>

    `;

    document.body.appendChild(popup);

    document.getElementById("yesBtn").onclick = ()=>{

        popup.remove();

        menuMusic.pause();
menuMusic.currentTime = 0;

        showLoading(false);

    };

    document.getElementById("noBtn").onclick = ()=>{

        popup.remove();

    };

}
// =========================
// حلقة اللعبة
// =========================

function update(){

    ctx.clearRect(
        0,
        0,
        canvas.width,
        canvas.height
    );

    switch(gameState){

        case GAME_MENU:
            // القائمة عبارة عن HTML فقط
        break;

        case GAME_LOADING:

            ctx.fillStyle = "#111";
            ctx.fillRect(
                0,
                0,
                canvas.width,
                canvas.height
            );

            ctx.fillStyle = "#ffffff";
            ctx.font = "40px Arial";
            ctx.textAlign = "center";

            ctx.fillText(
                "جاري إنشاء العالم...",
                canvas.width / 2,
                canvas.height / 2
            );

        break;

case GAME_WORLD:

ctx.fillStyle = "#6dbb55";

ctx.fillRect(
0,
0,
canvas.width,
canvas.height
);

break;


    }

    requestAnimationFrame(update);

}

update();

window.addEventListener("blur", ()=>{

menuMusic.pause();

});

window.addEventListener("focus", ()=>{

if(gameState===GAME_MENU){

menuMusic.play();

}

});

document.addEventListener("pause", ()=>{

    menuMusic.pause();

}, false);

document.addEventListener("resume", ()=>{

    if(gameState===GAME_MENU){

        menuMusic.play();

    }

}, false);

