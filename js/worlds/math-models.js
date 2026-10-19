// 3D models for the Number Pals Meadow: the Number Pal characters, farm props, and the island scenery.
import * as THREE from 'three';
import {RoundedBoxGeometry} from 'three/addons/geometries/RoundedBoxGeometry.js';

// Each pal from 1 to 10 has its own color. Pals 11–20 are a gold ten-tower plus the ones pal's color.
export const PAL_COLORS=['#2ec4b6','#ff6f61','#9b7bff','#8cd867','#ffb627','#3fa7ff','#ff8fab','#00b894','#e056fd','#ffcf3f'];
export const TEN_COLOR='#4c3fbf';
export const palColor=n=>n>10?PAL_COLORS[(n-11)%10]:PAL_COLORS[(n-1+10)%10];
export const UNIT=.52;

const shared=new Map();
function once(key,make){if(!shared.has(key))shared.set(key,make());return shared.get(key)}
function mark(o){o.userData.shared=true;return o}

export function numberTexture(text,{bg='#fff8e4',fg='#2b2350',ring=null,size=128}={}){
  const c=document.createElement('canvas');c.width=c.height=size;const g=c.getContext('2d'),r=size/2;
  g.fillStyle=bg;g.beginPath();g.arc(r,r,r*.86,0,Math.PI*2);g.fill();
  if(ring){g.lineWidth=size*.07;g.strokeStyle=ring;g.stroke()}
  g.fillStyle=fg;g.font=`900 ${String(text).length>1?size*.46:size*.56}px Nunito, system-ui, sans-serif`;g.textAlign='center';g.textBaseline='middle';g.fillText(String(text),r,r*1.06);
  const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;return t;
}
export function numberSprite(text,options={}){const s=new THREE.Sprite(new THREE.SpriteMaterial({map:numberTexture(text,options),transparent:true,depthWrite:false}));s.scale.setScalar(options.scale||.55);return s}

// ---------- Number Pal ----------
const cubeGeo=()=>once('cube',()=>new RoundedBoxGeometry(UNIT*.96,UNIT*.96,UNIT*.96,3,UNIT*.17));
function shade(color,amount){return new THREE.Color(color).lerp(new THREE.Color('#ffffff'),amount)}

