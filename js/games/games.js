// Game Room host: one shared 3D scene, HUD, dock, touch pad and keyboard input for four games.
import {RoomEnvironment} from 'three/addons/environments/RoomEnvironment.js';
import {THREE,V,newRound,updateTweens,updateBursts,confetti,disposeTree,sunLight} from './kit.js';
import {hydrateIcons} from '../core/icons.js';
import {installAudio,playSfx,play} from '../core/audio.js';
import memory from './memory.js';
import sorter from './sorter.js';
import race from './race.js';
import launch from './launch.js';

const GAMES={memory,sorter,race,launch},MAX_LEVEL=3;
const $=s=>document.querySelector(s),app=$('#games-app'),host=$('#world-canvas');
let renderer,scene,camera,root,game=null,interacted=false,last=performance.now(),lastFit=null,switching=null,lightRig={};
const raycaster=new THREE.Raycaster(),pointer=new THREE.Vector2();

const store={get(k,d){try{return JSON.parse(localStorage.getItem(k))??d}catch{return d}},set(k,v){try{localStorage.setItem(k,JSON.stringify(v))}catch{}}};
let stars=Number(store.get('wonder-stars',0))||0;const levels=store.get('wonder-game-levels',{});

// ---------- context handed to each game ----------
const ctx={
  get root(){return root},get camera(){return camera},get renderer(){return renderer},get scene(){return scene},
  get level(){return levels[game?.id]||1},usingKeys:false,
  sfx(kind,options){if(interacted)return playSfx(kind,options)},
  hud(title,text){$('#hud-title').textContent=title;$('#hud-text').textContent=text;$('#hud-note').textContent=''},
  hudNote(text){$('#hud-note').textContent=text},
  progress(done,total){$('#hud-bar').style.width=`${total?done/total*100:0}%`;$('#hud-count').textContent=`${done} / ${total}`},
  feedback(message){const el=$('#feedback');el.textContent=message;el.classList.add('show');clearTimeout(ctx.feedback.timer);ctx.feedback.timer=setTimeout(()=>el.classList.remove('show'),Math.max(1700,message.length*55))},
  celebrate(at){confetti(scene,at);ctx.sfx('correct')},
  win({title,text}){
    if(interacted){play('jingle-big',{volume:.7});play('crowd-cheer',{volume:.4,delay:.6})}
    stars++;store.set('wonder-stars',stars);$('#stars').textContent=stars;$('.score-pill').classList.remove('pop');void $('.score-pill').offsetWidth;$('.score-pill').classList.add('pop');
    const lv=ctx.level,last=lv>=MAX_LEVEL;$('#win-title').textContent=title;$('#win-text').textContent=last?`${text} You beat every level!`:text;
    $('#win-next').textContent=last?'Start from level 1':`Level ${lv+1} ›`;$('#win-layer').hidden=false;setTimeout(()=>$('#win-next').focus(),50);
  },
  setPad(buttons,layout=''){
    const pad=$('#game-pad');pad.replaceChildren();pad.className=`game-pad ${layout}`;
    buttons.forEach(({label,code,cls='',title})=>{const b=document.createElement('button');b.type='button';b.className=`pad-btn ${cls}`;b.textContent=label;b.setAttribute('aria-label',title||label);let timer=null,repeat=null;
      const press=()=>{if(switching)return;interacted=true;ctx.usingKeys=false;game?.key?.(code,true)};const stop=()=>{clearTimeout(timer);clearInterval(repeat);b.classList.remove('held');game?.key?.(code,false)};
      b.addEventListener('pointerdown',e=>{e.preventDefault();b.classList.add('held');press();if(code!=='Space'&&code!=='Enter')timer=setTimeout(()=>repeat=setInterval(press,110),320)});
      ['pointerup','pointerleave','pointercancel'].forEach(t=>b.addEventListener(t,stop));pad.append(b)});
  },
  lights(mode){
    const indoor=mode==='indoor';app.classList.toggle('indoor',indoor);
    lightRig.hemi.color.set(indoor?'#fff1df':'#e8f4ff');lightRig.hemi.groundColor.set(indoor?'#4a3020':'#6b8f4e');lightRig.hemi.intensity=indoor?.9:1;
    lightRig.sun.position.copy(indoor?V(-5,14,8):V(-10,18,12));lightRig.sun.intensity=indoor?2.4:3;lightRig.warm.visible=indoor;scene.environmentIntensity=indoor?.55:.35;
  },
  // Frame a w×h region around center, leaving room for the HUD, dock and touch pad.
  fit(w,h,center,{elevation=.9,pitch=false}={}){
    lastFit=[w,h,center,{elevation,pitch}];
    const wide=innerWidth>760,padH=$('#game-pad').children.length&&!$('#game-pad').classList.contains('split')?(wide?90:80):0,hudTop=wide&&innerWidth<=1100,top=wide?84:226,bottom=wide?110+padH:96+padH,left=wide&&!hudTop?Math.min(340,innerWidth*.28):12,right=wide?24:12;
    const availW=Math.max(200,innerWidth-left-right),availH=Math.max(180,innerHeight-top-bottom),fov=THREE.MathUtils.degToRad(camera.fov),screenH=pitch?h:h*Math.sin(elevation)+.4;
    const viewH=Math.max(screenH*innerHeight/availH,w*innerWidth/availW/camera.aspect),dist=viewH/2/Math.tan(fov/2),dir=V(0,Math.sin(elevation),Math.cos(elevation)),up=V(0,Math.cos(elevation),-Math.sin(elevation));
    const pxToWorld=viewH/innerHeight,shiftX=((left+availW/2)-innerWidth/2)*pxToWorld,shiftY=((top+availH/2)-innerHeight/2)*pxToWorld;
    const target=center.clone().add(V(-shiftX,0,0)).addScaledVector(up,shiftY);camera.position.copy(target).addScaledVector(dir,dist);camera.lookAt(target);
  },
  ray(e,objects){const r=renderer.domElement.getBoundingClientRect();pointer.set((e.clientX-r.left)/r.width*2-1,-(e.clientY-r.top)/r.height*2+1);raycaster.setFromCamera(pointer,camera);return raycaster.intersectObjects(objects,true)}
};

