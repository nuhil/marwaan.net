import * as THREE from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {hydrateIcons} from '../core/icons.js';
import {installAudio,playSfx} from '../core/audio.js';
import {NumberPal,PAL_COLORS,palColor,numberSprite,numberTexture,makeCarrot,makeEgg,makeNest,makePlate} from './math-models.js';
import {buildScenery} from './math-scenery.js';

const $=selector=>document.querySelector(selector);
const reduceMotion=matchMedia('(prefers-reduced-motion: reduce)').matches;
const V=(x,y,z)=>new THREE.Vector3(x,y,z);
const UP=V(0,1,0);
const SPOTS={plaza:V(0,0,0),patch:V(-8.5,0,3.2),farm:V(-4,0,-6.8),picnic:V(8,0,-1.4)};
const STATIONS={
  meet:{spot:'plaza',kicker:'MEET THE PALS'},
  add:{spot:'plaza',kicker:'PAL PARTY · ADD'},
  subtract:{spot:'patch',kicker:'BUNNY SNACK · TAKE AWAY'},
  multiply:{spot:'farm',kicker:'EGG FARM · TIMES'},
  divide:{spot:'picnic',kicker:'FAIR SHARE · DIVIDE'}
};
const WORDS=['zero','one','two','three','four','five','six','seven','eight','nine','ten','eleven','twelve','thirteen','fourteen','fifteen','sixteen','seventeen','eighteen','nineteen','twenty'];
const cap=s=>s[0].toUpperCase()+s.slice(1);

let renderer,scene,camera,controls,scenery,lesson,rory,milly,mixer,chickenActions={},chickenAction=null,rabbitTemplate=null;
let station='meet',run=0,flight=null,last=performance.now(),solved=false,firstTry=true,meetN=3,stars=readStars(),interacted=false;
const pals=[],tweens=[],clickables=[],bursts=[];

// ---------- small helpers ----------
function readStars(){try{return Number(localStorage.getItem('wonder-stars'))||0}catch{return 0}}
function saveStars(){try{localStorage.setItem('wonder-stars',String(stars))}catch{}}
const rand=(a,b)=>a+Math.floor(Math.random()*(b-a+1));
const ease={inOut:t=>t*t*(3-2*t),out:t=>1-Math.pow(1-t,3),linear:t=>t};
function sfx(kind){if(interacted)playSfx(kind)}
function feedback(message){const el=$('#feedback');el.textContent=message;el.classList.add('show');clearTimeout(feedback.timer);feedback.timer=setTimeout(()=>el.classList.remove('show'),Math.max(1800,message.length*60))}

// A tiny promise-based timeline. Every tween belongs to the current round; starting a new round drops them.
function tween({duration=500,delay=0,ease:e=ease.inOut,update}){
  const speed=reduceMotion?.25:1;return new Promise(resolve=>tweens.push({start:performance.now()+delay*speed,duration:Math.max(1,duration*speed),ease:e,update,resolve,round:run}));
}
const wait=ms=>tween({duration:ms,update(){}});
function updateTweens(now){for(let i=tweens.length-1;i>=0;i--){const t=tweens[i];if(t.round!==run){tweens.splice(i,1);continue}const raw=(now-t.start)/t.duration;if(raw<0)continue;const p=Math.min(1,raw);t.update(t.ease(p),p);if(p>=1){tweens.splice(i,1);t.resolve()}}}
function arcTo(object,to,{duration=500,height=1,e=ease.inOut}={}){const from=object.position.clone();return tween({duration,ease:e,update:(k,p)=>{object.position.lerpVectors(from,to,k);object.position.y+=Math.sin(Math.PI*p)*height}})}
function scaleTo(object,to,duration=300,e=ease.out){const from=object.scale.x;return tween({duration,ease:e,update:k=>object.scale.setScalar(THREE.MathUtils.lerp(from,to,k))})}
// forward is +1 for models that face +z (the chicken) and -1 for models that face -z (the rabbit).
function faceTowards(object,target,forward=1){const d=target.clone().sub(object.position);object.userData.yaw=forward>0?Math.atan2(d.x,d.z):Math.atan2(-d.x,-d.z)}
function hopPal(pal,height=.6){const base=.18;return tween({duration:420,update:(k,p)=>{pal.group.position.y=base+Math.sin(Math.PI*p)*height;const s=p<.15||p>.85?.9:1.06;pal.group.scale.set(1/Math.sqrt(s),s,1/Math.sqrt(s))}}).then(()=>pal.group.scale.set(1,1,1))}

