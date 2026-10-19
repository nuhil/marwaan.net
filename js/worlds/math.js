import * as THREE from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {hydrateIcons} from '../core/icons.js';
import {installAudio,playSfx} from '../core/audio.js';

const $=s=>document.querySelector(s),actions=$('#actions');
let renderer,scene,camera,controls,lesson,stars=Number(localStorage.getItem('wonder-stars')||0),mode='add',solved=false,chicken,rabbit,mixer,chickenActions={},currentChickenAction,tweens=[],taskTimers=[],lastFrame=performance.now();
$('#points').textContent=stars;

try{setup();boot()}catch(error){console.error(error);$('#fallback').hidden=false;$('#math-loading').classList.add('done')}

function setup(){
  renderer=new THREE.WebGLRenderer({antialias:true,alpha:true,powerPreference:'high-performance'});renderer.setPixelRatio(Math.min(devicePixelRatio,1.7));renderer.setSize(innerWidth,innerHeight);renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.05;renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFShadowMap;$('#world-canvas').append(renderer.domElement);
  scene=new THREE.Scene();scene.fog=new THREE.Fog(0x8ccfbd,15,34);camera=new THREE.PerspectiveCamera(44,innerWidth/innerHeight,.05,80);camera.position.set(8,5.5,13);
  controls=new OrbitControls(camera,renderer.domElement);controls.enableDamping=true;controls.enablePan=false;controls.target.set(0,.65,0);controls.minDistance=5;controls.maxDistance=19;controls.maxPolarAngle=Math.PI*.47;controls.minPolarAngle=Math.PI*.2;
  scene.add(new THREE.HemisphereLight(0xeefcff,0x3c682f,2.1));const sun=new THREE.DirectionalLight(0xfff2cd,3.5);sun.position.set(-7,13,7);sun.castShadow=true;sun.shadow.mapSize.set(1024,1024);sun.shadow.camera.left=-12;sun.shadow.camera.right=12;sun.shadow.camera.top=12;sun.shadow.camera.bottom=-12;scene.add(sun);const fill=new THREE.DirectionalLight(0xd8f5ff,1.8);fill.position.set(5,5,8);scene.add(fill);
  buildMeadow();lesson=new THREE.Group();scene.add(lesson);addEventListener('resize',resize);resize();animate();
}

async function boot(){
  hydrateIcons();installAudio({musicButton:$('#music-toggle'),theme:'math'});wireUI();
  const loader=new GLTFLoader(),[hen,bunny]=await Promise.all([loader.loadAsync('assets/math/chicken.glb'),loader.loadAsync('assets/math/rabbit.glb')]);
  chicken=prepareModel(hen.scene,2.25);chicken.traverse(o=>{if(o.isMesh&&o.material){o.material=o.material.clone();o.material.roughness=.62;o.material.emissive?.set(0x151515);o.material.emissiveIntensity=.7}});chicken.rotation.y=Math.PI*.52;chicken.position.set(-3,-.02,.2);scene.add(chicken);if(hen.animations.length){mixer=new THREE.AnimationMixer(chicken);hen.animations.forEach(clip=>chickenActions[clip.name]=mixer.clipAction(clip));playChicken('idle')}
  rabbit=prepareModel(bunny.scene,1.58);finishRabbit(rabbit);rabbit.rotation.y=-Math.PI*.42;rabbit.position.set(-3,-.04,.2);scene.add(rabbit);
  build(mode);$('#math-loading').classList.add('done');
}

function prepareModel(model,targetHeight){const box=new THREE.Box3().setFromObject(model),size=box.getSize(new THREE.Vector3()),center=box.getCenter(new THREE.Vector3());model.position.sub(center);model.position.y+=size.y/2;const scale=targetHeight/size.y;model.scale.setScalar(scale);model.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true;if(!o.material||!o.material.color)o.material=new THREE.MeshStandardMaterial({color:0xd8b18a,roughness:.72})}});return model}

