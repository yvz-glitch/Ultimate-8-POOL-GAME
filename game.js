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
  oc.style.position='absolute';
  W=cw;H=ch;
  const brd=H*.098;
  RX=brd*1.18;RY=brd*.72;TW=W-RX*2;TH=H-RY*2;
  BR=H*.034;PR=H*.072;
}
window.addEventListener('resize',()=>{resize();});

function pockets(){
  return[
    {x:RX,y:RY},{x:RX+TW/2,y:RY-PR*.08},{x:RX+TW,y:RY},
    {x:RX,y:RY+TH},{x:RX+TW/2,y:RY+TH+PR*.08},{x:RX+TW,y:RY+TH}
  ];
}

/* ══════════════════════════════
   BALL DATA
══════════════════════════════ */
const BD={
  0:{id:0,c:'#f5f0e8',s:false},
  1:{id:1,c:'#f0c018',s:false},2:{id:2,c:'#1060d0',s:false},
  3:{id:3,c:'#d02020',s:false},4:{id:4,c:'#7030a0',s:false},
  5:{id:5,c:'#e06820',s:false},6:{id:6,c:'#185898',s:false},
  7:{id:7,c:'#c01818',s:false},8:{id:8,c:'#181818',s:false},
  9:{id:9,c:'#f0c018',s:true},10:{id:10,c:'#1060d0',s:true},
  11:{id:11,c:'#d02020',s:true},12:{id:12,c:'#7030a0',s:true},
  13:{id:13,c:'#e06820',s:true},14:{id:14,c:'#185898',s:true},
  15:{id:15,c:'#c01818',s:true}
};

/* ══════════════════════════════
   GAME STATE
══════════════════════════════ */
let balls=[],ptcls=[],potted,plType,curPl,inShot,gameOver,breakShot,potSnap,shotCnt;
let cuePot,eightPot,foulF,placing,spaceDown,spacePower,spaceRAF;
let cueOffset=0,aimAng=0,mousePos={x:0,y:0};
let manualPower=70;
let aiTmr=null;
let shotBanks=0,shotCombos=0,shotPopped=0;
let keys={w:false,s:false};
const CUE_STEP=W*.009||2;
const CUE_OFFSET_MAX=W*.055||12;

/* ── Touch drag state ── */
let touchDragging=false;
let touchStartPos=null;
let touchDragThreshold=18;

function startGame(){
  resize();
  balls=[];ptcls=[];
  potted=[[],[]];plType=[null,null];curPl=0;
  inShot=false;gameOver=false;breakShot=true;shotCnt=0;
  cuePot=false;eightPot=false;foulF=false;
  placing=false;spaceDown=false;spacePower=0;cueOffset=0;
  shotBanks=0;shotCombos=0;shotPopped=0;
  if(aiTmr)clearTimeout(aiTmr);
  if(spaceRAF){cancelAnimationFrame(spaceRAF);spaceRAF=null;}
  ['goover','foultag','aitag','tricktag'].forEach(id=>document.getElementById(id).classList.remove('on'));
  document.getElementById('placehint').style.display='none';
  document.getElementById('spacehold').style.display='none';
  document.getElementById('cshotnum').textContent='0';
  setSpaceRing(0);
  updateBadges();updatePotUI();
  resetSideTracks();

  balls.push({...BD[0],x:RX+TW*.27,y:RY+TH/2,vx:0,vy:0,pocketed:false});
  const rx=RX+TW*.73,ry=RY+TH/2,d=BR*2.04;
  const order=[1,9,2,10,8,3,11,4,12,13,5,14,6,15,7];
  let i=0;
  for(let r=0;r<5;r++)for(let c=0;c<=r;c++){
    const bx=rx+r*d*Math.cos(Math.PI/6),by=ry+(c-r/2)*d;
    balls.push({...BD[order[i]],x:bx+(Math.random()-.5)*.35,y:by+(Math.random()-.5)*.35,vx:0,vy:0,pocketed:false});i++;
  }
  updateTurnUI();
  gameRunning=true;
  if(!loopRunning)startLoop();
}

/* ══════════════════════════════
   PHYSICS  — turbo power
══════════════════════════════ */
const FRIC=0.9875,MINV=0.11;

function physStep(){
  let any=false;
  balls.forEach(b=>{
    if(b.pocketed)return;
    const spd=Math.hypot(b.vx,b.vy);
    if(spd<MINV){b.vx=0;b.vy=0;return;}
    any=true;
    b.x+=b.vx;b.y+=b.vy;
    b.vx*=FRIC;b.vy*=FRIC;
    if(b.x-BR<RX){b.x=RX+BR;b.vx=Math.abs(b.vx)*.74;if(inShot)shotBanks++;snd('rail');}
    if(b.x+BR>RX+TW){b.x=RX+TW-BR;b.vx=-Math.abs(b.vx)*.74;if(inShot)shotBanks++;snd('rail');}
    if(b.y-BR<RY){b.y=RY+BR;b.vy=Math.abs(b.vy)*.74;if(inShot)shotBanks++;snd('rail');}
    if(b.y+BR>RY+TH){b.y=RY+TH-BR;b.vy=-Math.abs(b.vy)*.74;if(inShot)shotBanks++;snd('rail');}
    pockets().forEach(p=>{
      const dx=b.x-p.x,dy=b.y-p.y;
      if(dx*dx+dy*dy<(PR*.83)*(PR*.83)){
        b.pocketed=true;b.vx=0;b.vy=0;
        spawnPtcl(b.x,b.y,b.c||'#888');snd('pocket');onPot(b);
      }
    });
  });
  for(let i=0;i<balls.length;i++)for(let j=i+1;j<balls.length;j++){
    const a=balls[i],b=balls[j];
    if(a.pocketed||b.pocketed)continue;
    const dx=b.x-a.x,dy=b.y-a.y,dist=Math.hypot(dx,dy);
    if(dist<BR*2&&dist>0.01){
      const nx=dx/dist,ny=dy/dist,ov=BR*2-dist;
      a.x-=nx*ov*.5;a.y-=ny*ov*.5;b.x+=nx*ov*.5;b.y+=ny*ov*.5;
      const rel=(a.vx-b.vx)*nx+(a.vy-b.vy)*ny;
      if(rel>0){
        a.vx-=rel*nx*.93;a.vy-=rel*ny*.93;b.vx+=rel*nx*.93;b.vy+=rel*ny*.93;
        if(inShot)shotCombos++;snd('ball');
      }
    }
  }
  return any;
}