// ---------- scene ----------
function setupScene(){
  renderer=new THREE.WebGLRenderer({antialias:true,alpha:true,powerPreference:'high-performance'});
  renderer.setPixelRatio(Math.min(devicePixelRatio,1.75));renderer.setClearColor(0,0);renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=.85;renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFShadowMap;$('#world-canvas').append(renderer.domElement);
  scene=new THREE.Scene();scene.fog=new THREE.Fog(0xa9cde6,45,110);
  camera=new THREE.PerspectiveCamera(42,innerWidth/innerHeight,.05,2000);camera.position.set(0,26,42);
  controls=new OrbitControls(camera,renderer.domElement);controls.enableDamping=true;controls.dampingFactor=.07;controls.enablePan=false;controls.maxPolarAngle=Math.PI*.46;controls.minPolarAngle=Math.PI*.12;
  scenery=buildScenery(scene,renderer,SPOTS,PAL_COLORS);
  scene.add(new THREE.HemisphereLight(0xe8f4ff,0x6b8f4e,.7));
  const sun=new THREE.DirectionalLight(0xfff0d8,3.4);sun.position.copy(scenery.sunDirection).multiplyScalar(30);sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);Object.assign(sun.shadow.camera,{left:-19,right:19,top:19,bottom:-19,near:1,far:80});sun.shadow.bias=-.0004;sun.shadow.normalBias=.02;scene.add(sun);
  const fill=new THREE.DirectionalLight(0xd5ecff,.5);fill.position.set(10,8,14);scene.add(fill);
  lesson=new THREE.Group();scene.add(lesson);
  addEventListener('resize',resize);resize();
}

// ---------- animals (the original Math Meadow models, refined) ----------
function fitModel(model,height){const box=new THREE.Box3().setFromObject(model),size=box.getSize(V(0,0,0)),center=box.getCenter(V(0,0,0)),k=height/size.y,wrap=new THREE.Group();model.position.sub(center);model.position.y+=size.y/2;model.position.multiplyScalar(k);model.scale.multiplyScalar(k);wrap.add(model);wrap.inner=model;model.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true}});return wrap}
function furTexture(){const c=document.createElement('canvas');c.width=c.height=256;const g=c.getContext('2d');g.fillStyle='#8d8d8d';g.fillRect(0,0,256,256);for(let i=0;i<4200;i++){const s=105+Math.random()*95;g.strokeStyle=`rgba(${s},${s},${s},${.12+Math.random()*.22})`;g.lineWidth=.35+Math.random()*.8;const x=Math.random()*256,y=Math.random()*256;g.beginPath();g.moveTo(x,y);g.quadraticCurveTo(x+Math.random()*5-2.5,y+2+Math.random()*5,x+Math.random()*8-4,y+5+Math.random()*8);g.stroke()}const t=new THREE.CanvasTexture(c);t.wrapS=t.wrapT=THREE.RepeatWrapping;t.repeat.set(5,5);return t}
function finishRabbit(model){const fur=furTexture();model.traverse(o=>{if(!o.isMesh||!o.material)return;const name=(o.material.name||'').toLowerCase();o.material=o.material.clone();if(name.includes('coat')){o.material.roughness=.93;o.material.bumpMap=fur;o.material.bumpScale=.035}else if(name.includes('iris')||name==='black'||name==='white'){o.material.roughness=name.includes('iris')?.08:.18;o.material.metalness=0}else if(name.includes('ear'))o.material.color.set('#f0aaa9')})}
async function loadAnimals(){
  const loader=new GLTFLoader(),[hen,bunny]=await Promise.all([loader.loadAsync('assets/math/chicken.glb'),loader.loadAsync('assets/math/rabbit.glb')]);
  finishRabbit(bunny.scene);rabbitTemplate=fitModel(bunny.scene,1.15);
  rory=makeBunny();scene.add(rory);
  milly=fitModel(hen.scene,1.5);milly.traverse(o=>{if(o.isMesh&&o.material){o.material=o.material.clone();o.material.roughness=.62;o.material.emissive?.set('#2a2a2a');o.material.emissiveIntensity=.6}});scene.add(milly);
  mixer=new THREE.AnimationMixer(milly.inner);hen.animations.forEach(clip=>chickenActions[clip.name]=mixer.clipAction(clip));
  homeAnimals();
}
// Bunny clones share the template's geometry and materials, so they are never disposed.
function makeBunny(){const b=rabbitTemplate.clone(true);b.userData.sharedRoot=true;b.userData.yaw=0;return b}
function chicken(name,fade=.18){const next=chickenActions[name]||chickenActions.idle;if(!next||next===chickenAction)return;next.reset().fadeIn(fade).play();chickenAction?.fadeOut(fade);chickenAction=next}
function homeAnimals(){
  if(!rory)return;
  rory.position.copy(SPOTS.patch).add(V(-3.6,0,.8));rory.scale.set(1,1,1);faceTowards(rory,SPOTS.patch.clone().add(V(0,0,.8)),-1);rory.rotation.y=rory.userData.yaw;
  milly.position.copy(SPOTS.farm).add(V(-4.2,0,.9));faceTowards(milly,SPOTS.farm.clone().add(V(0,0,.9)),1);milly.rotation.y=milly.userData.yaw;chicken('idle');
}
async function hopBunny(bunny,to,{height=.45}={}){
  faceTowards(bunny,to,-1);const steps=Math.max(1,Math.ceil(bunny.position.distanceTo(to)/1.15)),start=bunny.position.clone();
  for(let i=1;i<=steps;i++){
    const target=start.clone().lerp(to,i/steps);
    await tween({duration:140,update:k=>bunny.scale.set(1+.08*k,1-.14*k,1+.08*k)});
    const from=bunny.position.clone();
    await tween({duration:330,update:(k,p)=>{bunny.position.lerpVectors(from,target,k);bunny.position.y=Math.sin(Math.PI*p)*height;const s=1+Math.sin(Math.PI*p)*.12;bunny.scale.set(1/Math.sqrt(s),s,1/Math.sqrt(s))}});
    await tween({duration:110,update:k=>bunny.scale.set(1+.08*(1-k),1-.14*(1-k),1+.08*(1-k))});
  }
}
async function walkChicken(to,speed=2.2){faceTowards(milly,to,1);chicken('walk');const from=milly.position.clone();await tween({duration:from.distanceTo(to)/speed*1000,ease:ease.linear,update:k=>milly.position.lerpVectors(from,to,k)});chicken('idle')}
function mouthOf(bunny){const f=V(0,0,-1).applyAxisAngle(UP,bunny.rotation.y);return bunny.position.clone().addScaledVector(f,.42).add(V(0,.5,0))}