function makeFiberTexture(){
  const canvas=document.createElement('canvas');canvas.width=256;canvas.height=256;const c=canvas.getContext('2d');c.fillStyle='#8d8d8d';c.fillRect(0,0,256,256);
  for(let i=0;i<4200;i++){const shade=105+Math.random()*95;c.strokeStyle=`rgba(${shade},${shade},${shade},${.12+Math.random()*.22})`;c.lineWidth=.35+Math.random()*.8;const x=Math.random()*256,y=Math.random()*256;c.beginPath();c.moveTo(x,y);c.quadraticCurveTo(x+Math.random()*5-2.5,y+2+Math.random()*5,x+Math.random()*8-4,y+5+Math.random()*8);c.stroke()}
  const texture=new THREE.CanvasTexture(canvas);texture.wrapS=texture.wrapT=THREE.RepeatWrapping;texture.repeat.set(5,5);texture.colorSpace=THREE.NoColorSpace;return texture;
}

function finishRabbit(model){
  const fur=makeFiberTexture();
  model.traverse(o=>{if(!o.isMesh||!o.material)return;const name=(o.material.name||'').toLowerCase();o.material=o.material.clone();if(name.includes('coat')){o.material.roughness=.93;o.material.bumpMap=fur;o.material.bumpScale=.035;o.material.color.multiplyScalar(.94)}else if(name.includes('iris')||name==='black'||name==='white'){o.material.roughness=name.includes('iris')?.08:.18;o.material.metalness=0;o.material.envMapIntensity=1.4}else if(name.includes('ear')){o.material.roughness=.82;o.material.color.set(0xf0aaa9)}o.material.needsUpdate=true});
  const nose=model.getObjectByName('Pet nose');if(nose){const points=[];for(const side of [-1,1])for(let i=0;i<3;i++){points.push(new THREE.Vector3(.035,(i-1)*.018,side*.018),new THREE.Vector3(.11+(i===1?.035:0),(i-1)*.045,side*(.19+i*.025)))}const whiskers=new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(points),new THREE.LineBasicMaterial({color:0x4a443f,transparent:true,opacity:.72}));nose.add(whiskers)}
  const shadow=new THREE.Mesh(new THREE.CircleGeometry(.72,40),new THREE.MeshBasicMaterial({color:0x244f35,transparent:true,opacity:.18,depthWrite:false}));shadow.rotation.x=-Math.PI/2;shadow.scale.set(1.35,.72,1);shadow.position.set(.05,.015,.02);model.add(shadow);
}
function playChicken(name){const next=chickenActions[name]||chickenActions.idle;if(!next||next===currentChickenAction)return;next.reset().fadeIn(.16).play();currentChickenAction?.fadeOut(.16);currentChickenAction=next}

function buildMeadow(){
  const ground=new THREE.Mesh(new THREE.CircleGeometry(23,96),new THREE.MeshStandardMaterial({color:0x58a86e,roughness:.95}));ground.rotation.x=-Math.PI/2;ground.position.y=-.08;ground.receiveShadow=true;scene.add(ground);
  const path=new THREE.Mesh(new THREE.RingGeometry(5.7,8.8,80,1,Math.PI*.05,Math.PI*.9),new THREE.MeshStandardMaterial({color:0xdabf88,roughness:1}));path.rotation.x=-Math.PI/2;path.position.y=-.065;path.rotation.z=-Math.PI*.05;scene.add(path);
  const barn=new THREE.Group(),red=new THREE.MeshStandardMaterial({color:0xa9433d,roughness:.8}),white=new THREE.MeshStandardMaterial({color:0xf2e5c8,roughness:.8});const wall=new THREE.Mesh(new THREE.BoxGeometry(5,3.4,3.2),red);wall.position.y=1.7;barn.add(wall);const roof=new THREE.Mesh(new THREE.CylinderGeometry(3.2,3.2,5.6,3,1,false,Math.PI/2),new THREE.MeshStandardMaterial({color:0x63352f,roughness:.85}));roof.rotation.z=Math.PI/2;roof.rotation.y=Math.PI/2;roof.position.y=3.8;barn.add(roof);const door=new THREE.Mesh(new THREE.BoxGeometry(1.7,2.4,.12),white);door.position.set(0,1.2,1.65);barn.add(door);barn.position.set(-10,0,-7);barn.rotation.y=.26;barn.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true}});scene.add(barn);
  const wood=new THREE.MeshStandardMaterial({color:0xd9b074,roughness:.9});for(let side of [-1,1])for(let i=0;i<8;i++){const post=new THREE.Mesh(new THREE.CylinderGeometry(.08,.1,1.25,8),wood);post.position.set(side*(6.7+i*1.25),.55,-4.5);scene.add(post)}for(let side of [-1,1])for(let y of [.35,.85]){const rail=new THREE.Mesh(new THREE.BoxGeometry(9,.09,.12),wood);rail.position.set(side*10.8,y,-4.5);scene.add(rail)}
  for(let i=0;i<42;i++){const blade=new THREE.Mesh(new THREE.ConeGeometry(.035,.35,5),new THREE.MeshStandardMaterial({color:i%2?0x65bd62:0x3d935a}));const a=Math.random()*Math.PI*2,r=6+Math.random()*15;blade.position.set(Math.cos(a)*r,.12,Math.sin(a)*r);scene.add(blade)}
}