/* ══════════════════════════════
   POT HANDLER
══════════════════════════════ */
function onPot(b){
  if(b.id===0){cuePot=true;foulF=true;return;}
  if(b.id===8){eightPot=true;return;}
  shotPopped++;
  const isS=b.s;
  if(plType[curPl]===null&&plType[1-curPl]===null&&!breakShot){
    plType[curPl]=isS?'stripe':'solid';
    plType[1-curPl]=isS?'solid':'stripe';
    updateBadges();
  }
  const ct=plType[curPl];
  if(ct===null||(ct==='solid'&&!isS)||(ct==='stripe'&&isS)){
    potted[curPl].push(b.id);
    addBallToSideTrack(curPl,b);
  } else {
    potted[1-curPl].push(b.id);
    addBallToSideTrack(1-curPl,b);
    foulF=true;
  }
  updatePotUI();
}

/* ══════════════════════════════
   SHOT SETTLED
══════════════════════════════ */
function onSettled(){
  inShot=false;breakShot=false;
  cueOffset=0;
  if(curPl===0){
    const trick=(shotBanks>=2)||(shotBanks>=1&&shotPopped>=1)||(shotCombos>=3&&shotPopped>=1);
    if(trick)flashTrick();
  }
  shotBanks=0;shotCombos=0;shotPopped=0;

  if(eightPot){
    const rem=remFor(curPl).length;
    if(rem===0&&!cuePot)endGame(curPl,'8-Ball Sunk — You Win!');
    else endGame(1-curPl,curPl===0?'AI wins — You sunk the 8 early!':'You win — AI sunk the 8 early!');
    return;
  }
  if(cuePot){foulMsg('SCRATCH! Ball in Hand');cuePot=false;foulF=false;flipTurn();enterPlace();return;}
  if(foulF){foulMsg('FOUL! Wrong Ball');foulF=false;flipTurn();return;}
  if(potted[curPl].length<=potSnap)flipTurn();
  if(!gameOver)schedAI();
}

function remFor(pi){
  const t=plType[pi];
  if(!t)return balls.filter(b=>!b.pocketed&&b.id!==0&&b.id!==8);
  return balls.filter(b=>!b.pocketed&&b.id!==0&&b.id!==8&&(t==='solid'?!b.s:b.s));
}
function flipTurn(){curPl=1-curPl;updateTurnUI();}
function foulMsg(m){const e=document.getElementById('foultag');e.textContent=m;e.classList.add('on');setTimeout(()=>e.classList.remove('on'),1600);}
function flashTrick(){
  const e=document.getElementById('tricktag');
  const msgs=['🔥 TRICKSHOT!','💫 SICK SHOT!','⚡ BANK MASTER!','🌟 COMBO KING!'];
  e.textContent=msgs[Math.floor(Math.random()*msgs.length)];
  e.classList.add('on');setTimeout(()=>e.classList.remove('on'),2200);
}
function enterPlace(){
  placing=true;document.getElementById('placehint').style.display='block';
  const cue=balls.find(b=>b.id===0);
  if(cue){cue.pocketed=false;cue.x=-300;cue.y=-300;cue.vx=0;cue.vy=0;}
}
function finishPlace(cx,cy){
  placing=false;document.getElementById('placehint').style.display='none';
  const cue=balls.find(b=>b.id===0);if(!cue)return;
  cue.x=Math.max(RX+BR+2,Math.min(RX+TW-BR-2,cx));
  cue.y=Math.max(RY+BR+2,Math.min(RY+TH-BR-2,cy));
  cue.vx=0;cue.vy=0;
}
function schedAI(){
  if(curPl!==1||gameOver)return;
  document.getElementById('aitag').classList.add('on');
  const d={easy:1500,medium:950,hard:560}[diff]||950;
  aiTmr=setTimeout(()=>{document.getElementById('aitag').classList.remove('on');if(!gameOver&&curPl===1)doAI();},d);
}

/* ══════════════════════════════
   AI
══════════════════════════════ */
function doAI(){
  const cue=balls.find(b=>b.id===0&&!b.pocketed);
  if(!cue){enterPlace();finishPlace(RX+TW*.27,RY+TH/2);return;}
  let targets=remFor(1);
  const pkts=pockets();
  const noise={easy:.26,medium:.1,hard:.025}[diff]||.1;
  let best=null,bestSc=-Infinity;

  function tryT(tgt){
    pkts.forEach(pkt=>{
      const dtx=pkt.x-tgt.x,dty=pkt.y-tgt.y,dtl=Math.hypot(dtx,dty);
      if(dtl<1)return;
      const dnx=dtx/dtl,dny=dty/dtl;
      const gx2=tgt.x-dnx*BR*2,gy2=tgt.y-dny*BR*2;
      const cgx=gx2-cue.x,cgy=gy2-cue.y,cgl=Math.hypot(cgx,cgy);
      if(cgl<BR*3)return;
      const cnx=cgx/cgl,cny=cgy/cgl;
      let blk=false;
      balls.forEach(ob=>{
        if(ob.pocketed||ob.id===tgt.id||ob.id===0)return;
        const ox2=ob.x-cue.x,oy2=ob.y-cue.y,proj=ox2*cnx+oy2*cny;
        if(proj<0||proj>cgl)return;
        if(Math.abs(ox2*cny-oy2*cnx)<BR*2.1)blk=true;
      });
      if(blk)return;
      const af=Math.abs((dtx*(-cnx)+dty*(-cny))/dtl);
      const sc=af*2+1/(dtl*.006+1)+Math.random()*.18;
      if(sc>bestSc){bestSc=sc;best={cnx,cny,noise};}
    });
  }
  if(targets.length>0)targets.forEach(tryT);
  else{const e=balls.find(b=>b.id===8&&!b.pocketed);if(e)tryT(e);}
  const nx=best?(best.cnx+(Math.random()-.5)*best.noise*2):Math.cos(Math.random()*Math.PI*2);
  const ny=best?(best.cny+(Math.random()-.5)*best.noise*2):Math.sin(Math.random()*Math.PI*2);
  const nl=Math.hypot(nx,ny);
  const pwr={easy:.32+Math.random()*.28,medium:.44+Math.random()*.36,hard:.5+Math.random()*.42}[diff]||.42;
  // TURBO: CMAX scaled way up
  const CMAX=W*.38;
  fire(cue,(nx/nl)*CMAX*pwr*.072,(ny/nl)*CMAX*pwr*.072);
}

