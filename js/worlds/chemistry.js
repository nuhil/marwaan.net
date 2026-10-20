import * as THREE from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {RoomEnvironment} from 'three/addons/environments/RoomEnvironment.js';
import {RoundedBoxGeometry} from 'three/addons/geometries/RoundedBoxGeometry.js';
import {mergeVertices} from 'three/addons/utils/BufferGeometryUtils.js';
import {hydrateIcons} from '../core/icons.js';
import {installAudio,playSfx,neonHum,geiger,whoosh,countTick} from '../core/audio.js';
// Element sounds: a material "clink" when a specimen appears, a neon hum for glowing gases, and Geiger clicks for radioactive elements.
let loops=[];
function stopElementSounds(){loops.forEach(l=>l.stop());loops=[]}
function elementSounds(el,showingAtom){
  stopElementSounds();
  if(el.radioactive)loops.push(geiger(el.number>=100?22:el.number>=89?12:6));
  if(showingAtom){whoosh(true,.6);[0,1,2,3].forEach(i=>setTimeout(()=>countTick(10+i*4),i*70));return}
  const kind=specimenSpec(el).kind,spec=specimenSpec(el);
  if(kind==='gas'&&spec.glow)loops.push(neonHum(spec.faint?.025:.05));
  const clink={metal:'metal-clink',chunk:'crystal-clink',crystals:'crystal-clink',diamond:'crystal-clink',bismuth:'metal-clink',gas:'glass-clink',liquid:'glass-clink',mercury:'glass-clink',oil:'glass-clink',ampoule:'glass-clink',powder:'soft-thud'}[kind];
  if(clink)playSfx(clink,{volume:.7,delay:.35});
}
import {ELEMENTS,FAMILIES,BODY_ELEMENTS} from './elements-data.js';

const $=selector=>document.querySelector(selector);
const app=$('#chem-app'),host=$('#world-canvas');
const reduceMotion=matchMedia('(prefers-reduced-motion: reduce)').matches;
const STATES={solid:{name:'Solid',color:'#ffb35c'},liquid:{name:'Liquid',color:'#4fd8ff'},gas:{name:'Gas',color:'#c58bff'},unknown:{name:'Unknown',color:'#6b7a90'}};
const BODY_COLOR='#a9ff68',OFF_COLOR='#3a4658';
const FAMOUS=[1,2,6,7,8,10,11,13,26,29,47,79,80,92];
const STAGE=new THREE.Vector3(0,-2.4,8);
const TILE=1.08,BASE_DEPTH=.28;
const LENS_TEXT={
  family:['FAMILIES','Elements in families','Elements in the same family act alike. Tap a color to light up a family, or tap any tile.'],
  state:['AT ROOM TEMPERATURE','Solid, liquid, or gas?','Most elements are solid. Only bromine and mercury are liquid, and 11 are gases. Watch the gases float!'],
  mass:['HOW HEAVY','Taller means heavier','Each tile grows with the weight of one atom. Oganesson is about 290 times heavier than hydrogen!'],
  body:['IN YOUR BODY','You are made of elements!','About 21 elements keep you alive. Oxygen, carbon, hydrogen, and nitrogen make up most of you.']
};

let renderer,scene,camera,controls,tableGroup,stage,specimenHolder,atomHolder,stageRim,stageRing,current=null;
let mode='table',lens='family',focusKey=null,selected=null,view='real',spin=true,hovered=null,flight=null,last=performance.now(),introStart=0;
const tiles=[],pickables=[];
const tmp=new THREE.Vector3();

// ---------- helpers ----------
function rng(seed){let a=seed*9301+49297;return()=>{a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}}
function noise(x,y,z,seed=1){return Math.sin(x*1.7+seed*3.1)*Math.cos(y*2.3+seed*1.3)*.5+Math.sin(y*3.1+z*2.7+seed)*.3+Math.sin(z*4.3+x*3.7+seed*2.1)*.2}
function familyColor(el){return FAMILIES[el.family].color}
function lensColor(el){
  if(lens==='state')return STATES[el.state].color;
  if(lens==='body')return BODY_ELEMENTS.has(el.number)?BODY_COLOR:OFF_COLOR;
  if(lens==='mass'){const t=Math.min(1,el.massValue/294),a=new THREE.Color('#5ef2c2'),b=new THREE.Color('#8b6cff'),c=new THREE.Color('#ff6bb5');return`#${(t<.5?a.lerp(b,t*2):b.lerp(c,(t-.5)*2)).getHexString()}`}
  return familyColor(el);
}
function inFocus(el){
  if(lens==='body')return BODY_ELEMENTS.has(el.number);
  if(!focusKey)return true;
  return lens==='family'?el.family===focusKey:lens==='state'?el.state===focusKey:true;
}
function feedback(message){const el=$('#feedback');el.textContent=message;el.classList.add('show');clearTimeout(feedback.timer);feedback.timer=setTimeout(()=>el.classList.remove('show'),Math.max(1600,message.length*55))}
function disposeTree(root){root.traverse(o=>{o.geometry?.dispose();const mats=Array.isArray(o.material)?o.material:o.material?[o.material]:[];mats.forEach(m=>{m.map?.dispose();m.dispose()})})}
function glowTexture(){const c=document.createElement('canvas');c.width=c.height=128;const g=c.getContext('2d'),r=g.createRadialGradient(64,64,0,64,64,64);r.addColorStop(0,'rgba(255,255,255,1)');r.addColorStop(.25,'rgba(255,255,255,.45)');r.addColorStop(1,'rgba(255,255,255,0)');g.fillStyle=r;g.fillRect(0,0,128,128);return new THREE.CanvasTexture(c)}
const GLOW=glowTexture();
function glowSprite(color,scale,opacity=.8){const s=new THREE.Sprite(new THREE.SpriteMaterial({map:GLOW,color,transparent:true,opacity,blending:THREE.AdditiveBlending,depthWrite:false}));s.scale.set(scale,scale,1);return s}

// ---------- renderer & scene ----------
function setupScene(){
  renderer=new THREE.WebGLRenderer({antialias:true,alpha:true,powerPreference:'high-performance'});
  renderer.setPixelRatio(Math.min(devicePixelRatio,1.75));renderer.setClearColor(0x000000,0);renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.08;host.append(renderer.domElement);
  scene=new THREE.Scene();const pmrem=new THREE.PMREMGenerator(renderer);scene.environment=pmrem.fromScene(new RoomEnvironment(),.04).texture;pmrem.dispose();scene.environmentIntensity=.9;
  scene.fog=new THREE.Fog(0x0a1220,11,1000);
  camera=new THREE.PerspectiveCamera(42,innerWidth/innerHeight,.05,200);
  controls=new OrbitControls(camera,renderer.domElement);controls.enableDamping=true;controls.dampingFactor=.06;controls.screenSpacePanning=true;controls.touches={ONE:THREE.TOUCH.ROTATE,TWO:THREE.TOUCH.DOLLY_PAN};
  scene.add(new THREE.HemisphereLight(0xcfe6ff,0x1a1230,1.2));
  const key=new THREE.DirectionalLight(0xffffff,2.4);key.position.set(6,10,14);scene.add(key);
  const teal=new THREE.PointLight(0x5ef2c2,60,40,1.6);teal.position.set(-12,4,6);scene.add(teal);
  const violet=new THREE.PointLight(0x8b6cff,60,40,1.6);violet.position.set(12,-4,6);scene.add(violet);
  tableGroup=new THREE.Group();tableGroup.rotation.x=-.1;scene.add(tableGroup);
  buildStage();
  addEventListener('resize',resize);resize();
}

