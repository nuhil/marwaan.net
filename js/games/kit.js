// Shared building blocks for the Game Room: textures, tweens, toys, sky, labels and confetti.
import * as THREE from 'three';
import {RoundedBoxGeometry} from 'three/addons/geometries/RoundedBoxGeometry.js';
import {makeCarrot,makeEgg} from '../worlds/math-models.js';

export {THREE,RoundedBoxGeometry};
export const V=(x=0,y=0,z=0)=>new THREE.Vector3(x,y,z);
export const reduceMotion=matchMedia('(prefers-reduced-motion: reduce)').matches;
export function rng(seed){let a=seed*9301+49297;return()=>{a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}}
export const shuffle=list=>{const a=[...list];for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]]}return a};
export const ease={inOut:t=>t*t*(3-2*t),out:t=>1-Math.pow(1-t,3),linear:t=>t,back:t=>{const c=1.7;return 1+(c+1)*Math.pow(t-1,3)+c*Math.pow(t-1,2)}};

// ---------- textures ----------
// Each image loads once; differently tiled copies share its pixels and refresh when it arrives.
const loader=new THREE.TextureLoader(),images=new Map(),surfaces=new Map();
function tex(path,repeat,color){
  if(!images.has(path)){const entry={copies:[]};entry.base=loader.load(path,()=>entry.copies.forEach(c=>{c.source=entry.base.source;c.needsUpdate=true}));images.set(path,entry)}
  const {base,copies}=images.get(path),t=new THREE.Texture();if(base.image){t.source=base.source;t.needsUpdate=true}else copies.push(t);
  t.wrapS=t.wrapT=THREE.RepeatWrapping;t.repeat.set(...repeat);t.anisotropy=8;if(color)t.colorSpace=THREE.SRGBColorSpace;return t;
}
const TEXTURE_DIR={leafy_grass:'assets/math/textures',brown_planks_05:'assets/math/textures'};
// unique:true returns a material with its own textures, for surfaces that scroll or change.
export function surface(name,{repeat=[1,1],color='#ffffff',roughness=.8,metalness=0,normal=1,clearcoat=0,unique=false}={}){
  const key=name+JSON.stringify([repeat,color,roughness,metalness,normal,clearcoat]);if(!unique&&surfaces.has(key))return surfaces.get(key);
  const dir=TEXTURE_DIR[name]||'assets/games/textures',props={map:tex(`${dir}/${name}-color.jpg`,repeat,true),normalMap:tex(`${dir}/${name}-normal.jpg`,repeat,false),normalScale:new THREE.Vector2(normal,normal),color,roughness,metalness};
  const m=clearcoat?new THREE.MeshPhysicalMaterial({...props,clearcoat,clearcoatRoughness:.25}):new THREE.MeshStandardMaterial(props);if(unique)return m;m.userData.shared=true;surfaces.set(key,m);return m;
}
// Painted wood: the grain shows through a bright, glossy colour.
export function paintedWood(color,repeat=[.6,.6]){return surface('oak_veneer_01',{repeat,color,roughness:.42,normal:.7,clearcoat:.6})}

// ---------- tweens ----------
// Tweens belong to a "round" token; when a game or level restarts, its pending tweens are dropped.
const tweens=[];let round=0;
export const newRound=()=>++round;
export function tween({duration=500,delay=0,ease:e=ease.inOut,update}){const speed=reduceMotion?.3:1;return new Promise(resolve=>tweens.push({start:performance.now()+delay*speed,duration:Math.max(1,duration*speed),e,update,resolve,round}))}
export const wait=ms=>tween({duration:ms,update(){}});
export function updateTweens(now){for(let i=tweens.length-1;i>=0;i--){const t=tweens[i];if(t.round!==round){tweens.splice(i,1);continue}const raw=(now-t.start)/t.duration;if(raw<0)continue;const p=Math.min(1,raw);t.update(t.e(p),p);if(p>=1){tweens.splice(i,1);t.resolve()}}}
export function arcTo(object,to,{duration=500,height=1,e=ease.inOut}={}){const from=object.position.clone();return tween({duration,ease:e,update:(k,p)=>{object.position.lerpVectors(from,to,k);object.position.y+=Math.sin(Math.PI*p)*height}})}
export function scaleTo(object,to,duration=300,e=ease.out){const from=object.scale.x;return tween({duration,ease:e,update:k=>object.scale.setScalar(THREE.MathUtils.lerp(from,to,k))})}