/* ══════════════════════════════
   FIRE SHOT  — MAX POWER = 100
══════════════════════════════ */
function fire(cue,vx,vy){
  potSnap=potted[curPl].length;
  cue.vx=vx;cue.vy=vy;
  inShot=true;shotBanks=0;shotCombos=0;shotPopped=0;
  shotCnt++;document.getElementById('cshotnum').textContent=shotCnt;
  cuePot=false;eightPot=false;foulF=false;
  cueOffset=0;
  document.getElementById('spacehold').style.display='none';
  spacePower=0;setSpaceRing(0);
}

function shootWithPower(pct){
  if(inShot||curPl!==0||gameOver||placing)return;
  const cue=balls.find(b=>b.id===0&&!b.pocketed);if(!cue)return;
  // TURBO: multiply max speed by 3.5× vs original
  const CMAX=W*.38;
  const spd=(pct/100)*CMAX*.072;
  fire(cue,Math.cos(aimAng)*spd,Math.sin(aimAng)*spd);
  setPwrDisplay(pct);
}

/* ══════════════════════════════
   END GAME
══════════════════════════════ */
function endGame(winner,reason){
  gameOver=true;
  document.getElementById('gotitle').textContent=winner===0?'YOU WIN!':'AI WINS!';
  document.getElementById('gosub').textContent=reason;
  document.getElementById('goover').classList.add('on');
}

/* ══════════════════════════════
   PARTICLES
══════════════════════════════ */
function spawnPtcl(px,py,color){
  for(let i=0;i<28;i++){
    const a=Math.random()*Math.PI*2,sp=2+Math.random()*7;
    ptcls.push({x:px,y:py,vx:Math.cos(a)*sp,vy:Math.sin(a)*sp,r:1.5+Math.random()*4.5,life:1,dec:.022+Math.random()*.025,color});
  }
}
function updPtcl(){ptcls=ptcls.filter(p=>{p.x+=p.vx;p.y+=p.vy;p.vy+=.06;p.vx*=.93;p.life-=p.dec;return p.life>0;});}

/* ══════════════════════════════
   SHOT PREDICTION
══════════════════════════════ */
function preview(cue){
  if(!cue||inShot)return null;
  const dx=Math.cos(aimAng),dy=Math.sin(aimAng);
  const pts=[{x:cue.x,y:cue.y}];
  let cx=cue.x,cy=cue.y,cdx=dx,cdy=dy;
  let ghost=null,hitBall=null;
  const MAXB=3,MAXD=W*3;

  for(let bounce=0;bounce<=MAXB;bounce++){
    let tBall=MAXD,tHit=null;
    balls.forEach(b=>{
      if(b.pocketed||b.id===0)return;
      const ox=cx-b.x,oy=cy-b.y;
      const B2=2*(ox*cdx+oy*cdy),C=ox*ox+oy*oy-(BR*2)*(BR*2);
      const disc=B2*B2-4*C;
      if(disc<0)return;
      const sq=Math.sqrt(disc),t1=(-B2-sq)/2,t2=(-B2+sq)/2;
      const t=t1>0.5?t1:(t2>0.5?t2:null);
      if(t&&t<tBall){tBall=t;tHit=b;}
    });
    let tWall=MAXD,axis='';
    if(cdx>0){const t=(RX+TW-BR-cx)/cdx;if(t>0.5&&t<tWall){tWall=t;axis='x';}}
    if(cdx<0){const t=(RX+BR-cx)/cdx;if(t>0.5&&t<tWall){tWall=t;axis='x';}}
    if(cdy>0){const t=(RY+TH-BR-cy)/cdy;if(t>0.5&&t<tWall){tWall=t;axis='y';}}
    if(cdy<0){const t=(RY+BR-cy)/cdy;if(t>0.5&&t<tWall){tWall=t;axis='y';}}

    if(tBall<tWall&&tBall<MAXD){
      ghost={x:cx+cdx*tBall,y:cy+cdy*tBall};hitBall=tHit;pts.push({...ghost});break;
    } else if(tWall<MAXD&&bounce<MAXB){
      const wx=cx+cdx*tWall,wy=cy+cdy*tWall;
      pts.push({x:wx,y:wy});cx=wx;cy=wy;
      if(axis==='x')cdx=-cdx;else cdy=-cdy;
    } else {
      pts.push({x:cx+cdx*Math.min(tWall,MAXD*.45),y:cy+cdy*Math.min(tWall,MAXD*.45)});break;
    }
  }
  return{pts,ghost,hitBall};
}

