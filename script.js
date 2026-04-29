/* ══════════════════════════════
   SCREEN MANAGEMENT
══════════════════════════════ */
const screens={menu:'sMenu',how:'sHow',game:'sGame'};
function show(k){Object.values(screens).forEach(id=>document.getElementById(id).classList.toggle('off',id!==screens[k]));}

let diff='medium';
document.querySelectorAll('.dbtn').forEach(b=>b.addEventListener('click',()=>{
  document.querySelectorAll('.dbtn').forEach(x=>x.classList.remove('on'));
  b.classList.add('on'); diff=b.dataset.d;
}));

document.getElementById('btnPlay').onclick=()=>{
  show('game');
  document.getElementById('ainame').textContent=diff.toUpperCase();
  startGame();
};
document.getElementById('btnHow').onclick=()=>show('how');
document.getElementById('btnHowBack').onclick=()=>show('menu');
document.getElementById('btnMenu2').onclick=()=>show('menu');
document.getElementById('btnNew').onclick=startGame;
document.getElementById('goAgain').onclick=()=>{document.getElementById('goover').classList.remove('on');startGame();};
document.getElementById('goMenu').onclick=()=>{document.getElementById('goover').classList.remove('on');show('menu');};

/* ══════════════════════════════
   CANVAS SETUP
══════════════════════════════ */
const gc=document.getElementById('gc');
const oc=document.getElementById('oc');
const gx=gc.getContext('2d');
const ox=oc.getContext('2d');
let W=0,H=0,RX=0,RY=0,TW=0,TH=0,BR=0,PR=0;
let gameRunning=false;

function resize(){
  const wrap=document.getElementById('cwrap');
  const wa=wrap.clientWidth,ha=wrap.clientHeight;
  const ratio=1.94;
  let cw=wa,ch=wa/ratio;
  if(ch>ha){ch=ha;cw=ch*ratio;}
  cw=Math.floor(cw);ch=Math.floor(ch);
  [gc,oc].forEach(c=>{c.width=cw;c.height=ch;c.style.width=cw+'px';c.style.height=ch+'px';});
  W=cw;H=ch;
  RX=Math.round(W*.054);RY=Math.round(H*.09);
  TW=W-RX*2;TH=H-RY*2;
  BR=Math.round(W*.019);
  PR=Math.round(W*.04); 
}
window.addEventListener('resize',()=>{if(gameRunning)resize();});

/* ══════════════════════════════
   BALL DEFINITIONS
══════════════════════════════ */
const BD=[
  {id:0,c:'#f0ede6',s:false},
  {id:1,c:'#f0c040',s:false},{id:2,c:'#1e50c8',s:false},
  {id:3,c:'#c82020',s:false},{id:4,c:'#6010a8',s:false},
  {id:5,c:'#d06010',s:false},{id:6,c:'#186828',s:false},
  {id:7,c:'#701010',s:false},{id:8,c:'#111111',s:false},
  {id:9,c:'#f0c040',s:true},{id:10,c:'#1e50c8',s:true},
  {id:11,c:'#c82020',s:true},{id:12,c:'#6010a8',s:true},
  {id:13,c:'#d06010',s:true},{id:14,c:'#186828',s:true},
  {id:15,c:'#701010',s:true},
];

/* ══════════════════════════════
   GAME STATE
══════════════════════════════ */
let balls=[],ptcls=[];
let curPl=0,plType=[null,null],potted=[[],[]];
let inShot=false,gameOver=false,breakShot=true,shotCnt=0;
let cuePot=false,eightPot=false,foulF=false;
let placing=false,aiTmr=null;
let aimAng=0;
let manualPower=50;
let spacePower=0;
let keys={w:false,s:false};
let mousePos={x:200,y:200};

// ... Rest of your JavaScript physics and game logic goes here ...
// Since the user provided script was cut off, make sure to paste 
// the full logic from your original "script" section here.

function startGame(){
  gameRunning=true;resize();
  balls=[];ptcls=[];
  curPl=0;plType=[null,null];potted=[[],[]];
  inShot=false;gameOver=false;breakShot=true;shotCnt=0;
  // Initialize balls... (as per your script logic)
}

// Ensure you include your loop and draw functions to make it run!