// ---------- periodic table ----------
function tilePosition(el){return new THREE.Vector3((el.col-9.5)*TILE,(5.2-el.row-(el.row>=9?.45:0))*TILE,0)}
function roundRect(g,x,y,w,h,r){g.beginPath();g.moveTo(x+r,y);g.arcTo(x+w,y,x+w,y+h,r);g.arcTo(x+w,y+h,x,y+h,r);g.arcTo(x,y+h,x,y,r);g.arcTo(x,y,x+w,y,r);g.closePath()}
function drawTile(tile){
  const {el,canvas}=tile,g=canvas.getContext('2d'),color=lensColor(el),s=canvas.width;g.clearRect(0,0,s,s);
  const bg=g.createLinearGradient(0,0,0,s);bg.addColorStop(0,'#17243a');bg.addColorStop(1,'#0a111e');roundRect(g,6,6,s-12,s-12,34);g.fillStyle=bg;g.fill();
  const glow=g.createRadialGradient(40,30,0,40,30,s*.95);glow.addColorStop(0,color+'66');glow.addColorStop(1,color+'00');g.fillStyle=glow;g.fill();
  g.lineWidth=6;g.strokeStyle=color;roundRect(g,9,9,s-18,s-18,31);g.stroke();
  g.fillStyle='#dfe7f3';g.font='700 32px "Space Mono", monospace';g.textAlign='left';g.fillText(String(el.number),28,52);
  g.textAlign='center';g.fillStyle='#ffffff';g.shadowColor=color;g.shadowBlur=18;g.font=`900 ${el.symbol.length>2?84:104}px Nunito, system-ui, sans-serif`;g.fillText(el.symbol,s/2,160);g.shadowBlur=0;
  let size=26;g.font=`800 ${size}px Nunito, system-ui, sans-serif`;while(g.measureText(el.name).width>s-40&&size>14){size--;g.font=`800 ${size}px Nunito, system-ui, sans-serif`}g.fillStyle='#c3cddc';g.fillText(el.name,s/2,204);
  g.font='700 18px "Space Mono", monospace';g.fillStyle='#8f9db1';g.fillText(el.mass,s/2,234);
  tile.texture.needsUpdate=true;
  const c=new THREE.Color(color);tile.bodyMat.color.copy(c).multiplyScalar(.28);tile.bodyMat.emissive.copy(c);
}
function buildTable(){
  const bodyGeo=new RoundedBoxGeometry(1,1,1,4,.08),faceGeo=new THREE.PlaneGeometry(.9,.9);
  ELEMENTS.forEach(el=>{
    const canvas=document.createElement('canvas');canvas.width=canvas.height=256;const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;texture.anisotropy=Math.min(8,renderer.capabilities.getMaxAnisotropy());
    const bodyMat=new THREE.MeshPhysicalMaterial({color:0x111111,emissive:0x000000,emissiveIntensity:.22,metalness:.35,roughness:.28,clearcoat:1,clearcoatRoughness:.15,transparent:true});
    const faceMat=new THREE.MeshBasicMaterial({map:texture,transparent:true,toneMapped:false});
    const group=new THREE.Group(),body=new THREE.Mesh(bodyGeo,bodyMat),face=new THREE.Mesh(faceGeo,faceMat);body.scale.set(.96,.96,BASE_DEPTH);group.add(body,face);
    const home=tilePosition(el);group.position.copy(home);tableGroup.add(group);
    const tile={el,group,body,face,bodyMat,faceMat,canvas,texture,home,lift:0,depth:BASE_DEPTH,dim:1,delay:(el.col+el.row*1.6)*.035,seed:Math.random()*6.28};
    body.userData.tile=face.userData.tile=tile;pickables.push(body,face);tiles.push(tile);drawTile(tile);
  });
  // Pointers from the main table to the two bottom rows.
  [['57–71','La–Lu',6],['89–103','Ac–Lr',7]].forEach(([nums,names,row])=>{const c=document.createElement('canvas');c.width=c.height=256;const g=c.getContext('2d');g.setLineDash([14,10]);g.lineWidth=4;g.strokeStyle='#ffffff40';roundRect(g,12,12,232,232,30);g.stroke();g.fillStyle='#9aa7ba';g.textAlign='center';g.font='700 34px "Space Mono", monospace';g.fillText(nums,128,120);g.font='800 30px Nunito, sans-serif';g.fillText(names,128,170);const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;const m=new THREE.Mesh(faceGeo,new THREE.MeshBasicMaterial({map:t,transparent:true,toneMapped:false}));m.position.copy(tilePosition({col:3,row}));m.position.z=.05;tableGroup.add(m)});
  // Title in the empty space above the transition metals.
  const c=document.createElement('canvas');c.width=1024;c.height=256;const g=c.getContext('2d');g.textAlign='center';const grad=g.createLinearGradient(200,0,824,0);grad.addColorStop(0,'#5ef2c2');grad.addColorStop(1,'#a88bff');g.fillStyle=grad;g.font='900 120px Nunito, sans-serif';g.fillText('The Elements',512,130);g.fillStyle='#9aa7ba';g.font='700 34px "Space Mono", monospace';g.fillText('118 BUILDING BLOCKS OF EVERYTHING',512,200);
  const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;const title=new THREE.Mesh(new THREE.PlaneGeometry(8.4,2.1),new THREE.MeshBasicMaterial({map:t,transparent:true,toneMapped:false}));title.position.set(-2.2*TILE+.1,3.55*TILE,.2);tableGroup.add(title);
  introStart=performance.now();
}
function redrawTiles(){tiles.forEach(drawTile)}
function updateTiles(dt,now){
  const t=now/1000,intro=reduceMotion?1e9:(now-introStart)/1000;
  tiles.forEach(tile=>{
    const {el}=tile,isSel=selected===el,isHover=hovered===tile&&mode==='table';
    const depthTarget=lens==='mass'?BASE_DEPTH+el.massValue/294*3.4:BASE_DEPTH;
    const dimTarget=mode==='element'?(isSel?1:.07):(inFocus(el)?1:.17);
    const liftTarget=(isHover?.45:0)+(isSel?.6:0);
    tile.depth=THREE.MathUtils.damp(tile.depth,depthTarget,6,dt);tile.dim=THREE.MathUtils.damp(tile.dim,dimTarget,8,dt);tile.lift=THREE.MathUtils.damp(tile.lift,liftTarget,12,dt);
    let bob=0;if(lens==='state'&&!reduceMotion){if(el.state==='gas')bob=.18+Math.sin(t*1.6+tile.seed)*.14;else if(el.state==='liquid')tile.group.rotation.z=Math.sin(t*2.4+tile.seed)*.06}
    if(lens!=='state'||el.state!=='liquid')tile.group.rotation.z=THREE.MathUtils.damp(tile.group.rotation.z,0,8,dt);
    const p=THREE.MathUtils.clamp((intro-tile.delay)/.7,0,1),e=1-(1-p)**3;
    const z=tile.lift+bob-(1-e)*14;tile.group.scale.setScalar(.2+.8*e);
    tile.body.scale.z=tile.depth;tile.body.position.z=tile.depth/2+z;tile.face.position.z=tile.depth+z+.004;
    tile.bodyMat.opacity=.12+.88*tile.dim;tile.faceMat.opacity=(.08+.92*tile.dim)*e;tile.bodyMat.emissiveIntensity=(isHover||isSel?.75:.2)*tile.dim;
    tile.bodyMat.depthWrite=tile.faceMat.depthWrite=tile.dim>.6;
  });
}