/* ══════════════════════════════
   DRAW TABLE
══════════════════════════════ */
function drawTable(){
  gx.fillStyle='#230d01';rr(gx,0,0,W,H,16);gx.fill();
  const rg=gx.createLinearGradient(0,0,0,H);
  rg.addColorStop(0,'#683010');rg.addColorStop(.27,'#b56226');rg.addColorStop(.5,'#935016');rg.addColorStop(.73,'#b56226');rg.addColorStop(1,'#482008');
  gx.fillStyle=rg;rr(gx,0,0,W,H,16);gx.fill();
  gx.strokeStyle='rgba(215,155,58,.2)';gx.lineWidth=1;
  gx.beginPath();gx.moveTo(RX*.5,H*.08);gx.lineTo(W-RX*.5,H*.08);gx.stroke();
  gx.beginPath();gx.moveTo(RX*.5,H*.92);gx.lineTo(W-RX*.5,H*.92);gx.stroke();
  [[.25,0],[.5,0],[.75,0],[.25,1],[.5,1],[.75,1],[0,.5],[1,.5]].forEach(([rx,ry])=>{
    const dx2=RX+TW*rx+(rx===0?-RX*.52:rx===1?RX*.52:0),dy2=RY+TH*ry+(ry===0?-RY*.52:ry===1?RY*.52:0);
    gx.save();gx.translate(dx2,dy2);gx.rotate(Math.PI/4);
    gx.fillStyle='rgba(195,148,48,.5)';gx.fillRect(-5,-5,10,10);
    gx.fillStyle='rgba(250,205,95,.76)';gx.fillRect(-2.5,-2.5,5,5);
    gx.restore();
  });
  // felt
  const fg=gx.createRadialGradient(W/2,H/2,0,W/2,H/2,Math.max(W,H)*.6);
  fg.addColorStop(0,'#217848');fg.addColorStop(1,'#155830');
  gx.fillStyle=fg;rr(gx,RX,RY,TW,TH,5);gx.fill();
  gx.save();gx.beginPath();rr(gx,RX,RY,TW,TH,5);gx.clip();
  gx.strokeStyle='rgba(0,0,0,.048)';gx.lineWidth=.55;
  for(let xi=RX;xi<=RX+TW;xi+=8){gx.beginPath();gx.moveTo(xi,RY);gx.lineTo(xi,RY+TH);gx.stroke();}
  for(let yi=RY;yi<=RY+TH;yi+=8){gx.beginPath();gx.moveTo(RX,yi);gx.lineTo(RX+TW,yi);gx.stroke();}
  gx.restore();
  gx.strokeStyle='rgba(255,255,255,.065)';gx.lineWidth=.9;gx.setLineDash([5,5]);
  gx.beginPath();gx.moveTo(RX+TW*.28,RY+4);gx.lineTo(RX+TW*.28,RY+TH-4);gx.stroke();
  gx.setLineDash([]);
  [[.5,.5],[.73,.5]].forEach(([sx,sy])=>{gx.beginPath();gx.arc(RX+TW*sx,RY+TH*sy,2.5,0,Math.PI*2);gx.fillStyle='rgba(255,255,255,.12)';gx.fill();});
  // pockets
  pockets().forEach(p=>{
    const pg=gx.createRadialGradient(p.x,p.y,0,p.x,p.y,PR*1.7);
    pg.addColorStop(0,'rgba(0,0,0,.96)');pg.addColorStop(.5,'rgba(0,0,0,.55)');pg.addColorStop(1,'rgba(0,0,0,0)');
    gx.beginPath();gx.arc(p.x,p.y,PR*1.7,0,Math.PI*2);gx.fillStyle=pg;gx.fill();
    gx.beginPath();gx.arc(p.x,p.y,PR*.82,0,Math.PI*2);gx.fillStyle='#030303';gx.fill();
    gx.beginPath();gx.arc(p.x,p.y,PR*.88,0,Math.PI*2);
    gx.strokeStyle='rgba(105,52,10,.88)';gx.lineWidth=2.5;gx.stroke();
    gx.strokeStyle='rgba(185,125,38,.28)';gx.lineWidth=1;gx.stroke();
  });
}

/* ══════════════════════════════
   DRAW BALL
══════════════════════════════ */
function drawBall(b){
  if(b.pocketed)return;
  const{x,y,c,s,id}=b,r=BR;
  gx.save();gx.beginPath();gx.arc(x+2,y+3,r*.88,0,Math.PI*2);gx.fillStyle='rgba(0,0,0,.22)';gx.fill();gx.restore();
  gx.save();gx.beginPath();gx.arc(x,y,r,0,Math.PI*2);gx.clip();
  if(id===0){
    const g=gx.createRadialGradient(x-r*.3,y-r*.35,r*.04,x,y,r);
    g.addColorStop(0,'#fff');g.addColorStop(.55,'#f0ede4');g.addColorStop(1,'#c0bcb2');
    gx.fillStyle=g;gx.fillRect(x-r,y-r,r*2,r*2);
  } else if(s){
    const g=gx.createRadialGradient(x-r*.3,y-r*.35,r*.04,x,y,r);
    g.addColorStop(0,'#f8f4ee');g.addColorStop(1,'#d4cfc5');
    gx.fillStyle=g;gx.fillRect(x-r,y-r,r*2,r*2);
    gx.fillStyle=c;gx.fillRect(x-r,y-r*.42,r*2,r*.84);
  } else {
    const g=gx.createRadialGradient(x-r*.28,y-r*.32,r*.04,x,y,r);
    g.addColorStop(0,lerpHex(c,'#ffffff',.38));g.addColorStop(.45,c);g.addColorStop(1,lerpHex(c,'#000000',.55));
    gx.fillStyle=g;gx.fillRect(x-r,y-r,r*2,r*2);
  }
  const hl=gx.createRadialGradient(x-r*.32,y-r*.38,0,x-r*.32,y-r*.38,r*.55);
  hl.addColorStop(0,'rgba(255,255,255,.62)');hl.addColorStop(.6,'rgba(255,255,255,.1)');hl.addColorStop(1,'rgba(255,255,255,0)');
  gx.fillStyle=hl;gx.fillRect(x-r,y-r,r*2,r*2);
  gx.restore();
  if(id!==0){
    gx.beginPath();gx.arc(x,y,r*.44,0,Math.PI*2);
    gx.fillStyle=s?'rgba(255,255,255,.92)':'rgba(255,255,255,.22)';gx.fill();
    gx.fillStyle=s?lerpHex(c,'#000000',.35):'rgba(255,255,255,.95)';
    gx.font=`bold ${Math.round(r*.56)}px Rajdhani,sans-serif`;
    gx.textAlign='center';gx.textBaseline='middle';gx.fillText(id,x,y+.5);
  }
  gx.beginPath();gx.arc(x,y,r,0,Math.PI*2);gx.strokeStyle='rgba(0,0,0,.3)';gx.lineWidth=.7;gx.stroke();
}