export class NumberPal{
  constructor(n){
    this.group=new THREE.Group();this.body=new THREE.Group();this.head=new THREE.Group();this.group.add(this.body);this.body.add(this.head);
    this.cubes=[];this.count=0;this.n=n;this.blinkAt=1+Math.random()*3;this.waveUntil=0;this.seed=Math.random()*10;
    this.buildFace();this.feet=[];for(const side of [-1,1]){const foot=mark(new THREE.Mesh(once('foot',()=>new THREE.SphereGeometry(UNIT*.2,16,10)),once('footMat',()=>new THREE.MeshStandardMaterial({color:'#3b2f5c',roughness:.6}))));foot.scale.set(1.1,.5,1.35);foot.userData.side=side;foot.castShadow=true;this.body.add(foot);this.feet.push(foot)}
    for(let i=0;i<n;i++)this.addCube({instant:true});
    this.recolor(n,true);this.layout(true);
  }
  buildFace(){
    const white=once('eyeWhite',()=>new THREE.MeshPhysicalMaterial({color:'#ffffff',roughness:.15,clearcoat:1})),black=once('pupil',()=>new THREE.MeshStandardMaterial({color:'#1d1633',roughness:.3}));
    const z=UNIT*.49;this.eyes=[];
    for(const side of [-1,1]){
      const eye=new THREE.Group(),ball=mark(new THREE.Mesh(once('eyeGeo',()=>new THREE.SphereGeometry(UNIT*.17,20,14)),white));ball.scale.z=.55;
      const pupil=mark(new THREE.Mesh(once('pupilGeo',()=>new THREE.SphereGeometry(UNIT*.085,16,10)),black));pupil.position.z=UNIT*.07;pupil.scale.z=.6;
      const shine=mark(new THREE.Mesh(once('shineGeo',()=>new THREE.SphereGeometry(UNIT*.03,8,6)),white));shine.position.set(UNIT*.03,UNIT*.04,UNIT*.1);
      eye.add(ball,pupil,shine);eye.position.set(side*UNIT*.19,UNIT*.07,z);eye.userData.pupil=pupil;this.head.add(eye);this.eyes.push(eye);
    }
    const mouth=mark(new THREE.Mesh(once('mouth',()=>new THREE.TorusGeometry(UNIT*.11,UNIT*.028,8,20,Math.PI)),black));mouth.rotation.z=Math.PI;mouth.position.set(0,-UNIT*.13,z+.005);this.head.add(mouth);this.mouth=mouth;
    for(const side of [-1,1]){const cheek=mark(new THREE.Mesh(once('cheek',()=>new THREE.CircleGeometry(UNIT*.07,16)),once('cheekMat',()=>new THREE.MeshBasicMaterial({color:'#ff8fb1',transparent:true,opacity:.75}))));cheek.position.set(side*UNIT*.33,-UNIT*.08,z+.004);this.head.add(cheek)}
    this.arms=[];for(const side of [-1,1]){const pivot=new THREE.Group(),arm=new THREE.Mesh(once('arm',()=>new THREE.CapsuleGeometry(UNIT*.075,UNIT*.26,6,10)),new THREE.MeshPhysicalMaterial({roughness:.35,clearcoat:.5}));arm.position.y=-UNIT*.17;arm.castShadow=true;pivot.add(arm);pivot.position.set(side*UNIT*.52,-UNIT*.05,0);pivot.rotation.z=side*.35;pivot.userData.side=side;this.head.add(pivot);this.arms.push(pivot)}
    const stem=mark(new THREE.Mesh(once('stem',()=>new THREE.CylinderGeometry(.018,.018,UNIT*.55,6)),black));stem.position.y=UNIT*.75;this.head.add(stem);
    this.badge=new THREE.Sprite(new THREE.SpriteMaterial({transparent:true,depthWrite:false}));this.badge.scale.setScalar(UNIT*1.05);this.badge.position.y=UNIT*1.25;this.head.add(this.badge);
  }
  cubeSlot(i){const col=i<10?0:1,row=i%10;return new THREE.Vector3(col*UNIT,UNIT*.62+row*UNIT,0)}
  addCube({instant=false,fromWorld=null}={}){
    const mesh=new THREE.Mesh(cubeGeo(),new THREE.MeshPhysicalMaterial({roughness:.32,clearcoat:.7,clearcoatRoughness:.3}));mesh.userData.shared=false;mesh.castShadow=true;mesh.receiveShadow=true;mesh.userData.pal=this;
    const i=this.cubes.length,slot=this.cubeSlot(i);this.cubes.push(mesh);this.body.add(mesh);this.count=this.cubes.length;
    mesh.material.color.copy(this.cubeColor(i,this.n));
    if(instant||!fromWorld){mesh.position.copy(slot);if(!instant){mesh.position.y+=3;mesh.userData.drop={from:mesh.position.clone(),to:slot,t:0,arc:0}}}
    else{const local=this.body.worldToLocal(fromWorld.clone());mesh.position.copy(local);mesh.userData.drop={from:local,to:slot,t:0,arc:1.4}}
    return mesh;
  }
  popCube(){const mesh=this.cubes.pop();if(!mesh)return null;const world=mesh.getWorldPosition(new THREE.Vector3());this.body.remove(mesh);this.count=this.cubes.length;return{mesh,world}}
  cubeColor(i,n){if(n>10&&i<10)return shade(TEN_COLOR,i>=5?.22:0);return shade(palColor(n),(i%10)>=5?.24:0)}
  recolor(n,instant=false){this.n=n;this.cubes.forEach((c,i)=>{const to=this.cubeColor(i,n);if(instant)c.material.color.copy(to);else c.userData.recolor={from:c.material.color.clone(),to,t:0}});const arm=new THREE.Color(n>10?TEN_COLOR:palColor(n));this.arms.forEach(a=>a.children[0].material.color.copy(arm));this.setBadge(n)}
  setBadge(n){this.badge.material.map?.dispose();this.badge.material.map=numberTexture(n,{ring:palColor(n)});this.badge.material.needsUpdate=true}
  get height(){return UNIT*.62+Math.min(10,Math.max(1,this.count))*UNIT}
  layout(instant=false){
    const cols=this.count>10?2:1,targetX=-(cols-1)*UNIT/2,top=Math.max(0,Math.min(this.count,10)-1),headY=this.cubeSlot(top).y;
    this.layoutTarget={x:targetX,headY};if(instant){this.body.position.x=targetX;this.head.position.y=headY}
    this.feet.forEach(f=>{f.position.set(f.userData.side*UNIT*.22+(cols===2&&f.userData.side>0?UNIT:0),UNIT*.1,UNIT*.08)});
  }
  highlight(i,on){const c=this.cubes[i];if(!c)return;c.material.emissive.set(on?'#ffffff':'#000000');c.material.emissiveIntensity=on?.35:0}
  wave(seconds=1.6){this.waveUntil=performance.now()/1000+seconds}
  update(dt,t){
    this.layout();const L=this.layoutTarget;this.body.position.x=THREE.MathUtils.damp(this.body.position.x,L.x,8,dt);this.head.position.y=THREE.MathUtils.damp(this.head.position.y,L.headY,10,dt);
    this.cubes.forEach(c=>{const d=c.userData.drop;if(d){d.t=Math.min(1,d.t+dt/(d.arc?.55:.45));const e=d.arc?d.t*d.t*(3-2*d.t):1-Math.pow(1-d.t,3);c.position.lerpVectors(d.from,d.to,e);c.position.y+=Math.sin(Math.PI*d.t)*d.arc;if(d.t>=1){c.position.copy(d.to);c.userData.drop=null;c.userData.landed=performance.now()}}const r=c.userData.recolor;if(r){r.t=Math.min(1,r.t+dt*2);c.material.color.lerpColors(r.from,r.to,r.t);if(r.t>=1)c.userData.recolor=null}});
    const breathe=1+Math.sin(t*2.2+this.seed)*.012;this.body.scale.set(1/Math.sqrt(breathe),breathe,1/Math.sqrt(breathe));
    if(t>this.blinkAt){const k=t-this.blinkAt;const s=k<.08?1-k/.08:k<.16?(k-.08)/.08:1;this.eyes.forEach(e=>e.scale.y=Math.max(.08,s));if(k>.16)this.blinkAt=t+2+Math.random()*3.5}
    this.eyes.forEach(e=>{e.userData.pupil.position.x=Math.sin(t*.7+this.seed)*UNIT*.03});
    const waving=t<this.waveUntil;this.arms.forEach(a=>{const side=a.userData.side,target=waving?side*(2.3+Math.sin(t*14)*.35):side*(.35+Math.sin(t*1.8+this.seed)*.06);a.rotation.z=THREE.MathUtils.damp(a.rotation.z,target,12,dt)});
  }
  // Pal geometries are shared, so only the per-pal materials (cubes, arms, badge) need freeing.
  dispose(){this.group.traverse(o=>{if(o.userData.shared||!o.material)return;o.material.map?.dispose();o.material.dispose()})}
}