function wireUI(){document.querySelectorAll('.story-tab').forEach(button=>button.onclick=()=>{document.querySelectorAll('.story-tab').forEach(x=>x.classList.toggle('active',x===button));mode=button.dataset.mode;build(mode);playSfx('tap')});$('#new-story').onclick=()=>build(mode)}
function clearLesson(){taskTimers.forEach(clearTimeout);taskTimers=[];while(lesson.children.length){const o=lesson.children.pop();o.traverse(x=>{if(x.geometry&&!x.userData.shared)x.geometry.dispose();if(x.material&&!x.userData.shared){if(Array.isArray(x.material))x.material.forEach(m=>m.dispose());else x.material.dispose()}})}tweens=[];actions.replaceChildren();if(rabbit)rabbit.rotation.z=0;playChicken('idle');solved=false;setOverviewCamera()}
function showAnimal(which){if(!chicken||!rabbit)return;chicken.visible=which==='chicken';rabbit.visible=which==='rabbit'}
function setStory(tag,title,copy,line,icon,equation){$('#mission-tag').textContent=tag;$('#mission-title').textContent=title;$('#mission-copy').textContent=copy;$('#story-line').textContent=line;$('#story-icon').className=icon;$('#equation').textContent=equation}
function rand(min,max){return min+Math.floor(Math.random()*(max-min+1))}
function addChoice(label,onClick){const b=document.createElement('button');b.className='answer-choice';b.textContent=label;b.onclick=()=>{if(!solved)onClick(b)};actions.append(b)}
function choices(answer,onCorrect){const values=new Set([answer]);while(values.size<3){let n=Math.max(1,answer+rand(-3,3));if(n!==answer)values.add(n)}[...values].sort(()=>Math.random()-.5).forEach(n=>addChoice(n,button=>{if(n===answer){solved=true;button.classList.add('good');$('#equation').textContent=$('#equation').textContent.replace('?',answer);stars++;localStorage.setItem('wonder-stars',stars);$('#points').textContent=stars;$('#meter').style.width=`${(stars%5||5)*20}%`;feedback(`${answer} is right!`,'correct');onCorrect()}else{button.animate([{transform:'translateX(-5px)'},{transform:'translateX(5px)'},{transform:'translateX(0)'}],{duration:230});feedback('Try one more time','wrong')}}))}
function feedback(text,tone){const el=$('#feedback');el.textContent=text;el.classList.add('show');playSfx(tone);clearTimeout(feedback.timer);feedback.timer=setTimeout(()=>el.classList.remove('show'),2100)}