/* ══════════════════════════════
   DRAW OVERLAY
══════════════════════════════ */
function drawOverlay(){
  ox.clearRect(0,0,W,H);
  if(inShot||curPl!==0||gameOver)return;
  const cue=balls.find(b=>b.id===0&&!b.pocketed);if(!cue)return;

  if(placing){
    const{x,y}=mousePos;
    ox.save();ox.beginPath();ox.arc(x,y,BR,0,Math.PI*2);
    ox.strokeStyle='rgba(240,230,200,.55)';ox.lineWidth=1.5;ox.setLineDash([4,4]);ox.stroke();
    ox.setLineDash([]);ox.fillStyle='rgba(240,230,200,.1)';ox.fill();ox.restore();
    return;
  }

  const pv=preview(cue);
  if(pv&&pv.pts.length>1){
    for(let i=0;i<pv.pts.length-1;i++){
      const p0=pv.pts[i],p1=pv.pts[i+1];
      const al=.52-i*.22;
      ox.save();ox.setLineDash([7,9]);
      ox.strokeStyle=`rgba(255,218,95,${al})`;ox.lineWidth=1.3;
      ox.beginPath();ox.moveTo(p0.x,p0.y);ox.lineTo(p1.x,p1.y);ox.stroke();
      ox.setLineDash([]);
      if(i>0){
        ox.beginPath();ox.arc(p0.x,p0.y,4.5,0,Math.PI*2);
        ox.fillStyle=`rgba(255,200,75,${al*.9})`;ox.fill();
      }
      ox.restore();
    }
    const gb=pv.ghost,tb=pv.hitBall;
    if(gb){
      ox.save();
      ox.beginPath();ox.arc(gb.x,gb.y,BR,0,Math.PI*2);
      ox.strokeStyle='rgba(255,255,255,.32)';ox.lineWidth=1.5;ox.setLineDash([3,3]);ox.stroke();
      ox.setLineDash([]);ox.fillStyle='rgba(255,255,255,.06)';ox.fill();
      ox.beginPath();ox.arc(gb.x,gb.y,3,0,Math.PI*2);ox.fillStyle='rgba(255,255,255,.55)';ox.fill();
      if(tb){
        const nx2=(tb.x-gb.x)/Math.hypot(tb.x-gb.x,tb.y-gb.y);
        const ny2=(tb.y-gb.y)/Math.hypot(tb.x-gb.x,tb.y-gb.y);
        const ll=TW*.38;
        ox.beginPath();ox.moveTo(tb.x,tb.y);ox.lineTo(tb.x+nx2*ll,tb.y+ny2*ll);
        const rc=tb.c||'#888';
        ox.strokeStyle=`rgba(${hR(rc)},${hG(rc)},${hB(rc)},.5)`;
        ox.lineWidth=1.4;ox.setLineDash([5,6]);ox.stroke();ox.setLineDash([]);
        drawArrow(ox,tb.x+nx2*ll*.72,tb.y+ny2*ll*.72,nx2,ny2,8,'rgba(255,200,75,.5)');
        let nearP=null,nearD=Infinity;
        pockets().forEach(p=>{
          const tx2=tb.x+nx2*500,ty2=tb.y+ny2*500;
          const lx2=tx2-tb.x,ly2=ty2-tb.y,ll3=Math.hypot(lx2,ly2);
          const t2=((p.x-tb.x)*lx2+(p.y-tb.y)*ly2)/(ll3*ll3);
          if(t2>0&&t2<1){
            const pd=Math.hypot(tb.x+t2*lx2-p.x,tb.y+t2*ly2-p.y);
            if(pd<nearD){nearD=pd;nearP=p;}
          }
        });
        if(nearP&&nearD<PR*4.5){
          const al2=Math.max(0,.7-nearD/(PR*4.5));
          ox.beginPath();ox.arc(nearP.x,nearP.y,PR*.68,0,Math.PI*2);
          ox.strokeStyle=`rgba(70,245,110,${al2})`;ox.lineWidth=2.8;ox.stroke();
          const gl=ox.createRadialGradient(nearP.x,nearP.y,0,nearP.x,nearP.y,PR*1.4);
          gl.addColorStop(0,`rgba(70,245,110,${al2*.35})`);gl.addColorStop(1,'rgba(70,245,110,0)');
          ox.beginPath();ox.arc(nearP.x,nearP.y,PR*1.4,0,Math.PI*2);ox.fillStyle=gl;ox.fill();
        }
      }
      ox.restore();
    }
  }

  // ── CUE STICK ──
  const CUE_LEN=W*.30;
  const tipGap=Math.max(BR*.95, BR*1.35 - cueOffset);
  const stickDir=aimAng+Math.PI;
  const tipX=cue.x + Math.cos(aimAng+Math.PI) * tipGap;
  const tipY=cue.y + Math.sin(aimAng+Math.PI) * tipGap;
  const buttX=tipX + Math.cos(stickDir)*CUE_LEN;
  const buttY=tipY + Math.sin(stickDir)*CUE_LEN;
  const perpX=-Math.sin(stickDir),perpY=Math.cos(stickDir);
  const TIP_W=W*.0024,BUTT_W=W*.009;

  ox.save();
  const cg=ox.createLinearGradient(tipX,tipY,buttX,buttY);
  cg.addColorStop(0,'#70ccda');cg.addColorStop(.04,'#e8d490');cg.addColorStop(.12,'#d8a848');
  cg.addColorStop(.45,'#a86820');cg.addColorStop(.72,'#5a2e0a');cg.addColorStop(1,'#1e0a02');
  ox.beginPath();
  ox.moveTo(tipX+perpX*TIP_W, tipY+perpY*TIP_W);
  ox.lineTo(buttX+perpX*BUTT_W, buttY+perpY*BUTT_W);
  ox.lineTo(buttX-perpX*BUTT_W, buttY-perpY*BUTT_W);
  ox.lineTo(tipX-perpX*TIP_W, tipY-perpY*TIP_W);
  ox.closePath();
  ox.fillStyle=cg;ox.fill();
  ox.beginPath();
  ox.moveTo(tipX+perpX*TIP_W, tipY+perpY*TIP_W);
  ox.lineTo(buttX+perpX*BUTT_W, buttY+perpY*BUTT_W);
  ox.strokeStyle='rgba(255,200,80,.18)';ox.lineWidth=.8;ox.stroke();
  [.1,.16,.22].forEach(t=>{
    const wx2=tipX+(buttX-tipX)*t,wy2=tipY+(buttY-tipY)*t;
    const ww=TIP_W+(BUTT_W-TIP_W)*t+1.6;
    ox.beginPath();ox.moveTo(wx2+perpX*ww,wy2+perpY*ww);ox.lineTo(wx2-perpX*ww,wy2-perpY*ww);
    ox.strokeStyle='rgba(140,65,12,.7)';ox.lineWidth=2.2;ox.stroke();
  });
  ox.restore();

  if(spaceDown&&spacePower>0){
    const pct=spacePower/100;
    const arcR=BR*3.5;
    ox.save();
    ox.beginPath();ox.arc(cue.x,cue.y,arcR,-Math.PI*.65,Math.PI*.65);
    ox.strokeStyle='rgba(255,255,255,.08)';ox.lineWidth=5;ox.lineCap='round';ox.stroke();
    const sa=-Math.PI*.65,ea=sa+pct*Math.PI*1.3;
    const gr=ox.createLinearGradient(cue.x-arcR,cue.y,cue.x+arcR,cue.y);
    gr.addColorStop(0,'rgba(26,158,74,.95)');gr.addColorStop(.5,'rgba(240,192,64,.95)');gr.addColorStop(1,'rgba(224,48,48,.95)');
    ox.beginPath();ox.arc(cue.x,cue.y,arcR,sa,ea);
    ox.strokeStyle=gr;ox.lineWidth=5;ox.lineCap='round';ox.stroke();
    ox.restore();
  }
}