// ---------- lenses & legend ----------
function setLens(next){
  lens=next;focusKey=null;redrawTiles();buildLegend();updateLensText();feedback(LENS_TEXT[lens][1]);
  document.querySelectorAll('.lens-toggle').forEach(b=>{const on=b.dataset.lens===lens;b.classList.toggle('active',on);b.setAttribute('aria-pressed',String(on))});
  if(mode==='table')flyTo(tableView(),1100);
}
function buildLegend(){
  const legend=$('#legend');legend.replaceChildren();
  const chip=(key,label,color)=>{const b=document.createElement('button');b.type='button';b.className='legend-chip';b.style.setProperty('--chip',color);b.innerHTML=`<i></i>${label}`;b.setAttribute('aria-pressed','false');b.onclick=()=>{focusKey=focusKey===key?null:key;legend.querySelectorAll('.legend-chip').forEach(x=>{const on=x===b&&focusKey===key;x.classList.toggle('active',on);x.setAttribute('aria-pressed',String(on))});const copy=updateLensText();if(focusKey)feedback(copy);playSfx('tap')};legend.append(b)};
  const note=text=>{const p=document.createElement('span');p.className='legend-note';p.textContent=text;legend.append(p)};
  if(lens==='family')Object.entries(FAMILIES).forEach(([key,f])=>chip(key,f.short,f.color));
  else if(lens==='state')Object.entries(STATES).forEach(([key,s])=>chip(key,s.name,s.color));
  else if(lens==='mass')note('Lightest: Hydrogen (1) · Heaviest: Oganesson (294)');
  else note('Glowing tiles are elements found in your body');
}
function updateLensText(){
  let [kicker,title,copy]=LENS_TEXT[lens];
  if(focusKey&&lens==='family'){const f=FAMILIES[focusKey];kicker=`${ELEMENTS.filter(e=>e.family===focusKey).length} ELEMENTS`;title=f.name;copy=f.about}
  if(focusKey&&lens==='state'){const list=ELEMENTS.filter(e=>e.state===focusKey);kicker=`${list.length} ELEMENTS`;title=`${STATES[focusKey].name} elements`;copy=focusKey==='unknown'?'These super-heavy elements vanish too fast for anyone to find out.':focusKey==='solid'?'Solids keep their shape. Most elements are solid metals!':list.map(e=>e.name).join(', ')+'.'}
  $('#lens-kicker').textContent=kicker;$('#lens-title').textContent=title;$('#lens-copy').textContent=copy;
  return copy;
}

// ---------- camera ----------
const TABLE_CENTER=new THREE.Vector3(0,-.57,0),TABLE_W=21.4,TABLE_H=11.9;
function tableView(){
  // Fit the table into the screen area left free by the top bar and the bottom ribbon.
  const fov=THREE.MathUtils.degToRad(camera.fov),wide=innerWidth>760,top=wide?84:66,bottom=($('.lens-ribbon').offsetHeight||110)+(wide?30:18),side=wide?28:8;
  const availH=Math.max(160,innerHeight-top-bottom),availW=Math.max(200,innerWidth-side*2);
  const viewH=Math.max(TABLE_H*innerHeight/availH,TABLE_W*innerWidth/availW/camera.aspect),dist=viewH/2/Math.tan(fov/2);
  const shiftPx=(top+availH/2)-innerHeight/2,target=TABLE_CENTER.clone().add(new THREE.Vector3(0,shiftPx*viewH/innerHeight,0));
  const dir=lens==='mass'?new THREE.Vector3(-.42,.5,.76).normalize():new THREE.Vector3(0,.16,1).normalize();
  return{position:target.clone().addScaledVector(dir,dist*(lens==='mass'?1.22:1)),target,dist};
}
function elementView(){
  const fov=THREE.MathUtils.degToRad(camera.fov),dist=innerWidth>760?(view==='atom'?8.2:7):(view==='atom'?9.6:8.6),target=STAGE.clone().add(new THREE.Vector3(0,view==='atom'?1.9:1.05,0));
  const visH=2*dist*Math.tan(fov/2),visW=visH*camera.aspect;
  if(innerWidth>760){const card=$('#element-card').offsetWidth||370;target.x+=(card/2+10)/innerWidth*visW}
  else{const card=$('#element-card').offsetHeight||innerHeight*.4;target.y-=((card+84)/2-40)/innerHeight*visH}
  return{position:target.clone().add(new THREE.Vector3(0,dist*.13,dist)),target};
}
function flyTo({position,target},duration=1000){flight={from:camera.position.clone(),to:position,targetFrom:controls.target.clone(),target:target.clone(),start:performance.now(),duration:reduceMotion?1:duration}}
// OrbitControls clamps distance on update, so it sits out while the camera flies between table and stage.
function configureControls(){
  if(mode==='table'){const d=tableView().dist;controls.enablePan=true;controls.minDistance=5;controls.maxDistance=d*1.5;controls.minAzimuthAngle=-1.15;controls.maxAzimuthAngle=1.15;controls.minPolarAngle=.35;controls.maxPolarAngle=2.05}
  else{controls.enablePan=false;controls.minDistance=2.6;controls.maxDistance=12;controls.minAzimuthAngle=-Infinity;controls.maxAzimuthAngle=Infinity;controls.minPolarAngle=.2;controls.maxPolarAngle=1.75}
}
function clampPan(){if(mode!=='table')return;const t=controls.target,clamped=tmp.set(THREE.MathUtils.clamp(t.x,-10,10),THREE.MathUtils.clamp(t.y,-7,5.5),THREE.MathUtils.clamp(t.z,-2,4));if(!clamped.equals(t)){const delta=clamped.clone().sub(t);t.add(delta);camera.position.add(delta)}}

// ---------- display stage ----------
function buildStage(){
  stage=new THREE.Group();stage.position.copy(STAGE);stage.visible=false;scene.add(stage);
  const pedestal=new THREE.Mesh(new THREE.CylinderGeometry(1.42,1.58,.3,96),new THREE.MeshPhysicalMaterial({color:0x101826,metalness:.65,roughness:.3,clearcoat:1,clearcoatRoughness:.2}));pedestal.position.y=-.16;stage.add(pedestal);
  const top=new THREE.Mesh(new THREE.CylinderGeometry(1.3,1.3,.02,96),new THREE.MeshPhysicalMaterial({color:0x0b1220,metalness:.2,roughness:.08,clearcoat:1}));top.position.y=.005;stage.add(top);
  stageRing=new THREE.Mesh(new THREE.TorusGeometry(1.36,.022,8,128),new THREE.MeshBasicMaterial({color:0x5ef2c2,toneMapped:false}));stageRing.rotation.x=Math.PI/2;stageRing.position.y=.01;stage.add(stageRing);
  const under=glowSprite(0x5ef2c2,4.6,.25);under.position.y=-.2;stage.add(under);stageRing.userData.glow=under;
  const keySpot=new THREE.SpotLight(0xffffff,90,16,.55,.5,1.2);keySpot.position.set(2.5,6,4);keySpot.target.position.set(0,.8,0);stage.add(keySpot,keySpot.target);
  stageRim=new THREE.PointLight(0x5ef2c2,30,10,1.6);stageRim.position.set(-2,2.6,-2.4);stage.add(stageRim);
  specimenHolder=new THREE.Group();atomHolder=new THREE.Group();atomHolder.position.y=2;stage.add(specimenHolder,atomHolder);
}