// ---------- scene ----------
function setupScene(){
  renderer=new THREE.WebGLRenderer({antialias:true,alpha:true,powerPreference:'high-performance'});renderer.setPixelRatio(Math.min(devicePixelRatio,1.75));renderer.setClearColor(0,0);
  renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=.95;renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFShadowMap;host.append(renderer.domElement);
  scene=new THREE.Scene();const pmrem=new THREE.PMREMGenerator(renderer);scene.environment=pmrem.fromScene(new RoomEnvironment(),.04).texture;pmrem.dispose();
  camera=new THREE.PerspectiveCamera(42,innerWidth/innerHeight,.05,1000);
  lightRig.hemi=new THREE.HemisphereLight(0xe8f4ff,0x6b8f4e,1);lightRig.sun=sunLight(16);lightRig.warm=new THREE.PointLight(0xffc48a,30,30,1.6);lightRig.warm.position.set(6,6,6);scene.add(lightRig.hemi,lightRig.sun,lightRig.warm);
  addEventListener('resize',resize);resize();
}
function resize(){renderer.setSize(innerWidth,innerHeight);camera.aspect=innerWidth/innerHeight;camera.fov=innerHeight>innerWidth?52:42;camera.updateProjectionMatrix();if(game?.layout)game.layout();else if(lastFit)ctx.fit(...lastFit)}

// ---------- switching games ----------
async function switchGame(id){
  if(!GAMES[id])id='memory';const next=GAMES[id];if(switching)await switching;
  switching=(async()=>{
    game?.exit?.();if(root){scene.remove(root);disposeTree(root)}newRound();lastFit=null;
    root=new THREE.Group();scene.add(root);game=next;$('#win-layer').hidden=true;
    document.querySelectorAll('.game-btn').forEach(b=>{const on=b.dataset.game===id;b.classList.toggle('active',on);b.setAttribute('aria-pressed',String(on))});
    $('#hud-kicker').textContent=`${next.name.toUpperCase()} · ${next.kicker}`;$('#level-label').textContent=`Level ${ctx.level}`;
    $('#key-chips').innerHTML=next.keys.map(([k,v])=>`<span class="key-chip"><kbd>${k}</kbd>${v}</span>`).join('');
    const loading=$('#load-status');loading.classList.remove('done');
    try{await next.enter(ctx)}catch(error){console.error(error);ctx.feedback('This game could not start. Try another one!')}
    loading.classList.add('done');history.replaceState(null,'',`#${id}`);
    if(document.activeElement?.closest?.('.game-dock'))document.activeElement.blur();
  })();
  await switching;switching=null;
}
function replay(nextLevel){
  $('#win-layer').hidden=true;if(nextLevel){levels[game.id]=ctx.level>=MAX_LEVEL?1:ctx.level+1;store.set('wonder-game-levels',levels)}
  $('#level-label').textContent=`Level ${ctx.level}`;newRound();game.restart();ctx.sfx('tap');
}