/* ══════════════════════════════
   SPACE RING
══════════════════════════════ */
function setSpaceRing(pct){
  const circ=2*Math.PI*22;
  const el=document.getElementById('progring');
  el.style.strokeDashoffset=circ*(1-pct/100);
  document.getElementById('pwrfill').style.width=pct+'%';
  document.getElementById('pwrval').textContent=Math.round(pct);
}

function setPwrDisplay(pct){
  document.getElementById('pwrfill').style.width=pct+'%';
  document.getElementById('pwrval').textContent=Math.round(pct);
  const track=document.getElementById('pwrtrack');
  if(pct>=100){
    track.classList.add('maxed');
    setTimeout(()=>track.classList.remove('maxed'),900);
  }
}

/* ══════════════════════════════
   SIDE TRACK — animated ball tracker
══════════════════════════════ */
const TRACK_MAX=7; // max 7 balls per player (solids or stripes)
const trackState=[[],[]]; // which ball IDs are shown per player

function resetSideTracks(){
  trackState[0]=[];trackState[1]=[];
  buildSideTrack(0);buildSideTrack(1);
}

function buildSideTrack(pi){
  const el=document.getElementById(`sidetrack${pi}`);
  el.innerHTML='';
  // label
  const lbl=document.createElement('div');
  lbl.className='track-label';
  lbl.innerHTML=pi===0?'YOU':'A.I.';
  el.appendChild(lbl);
  for(let i=0;i<TRACK_MAX;i++){
    const slot=document.createElement('div');
    slot.className='track-ball-slot';
    slot.id=`ts${pi}_${i}`;
    const ball=document.createElement('div');
    ball.className='track-ball';
    slot.appendChild(ball);
    el.appendChild(slot);
  }
  const cnt=document.createElement('div');
  cnt.className='track-count';
  cnt.id=`tc${pi}`;
  cnt.textContent='0';
  el.appendChild(cnt);
}

function addBallToSideTrack(pi,ballData){
  const idx=trackState[pi].length;
  if(idx>=TRACK_MAX)return;
  trackState[pi].push(ballData.id);
  const slot=document.getElementById(`ts${pi}_${idx}`);
  if(!slot)return;
  // Build ball color
  const inner=slot.querySelector('.track-ball');
  if(ballData.s){
    // stripe
    inner.style.background=`linear-gradient(to bottom, #f0ede4 30%, ${ballData.c} 30%, ${ballData.c} 70%, #f0ede4 70%)`;
    inner.style.boxShadow=`inset -2px -2px 5px rgba(0,0,0,.5),inset 1px 1px 3px rgba(255,255,255,.25)`;
  } else {
    inner.style.background=`radial-gradient(circle at 35% 35%, ${lightenHex(ballData.c,.4)}, ${ballData.c} 55%, ${darkenHex(ballData.c,.4)})`;
    inner.style.boxShadow=`inset -2px -2px 5px rgba(0,0,0,.5),inset 1px 1px 3px rgba(255,255,255,.25)`;
  }
  // Trigger animation
  slot.classList.add('filled','new-ball');
  setTimeout(()=>slot.classList.remove('new-ball'),800);
  // Update count
  document.getElementById(`tc${pi}`).textContent=trackState[pi].length;
}

function lightenHex(hex,amt){
  const r=hR(hex),g=hG(hex),b=hB(hex);
  return `rgb(${Math.min(255,Math.round(r+(255-r)*amt))},${Math.min(255,Math.round(g+(255-g)*amt))},${Math.min(255,Math.round(b+(255-b)*amt))})`;
}
function darkenHex(hex,amt){
  const r=hR(hex),g=hG(hex),b=hB(hex);
  return `rgb(${Math.round(r*(1-amt))},${Math.round(g*(1-amt))},${Math.round(b*(1-amt))})`;
}