// ---------- real-life specimens ----------
const SPECIMENS={
  H:{kind:'gas',glow:'#d78bff'},He:{kind:'gas',glow:'#ffb08a'},N:{kind:'gas',glow:'#ff94c8'},O:{kind:'gas',glow:'#b9a6ff'},Ne:{kind:'gas',glow:'#ff4d1f'},Ar:{kind:'gas',glow:'#a463ff'},Kr:{kind:'gas',glow:'#e9e3ff'},Xe:{kind:'gas',glow:'#5f9dff'},Rn:{kind:'gas',glow:'#9fe8ff',faint:true},
  F:{kind:'gas',tint:'#f3ee8a'},Cl:{kind:'gas',tint:'#c6e64a'},
  Br:{kind:'liquid',color:'#4a0d03',vapor:'#d9652a'},Hg:{kind:'mercury'},
  Li:{kind:'oil',color:'#c9ccd0',float:true},Na:{kind:'oil',color:'#c8cbcf'},K:{kind:'oil',color:'#c4c6cb'},
  Rb:{kind:'ampoule',color:'#c9c9cc'},Cs:{kind:'ampoule',color:'#e6c278'},
  C:{kind:'diamond'},S:{kind:'crystals',color:'#e6b000'},I:{kind:'crystals',color:'#3b2d55',vapor:'#a24dff'},P:{kind:'powder',color:'#a3231b'},
  Si:{kind:'chunk',color:'#6f7f96',metal:.75,rough:.15},B:{kind:'chunk',color:'#2a2b30',metal:.5,rough:.35},Ge:{kind:'chunk',color:'#b5bac0',metal:.85,rough:.12},As:{kind:'chunk',color:'#7d8288',metal:.8,rough:.3},Sb:{kind:'chunk',color:'#c3c7cc',metal:.9,rough:.12},Te:{kind:'chunk',color:'#cdd1d5',metal:.9,rough:.1},Se:{kind:'chunk',color:'#4c4c52',metal:.6,rough:.2},
  Bi:{kind:'bismuth'}
};
const METALS={Cu:['#e3875a',.2,'nugget'],Au:['#ffc65a',.12,'ingot'],Ag:['#f1f2f4',.08,'ingot'],Pt:['#e3e3e1',.1,'ingot'],Os:['#9fb1c8',.12],Pb:['#7f8894',.55],Zn:['#b6c2cb',.25],Ni:['#d1c7b1',.15],Co:['#b3bfca',.18],Ti:['#a7a6a3',.25],Fe:['#8e8e90',.5,'nugget'],Cr:['#dde2e8',.04],Ca:['#d6d5cc',.6],Sr:['#e2d9b8',.5],Ba:['#cfd0cc',.5],Mg:['#d3d5d8',.2],Al:['#cfd3d7',.18],Ga:['#d9dee3',.05,'nugget'],In:['#d6d9dc',.15],Sn:['#cfd2d4',.2],Tl:['#9aa0a4',.5],Mn:['#a3a3a6',.4,'nugget'],W:['#9a9ea3',.2],Ta:['#8f9aa8',.2],Nb:['#8f97a3',.2],Cd:['#b9c1cc',.2],U:['#8d9092',.45],Pu:['#a7a39c',.5],Eu:['#c9c8c0',.5],Be:['#9ea4ab',.3]};
const RADIOGLOW={Ra:'#7cb4ff',Ac:'#8fc7ff',Po:'#7cb4ff',Cm:'#b48cff',Es:'#7cb4ff',Pm:'#8fffe0'};
function specimenSpec(el){
  if(el.neverSeen)return{kind:'atomOnly'};
  if(SPECIMENS[el.symbol])return SPECIMENS[el.symbol];
  const [color='#c7ccd2',rough=.22,shape=el.number%2?'cube':'nugget']=METALS[el.symbol]||[];
  return{kind:'metal',color,rough,shape,glow:RADIOGLOW[el.symbol]};
}
const glassMat=()=>new THREE.MeshPhysicalMaterial({color:0xffffff,metalness:0,roughness:.04,transmission:1,thickness:.12,ior:1.5,transparent:true,depthWrite:false,envMapIntensity:1.2,specularIntensity:1});
const metalMat=(color,rough=.2)=>new THREE.MeshPhysicalMaterial({color,metalness:1,roughness:rough,envMapIntensity:1.25});
function blobGeometry(seed,amp=.22,flat=false){
  let g=new THREE.IcosahedronGeometry(1,flat?1:5);g.deleteAttribute('normal');g.deleteAttribute('uv');g=mergeVertices(g);
  const p=g.attributes.position,v=new THREE.Vector3(),rand=rng(seed);
  for(let i=0;i<p.count;i++){v.fromBufferAttribute(p,i).normalize();const r=flat?1+(rand()-.5)*amp*2:1+amp*noise(v.x*1.6,v.y*1.6,v.z*1.6,seed)+amp*.35*noise(v.x*4,v.y*4,v.z*4,seed+7);v.multiplyScalar(r);p.setXYZ(i,v.x,v.y,v.z)}
  if(flat)g=g.toNonIndexed();g.computeVertexNormals();return g;
}
function engraving(el,dark='rgba(20,20,28,.55)'){const c=document.createElement('canvas');c.width=c.height=256;const g=c.getContext('2d');g.fillStyle=dark;g.textAlign='center';g.font='900 120px Nunito, sans-serif';g.fillText(el.symbol,128,150);g.font='700 26px "Space Mono", monospace';g.fillText(String(el.number),128,200);const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;return new THREE.MeshBasicMaterial({map:t,transparent:true,depthWrite:false})}
function particles(count,radius,color,size=.035,shape='sphere'){
  const pos=new Float32Array(count*3),vel=[];for(let i=0;i<count;i++){const v=new THREE.Vector3().randomDirection().multiplyScalar(Math.cbrt(Math.random())*radius);if(shape==='column')v.set((Math.random()-.5)*radius,Math.random()*radius*2,(Math.random()-.5)*radius);pos.set([v.x,v.y,v.z],i*3);vel.push(new THREE.Vector3().randomDirection().multiplyScalar(.15+Math.random()*.25))}
  const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.BufferAttribute(pos,3));const pts=new THREE.Points(geo,new THREE.PointsMaterial({color,size,transparent:true,opacity:.85,blending:THREE.AdditiveBlending,depthWrite:false,map:GLOW}));
  pts.userData.tick=dt=>{const a=geo.attributes.position;for(let i=0;i<count;i++){const v=tmp.fromBufferAttribute(a,i).addScaledVector(vel[i],dt);if(shape==='column'){if(v.y>radius*2)v.y=0;vel[i].y=Math.abs(vel[i].y);if(Math.abs(v.x)>radius/2)vel[i].x*=-1;if(Math.abs(v.z)>radius/2)vel[i].z*=-1}else if(v.length()>radius){vel[i].reflect(v.clone().normalize()).multiplyScalar(1)}a.setXYZ(i,v.x,v.y,v.z)}a.needsUpdate=true};
  return pts;
}