function build(next){if(!chicken)return;clearLesson();({add:buildAdd,subtract:buildSubtract,multiply:buildMultiply,divide:buildDivide}[next])()}
function buildAdd(){
  showAnimal('chicken');chicken.position.set(-3.4,-.02,.25);chicken.rotation.y=Math.PI*.5;const a=rand(1,3),b=rand(1,3),total=a+b,nest=makeNest();nest.position.set(1.35,.08,0);lesson.add(nest);const eggs=[],slots=eggSlots(total);for(let i=0;i<total;i++){const egg=makeEgg(i),slot=slots[i],home={x:1.35+slot[0],y:.31,z:slot[1]};egg.position.set(home.x,home.y,home.z);egg.userData.home=home;if(i>=a)egg.visible=false;lesson.add(egg);eggs.push(egg)}setStory('HEN HOUSE','Milly lays more eggs','Count every egg in her nest.',`${a} eggs, then ${b} more`,'egg-mark',`${a} + ${b} = ?`);choices(total,()=>animateEggStory(eggs.slice(a)))
}
function buildSubtract(){
  showAnimal('rabbit');rabbit.position.set(-3.5,-.04,.35);rabbit.rotation.y=-Math.PI*.42;const total=rand(5,8),eaten=rand(1,Math.min(3,total-2)),carrots=[];for(let i=0;i<total;i++){const carrot=makeCarrot();carrot.position.set(-.5+(i%4)*1.05,.05,Math.floor(i/4)*1.25-.55);carrot.rotation.y=(i%2?-.2:.2);lesson.add(carrot);carrots.push(carrot)}setStory('CARROT PATCH','Rory munches carrots','Watch the carrots disappear.',`${total} carrots, eat ${eaten}`,'carrot-mark',`${total} − ${eaten} = ?`);choices(total-eaten,()=>animateCarrotStory(carrots.slice(0,eaten)))
}
function buildMultiply(){
  showAnimal(null);const rows=rand(2,3),each=rand(2,4);for(let r=0;r<rows;r++){const patch=makePatch();patch.position.set((r-(rows-1)/2)*2.4,-.01,0);lesson.add(patch);lesson.add(numberSign(r+1,(r-(rows-1)/2)*2.4,0));for(let i=0;i<each;i++){const flower=makeFlower((r*each+i)%4);flower.position.set((r-(rows-1)/2)*2.4,.02,(i-(each-1)/2)*.85);flower.scale.setScalar(0);lesson.add(flower);schedule(()=>tweenScale(flower,1,450),150*(r*each+i))}}setStory('GARDEN ROWS','Grow equal flower rows','Count every flower in the garden.',`${rows} rows with ${each} flowers`,'flower-mark',`${rows} × ${each} = ?`);choices(rows*each,()=>lesson.children.filter(x=>x.userData.flower).forEach((f,i)=>schedule(()=>{bob(f,.22);playSfx('pop')},i*110)))
}
function buildDivide(){
  showAnimal(null);const baskets=rand(2,3),each=rand(2,3),total=baskets*each,fruit=[],basketModels=[];for(let i=0;i<baskets;i++){const basket=makeBasket();basket.position.set((i-(baskets-1)/2)*2.8,.02,.65);lesson.add(basket);basketModels.push(basket);lesson.add(numberSign(i+1,(i-(baskets-1)/2)*2.8,.65))}for(let i=0;i<total;i++){const apple=makeApple(i);apple.position.set((i-(total-1)/2)*.75,.22,-1.55+(i%2)*.2);lesson.add(apple);fruit.push(apple)}setStory('PICNIC SHARE','Share the apples fairly','Put the same amount in each basket.',`${total} apples for ${baskets} baskets`,'apple-mark',`${total} ÷ ${baskets} = ?`);choices(each,()=>fruit.forEach((apple,i)=>{const basket=i%baskets,slot=Math.floor(i/baskets);schedule(()=>tween(apple,{x:apple.position.x,y:apple.position.y,z:apple.position.z},{x:(basket-(baskets-1)/2)*2.8+(slot-.6)*.35,y:.55+slot*.16,z:.65},650,'bounce',()=>{playSfx('pop');bob(basketModels[basket],.08)}),i*210)}))
}