// ---------- input ----------
const GAME_KEYS=new Set(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Space','Enter','Escape','KeyA','KeyD','KeyW','KeyS']);
function wireInput(){
  addEventListener('pointerdown',()=>interacted=true,{capture:true});
  addEventListener('keydown',e=>{
    interacted=true;if(!GAME_KEYS.has(e.code))return;
    const onControl=e.target.closest?.('button,a,input');if(onControl&&(e.code==='Enter'||e.code==='Space'))return;
    if(!$('#win-layer').hidden){if(e.code==='Escape')replay(false);return}
    e.preventDefault();if(switching)return;ctx.usingKeys=true;game?.key?.(e.code,true);
  });
  addEventListener('keyup',e=>{if(GAME_KEYS.has(e.code))game?.key?.(e.code,false)});
  const canvas=renderer.domElement;let down=null,dragging=false;
  canvas.addEventListener('pointerdown',e=>{down={x:e.clientX,y:e.clientY};dragging=false;ctx.usingKeys=false});
  canvas.addEventListener('pointermove',e=>{
    if(down&&game?.drag){const dx=e.clientX-down.x,dy=e.clientY-down.y;if(!dragging&&Math.hypot(dx,dy)>10){dragging=true;game.drag(0,0,'start')}if(dragging)game.drag(dx,dy,'move')}
    if(e.pointerType==='mouse'&&!down)host.classList.toggle('pointing',!!game?.hover?.(e));
  });
  canvas.addEventListener('pointerup',e=>{const wasDrag=dragging;down=null;dragging=false;if(!wasDrag&&!switching&&$('#win-layer').hidden)game?.tap?.(e)});
  canvas.addEventListener('pointercancel',()=>{down=null;dragging=false});
}
function wireUI(){
  $('#stars').textContent=stars;
  document.querySelectorAll('.game-btn').forEach(b=>b.onclick=()=>{if(b.dataset.game!==game?.id){ctx.sfx('tap');switchGame(b.dataset.game)}});
  $('#restart').onclick=()=>replay(false);$('#win-again').onclick=()=>replay(false);$('#win-next').onclick=()=>replay(true);
  const showKeys=on=>{app.classList.toggle('show-keys',on);$('#toggle-keys').classList.toggle('active',on);$('#toggle-keys').setAttribute('aria-pressed',String(on))};
  showKeys(matchMedia('(hover:hover) and (pointer:fine)').matches);$('#toggle-keys').onclick=()=>{showKeys(!app.classList.contains('show-keys'));ctx.sfx('tap')};
  $('#fullscreen').onclick=()=>document.fullscreenElement?document.exitFullscreen():app.requestFullscreen?.();
  addEventListener('hashchange',()=>{const id=location.hash.slice(1);if(GAMES[id]&&id!==game?.id)switchGame(id)});
}

function animate(now=0){
  requestAnimationFrame(animate);if(document.hidden)return;
  const dt=Math.min(.05,Math.max(0,(now-last)/1000));last=now;
  updateTweens(performance.now());updateBursts(scene,dt);if(!switching)game?.update?.(dt,now/1000);
  renderer.render(scene,camera);
}

try{setupScene();hydrateIcons();installAudio({musicButton:$('#music-toggle'),theme:'games'});wireUI();wireInput();animate();switchGame(location.hash.slice(1))}
catch(error){console.error(error);$('#fallback').hidden=false;$('#load-status').classList.add('done')}