const BUILDERS={
  metal(el,s){
    const group=new THREE.Group(),extras=[],mat=metalMat(s.color,s.rough);
    if(s.shape==='ingot'){const geo=new RoundedBoxGeometry(2,.7,1,4,.08),p=geo.attributes.position;for(let i=0;i<p.count;i++)if(p.getY(i)>0){p.setX(i,p.getX(i)*.86);p.setZ(i,p.getZ(i)*.8)}geo.computeVertexNormals();const bar=new THREE.Mesh(geo,mat);group.add(bar);const mark=new THREE.Mesh(new THREE.PlaneGeometry(.7,.7),engraving(el));mark.rotation.x=-Math.PI/2;mark.position.y=.352;group.add(mark)}
    else if(s.shape==='cube'){const cube=new THREE.Mesh(new RoundedBoxGeometry(1.35,1.35,1.35,5,.1),mat);group.add(cube);const mark=new THREE.Mesh(new THREE.PlaneGeometry(.9,.9),engraving(el));mark.position.z=.677;group.add(mark)}
    else{const nugget=new THREE.Mesh(blobGeometry(el.number,.24),mat);nugget.scale.set(1.25,.82,1);group.add(nugget);if(el.symbol==='Fe'){const rust=new THREE.Mesh(blobGeometry(el.number+3,.2),new THREE.MeshStandardMaterial({color:'#8a3b18',roughness:1}));rust.scale.set(.55,.42,.5);rust.position.set(.65,.15,.35);group.add(rust)}}
    if(s.glow){extras.push(glowSprite(s.glow,3.4,.5));const light=new THREE.PointLight(s.glow,6,5,1.5);extras.push(light);const sparks=particles(40,1.3,s.glow,.05);extras.push(sparks)}
    return{group,extras};
  },
  gas(el,s){
    const group=new THREE.Group(),extras=[],glass=glassMat();
    const bulb=new THREE.Mesh(new THREE.SphereGeometry(1,64,48),glass);group.add(bulb);
    const neck=new THREE.Mesh(new THREE.CylinderGeometry(.16,.2,.9,32),glass);neck.position.y=1.35;group.add(neck);
    const tip=new THREE.Mesh(new THREE.ConeGeometry(.16,.3,32),glass);tip.position.y=1.95;group.add(tip);
    const base=new THREE.Mesh(new THREE.CylinderGeometry(.45,.55,.35,48),metalMat('#7d8794',.35));base.position.y=-1.05;group.add(base);
    const wireMat=metalMat('#c9ced6',.2);[[0,.25,0],[0,-.55,0]].forEach(([x,y,z],i)=>{const w=new THREE.Mesh(new THREE.CylinderGeometry(.02,.02,.7,8),wireMat);w.position.set(x,y+(i?-.1:.95),z);group.add(w)});
    if(s.glow){const inner=new THREE.Mesh(new THREE.SphereGeometry(.94,48,32),new THREE.MeshBasicMaterial({color:s.glow,transparent:true,opacity:s.faint?.12:.32,blending:THREE.AdditiveBlending,depthWrite:false,toneMapped:false}));extras.push(inner);const core=glowSprite(s.glow,2.4,s.faint?.3:1);extras.push(core);const halo=glowSprite(s.glow,4.6,s.faint?.25:.75);extras.push(halo);const light=new THREE.PointLight(s.glow,s.faint?4:14,7,1.4);extras.push(light);extras.push(particles(140,.85,'#ffffff',.04));
      extras.tick=t=>{const f=.85+Math.sin(t*9)*.05+Math.sin(t*23)*.04;inner.material.opacity=(s.faint?.12:.32)*f;halo.material.opacity=(s.faint?.25:.75)*f;light.intensity=(s.faint?4:14)*f}}
    else{const inner=new THREE.Mesh(new THREE.SphereGeometry(.94,48,32),new THREE.MeshPhysicalMaterial({color:s.tint,transparent:true,opacity:.5,roughness:.2,depthWrite:false}));extras.push(inner);extras.push(particles(90,.85,s.tint,.05))}
    return{group,extras};
  },
  liquid(el,s){
    const group=new THREE.Group(),extras=[],glass=glassMat();
    const vial=new THREE.Mesh(new THREE.CylinderGeometry(.62,.62,2.2,48,1,true),glass);vial.position.y=1.1;group.add(vial);
    const bottom=new THREE.Mesh(new THREE.SphereGeometry(.62,48,16,0,Math.PI*2,Math.PI/2,Math.PI/2),glass);group.add(bottom);
    const stopper=new THREE.Mesh(new THREE.CylinderGeometry(.5,.44,.4,32),new THREE.MeshStandardMaterial({color:'#2b2f38',roughness:.6}));stopper.position.y=2.35;group.add(stopper);
    const liquid=new THREE.Mesh(new THREE.CylinderGeometry(.57,.57,.9,48),new THREE.MeshPhysicalMaterial({color:s.color,roughness:.08,clearcoat:1,transparent:true,opacity:.96}));liquid.position.y=.35;group.add(liquid);
    const vapor=new THREE.Mesh(new THREE.CylinderGeometry(.57,.57,1.3,48),new THREE.MeshBasicMaterial({color:s.vapor,transparent:true,opacity:.28,depthWrite:false}));vapor.position.y=1.45;extras.push(vapor);
    const rising=particles(60,.5,s.vapor,.06,'column');rising.position.y=.85;extras.push(rising);
    return{group,extras};
  },
  mercury(el){
    const group=new THREE.Group(),extras=[];
    const dish=new THREE.Mesh(new THREE.LatheGeometry([new THREE.Vector2(0,0),new THREE.Vector2(1.5,0),new THREE.Vector2(1.6,.05),new THREE.Vector2(1.62,.35),new THREE.Vector2(1.56,.35),new THREE.Vector2(1.52,.08),new THREE.Vector2(0,.08)],96),glassMat());group.add(dish);
    const mat=metalMat('#e9edf2',.02);const pool=new THREE.Mesh(blobGeometry(80,.06),mat);pool.scale.set(1.05,.2,.9);pool.position.y=.25;group.add(pool);
    const rand=rng(80);for(let i=0;i<6;i++){const d=new THREE.Mesh(new THREE.SphereGeometry(.08+rand()*.12,32,16),mat);const a=rand()*6.28,r=1.15+rand()*.2;d.scale.y=.55;d.position.set(Math.cos(a)*r,.13,Math.sin(a)*r);group.add(d)}
    extras.tick=t=>{pool.scale.y=.2+Math.sin(t*2.2)*.008;pool.rotation.y=Math.sin(t*.7)*.08};
    return{group,extras};
  },
  oil(el,s){
    const group=new THREE.Group(),extras=[],glass=glassMat();
    const jar=new THREE.Mesh(new THREE.CylinderGeometry(1,1,2.1,64,1,true),glass);jar.position.y=1.05;group.add(jar);
    const floor=new THREE.Mesh(new THREE.CylinderGeometry(1,1,.06,64),glass);floor.position.y=.03;group.add(floor);
    const lid=new THREE.Mesh(new THREE.CylinderGeometry(1.06,1.06,.28,64),metalMat('#39404c',.4));lid.position.y=2.22;group.add(lid);
    const oil=new THREE.Mesh(new THREE.CylinderGeometry(.95,.95,1.5,64),new THREE.MeshPhysicalMaterial({color:'#e2b54e',transparent:true,opacity:.35,roughness:.1,depthWrite:false}));oil.position.y=.8;extras.push(oil);
    const mat=metalMat(s.color,.32),rand=rng(el.number);
    for(let i=0;i<(s.float?2:3);i++){const piece=new THREE.Mesh(blobGeometry(el.number+i*5,.25,true),mat);piece.scale.set(.42+rand()*.18,.26+rand()*.1,.36+rand()*.14);piece.position.set((rand()-.5)*.9,s.float?1.45+i*.05:.3,(rand()-.5)*.8);piece.rotation.y=rand()*6;group.add(piece)}
    return{group,extras};
  },
  ampoule(el,s){
    const group=new THREE.Group(),extras=[],glass=glassMat();
    const capsule=new THREE.Mesh(new THREE.CapsuleGeometry(.48,1.8,16,48),glass);capsule.position.y=1.38;group.add(capsule);
    const tip=new THREE.Mesh(new THREE.CylinderGeometry(.04,.12,.5,24),glass);tip.position.y=2.9;group.add(tip);
    const metal=new THREE.Mesh(blobGeometry(el.number,.08),metalMat(s.color,.15));metal.scale.set(.42,.28,.42);metal.position.y=.55;group.add(metal);
    const stand=new THREE.Mesh(new THREE.TorusGeometry(.56,.05,12,64),metalMat('#7d8794',.35));stand.rotation.x=Math.PI/2;stand.position.y=.4;group.add(stand);
    return{group,extras};
  },
  diamond(el){
    const group=new THREE.Group(),extras=[];
    const profile=[new THREE.Vector2(0,-.95),new THREE.Vector2(1,.05),new THREE.Vector2(1,.15),new THREE.Vector2(.62,.5),new THREE.Vector2(0,.5)];
    const gem=new THREE.Mesh(new THREE.LatheGeometry(profile,8),new THREE.MeshPhysicalMaterial({color:0xffffff,metalness:0,roughness:0,transmission:1,thickness:1.4,ior:2.42,dispersion:5,flatShading:true,envMapIntensity:2.2,specularIntensity:1}));gem.position.set(-.55,1.6,0);gem.rotation.z=.15;group.add(gem);
    const graphite=new THREE.Mesh(blobGeometry(6,.28,true),new THREE.MeshPhysicalMaterial({color:'#1d1f24',metalness:.45,roughness:.38,flatShading:true}));graphite.scale.set(.75,.45,.6);graphite.position.set(1.15,.45,.2);group.add(graphite);
    extras.push(glowSprite('#bfe9ff',2.2,.25));extras[0].position.copy(gem.position);
    extras.tick=t=>{gem.rotation.y=t*.8;gem.position.y=1.6+Math.sin(t*1.4)*.08};
    return{group,extras};
  },
  crystals(el,s){
    const group=new THREE.Group(),extras=[],rand=rng(el.number*7),iodine=el.symbol==='I';
    const rock=new THREE.Mesh(blobGeometry(el.number,.2,true),new THREE.MeshStandardMaterial({color:iodine?'#17121f':'#3a342c',roughness:.95,flatShading:true}));rock.scale.set(1.05,.34,.9);rock.position.y=.3;group.add(rock);
    const mat=iodine?new THREE.MeshPhysicalMaterial({color:s.color,metalness:.75,roughness:.18,flatShading:true,iridescence:.4}):new THREE.MeshPhysicalMaterial({color:s.color,metalness:0,roughness:.32,clearcoat:.6,flatShading:true,emissive:'#5a4300',emissiveIntensity:.6});
    for(let i=0;i<11;i++){
      const geo=iodine?new THREE.BoxGeometry(.5,.08,.34):new THREE.OctahedronGeometry(.5,0),c=new THREE.Mesh(geo,mat),len=.6+rand()*.9;
      if(iodine)c.scale.set(1+rand(),1,1+rand()*.6);else c.scale.set(.42+rand()*.2,len,.32+rand()*.14);
      const a=rand()*Math.PI*2,r=rand()*.85;c.position.set(Math.cos(a)*r,.55+len*.25,Math.sin(a)*r*.8);c.rotation.set((rand()-.5)*.9,rand()*3,(rand()-.5)*.9);group.add(c);
    }
    if(s.vapor){const v=glowSprite(s.vapor,3.6,.35);v.position.y=1.6;extras.push(v);extras.push(particles(70,1.1,s.vapor,.07))}
    return{group,extras};
  },
  powder(el,s){
    const group=new THREE.Group(),extras=[];
    const dish=new THREE.Mesh(new THREE.LatheGeometry([new THREE.Vector2(0,0),new THREE.Vector2(1.4,0),new THREE.Vector2(1.6,.3),new THREE.Vector2(1.52,.32),new THREE.Vector2(1.34,.08),new THREE.Vector2(0,.08)],96),new THREE.MeshPhysicalMaterial({color:'#f4f6fa',roughness:.25,clearcoat:1}));group.add(dish);
    const geo=blobGeometry(el.number,.12);const p=geo.attributes.position;for(let i=0;i<p.count;i++){const y=p.getY(i);p.setY(i,y<0?0:y*(1-Math.hypot(p.getX(i),p.getZ(i))*.35))}geo.computeVertexNormals();
    const pile=new THREE.Mesh(geo,new THREE.MeshStandardMaterial({color:s.color,roughness:1}));pile.scale.set(1.15,.85,1.05);pile.position.y=.08;group.add(pile);
    const rand=rng(15),grainGeo=new THREE.SphereGeometry(.035,6,4),grainMat=new THREE.MeshStandardMaterial({color:s.color,roughness:1});for(let i=0;i<40;i++){const g=new THREE.Mesh(grainGeo,grainMat),a=rand()*6.28,r=1.05+rand()*.25;g.position.set(Math.cos(a)*r,.1,Math.sin(a)*r);group.add(g)}
    return{group,extras};
  },
  chunk(el,s){
    const group=new THREE.Group(),extras=[];
    const mat=new THREE.MeshPhysicalMaterial({color:s.color,metalness:s.metal,roughness:s.rough,flatShading:true,envMapIntensity:1.3,clearcoat:.3});
    const main=new THREE.Mesh(blobGeometry(el.number,.32,true),mat);main.scale.set(1.2,.85,.95);main.position.y=.8;group.add(main);
    const small=new THREE.Mesh(blobGeometry(el.number+11,.35,true),mat);small.scale.set(.45,.35,.4);small.position.set(1.35,.32,.4);group.add(small);
    return{group,extras};
  },
  bismuth(el){
    const group=new THREE.Group(),extras=[];
    // Real bismuth crystals get their rainbow from a thin oxide layer, so each step takes a different tint.
    const tints=['#f2c46d','#e98ad8','#8f7cff','#4fc4ff','#57e3c1','#c7e86a','#ffb15c','#ff7fb0'].map(color=>new THREE.MeshPhysicalMaterial({color,metalness:.95,roughness:.18,iridescence:1,iridescenceIOR:2.1,iridescenceThicknessRange:[120,900],envMapIntensity:1.6}));
    const hopper=(size,steps,x,z,rot)=>{const h=new THREE.Group();for(let i=0;i<steps;i++){const s=size*(1-i/steps*.82),w=.11,y=i*.11,mat=tints[((i+Math.round(x*3))%tints.length+tints.length)%tints.length];[[0,s/2],[0,-s/2],[s/2,0],[-s/2,0]].forEach(([dx,dz],k)=>{const bar=new THREE.Mesh(new THREE.BoxGeometry(k<2?s:w,.11,k<2?w:s),mat);bar.position.set(dx,y,dz);h.add(bar)})}h.position.set(x,0,z);h.rotation.y=rot;group.add(h)};
    hopper(1.9,9,0,0,.2);hopper(1,6,1.15,.7,.9);hopper(.8,5,-1.05,.75,-.4);
    return{group,extras};
  },
  atomOnly(el){return{group:new THREE.Group(),extras:[]}}
};