// ---------- confetti, crumbs and floating numbers ----------
function particles(at,count,colors,{size=[.12,.07],speed=5,lift=4,life=2.2,box=false}={}){
  const geo=box?new THREE.SphereGeometry(size[0]/2,6,4):new THREE.PlaneGeometry(size[0],size[1]),mats=colors.map(color=>new THREE.MeshStandardMaterial({color,side:THREE.DoubleSide,roughness:.6})),group=new THREE.Group();
  for(let i=0;i<count;i++){const m=new THREE.Mesh(geo,mats[i%mats.length]);m.position.copy(at);m.userData.v=V((Math.random()-.5)*speed,lift*(.6+Math.random()*.8),(Math.random()-.5)*speed);m.userData.spin=V(Math.random()*8,Math.random()*8,0);group.add(m)}
  scene.add(group);bursts.push({group,life,geo,mats});
}
const confetti=at=>particles(at,80,['#ff6f61','#ffd34d','#2ec4b6','#9b7bff','#3fa7ff','#ff8fab']);
const crumbs=at=>particles(at,14,['#f07022','#ffa24d'],{size:[.07],speed:2,lift:1.5,life:.9,box:true});
function updateBursts(dt){for(let i=bursts.length-1;i>=0;i--){const b=bursts[i];b.life-=dt;b.group.children.forEach(m=>{m.userData.v.y-=9*dt;m.position.addScaledVector(m.userData.v,dt);if(m.position.y<.03){m.position.y=.03;m.userData.v.multiplyScalar(.35)}m.rotation.x+=m.userData.spin.x*dt;m.rotation.y+=m.userData.spin.y*dt});if(b.life<=0){scene.remove(b.group);b.geo.dispose();b.mats.forEach(m=>m.dispose());bursts.splice(i,1)}}}
function floatNumber(n,at,color){const s=numberSprite(n,{ring:color,scale:.6});s.position.copy(at);lesson.add(s);arcTo(s,at.clone().add(V(0,1,0)),{duration:900,height:0,e:ease.out}).then(()=>tween({duration:500,update:k=>s.material.opacity=1-k})).then(()=>{lesson.remove(s);s.material.map.dispose();s.material.dispose()})}