// ---------- disposal ----------
export function disposeTree(root){root.traverse(o=>{if(o.userData.shared)return;if(o.geometry&&!o.geometry.userData.shared)o.geometry.dispose();const mats=Array.isArray(o.material)?o.material:o.material?[o.material]:[];mats.forEach(m=>{if(m.userData.shared)return;if(m.map&&!m.map.userData.shared)m.map.dispose();m.dispose()})})}

// ---------- sky and lights ----------
export function makeSky(top='#2f7fd6',horizon='#d4ecf8',sun=V(-.4,.6,.5).normalize()){
  const material=new THREE.ShaderMaterial({side:THREE.BackSide,depthWrite:false,fog:false,uniforms:{top:{value:new THREE.Color(top)},horizon:{value:new THREE.Color(horizon)},sun:{value:sun}},
    vertexShader:'varying vec3 vDir;void main(){vDir=normalize(position);gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
    fragmentShader:'uniform vec3 top,horizon,sun;varying vec3 vDir;void main(){float h=max(vDir.y,0.);vec3 c=mix(horizon,top,pow(h,.55));float g=max(dot(normalize(vDir),normalize(sun)),0.);c+=vec3(1.,.93,.75)*(pow(g,64.)*.9+pow(g,8.)*.16);gl_FragColor=vec4(c,1.);}'});
  const sky=new THREE.Mesh(new THREE.SphereGeometry(400,32,16),material);sky.renderOrder=-1;return sky;
}
export function sunLight(size=14,position=V(-8,16,10)){const sun=new THREE.DirectionalLight(0xfff0d8,3);sun.position.copy(position);sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);Object.assign(sun.shadow.camera,{left:-size,right:size,top:size,bottom:-size,near:1,far:70});sun.shadow.bias=-.0004;sun.shadow.normalBias=.02;return sun}
export const shadowed=o=>{o.traverse(m=>{if(m.isMesh){m.castShadow=true;m.receiveShadow=true}});return o};

// ---------- labels ----------
export function labelSprite(text,{bg='#fffaf0',fg='#2b2350',ring='#ffb627',scale=.9,font=64}={}){
  const c=document.createElement('canvas');c.width=512;c.height=160;const g=c.getContext('2d');g.font=`900 ${font}px Nunito, system-ui, sans-serif`;const w=Math.min(500,g.measureText(text).width+90);
  g.fillStyle=bg;g.beginPath();g.roundRect((512-w)/2,14,w,132,66);g.fill();g.lineWidth=10;g.strokeStyle=ring;g.stroke();g.fillStyle=fg;g.textAlign='center';g.textBaseline='middle';g.fillText(text,256,84);
  const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;const s=new THREE.Sprite(new THREE.SpriteMaterial({map:t,transparent:true,depthWrite:false}));s.scale.set(scale*3.2,scale,1);s.renderOrder=5;return s;
}