/* ══════════════════════════════
   RENDER LOOP
══════════════════════════════ */
let loopRunning=false,settleTmr=null,wasMoving=false;
function startLoop(){loopRunning=true;requestAnimationFrame(loop);}
function loop(){
  if(!gameRunning){loopRunning=false;return;}
  if(!inShot&&curPl===0&&!placing){
    if(keys.w) cueOffset=Math.min(CUE_OFFSET_MAX,cueOffset+2.2);
    if(keys.s) cueOffset=Math.max(-CUE_OFFSET_MAX,cueOffset-2.2);
  }
  const moving=physStep();
  updPtcl();
  gx.clearRect(0,0,W,H);
  drawTable();
  balls.forEach(b=>drawBall(b));
  ptcls.forEach(p=>{gx.save();gx.globalAlpha=p.life;gx.beginPath();gx.arc(p.x,p.y,p.r*p.life,0,Math.PI*2);gx.fillStyle=p.color;gx.fill();gx.restore();});
  drawOverlay();
  if(inShot){
    if(!moving&&wasMoving){if(!settleTmr)settleTmr=setTimeout(()=>{settleTmr=null;if(inShot&&!gameOver)onSettled();},160);}
    if(moving&&settleTmr){clearTimeout(settleTmr);settleTmr=null;}
  }
  wasMoving=moving;
  requestAnimationFrame(loop);
}

/* ══════════════════════════════
   INPUT — Mouse
══════════════════════════════ */
function canvasCoord(e){
  const rect=gc.getBoundingClientRect(),sx=W/rect.width,sy=H/rect.height;
  const src=e.touches?e.touches[0]:e;
  return{x:(src.clientX-rect.left)*sx,y:(src.clientY-rect.top)*sy};
}

gc.addEventListener('mousemove',e=>{
  const pos=canvasCoord(e);mousePos=pos;
  const cue=balls.find(b=>b.id===0&&!b.pocketed);
  if(cue&&!inShot&&!placing&&curPl===0){
    aimAng=Math.atan2(pos.y-cue.y,pos.x-cue.x);
  }
});

gc.addEventListener('click',e=>{
  if(gameOver||inShot)return;
  if(placing&&curPl===0){
    const pos=canvasCoord(e);finishPlace(pos.x,pos.y);schedAI();
  }
});

/* ── Keyboard ── */
window.addEventListener('keydown',e=>{
  const k=e.key.toLowerCase();
  if(k==='w'){e.preventDefault();keys.w=true;}
  if(k==='s'){e.preventDefault();keys.s=true;}
  if(k===' '||e.code==='Space'){
    e.preventDefault();
    if(inShot||curPl!==0||gameOver||placing)return;
    if(!spaceDown){
      spaceDown=true;spacePower=0;
      document.getElementById('spacehold').style.display='flex';
      chargeSpace();
    }
  }
});

window.addEventListener('keyup',e=>{
  const k=e.key.toLowerCase();
  if(k==='w')keys.w=false;
  if(k==='s')keys.s=false;
  if(k===' '||e.code==='Space'){
    e.preventDefault();
    if(spaceDown){
      spaceDown=false;
      document.getElementById('spacehold').style.display='none';
      const pwr=spacePower;
      spacePower=0;setSpaceRing(0);
      if(pwr>2)shootWithPower(pwr);
    }
  }
});

function chargeSpace(){
  if(!spaceDown)return;
  spacePower=Math.min(100,spacePower+1.9);
  setSpaceRing(spacePower);
  spaceRAF=requestAnimationFrame(chargeSpace);
}

/* ══════════════════════════════
   TOUCH SUPPORT — full mobile
══════════════════════════════ */
let touchStartTime=0;
let touchLastPos=null;
let touchPowerCharging=false;
let touchPowerRAF=null;
let touchCurrentPower=70;

gc.addEventListener('touchstart',e=>{
  e.preventDefault();
  if(gameOver||inShot)return;
  const t=e.touches[0];
  const pos=canvasCoord(e);
  touchStartPos={x:t.clientX,y:t.clientY};
  touchLastPos=pos;
  touchStartTime=Date.now();
  touchDragging=false;
  mousePos=pos;
  // Aim at touch position immediately
  const cue=balls.find(b=>b.id===0&&!b.pocketed);
  if(cue&&!placing&&curPl===0){
    aimAng=Math.atan2(pos.y-cue.y,pos.x-cue.x);
  }
  if(placing&&curPl===0){
    finishPlace(pos.x,pos.y);schedAI();
  }
},{passive:false});

gc.addEventListener('touchmove',e=>{
  e.preventDefault();
  if(gameOver||inShot)return;
  const t=e.touches[0];
  const pos=canvasCoord(e);
  mousePos=pos;
  touchLastPos=pos;
  const cue=balls.find(b=>b.id===0&&!b.pocketed);
  if(cue&&!placing&&curPl===0){
    aimAng=Math.atan2(pos.y-cue.y,pos.x-cue.x);
    // If dragged significantly, show it
    if(touchStartPos){
      const dx=t.clientX-touchStartPos.x,dy=t.clientY-touchStartPos.y;
      if(Math.hypot(dx,dy)>touchDragThreshold) touchDragging=true;
    }
  }
},{passive:false});

gc.addEventListener('touchend',e=>{
  e.preventDefault();
  if(gameOver||inShot)return;
  if(!placing&&curPl===0&&touchLastPos){
    const cue=balls.find(b=>b.id===0&&!b.pocketed);
    if(cue){
      aimAng=Math.atan2(touchLastPos.y-cue.y,touchLastPos.x-cue.x);
    }
    // Tap (not drag) = shoot with current power
    if(!touchDragging){
      const holdTime=Date.now()-touchStartTime;
      if(holdTime<300){
        shootWithPower(touchCurrentPower);
      }
    }
  }
  touchDragging=false;
  touchStartPos=null;
  touchLastPos=null;
},{passive:false});

/* ══════════════════════════════
   MOBILE SHOOT BUTTON
══════════════════════════════ */
document.getElementById('shootbtn').addEventListener('touchstart',e=>{
  e.preventDefault();
  shootWithPower(touchCurrentPower);
},{passive:false});
document.getElementById('shootbtn').addEventListener('click',()=>{
  shootWithPower(touchCurrentPower);
});