// ---------- camera ----------
function viewFor(){
  const narrow=innerWidth<760,portrait=innerHeight>innerWidth,far=portrait?1.6:narrow?1.25:1,where=STATIONS[station].spot,spot=SPOTS[where];
  if(where==='plaza'){const h=Math.max(2.4,...pals.map(p=>p.height+.9));return{target:spot.clone().add(V(0,h*.45,0)),position:spot.clone().add(V(0,h*.5+2.6,(h*1.05+6.4)*far))}}
  const w=where==='farm'?Math.max(5.5,lesson.userData.width||5):where==='picnic'?Math.max(6.5,lesson.userData.width||6):6.5;
  return{target:spot.clone().add(V(0,.75,.4)),position:spot.clone().add(V(.6,3.8+w*.12,(w*.9+3.8)*far))};
}
function flyTo(view,duration=1400){flight={from:camera.position.clone(),to:view.position,targetFrom:controls.target.clone(),target:view.target,start:performance.now(),duration:reduceMotion?1:duration}}
function configureControls(){const d=camera.position.distanceTo(controls.target);controls.minDistance=d*.55;controls.maxDistance=d*1.45}

// ---------- question card and answers ----------
function setQuestion(title,equation,hint){$('#q-kicker').textContent=STATIONS[station].kicker;$('#q-title').textContent=title;$('#q-equation').innerHTML=equation;$('#q-hint').textContent=hint}
const num=(n,color)=>`<span class="eq-num" style="--c:${color||palColor(Math.min(20,Math.max(1,n)))}">${n}</span>`;
const QUESTION='<span class="eq-q">?</span>';
function setActions(list){const host=$('#actions');host.replaceChildren();list.forEach(([label,fn,cls=''])=>{const b=document.createElement('button');b.type='button';b.className=`action-btn ${cls}`;b.innerHTML=label;b.onclick=()=>{sfx('tap');fn()};host.append(b)})}
function showChoices(answer,onCorrect,onWrong){
  const host=$('#answers');host.replaceChildren();const values=new Set([answer]);while(values.size<3){const n=Math.max(0,answer+rand(-3,3));if(n!==answer)values.add(n)}
  [...values].sort(()=>Math.random()-.5).forEach(n=>{
    const b=document.createElement('button');b.type='button';b.className='answer-bubble';b.textContent=n;b.style.setProperty('--c',palColor(Math.min(20,Math.max(1,n))));b.setAttribute('aria-label',`Answer ${n}`);
    b.onclick=()=>{if(solved)return;if(n===answer){solved=true;b.classList.add('good');if(firstTry){stars++;saveStars();$('#stars').textContent=stars;$('.star-pill').classList.add('pop');setTimeout(()=>$('.star-pill').classList.remove('pop'),600)}sfx('correct');feedback(firstTry?`${n} is right! ⭐`:`${n} is right!`);host.querySelectorAll('button').forEach(x=>x!==b&&(x.disabled=true));onCorrect()}else{firstTry=false;b.classList.add('shake');setTimeout(()=>b.classList.remove('shake'),450);sfx('wrong');onWrong?.()}};
    host.append(b)});
}
function revealEquation(answer){const eq=$('#q-equation');eq.innerHTML=eq.innerHTML.replace(QUESTION,num(answer));eq.classList.add('solved')}

// ---------- rounds ----------
function disposeObject(o){if(o.userData.palRoot||o.userData.sharedRoot||o.userData.pal)return;if(!o.userData.shared){if(o.geometry&&!o.isSprite)o.geometry.dispose();const mats=Array.isArray(o.material)?o.material:o.material?[o.material]:[];mats.forEach(m=>{m.map?.dispose();m.dispose()})}o.children.forEach(disposeObject)}
function clearLesson(){
  run++;solved=false;firstTry=true;clickables.length=0;pals.splice(0).forEach(p=>p.dispose());
  while(lesson.children.length){const o=lesson.children.pop();disposeObject(o)}
  lesson.userData.width=0;$('#answers').replaceChildren();setActions([]);$('#q-equation').classList.remove('solved');homeAnimals();
}
function startRound(){clearLesson();({meet:roundMeet,add:roundAdd,subtract:roundSubtract,multiply:roundMultiply,divide:roundDivide})[station]();flyTo(viewFor(),1300)}
function addPal(n,x){const p=new NumberPal(n);p.group.userData.palRoot=true;p.group.position.set(SPOTS.plaza.x+x,.18,SPOTS.plaza.z);lesson.add(p.group);pals.push(p);return p}
const cubeTop=(pal,i)=>pal.cubes[i].getWorldPosition(V(0,0,0)).add(V(0,0,.6));