function schedule(fn,delay){const id=setTimeout(fn,delay);taskTimers.push(id);return id}
function eggSlots(total){const layouts={1:[[0,0]],2:[[-.43,0],[.43,0]],3:[[-.43,-.22],[.43,-.22],[0,.36]],4:[[-.4,-.3],[.4,-.3],[-.4,.3],[.4,.3]],5:[[-.51,-.29],[0,-.33],[.51,-.29],[-.3,.34],[.3,.34]],6:[[-.55,-.31],[0,-.34],[.55,-.31],[-.55,.32],[0,.36],[.55,.32]]};return layouts[total].map(([across,depth])=>[across*.86+depth*.5,-across*.5+depth*.86])}
function setOverviewCamera(){if(!camera||!controls)return;camera.position.set(innerWidth<760?7:8,innerWidth<760?5.2:5.5,innerWidth<760?15:13);controls.target.set(0,.65,0);controls.update()}
function focusEggBasket(){const destination=innerWidth<760?{x:5.2,y:4.1,z:8.4}:{x:4.9,y:3.35,z:6.25};tweenVector(camera.position,destination,1050);tweenVector(controls.target,{x:1.35,y:.42,z:0},1050)}
function animateEggStory(newEggs){
  focusEggBasket();
  playChicken('walk');tween(chicken,{x:chicken.position.x,y:chicken.position.y,z:chicken.position.z},{x:.18,y:-.02,z:.22},780,'smooth');
  schedule(()=>playChicken('idle'),760);
  newEggs.forEach((egg,i)=>schedule(()=>{const home=egg.userData.home;playChicken('butt_slide');bob(chicken,-.1);egg.visible=true;egg.position.set(.34,.18,.22);playSfx('pop');tween(egg,{x:.34,y:.18,z:.22},{x:(home.x+.34)/2,y:.82,z:(home.z+.22)/2},330,'smooth',()=>tween(egg,{x:egg.position.x,y:egg.position.y,z:egg.position.z},home,430,'bounce'));schedule(()=>playChicken('idle'),560)},980+i*920));
  schedule(()=>{playChicken('walk');tween(chicken,{x:chicken.position.x,y:chicken.position.y,z:chicken.position.z},{x:-3.4,y:-.02,z:.25},800,'smooth',()=>{playChicken('idle');chicken.visible=false})},1050+newEggs.length*920);
}
function animateCarrotStory(eatenCarrots){
  eatenCarrots.forEach((carrot,i)=>schedule(()=>{const target={x:carrot.position.x-1.02,y:-.04,z:carrot.position.z+.12};hop(rabbit,target,520);schedule(()=>{carrot.rotation.z=-Math.PI/2;const mouth={x:target.x+.72,y:.62,z:target.z-.03};tween(carrot,{x:carrot.position.x,y:carrot.position.y,z:carrot.position.z},mouth,360,'smooth',()=>{playSfx('chomp');for(let n=0;n<3;n++)schedule(()=>bob(rabbit,.055),n*135);tweenScale(carrot,.06,430);schedule(()=>carrot.visible=false,430)})},510)},i*1320));
}

const eggGeo=new THREE.LatheGeometry([new THREE.Vector2(.04,-.34),new THREE.Vector2(.21,-.27),new THREE.Vector2(.3,-.06),new THREE.Vector2(.27,.19),new THREE.Vector2(.16,.34),new THREE.Vector2(.02,.39)],32),eggMats=[new THREE.MeshPhysicalMaterial({color:0xfff8dc,roughness:.48,clearcoat:.12}),new THREE.MeshPhysicalMaterial({color:0xdcb27d,roughness:.6,clearcoat:.08})];function makeEgg(i=0){const m=new THREE.Mesh(eggGeo,eggMats[i%2]);m.scale.setScalar(.72);m.castShadow=true;m.userData.shared=true;m.rotation.z=(i%3-1)*.08;return m}
function makeNest(){const g=new THREE.Group(),mats=[0x8d542d,0xb1783f,0x6f4329].map(color=>new THREE.MeshStandardMaterial({color,roughness:1})),bed=new THREE.Mesh(new THREE.CylinderGeometry(.82,.86,.08,40),new THREE.MeshStandardMaterial({color:0xa76a35,roughness:1}));bed.position.y=.045;bed.receiveShadow=true;g.add(bed);for(let i=0;i<32;i++){const a=i/32*Math.PI*2,r=.74+Math.random()*.25,y=.06+Math.random()*.22;const curve=new THREE.CatmullRomCurve3([new THREE.Vector3(Math.cos(a)*r,y,Math.sin(a)*r),new THREE.Vector3(Math.cos(a+.5)*(r+.08),y+.03,Math.sin(a+.5)*(r+.08)),new THREE.Vector3(Math.cos(a+1.02)*(r-.08),y+.01,Math.sin(a+1.02)*(r-.08))]);const twig=new THREE.Mesh(new THREE.TubeGeometry(curve,7,.025+Math.random()*.016,5,false),mats[i%3]);twig.castShadow=true;g.add(twig)}return g}