/* ══════════════════════════════
   MOBILE POWER ARROWS
══════════════════════════════ */
const PWR_STEP=5;
const PWR_REPEAT_DELAY=120;
let pwrHoldInterval=null;

function changePower(delta){
  touchCurrentPower=Math.max(1,Math.min(100,touchCurrentPower+delta));
  manualPower=touchCurrentPower;
  setPwrDisplay(touchCurrentPower);
}

function setupPwrBtn(id,delta){
  const btn=document.getElementById(id);
  btn.addEventListener('touchstart',e=>{
    e.preventDefault();
    changePower(delta);
    pwrHoldInterval=setInterval(()=>changePower(delta),PWR_REPEAT_DELAY);
  },{passive:false});
  btn.addEventListener('touchend',e=>{
    e.preventDefault();
    clearInterval(pwrHoldInterval);
  },{passive:false});
  btn.addEventListener('touchcancel',()=>clearInterval(pwrHoldInterval));
  btn.addEventListener('mousedown',()=>{
    changePower(delta);
    pwrHoldInterval=setInterval(()=>changePower(delta),PWR_REPEAT_DELAY);
  });
  btn.addEventListener('mouseup',()=>clearInterval(pwrHoldInterval));
  btn.addEventListener('mouseleave',()=>clearInterval(pwrHoldInterval));
}
setupPwrBtn('pwrBtnUp',PWR_STEP);
setupPwrBtn('pwrBtnDown',-PWR_STEP);

/* ══════════════════════════════
   UI UPDATES
══════════════════════════════ */
function updateTurnUI(){
  if(gameOver)return;
  [0,1].forEach(i=>document.getElementById(`pc${i}`).classList.toggle('act',curPl===i));
  const el=document.getElementById('cturn');
  el.textContent=curPl===0?'▶ Your Shot':'▶ AI Shooting';
  el.style.color=curPl===0?'#f0c040':'#88b4f5';
  document.getElementById('keyshint').style.opacity=curPl===0&&!inShot?'1':'0';
}
function updateBadges(){
  [0,1].forEach(pi=>{
    const el=document.getElementById(`pt${pi}`),t=plType[pi];
    if(!t){el.innerHTML='<span style="font-size:9px;color:rgba(245,230,200,.2)">TBD</span>';return;}
    const ids=t==='solid'?[1,2,3,4]:[9,10,11,12];
    el.innerHTML=ids.map(id=>{const b=BD[id];return b.s?`<span class="bs" style="background:#ddd;border:2.5px solid ${b.c}"></span>`:`<span class="bs" style="background:${b.c}"></span>`;}).join('');
  });
}
function updatePotUI(){
  // We now use the side tracks for visual display, these are just hidden fallback
  [0,1].forEach(pi=>{
    const el=document.getElementById(`pot${pi}`);
    el.innerHTML='';
  });
}

/* ══════════════════════════════
   SOUND
══════════════════════════════ */
let AC;
function getAC(){if(!AC)AC=new(window.AudioContext||window.webkitAudioContext)();return AC;}
function snd(type){
  try{
    const a=getAC(),o=a.createOscillator(),g=a.createGain();
    o.connect(g);g.connect(a.destination);
    if(type==='ball'){o.frequency.value=580+Math.random()*480;o.frequency.exponentialRampToValueAtTime(140,a.currentTime+.07);g.gain.setValueAtTime(.07,a.currentTime);g.gain.exponentialRampToValueAtTime(.001,a.currentTime+.07);o.start();o.stop(a.currentTime+.07);}
    else if(type==='rail'){o.frequency.value=275+Math.random()*75;o.frequency.exponentialRampToValueAtTime(65,a.currentTime+.12);g.gain.setValueAtTime(.05,a.currentTime);g.gain.exponentialRampToValueAtTime(.001,a.currentTime+.12);o.start();o.stop(a.currentTime+.12);}
    else if(type==='pocket'){o.type='sine';o.frequency.setValueAtTime(195,a.currentTime);o.frequency.exponentialRampToValueAtTime(48,a.currentTime+.34);g.gain.setValueAtTime(.1,a.currentTime);g.gain.exponentialRampToValueAtTime(.001,a.currentTime+.34);o.start();o.stop(a.currentTime+.34);}
  }catch(e){}
}

/* ══════════════════════════════
   UTILS
══════════════════════════════ */
function rr(c,x,y,w,h,r){c.beginPath();c.moveTo(x+r,y);c.lineTo(x+w-r,y);c.quadraticCurveTo(x+w,y,x+w,y+r);c.lineTo(x+w,y+h-r);c.quadraticCurveTo(x+w,y+h,x+w-r,y+h);c.lineTo(x+r,y+h);c.quadraticCurveTo(x,y+h,x,y+h-r);c.lineTo(x,y+r);c.quadraticCurveTo(x,y,x+r,y);c.closePath();}
function hR(h){return parseInt((h||'#888888').replace('#','').slice(0,2),16);}
function hG(h){return parseInt((h||'#888888').replace('#','').slice(2,4),16);}
function hB(h){return parseInt((h||'#888888').replace('#','').slice(4,6),16);}
function lerpHex(h,to,t){const[r1,g1,b1]=[hR(h),hG(h),hB(h)],[r2,g2,b2]=[hR(to),hG(to),hB(to)];return`rgb(${Math.round(r1+(r2-r1)*t)},${Math.round(g1+(g2-g1)*t)},${Math.round(b1+(b2-b1)*t)})`;}
function drawArrow(c,x,y,nx,ny,sz,col){const px=-ny,py=nx;c.save();c.beginPath();c.moveTo(x+nx*sz,y+ny*sz);c.lineTo(x-nx*sz/2+px*sz/2,y-ny*sz/2+py*sz/2);c.lineTo(x-nx*sz/2-px*sz/2,y-ny*sz/2-py*sz/2);c.closePath();c.fillStyle=col;c.fill();c.restore();}

// Init power display
setPwrDisplay(manualPower);

/* init */
show('menu');