// Meet the Pals: build a pal up and down, and tap it to count its blocks.
function roundMeet(){
  const pal=addPal(meetN,0);let counted=0;
  const describe=()=>{const n=pal.count;setQuestion(`Hi! I’m ${WORDS[n]}.`,num(n),n>10?`I’m one ten and ${WORDS[n-10]} more. Tap me to count my blocks!`:'Tap me to count my blocks. Use + and − to change me!')};
  const recount=()=>{counted=0;pal.cubes.forEach((_,i)=>pal.highlight(i,false))};
  const change=delta=>{
    const n=pal.count+delta;if(n<1||n>20)return feedback(n<1?'One is the smallest pal here!':'Twenty is as tall as we grow today!');recount();
    if(delta>0)pal.addCube();
    else{const popped=pal.popCube();lesson.add(popped.mesh);popped.mesh.position.copy(popped.world);const away=popped.world.clone().add(V((Math.random()-.5)*3,-popped.world.y+.3,2.2));arcTo(popped.mesh,away,{duration:650,height:1.4}).then(()=>scaleTo(popped.mesh,.001,250)).then(()=>{lesson.remove(popped.mesh);popped.mesh.material.dispose()})}
    sfx('pop');meetN=n;pal.recolor(n);describe();hopPal(pal,.25);flyTo(viewFor(),700)};
  pal.onTap=()=>{if(counted>=pal.count)recount();const i=counted++;pal.highlight(i,true);floatNumber(i+1,cubeTop(pal,i),palColor(pal.count));sfx('pop');if(counted===pal.count){pal.wave();hopPal(pal,.4);feedback(`${pal.count}! You counted all my blocks!`)}};
  describe();setActions([['−',()=>change(-1),'round minus'],['+',()=>change(1),'round plus'],['New pal',()=>{meetN=rand(1,20);startRound()}]]);
}

// Pal Party: two pals join together into one new pal.
function roundAdd(){
  const a=rand(1,6),b=rand(1,Math.min(5,10-a)),total=a+b,round=run,left=addPal(a,-1.5),right=addPal(b,1.5);let joined=false;
  const plus=numberSprite('+',{bg:'#ffffff',fg:'#ff6f61',scale:.7});plus.position.set(SPOTS.plaza.x,1.4,SPOTS.plaza.z+.4);lesson.add(plus);
  setQuestion(`${cap(WORDS[a])} meets ${WORDS[b]}!`,`${num(a)} + ${num(b)} = ${QUESTION}`,'How many blocks will the new pal have? Tap Join to watch!');
  const party=()=>{confetti(V(SPOTS.plaza.x,left.height+.8,SPOTS.plaza.z));left.wave(2);hopPal(left,.5);setActions([['Next party ›',startRound,'next']])};
  const join=async()=>{
    if(joined)return;joined=true;setActions([]);plus.visible=false;await Promise.all([hopPal(left,.5),hopPal(right,.5)]);
    for(let i=0;i<b;i++){if(round!==run)return;const p=right.popCube();left.addCube({fromWorld:p.world});p.mesh.material.dispose();sfx('pop');await wait(330)}
    lesson.remove(right.group);right.dispose();pals.splice(pals.indexOf(right),1);
    await tween({duration:500,update:k=>left.group.position.x=SPOTS.plaza.x-1.5*(1-k)});left.recolor(total);flyTo(viewFor(),700);
    if(solved)party();else{left.wave(2);hopPal(left,.4);setQuestion(`Now they are one pal!`,`${num(a)} + ${num(b)} = ${QUESTION}`,'Count the blocks. How many are there now?');setActions([['New party',startRound]])}};
  const countHint=async()=>{let k=0;for(const pal of [left,right])for(let i=0;i<pal.count;i++){if(round!==run)return;pal.highlight(i,true);floatNumber(++k,cubeTop(pal,i),'#ff6f61');await wait(380);pal.highlight(i,false)}};
  showChoices(total,()=>{revealEquation(total);if(joined)party();else join()},()=>{feedback('Let’s count all the blocks together!');countHint()});
  setActions([['Join them!',join,'primary'],['New party',startRound]]);
}