function normalizeSpecimen(group,size=2.2){
  group.updateMatrixWorld(true);const box=new THREE.Box3().setFromObject(group);if(box.isEmpty())return;const dim=box.getSize(new THREE.Vector3());
  group.scale.multiplyScalar(size/Math.max(dim.x,dim.y*1.05,dim.z));group.updateMatrixWorld(true);box.setFromObject(group);
  group.position.set(-(box.min.x+box.max.x)/2,-box.min.y+.02,-(box.min.z+box.max.z)/2);
}
function buildRealSpecimen(el){
  const spec=specimenSpec(el),{group,extras}=BUILDERS[spec.kind](el,spec),wrap=new THREE.Group();wrap.add(group);normalizeSpecimen(group);
  extras.forEach(x=>group.add(x));
  const tickers=[];group.traverse(o=>o.userData.tick&&tickers.push(o.userData.tick));
  return{object:wrap,tick:(t,dt)=>{extras.tick?.(t);tickers.forEach(fn=>fn(dt))}};
}

// ---------- atom model ----------
function buildAtom(el){
  const group=new THREE.Group(),color=new THREE.Color(familyColor(el));
  const neutrons=Math.max(0,Math.round(el.massValue)-el.number),total=el.number+neutrons,shown=Math.min(total,72),protonsShown=Math.max(1,Math.round(shown*el.number/total));
  const nucleus=new THREE.Group(),ball=new THREE.SphereGeometry(.12,20,14),pMat=new THREE.MeshPhysicalMaterial({color:'#ff5d73',roughness:.3,clearcoat:1,emissive:'#ff2b4a',emissiveIntensity:.2}),nMat=new THREE.MeshPhysicalMaterial({color:'#9fb0cc',roughness:.3,clearcoat:1}),R=.12*Math.cbrt(shown)*1.1,golden=Math.PI*(3-Math.sqrt(5));
  const order=Array.from({length:shown},(_,i)=>i).sort(()=>Math.random()-.5);
  for(let i=0;i<shown;i++){const y=1-(i+.5)/shown*2,r=Math.sqrt(1-y*y),a=i*golden,rad=R*Math.cbrt((i+1)/shown);const m=new THREE.Mesh(ball,order[i]<protonsShown?pMat:nMat);m.position.set(Math.cos(a)*r*rad,y*rad,Math.sin(a)*r*rad);nucleus.add(m)}
  group.add(nucleus);const core=glowSprite('#ff8aa0',R*7,.35);group.add(core);
  const shellGap=el.shells.length>5?.36:.45,electronGeo=new THREE.SphereGeometry(.06,16,10),electronMat=new THREE.MeshBasicMaterial({color:'#8ffcff',toneMapped:false}),rand=rng(el.number),shells=[];
  el.shells.forEach((count,i)=>{
    const radius=R+.55+i*shellGap,pivot=new THREE.Group();pivot.rotation.set(Math.PI/2+(rand()-.5)*1.1,(rand()-.5)*1.1,0);
    const ring=new THREE.Mesh(new THREE.TorusGeometry(radius,.007,6,160),new THREE.MeshBasicMaterial({color,transparent:true,opacity:.4,toneMapped:false}));pivot.add(ring);
    const spinner=new THREE.Group();pivot.add(spinner);
    for(let k=0;k<count;k++){const a=k/count*Math.PI*2,e=new THREE.Mesh(electronGeo,electronMat);e.position.set(Math.cos(a)*radius,Math.sin(a)*radius,0);spinner.add(e);if(count<=18){const g=glowSprite('#5ef9ff',.32,.6);g.position.copy(e.position);spinner.add(g)}}
    shells.push({spinner,speed:1.1/(i+1)**.6*(i%2?-1:1)});group.add(pivot);
  });
  const maxR=R+.55+(el.shells.length-1)*shellGap;group.scale.setScalar(Math.min(1.25,2.15/maxR));
  return{object:group,tick:(t,dt)=>{shells.forEach(s=>s.spinner.rotation.z+=dt*s.speed);nucleus.rotation.y+=dt*.3;nucleus.rotation.x+=dt*.13;core.material.opacity=.3+Math.sin(t*3)*.06}};
}