function carrotLeaf(color,height,lean,turn){
  const shape=new THREE.Shape();shape.moveTo(0,0);shape.bezierCurveTo(.07,height*.22,.095,height*.54,0,height);shape.bezierCurveTo(-.075,height*.56,-.06,height*.2,0,0);
  const leaf=new THREE.Mesh(new THREE.ShapeGeometry(shape,5),new THREE.MeshStandardMaterial({color,roughness:.82,side:THREE.DoubleSide}));leaf.rotation.y=turn;leaf.rotation.z=lean;leaf.castShadow=true;return leaf;
}
function makeCarrot(){
  const g=new THREE.Group(),height=.98+Math.random()*.13,width=.27+Math.random()*.035,profile=[new THREE.Vector2(.018,0),new THREE.Vector2(width*.22,.13),new THREE.Vector2(width*.46,.38),new THREE.Vector2(width*.72,.68),new THREE.Vector2(width*.94,.91),new THREE.Vector2(width,1.02),new THREE.Vector2(width*.82,1.09),new THREE.Vector2(.04,1.1)];
  const bodyMat=new THREE.MeshPhysicalMaterial({color:0xe96724,roughness:.66,clearcoat:.06}),body=new THREE.Mesh(new THREE.LatheGeometry(profile,32),bodyMat);body.scale.y=height;body.castShadow=true;body.receiveShadow=true;g.add(body);
  for(let i=0;i<7;i++){const y=.25+i*.105,r=width*(.28+y*.62);const groove=new THREE.Mesh(new THREE.TorusGeometry(r,.008,5,22,Math.PI*(1.12+Math.random()*.45)),new THREE.MeshStandardMaterial({color:i%2?0xb74719:0xf38a3d,roughness:1}));groove.rotation.x=Math.PI/2;groove.rotation.y=Math.random()*Math.PI;groove.rotation.z=(Math.random()-.5)*.16;groove.position.y=y*height;g.add(groove)}
  const tipCurve=new THREE.CatmullRomCurve3([new THREE.Vector3(0,.03,0),new THREE.Vector3(.018,-.08,.006),new THREE.Vector3(-.025,-.18,.01)]),tip=new THREE.Mesh(new THREE.TubeGeometry(tipCurve,8,.014,6,false),bodyMat);tip.castShadow=true;g.add(tip);
  const greens=[0x276d3c,0x378f49,0x55a950];for(let i=0;i<9;i++){const leaf=carrotLeaf(greens[i%3],.5+Math.random()*.26,(i-4)*.055+(Math.random()-.5)*.12,i/9*Math.PI*2);leaf.position.set((Math.random()-.5)*.09,1.07*height,(Math.random()-.5)*.08);g.add(leaf)}
  const shadow=new THREE.Mesh(new THREE.CircleGeometry(.31,24),new THREE.MeshBasicMaterial({color:0x28573a,transparent:true,opacity:.16,depthWrite:false}));shadow.rotation.x=-Math.PI/2;shadow.position.y=.012;shadow.scale.set(1.5,.7,1);g.add(shadow);g.rotation.z=(Math.random()-.5)*.11;return g;
}
function makePatch(){const g=new THREE.Group(),soil=new THREE.Mesh(new THREE.CylinderGeometry(1.02,1.08,.16,32),new THREE.MeshStandardMaterial({color:0x75482c,roughness:1}));soil.scale.z=1.9;soil.position.y=.02;soil.receiveShadow=true;g.add(soil);return g}
function makeFlower(i){const g=new THREE.Group(),stem=new THREE.Mesh(new THREE.CylinderGeometry(.035,.05,.72,8),new THREE.MeshStandardMaterial({color:0x438f4c,roughness:.8}));stem.position.y=.38;g.add(stem);const colors=[0xff79a9,0xffce55,0x8c79ed,0x6bd7ed],petalMat=new THREE.MeshStandardMaterial({color:colors[i%4],roughness:.58});for(let p=0;p<7;p++){const petal=new THREE.Mesh(new THREE.SphereGeometry(.13,10,8),petalMat);const a=p/7*Math.PI*2;petal.position.set(Math.cos(a)*.18,.82,Math.sin(a)*.18);petal.scale.set(.75,1.25,.65);g.add(petal)}const center=new THREE.Mesh(new THREE.SphereGeometry(.12,12,8),new THREE.MeshStandardMaterial({color:0x6e482b}));center.position.y=.82;g.add(center);g.userData.flower=true;return g}
function makeBasket(){const g=new THREE.Group(),mat=new THREE.MeshStandardMaterial({color:0xc18443,roughness:.88});const bowl=new THREE.Mesh(new THREE.CylinderGeometry(.85,.62,.55,24,1,true),mat);bowl.position.y=.28;g.add(bowl);for(let y of [.05,.28,.54]){const rim=new THREE.Mesh(new THREE.TorusGeometry(.64+y*.34,.045,7,30),mat);rim.rotation.x=Math.PI/2;rim.position.y=y;g.add(rim)}const handle=new THREE.Mesh(new THREE.TorusGeometry(.65,.045,7,30,Math.PI),mat);handle.position.y=.55;handle.rotation.z=0;g.add(handle);return g}
function makeApple(i){const g=new THREE.Group(),profile=[new THREE.Vector2(.06,-.34),new THREE.Vector2(.26,-.29),new THREE.Vector2(.35,-.12),new THREE.Vector2(.36,.12),new THREE.Vector2(.29,.3),new THREE.Vector2(.14,.34),new THREE.Vector2(.07,.3)],apple=new THREE.Mesh(new THREE.LatheGeometry(profile,28),new THREE.MeshPhysicalMaterial({color:i%2?0xe6bd3d:0xd8443f,roughness:.48,clearcoat:.18,clearcoatRoughness:.4}));apple.castShadow=true;g.add(apple);const stem=new THREE.Mesh(new THREE.CylinderGeometry(.022,.035,.23,8),new THREE.MeshStandardMaterial({color:0x5b3824,roughness:1}));stem.position.set(.015,.4,0);stem.rotation.z=-.12;g.add(stem);const leaf=carrotLeaf(0x3d894d,.25,.72,.25);leaf.scale.set(.8,.8,.8);leaf.position.set(.03,.42,0);g.add(leaf);return g}
function numberSign(n,x,z){const canvas=document.createElement('canvas');canvas.width=128;canvas.height=128;const c=canvas.getContext('2d');c.fillStyle='#fff7dc';c.beginPath();c.arc(64,64,48,0,Math.PI*2);c.fill();c.fillStyle='#17364b';c.font='900 62px Nunito';c.textAlign='center';c.textBaseline='middle';c.fillText(n,64,67);const sprite=new THREE.Sprite(new THREE.SpriteMaterial({map:new THREE.CanvasTexture(canvas),transparent:true}));sprite.position.set(x,1.5,z);sprite.scale.set(.65,.65,1);return sprite}