// Bunny Snack: Rory munches some carrots. How many are left?
async function roundSubtract(){
  const total=rand(4,9),eat=rand(1,Math.min(4,total-1)),left=total-eat,round=run,carrots=[],cols=Math.min(5,total),rows=Math.ceil(total/cols);
  for(let i=0;i<total;i++){const c=makeCarrot(i+total),row=Math.floor(i/cols),col=i%cols;c.scale.setScalar(.82);c.position.copy(SPOTS.patch).add(V(.6+(col-(cols-1)/2)*1.05,.12,(row-(rows-1)/2)*1.3));c.rotation.y=i%2?-.25:.25;lesson.add(c);carrots.push(c)}
  const equation=`${num(total,'#f07022')} − ${num(eat,'#57b846')} = ${QUESTION}`;
  setQuestion(`Rory finds ${total} carrots.`,equation,`Rory is hungry! Watch her eat ${eat}.`);setActions([['Watch again',startRound]]);
  await wait(900);if(round!==run||!rory)return;
  for(let i=0;i<eat;i++){
    const carrot=carrots[i],stand=carrot.position.clone().add(V(-.95,0,.15));stand.y=0;await hopBunny(rory,stand);if(round!==run)return;faceTowards(rory,carrot.position,-1);
    await tween({duration:260,update:k=>{carrot.position.y=.12+k*.5;carrot.rotation.z=-k*1.2}});const mouth=mouthOf(rory);await arcTo(carrot,mouth,{duration:260,height:.2});
    for(let bite=0;bite<3;bite++){if(round!==run)return;sfx('chomp');crumbs(mouth.clone());await scaleTo(carrot,[.56,.32,.001][bite],180);await tween({duration:80,update:(k,p)=>rory.scale.y=1-Math.sin(Math.PI*p)*.08});await wait(60)}
    lesson.remove(carrot);
  }
  await hopBunny(rory,SPOTS.patch.clone().add(V(-3.6,0,.8)));if(round!==run)return;faceTowards(rory,SPOTS.patch.clone().add(V(0,0,.8)),-1);
  setQuestion(`Rory ate ${eat}. How many are left?`,equation,'Count the carrots still in the patch.');
  const remaining=carrots.slice(eat);
  showChoices(left,async()=>{revealEquation(left);for(let i=0;i<remaining.length;i++){if(round!==run)return;const c=remaining[i];floatNumber(i+1,c.position.clone().add(V(0,1.4,0)),'#f07022');tween({duration:300,update:(k,p)=>c.position.y=.12+Math.sin(Math.PI*p)*.4});await wait(260)}confetti(SPOTS.patch.clone().add(V(.6,1.5,0)));setActions([['More carrots ›',startRound,'next']])},()=>feedback('Count only the carrots still in the ground.'));
}

// Egg Farm: Milly lays the same number of eggs in every nest.
async function roundMultiply(){
  const nests=rand(2,4),each=rand(2,4),total=nests*each,round=run,gap=1.75,spots=[];lesson.userData.width=nests*gap+2;
  for(let i=0;i<nests;i++){const nest=makeNest();nest.position.copy(SPOTS.farm).add(V((i-(nests-1)/2)*gap,0,.6));lesson.add(nest);const sign=numberSprite(0,{ring:'#ffb627',scale:.5});sign.position.copy(nest.position).add(V(0,1.35,0));lesson.add(sign);spots.push({nest,sign,count:0})}
  const equation=`${num(nests,'#a76a35')} × ${num(each,'#ffb627')} = ${QUESTION}`;
  setQuestion(`Milly lays ${each} eggs in each nest.`,equation,`${nests} nests with ${each} eggs in each. Watch and count!`);setActions([['Watch again',startRound]]);
  await wait(900);if(round!==run||!milly)return;
  const slot=k=>{const a=k/each*Math.PI*2+.4;return V(Math.cos(a)*.26,.08,Math.sin(a)*.26)};let laid=0;
  for(const spot of spots){
    await walkChicken(spot.nest.position.clone().add(V(-.15,0,-.35)));if(round!==run)return;
    for(let k=0;k<each;k++){
      chicken('butt_slide',.12);await wait(240);if(round!==run)return;
      const egg=makeEgg(laid++);egg.position.copy(milly.position).add(V(0,.35,0));egg.scale.setScalar(.01);lesson.add(egg);scaleTo(egg,1,200);
      await arcTo(egg,spot.nest.position.clone().add(slot(k)),{duration:320,height:.35,e:ease.out});sfx('pop');
      spot.count++;spot.sign.material.map.dispose();spot.sign.material.map=numberTexture(spot.count,{ring:'#ffb627'});chicken('idle',.12);await wait(110);
    }
  }
  await walkChicken(SPOTS.farm.clone().add(V(nests/2*gap+1.2,0,1.3)));if(round!==run)return;faceTowards(milly,camera.position,1);
  setQuestion('How many eggs did Milly lay?',equation,`Count by ${each}s, one nest at a time!`);
  showChoices(total,async()=>{revealEquation(total);chicken('jump');let sum=0;for(const spot of spots){if(round!==run)return;sum+=each;floatNumber(sum,spot.nest.position.clone().add(V(0,1.9,0)),'#ffb627');sfx('pop');await wait(520)}confetti(SPOTS.farm.clone().add(V(0,1.6,.6)));chicken('idle');setActions([['More eggs ›',startRound,'next']])},
    ()=>feedback(`Try counting by ${each}s: ${Array.from({length:nests},(_,i)=>(i+1)*each).join(', ')}…`));
}