// ---------- celebration ----------
const bursts=[];
export function confetti(scene,at,count=90){
  const colors=['#ff6f61','#ffd34d','#2ec4b6','#9b7bff','#3fa7ff','#ff8fab'],geo=new THREE.PlaneGeometry(.14,.08),mats=colors.map(color=>new THREE.MeshStandardMaterial({color,side:THREE.DoubleSide,roughness:.6})),group=new THREE.Group();
  for(let i=0;i<count;i++){const m=new THREE.Mesh(geo,mats[i%mats.length]);m.position.copy(at);m.userData.v=V((Math.random()-.5)*6,4+Math.random()*5,(Math.random()-.5)*6);m.userData.spin=V(Math.random()*9,Math.random()*9,0);group.add(m)}
  scene.add(group);bursts.push({group,life:2.4,geo,mats,floor:at.y-3});
}
export function updateBursts(scene,dt){for(let i=bursts.length-1;i>=0;i--){const b=bursts[i];b.life-=dt;b.group.children.forEach(m=>{m.userData.v.y-=9*dt;m.position.addScaledVector(m.userData.v,dt);if(m.position.y<b.floor){m.position.y=b.floor;m.userData.v.multiplyScalar(.3)}m.rotation.x+=m.userData.spin.x*dt;m.rotation.y+=m.userData.spin.y*dt});if(b.life<=0){scene.remove(b.group);b.geo.dispose();b.mats.forEach(m=>m.dispose());bursts.splice(i,1)}}}