function tween(object,from,to,duration=500,ease='smooth',done){tweens.push({object,from,to,start:performance.now(),duration,ease,done})}
function tweenVector(vector,to,duration=700,done){tweens.push({vector,from:{x:vector.x,y:vector.y,z:vector.z},to,start:performance.now(),duration,ease:'smooth',done})}
function tweenScale(object,to,duration){const from=object.scale.x;tweens.push({object,from:{s:from},to:{s:to},start:performance.now(),duration,ease:'bounce',scale:true})}
function hop(object,to,duration=520){tweens.push({object,from:{x:object.position.x,y:object.position.y,z:object.position.z},to,start:performance.now(),duration,ease:'smooth',hop:true})}
function bob(object,height=.2){const base=object.position.y;tween(object,{y:base},{y:base+height},220,'bounce',()=>tween(object,{y:base+height},{y:base},220,'smooth'))}
function updateTweens(now){tweens=tweens.filter(t=>{const raw=Math.min(1,(now-t.start)/t.duration);let p=t.ease==='bounce'?1-(1-raw)*(1-raw)*(1-raw):raw*raw*(3-2*raw);if(t.vector)Object.keys(t.to).forEach(k=>t.vector[k]=THREE.MathUtils.lerp(t.from[k],t.to[k],p));else if(t.scale)t.object.scale.setScalar(THREE.MathUtils.lerp(t.from.s,t.to.s,p));else{Object.keys(t.to).forEach(k=>t.object.position[k]=THREE.MathUtils.lerp(t.from[k],t.to[k],p));if(t.hop)t.object.position.y+=Math.sin(raw*Math.PI)*.34}if(raw>=1){t.done?.();return false}return true})}
function resize(){renderer.setSize(innerWidth,innerHeight);camera.aspect=innerWidth/innerHeight;camera.fov=innerWidth<760?52:44;if(!solved)setOverviewCamera();camera.updateProjectionMatrix()}
function animate(now=0){requestAnimationFrame(animate);const delta=Math.min(.05,Math.max(0,(now-lastFrame)/1000));lastFrame=now;mixer?.update(delta);if(rabbit?.visible&&!solved)rabbit.rotation.z=Math.sin(now*.0017)*.012;updateTweens(now);controls.update();renderer.render(scene,camera)}