// ---------- farm props (refined from the original Math Meadow) ----------
function leafShape(height){const s=new THREE.Shape();s.moveTo(0,0);s.bezierCurveTo(.07,height*.22,.095,height*.54,0,height);s.bezierCurveTo(-.075,height*.56,-.06,height*.2,0,0);return s}
export function makeCarrot(seed=0){
  const g=new THREE.Group(),rand=mulberry(seed+1),height=.9+rand()*.15,width=.25+rand()*.04;
  const profile=[[.018,0],[.22,.13],[.46,.38],[.72,.68],[.94,.91],[1,1.02],[.82,1.09],[.04/width,1.1]].map(([x,y])=>new THREE.Vector2(x*width,y));
  const body=new THREE.Mesh(once('carrotBody',()=>new THREE.LatheGeometry(profile,28)),once('carrotMat',()=>new THREE.MeshPhysicalMaterial({color:'#f07022',roughness:.6,clearcoat:.1})));body.userData.shared=true;body.scale.set(1,height,1);body.castShadow=true;g.add(body);
  for(let i=0;i<5;i++){const ring=mark(new THREE.Mesh(once('groove',()=>new THREE.TorusGeometry(.2,.007,4,20,Math.PI*1.3)),once('grooveMat',()=>new THREE.MeshStandardMaterial({color:'#c0501b',roughness:1}))));const y=.25+i*.14;ring.scale.setScalar((.28+y*.6)*width/.2);ring.rotation.set(Math.PI/2,0,rand()*6);ring.position.y=y*height;g.add(ring)}
  const greens=['#2f7d3f','#3f9a4d','#5cb85c'];for(let i=0;i<7;i++){const leaf=new THREE.Mesh(once(`leaf${i%3}`,()=>new THREE.ShapeGeometry(leafShape(.5+(i%3)*.1),5)),once(`leafMat${i%3}`,()=>new THREE.MeshStandardMaterial({color:greens[i%3],roughness:.8,side:THREE.DoubleSide})));leaf.userData.shared=true;leaf.rotation.set(0,i/7*Math.PI*2,(i-3)*.07);leaf.position.y=1.06*height;leaf.castShadow=true;g.add(leaf)}
  return g;
}
const eggProfile=[[.04,-.34],[.21,-.27],[.3,-.06],[.27,.19],[.16,.34],[.02,.39]].map(([x,y])=>new THREE.Vector2(x,y));
export function makeEgg(i=0){const m=new THREE.Mesh(once('egg',()=>new THREE.LatheGeometry(eggProfile,28)),once(`eggMat${i%2}`,()=>new THREE.MeshPhysicalMaterial({color:i%2?'#e8c18f':'#fff6dc',roughness:.45,clearcoat:.15})));m.userData.shared=true;m.scale.setScalar(.6);m.castShadow=true;const g=new THREE.Group();m.position.y=.2;g.add(m);return g}
export function makeNest(){
  const g=new THREE.Group(),straw=['#8d542d','#b1783f','#6f4329','#c99050'].map(color=>new THREE.MeshStandardMaterial({color,roughness:1}));
  const bed=new THREE.Mesh(new THREE.CylinderGeometry(.62,.66,.08,32),new THREE.MeshStandardMaterial({color:'#a76a35',roughness:1}));bed.position.y=.04;bed.receiveShadow=true;g.add(bed);
  for(let i=0;i<26;i++){const a=i/26*Math.PI*2,r=.56+Math.random()*.16,y=.06+Math.random()*.16,curve=new THREE.CatmullRomCurve3([new THREE.Vector3(Math.cos(a)*r,y,Math.sin(a)*r),new THREE.Vector3(Math.cos(a+.5)*(r+.06),y+.03,Math.sin(a+.5)*(r+.06)),new THREE.Vector3(Math.cos(a+1)*(r-.06),y+.01,Math.sin(a+1)*(r-.06))]);const twig=new THREE.Mesh(new THREE.TubeGeometry(curve,6,.022+Math.random()*.014,5,false),straw[i%4]);twig.castShadow=true;g.add(twig)}
  return g;
}
export function makePlate(){const g=new THREE.Group(),plate=new THREE.Mesh(once('plate',()=>new THREE.CylinderGeometry(.48,.38,.06,32)),once('plateMat',()=>new THREE.MeshPhysicalMaterial({color:'#ffffff',roughness:.2,clearcoat:1})));plate.userData.shared=true;plate.position.y=.03;plate.receiveShadow=true;g.add(plate);return g}
// ---------- small scenery helpers ----------
function mulberry(seed){let a=seed*9301+49297;return()=>{a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}}
export function makeFlower(seed){const g=new THREE.Group(),rand=mulberry(seed),colors=['#ff79a9','#ffd34d','#a98bff','#6bd7ed','#ffffff'],petal=once(`petal${seed%5}`,()=>new THREE.MeshStandardMaterial({color:colors[seed%5],roughness:.6}));const stem=mark(new THREE.Mesh(once('fstem',()=>new THREE.CylinderGeometry(.02,.025,.4,5)),once('fstemMat',()=>new THREE.MeshStandardMaterial({color:'#3f8f4a'}))));stem.position.y=.2;g.add(stem);for(let i=0;i<5;i++){const p=mark(new THREE.Mesh(once('petalGeo',()=>new THREE.SphereGeometry(.07,8,6)),petal));const a=i/5*Math.PI*2;p.position.set(Math.cos(a)*.08,.42,Math.sin(a)*.08);g.add(p)}const c=mark(new THREE.Mesh(once('fcenter',()=>new THREE.SphereGeometry(.05,8,6)),once('fcenterMat',()=>new THREE.MeshStandardMaterial({color:'#ffb703'}))));c.position.y=.43;g.add(c);g.rotation.y=rand()*6;return g}
export {mulberry};