// ---------- element mode ----------
function showSpecimen(el){
  if(current){[current.real,current.atom].forEach(x=>{x.object.removeFromParent();disposeTree(x.object)})}
  current={el,real:buildRealSpecimen(el),atom:buildAtom(el)};specimenHolder.add(current.real.object);atomHolder.add(current.atom.object);
  const color=new THREE.Color(familyColor(el));stageRing.material.color.copy(color);stageRing.userData.glow.material.color.copy(color);stageRim.color.copy(color);
  specimenHolder.rotation.y=0;applyView();
}
function applyView(){if(!current)return;const atom=view==='atom';specimenHolder.visible=!atom;atomHolder.visible=atom;
  [['#view-real',!atom],['#view-atom',atom]].forEach(([id,on])=>{$(id).classList.toggle('active',on);$(id).setAttribute('aria-pressed',String(on))})}
function setView(next){if(current?.el.neverSeen&&next==='real')return;view=next;applyView();if(mode==='element')flyTo(elementView(),700);if(current)elementSounds(current.el,view==='atom')}
function fillCard(el){
  const card=$('#element-card'),color=familyColor(el);card.style.setProperty('--tile',color);
  $('#card-number').textContent=el.number;$('#card-symbol').textContent=el.symbol;$('#card-mass').textContent=el.mass;$('#card-family').textContent=FAMILIES[el.family].name.toUpperCase();$('#card-name').textContent=el.name;
  const badges=$('#card-badges');badges.replaceChildren();const badge=(text,cls='')=>{const b=document.createElement('span');b.className=`badge ${cls}`;b.textContent=text;badges.append(b)};
  badge(STATES[el.state].name);if(el.radioactive)badge('☢ Radioactive','radioactive');if(el.synthetic)badge('Made in a lab','lab');if(BODY_ELEMENTS.has(el.number))badge('In your body');
  $('#stat-number').textContent=el.number;$('#stat-mass').textContent=el.mass;$('#stat-state').textContent=STATES[el.state].name;$('#stat-year').textContent=el.discovered;
  $('#card-look').textContent=el.neverSeen?el.look:`${el.look} The 3D model shows how it looks in real life.`;$('#card-fact').textContent=el.fact;$('#card-uses').textContent=el.uses;$('#card-shells').textContent=el.shells.join(' · ');
  const prev=ELEMENTS[(el.number+116)%118],next=ELEMENTS[el.number%118];$('#prev-label').textContent=prev.symbol;$('#next-label').textContent=next.symbol;$('#prev-element').setAttribute('aria-label',`Previous element: ${prev.name}`);$('#next-element').setAttribute('aria-label',`Next element: ${next.name}`);
  $('#view-real').disabled=el.neverSeen;$('#view-real').title=el.neverSeen?'Nobody has ever seen this element':'';
  card.scrollTop=0;
}
function selectElement(el,{silent=false}={}){
  const entering=mode!=='element';mode='element';selected=el;hovered=null;$('#hover-chip').hidden=true;host.classList.remove('pointing');
  app.classList.add('element-mode');$('#element-card').hidden=false;$('.element-controls').hidden=false;$('.finder-panel').classList.remove('open');
  if(el.neverSeen)view='atom';else if(entering)view='real';
  fillCard(el);showSpecimen(el);stage.visible=true;elementSounds(el,view==='atom');
  flyTo(elementView(),entering?1300:700);if(!silent){playSfx(entering?'select':'pop');if(entering)whoosh(true,.9)}
  document.querySelectorAll('.element-row').forEach(r=>r.classList.toggle('active',Number(r.dataset.number)===el.number));
  history.replaceState(null,'',`#${el.symbol}`);
}
function backToTable(){if(mode==='element'){stopElementSounds();whoosh(false,.8)}
  if(mode!=='element')return;mode='table';selected=null;app.classList.remove('element-mode');$('#element-card').hidden=true;$('.element-controls').hidden=true;
  stage.visible=false;flyTo(tableView(),1200);playSfx('tap');history.replaceState(null,'',location.pathname+location.search);
}
function step(delta){if(!selected)return;selectElement(ELEMENTS[(selected.number-1+delta+118)%118])}