// ---------- toys ----------
function lathe(points,segments=32){return new THREE.LatheGeometry(points.map(([x,y])=>new THREE.Vector2(x,y)),segments)}
function leafShape(h){const s=new THREE.Shape();s.moveTo(0,0);s.bezierCurveTo(.07,h*.22,.095,h*.54,0,h);s.bezierCurveTo(-.075,h*.56,-.06,h*.2,0,0);return s}
export function makeApple(){
  const g=new THREE.Group(),body=new THREE.Mesh(lathe([[.05,-.34],[.24,-.31],[.34,-.16],[.37,.06],[.33,.24],[.2,.33],[.07,.29],[.02,.27]]),new THREE.MeshPhysicalMaterial({color:'#d62f2f',roughness:.32,clearcoat:.7,clearcoatRoughness:.3}));body.position.y=.34;
  const stem=new THREE.Mesh(new THREE.CylinderGeometry(.018,.03,.2,8),new THREE.MeshStandardMaterial({color:'#5b3824',roughness:1}));stem.position.set(.01,.7,0);stem.rotation.z=-.15;
  const leaf=new THREE.Mesh(new THREE.ShapeGeometry(leafShape(.24),4),new THREE.MeshStandardMaterial({color:'#3f9a4d',roughness:.6,side:THREE.DoubleSide}));leaf.position.set(.03,.7,0);leaf.rotation.set(0,.4,-1.1);
  g.add(body,stem,leaf);return shadowed(g);
}
export function makeDuck(){
  const g=new THREE.Group(),yellow=new THREE.MeshPhysicalMaterial({color:'#ffd21f',roughness:.28,clearcoat:1,clearcoatRoughness:.15});
  const body=new THREE.Mesh(new THREE.SphereGeometry(.34,32,20),yellow);body.scale.set(1.25,.82,1);body.position.y=.28;
  const tail=new THREE.Mesh(new THREE.ConeGeometry(.14,.24,20),yellow);tail.rotation.z=Math.PI/2+.6;tail.position.set(-.42,.42,0);
  const head=new THREE.Mesh(new THREE.SphereGeometry(.22,32,20),yellow);head.position.set(.2,.66,0);
  const beak=new THREE.Mesh(new THREE.SphereGeometry(.1,20,12),new THREE.MeshPhysicalMaterial({color:'#ff7a1a',roughness:.35,clearcoat:.6}));beak.scale.set(1.3,.45,.9);beak.position.set(.42,.62,0);
  const eyeMat=new THREE.MeshPhysicalMaterial({color:'#111',roughness:.1,clearcoat:1});[-1,1].forEach(s=>{const e=new THREE.Mesh(new THREE.SphereGeometry(.035,12,8),eyeMat);e.position.set(.33,.73,s*.12);g.add(e)});
  const wing=new THREE.Mesh(new THREE.SphereGeometry(.18,20,12),yellow);wing.scale.set(1.2,.5,.4);[-1,1].forEach(s=>{const w=wing.clone();w.position.set(-.05,.36,s*.3);w.rotation.x=s*.3;g.add(w)});
  g.add(body,tail,head,beak);return shadowed(g);
}
export function makeBeachBall(){
  const c=document.createElement('canvas');c.width=512;c.height=256;const x=c.getContext('2d'),cols=['#e63946','#ffffff','#1d8fe1','#ffffff','#ffd21f','#ffffff'];cols.forEach((col,i)=>{x.fillStyle=col;x.fillRect(i*512/6,0,512/6+1,256)});x.fillStyle='#fff';x.fillRect(0,0,512,22);x.fillRect(0,234,512,22);
  const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;const ball=new THREE.Mesh(new THREE.SphereGeometry(.38,40,28),new THREE.MeshPhysicalMaterial({map:t,roughness:.3,clearcoat:.8}));ball.position.y=.38;ball.rotation.z=.4;
  const g=new THREE.Group();g.add(ball);return shadowed(g);
}
export function starGeometry(outer=.46,inner=.2,depth=.16){const s=new THREE.Shape();for(let k=0;k<10;k++){const r=k%2?inner:outer,a=k/10*Math.PI*2+Math.PI/2;k?s.lineTo(Math.cos(a)*r,Math.sin(a)*r):s.moveTo(Math.cos(a)*r,Math.sin(a)*r)}const e=new THREE.ExtrudeGeometry(s,{depth,bevelEnabled:true,bevelSize:.04,bevelThickness:.05,bevelSegments:3});e.center();return e}
export const goldMaterial=()=>new THREE.MeshPhysicalMaterial({color:'#ffc93c',metalness:.85,roughness:.22,clearcoat:1,emissive:'#5a3a00',emissiveIntensity:.35});
export function makeStar(){const g=new THREE.Group(),s=new THREE.Mesh(starGeometry(),goldMaterial());s.position.y=.5;g.add(s);return shadowed(g)}
export function makeToyCarrot(){const c=makeCarrot(3);c.scale.setScalar(.75);c.rotation.z=.15;const g=new THREE.Group();g.add(c);return shadowed(g)}
export function makeToyEgg(){const e=makeEgg(0);e.scale.setScalar(1.35);const g=new THREE.Group();g.add(e);return shadowed(g)}
export function makeTeddy(){
  const g=new THREE.Group(),fur=new THREE.MeshStandardMaterial({color:'#a86b3c',roughness:.95}),light=new THREE.MeshStandardMaterial({color:'#e3b98a',roughness:.95}),dark=new THREE.MeshPhysicalMaterial({color:'#1a1210',roughness:.15,clearcoat:1});
  const part=(r,x,y,z,m=fur,sx=1,sy=1,sz=1)=>{const p=new THREE.Mesh(new THREE.SphereGeometry(r,24,16),m);p.position.set(x,y,z);p.scale.set(sx,sy,sz);g.add(p);return p};
  part(.26,0,.3,0,fur,1,1.1,.9);part(.15,0,.3,.17,light,1,1.1,.4);part(.21,0,.68,0);part(.09,0,.63,.17,light,1.1,.8,.8);part(.035,0,.66,.25,dark);
  [-1,1].forEach(s=>{part(.08,s*.16,.85,0);part(.045,s*.16,.85,.05,light,1,1,.5);part(.028,s*.08,.74,.17,dark);part(.09,s*.25,.36,.05,fur,.8,1.3,.8);part(.1,s*.13,.08,.1,fur,1,.8,1.3)});
  return shadowed(g);
}
export const TOYS={apple:['Apple',makeApple],duck:['Duck',makeDuck],ball:['Ball',makeBeachBall],star:['Star',makeStar],carrot:['Carrot',makeToyCarrot],egg:['Egg',makeToyEgg],teddy:['Teddy',makeTeddy]};