// Fair Share: tap the bunnies to hand out carrots so everyone gets the same.
function roundDivide(){
  const k=rand(2,4),each=rand(2,4),total=k*each,round=run,spread=1.9,bunnies=[],given=Array(k).fill(0),pile=[];lesson.userData.width=k*spread+1.5;
  if(!rabbitTemplate){setQuestion('The bunnies are on their way…','','Try again in a moment.');return}
  for(let i=0;i<k;i++){
    const x=(i-(k-1)/2)*spread,b=makeBunny();b.scale.setScalar(.8);b.position.copy(SPOTS.picnic).add(V(x,0,-.7));faceTowards(b,b.position.clone().add(V(0,0,1)),-1);b.rotation.y=b.userData.yaw;lesson.add(b);
    const plate=makePlate();plate.position.copy(SPOTS.picnic).add(V(x,0,.35));lesson.add(plate);
    const hit=new THREE.Mesh(new THREE.CylinderGeometry(.7,.7,1.6,12),new THREE.MeshBasicMaterial({visible:false}));hit.position.copy(b.position).add(V(0,.8,.4));hit.userData.onTap=()=>give(i);lesson.add(hit);clickables.push(hit);
    bunnies.push({bunny:b,plate});
  }
  for(let i=0;i<total;i++){const c=makeCarrot(i+40);c.scale.setScalar(.6);c.rotation.set(0,0,Math.PI/2);c.position.copy(SPOTS.picnic).add(V(-.9+(i%6)*.36,.14+Math.floor(i/6)*.18,1.75+(i%2)*.06));lesson.add(c);pile.push(c)}
  const equation=`${num(total,'#f07022')} ÷ ${num(k,'#9b7bff')} = ${QUESTION}`;
  setQuestion(`Share ${total} carrots with ${k} bunnies.`,equation,'Tap a bunny to give it one carrot. Keep it fair!');
  let busy=false;
  const give=async(i,auto=false)=>{
    if(busy||!pile.length||round!==run)return;
    if(given[i]>Math.min(...given)){const b=bunnies[i].bunny,yaw=b.userData.yaw;sfx('wrong');feedback('Give the other bunnies one first!');await tween({duration:500,update:(q,p)=>{b.rotation.y=yaw+Math.sin(p*Math.PI*6)*.35*(1-p);b.userData.yaw=b.rotation.y}});b.userData.yaw=yaw;return}
    busy=true;const carrot=pile.pop(),slot=given[i]++,plate=bunnies[i].plate.position,target=plate.clone().add(V(-.18+(slot%3)*.18,.1+Math.floor(slot/3)*.12,(slot%2)*.08));sfx('pop');
    await arcTo(carrot,target,{duration:auto?380:480,height:1.1});carrot.rotation.set(0,(slot-1)*.3,Math.PI/2);
    const b=bunnies[i].bunny;tween({duration:300,update:(q,p)=>b.position.y=Math.sin(Math.PI*p)*.3});busy=false;
    if(!pile.length)finished()};
  const finished=async()=>{
    clickables.length=0;setActions([]);await wait(400);if(round!==run)return;bunnies.forEach(({bunny},j)=>tween({delay:j*120,duration:420,update:(q,p)=>bunny.position.y=Math.sin(Math.PI*p)*.5}));
    setQuestion('Every bunny has the same!',equation,'How many carrots did each bunny get?');
    showChoices(each,()=>{revealEquation(each);confetti(SPOTS.picnic.clone().add(V(0,1.5,0)));setActions([['Share again ›',startRound,'next']])},()=>feedback('Count the carrots on one plate.'))};
  setActions([['Share for me',async()=>{for(let j=0;pile.length&&round===run;j=(j+1)%k){await give(j,true);await wait(120)}},'primary'],['New share',startRound]]);
}