// ---------- finder ----------
function buildFinder(){
  const q=$('#element-search').value.trim().toLowerCase(),list=$('#element-list');list.replaceChildren();
  let items=q?ELEMENTS.filter(e=>e.name.toLowerCase().includes(q)||e.symbol.toLowerCase()===q||String(e.number)===q).sort((a,b)=>(b.symbol.toLowerCase()===q)-(a.symbol.toLowerCase()===q)||(b.name.toLowerCase().startsWith(q))-(a.name.toLowerCase().startsWith(q))||a.number-b.number).slice(0,24):FAMOUS.map(n=>ELEMENTS[n-1]);
  items.forEach(el=>{const b=document.createElement('button');b.type='button';b.className='element-row';b.dataset.number=el.number;b.style.setProperty('--tile',familyColor(el));b.innerHTML=`<i>${el.symbol}</i><span>${el.name}</span>`;b.classList.toggle('active',selected===el);b.onclick=()=>selectElement(el);list.append(b)});
  if(!items.length)list.innerHTML='<p class="empty-parts">No element with that name. Try a symbol like “Fe” or a number like 26.</p>';
  $('#finder-heading').textContent=q?'RESULTS':'FAMOUS ELEMENTS';$('#finder-count').textContent=items.length;
}

// ---------- picking ----------
const raycaster=new THREE.Raycaster(),pointer=new THREE.Vector2();
function tileAt(event){const r=renderer.domElement.getBoundingClientRect();pointer.set((event.clientX-r.left)/r.width*2-1,-(event.clientY-r.top)/r.height*2+1);raycaster.setFromCamera(pointer,camera);if(mode==='element'&&raycaster.intersectObject(stage,true).length)return null;return raycaster.intersectObjects(pickables,false)[0]?.object.userData.tile||null}
function wirePicking(){
  const canvas=renderer.domElement;let down=null;
  canvas.addEventListener('pointerdown',e=>{down={x:e.clientX,y:e.clientY}});
  canvas.addEventListener('pointermove',e=>{if(e.pointerType!=='mouse'||mode!=='table'){return}const tile=tileAt(e);if(tile!==hovered){hovered=tile;host.classList.toggle('pointing',!!tile)}const chip=$('#hover-chip');if(tile){chip.hidden=false;chip.style.setProperty('--tile',lensColor(tile.el));chip.innerHTML=`<b>${tile.el.symbol}</b>${tile.el.name} · ${tile.el.number}`;chip.style.left=`${e.clientX}px`;chip.style.top=`${e.clientY}px`}else chip.hidden=true});
  canvas.addEventListener('pointerleave',()=>{hovered=null;$('#hover-chip').hidden=true;host.classList.remove('pointing')});
  canvas.addEventListener('pointerup',e=>{if(!down||Math.hypot(e.clientX-down.x,e.clientY-down.y)>8)return;down=null;const tile=tileAt(e);if(tile&&(mode==='table'||tile.el!==selected))selectElement(tile.el)});
}

// ---------- UI wiring ----------
function wireUI(){
  document.querySelectorAll('.lens-toggle').forEach(b=>b.onclick=()=>{if(b.dataset.lens!==lens){setLens(b.dataset.lens);playSfx('tap')}});
  $('#element-search').addEventListener('input',buildFinder);
  $('#open-finder').onclick=()=>{const panel=$('.finder-panel'),open=!panel.classList.contains('open');panel.classList.toggle('open',open);if(open)$('#element-search').focus();playSfx('tap')};
  $('#close-finder').onclick=()=>$('.finder-panel').classList.remove('open');
  $('#reset-view').onclick=()=>{flyTo(mode==='table'?tableView():elementView(),900);playSfx('tap')};
  $('#auto-rotate').onclick=e=>{spin=!spin;e.currentTarget.classList.toggle('active',spin);e.currentTarget.setAttribute('aria-pressed',String(spin));playSfx('tap')};
  $('#fullscreen').onclick=()=>document.fullscreenElement?document.exitFullscreen():app.requestFullscreen?.();
  $('#close-card').onclick=backToTable;$('#back-to-table').onclick=backToTable;
  $('#prev-element').onclick=()=>step(-1);$('#next-element').onclick=()=>step(1);
  $('#view-real').onclick=()=>setView('real');$('#view-atom').onclick=()=>setView('atom');
  addEventListener('keydown',e=>{if(e.target.matches('input'))return e.key==='Escape'&&$('.finder-panel').classList.remove('open');if(e.key==='Escape'){if($('.finder-panel').classList.contains('open'))$('.finder-panel').classList.remove('open');else backToTable()}if(mode==='element'&&e.key==='ArrowLeft')step(-1);if(mode==='element'&&e.key==='ArrowRight')step(1)});
}

// ---------- loop ----------
function resize(){const w=innerWidth,h=innerHeight;renderer.setSize(w,h);camera.aspect=w/h;camera.fov=w<760&&h>w?50:42;camera.updateProjectionMatrix();if(tiles.length&&!flight){configureControls();flyTo(mode==='table'?tableView():elementView(),400)}}
function animate(now=0){
  requestAnimationFrame(animate);if(document.hidden)return;
  const dt=Math.min(.05,Math.max(0,(now-last)/1000)),t=now/1000;last=now;
  if(tiles.length)updateTiles(dt,now);
  tableGroup.rotation.y=THREE.MathUtils.damp(tableGroup.rotation.y,spin&&mode==='table'&&!reduceMotion?Math.sin(t*.22)*.07:0,3,dt);
  scene.fog.far=THREE.MathUtils.damp(scene.fog.far,mode==='element'?18:1000,mode==='element'?3:1.5,dt);
  if(current&&stage.visible){if(spin&&!reduceMotion)specimenHolder.rotation.y+=dt*.45;current.real.tick(t,dt);current.atom.tick(t,dt)}
  if(flight){const p=THREE.MathUtils.clamp((performance.now()-flight.start)/flight.duration,0,1),e=p<.5?4*p*p*p:1-Math.pow(-2*p+2,3)/2;camera.position.lerpVectors(flight.from,flight.to,e);controls.target.lerpVectors(flight.targetFrom,flight.target,e);camera.lookAt(controls.target);if(p===1){flight=null;configureControls();controls.update()}}
  else{controls.update();clampPan()}
  renderer.render(scene,camera);
}

async function boot(){
  hydrateIcons();installAudio({musicButton:$('#music-toggle'),theme:'chemistry'});wireUI();buildFinder();buildLegend();updateLensText();
  await Promise.race([Promise.all(['900 104px Nunito','800 26px Nunito','700 32px "Space Mono"'].map(f=>document.fonts.load(f))),new Promise(r=>setTimeout(r,2500))]).catch(()=>{});
  buildTable();wirePicking();const home=tableView();camera.position.copy(home.position);controls.target.copy(home.target);configureControls();
  $('#load-status').classList.add('done');
  openFromHash();addEventListener('hashchange',openFromHash);
}
// Deep links: chemistry.html#Au or #79 opens that element; #atom-Au opens its atom view.
function openFromHash(){const raw=decodeURIComponent(location.hash.slice(1)),atom=raw.startsWith('atom-'),key=raw.replace(/^atom-/,'').toLowerCase();if(!key)return;const el=ELEMENTS.find(e=>e.symbol.toLowerCase()===key||String(e.number)===key);if(!el||el===selected)return;selectElement(el,{silent:true});if(atom){view='atom';applyView();flyTo(elementView(),1)}}

try{setupScene();animate();boot().catch(error=>{console.error(error);$('#fallback').hidden=false;$('#load-status').classList.add('done')})}
catch(error){console.error(error);$('#fallback').hidden=false;$('#load-status').classList.add('done')}