// ---------- picking ----------
const tapTargets=()=>[...clickables,...pals.filter(p=>p.onTap).flatMap(p=>p.cubes)];
function wirePicking(){
  const ray=new THREE.Raycaster(),pointer=new THREE.Vector2(),canvas=renderer.domElement;let down=null;
  const aim=e=>{const r=canvas.getBoundingClientRect();pointer.set((e.clientX-r.left)/r.width*2-1,-(e.clientY-r.top)/r.height*2+1);ray.setFromCamera(pointer,camera);return ray.intersectObjects(tapTargets(),false)[0]?.object};
  canvas.addEventListener('pointerdown',e=>down={x:e.clientX,y:e.clientY});
  canvas.addEventListener('pointerup',e=>{if(!down||Math.hypot(e.clientX-down.x,e.clientY-down.y)>8)return;down=null;const o=aim(e);(o?.userData.onTap||o?.userData.pal?.onTap)?.()});
  canvas.addEventListener('pointermove',e=>{if(e.pointerType==='mouse')canvas.style.cursor=aim(e)?'pointer':''});
}

// ---------- loop ----------
function resize(){renderer.setSize(innerWidth,innerHeight);camera.aspect=innerWidth/innerHeight;camera.fov=innerHeight>innerWidth?52:42;camera.updateProjectionMatrix();if(lesson&&!flight)flyTo(viewFor(),400)}
function animate(now=0){
  requestAnimationFrame(animate);if(document.hidden)return;
  const dt=Math.min(.05,Math.max(0,(now-last)/1000)),t=now/1000;last=now;
  updateTweens(performance.now());updateBursts(dt);mixer?.update(dt);pals.forEach(p=>p.update(dt,t));
  for(const a of [rory,milly,...lesson.children])if(a?.userData.yaw!==undefined)a.rotation.y=THREE.MathUtils.damp(a.rotation.y,a.userData.yaw,10,dt);
  if(!reduceMotion)scenery.update(t,dt);
  scenery.hideNear(camera);
  if(flight){const p=THREE.MathUtils.clamp((performance.now()-flight.start)/flight.duration,0,1),e=ease.inOut(p);camera.position.lerpVectors(flight.from,flight.to,e);controls.target.lerpVectors(flight.targetFrom,flight.target,e);camera.lookAt(controls.target);if(p===1){flight=null;configureControls();controls.update()}}
  else controls.update();
  renderer.render(scene,camera);
}

function selectStation(next){station=next;document.querySelectorAll('.station-btn').forEach(x=>{const on=x.dataset.station===station;x.classList.toggle('active',on);x.setAttribute('aria-pressed',String(on))})}
function wireUI(){
  addEventListener('pointerdown',()=>interacted=true,{once:true,capture:true});addEventListener('keydown',()=>interacted=true,{once:true,capture:true});
  $('#stars').textContent=stars;
  document.querySelectorAll('.station-btn').forEach(b=>b.onclick=()=>{selectStation(b.dataset.station);history.replaceState(null,'',`#${station}`);sfx('tap');startRound()});
}
async function boot(){
  hydrateIcons();installAudio({musicButton:$('#music-toggle'),theme:'math'});wireUI();wirePicking();
  const fromHash=location.hash.slice(1);if(STATIONS[fromHash])selectStation(fromHash);
  await Promise.race([document.fonts.load('900 64px Nunito'),new Promise(r=>setTimeout(r,2000))]).catch(()=>{});
  await loadAnimals().catch(error=>console.error('Animal models failed to load',error));
  $('#load-status').classList.add('done');startRound();
}

try{setupScene();animate();boot().catch(error=>{console.error(error);$('#fallback').hidden=false;$('#load-status').classList.add('done')})}
catch(error){console.error(error);$('#fallback').hidden=false;$('#load-status').classList.add('done')}
