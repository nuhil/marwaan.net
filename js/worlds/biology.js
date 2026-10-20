import * as THREE from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {DRACOLoader} from 'three/addons/loaders/DRACOLoader.js';
import {hydrateIcons} from '../core/icons.js';
import {installAudio,playSfx,heartbeat,breathing,countTick} from '../core/audio.js';
// Body sounds that play while a part is selected: a heartbeat for the heart, breathing for the lungs.
let organSound=null;
function organAudio(part){organSound?.stop();organSound=null;const id=(part?.calloutName||part?.id||'').toLowerCase();
  if(/heart|ventricle|atri|aorta/.test(id))organSound=heartbeat(72);
  else if(/lung/.test(id))organSound=breathing(4.2);
  else if(/brain|spinal|nerve|cerebr/.test(id))[0,1,2].forEach(i=>setTimeout(()=>countTick(14+i*3),i*90));
  else if(part?.system==='skeletal')playSfx('wood-tap',{volume:.6});}

const $=s=>document.querySelector(s);
const colors={skin:'#7dd5ff',muscular:'#ff5969',skeletal:'#fff0c4',visceral:'#ff9a55',nervous:'#ffd05b',cardiovascular:'#ff4167'};
const names={muscular:'Muscles',skeletal:'Bones',visceral:'Organs',nervous:'Nerves',cardiovascular:'Vessels'};
const facts={heart:'Your heart pumps blood all around your body.',lung:'Your lungs fill your body with fresh oxygen.',liver:'Your liver cleans your blood and stores energy.',stomach:'Your stomach squishes and mixes food.',kidney:'Your kidneys clean waste from your blood.',brain:'Your brain helps you think, feel, learn, and move.',spinal:'Your spinal cord carries messages between your brain and body.',femur:'Your femur is the longest and strongest bone in your body.',rib:'Your ribs make a strong cage around your heart and lungs.',biceps:'Your biceps help bend your arm.',quadriceps:'Your quadriceps help you stand, run, and jump.',aorta:'The aorta is the biggest blood vessel in your body.',bone:'Bones support and protect your body.',muscle:'Muscles pull on bones to make you move.',nerve:'Nerves carry super-fast messages.',artery:'Arteries carry blood away from the heart.',vein:'Veins carry blood back to the heart.'};
const calloutSpecs=[
  ['Brain','nervous',['Cerebral hemisphere','Cerebral cortex','Midbrain']],['Spinal cord','nervous',['White matter of spinal cord','Anterior horn of spinal cord']],
  ['Lungs','visceral',['Superior lobe of right lung','Inferior lobe of right lung']],['Liver','visceral',['Liver']],['Stomach','visceral',['Stomach']],['Kidneys','visceral',['Kidney.r','Kidney.l']],
  ['Heart','cardiovascular',['Left ventricle','Right ventricle','Ascending aorta']],['Aorta','cardiovascular',['Thoracic aorta','Abdominal aorta']],
  ['Ribs','skeletal',['Sixth rib.r','Fifth rib.r','Costal cartilage of fifth rib.r']],['Femur','skeletal',['Femur.r','Femur.l']],
  ['Biceps','muscular',['Long head of biceps brachii.r','Short head of biceps brachii.r']],['Thigh muscle','muscular',['Rectus femoris.r','Vastus lateralis.r']]
];
const initialSystems=['skeletal','visceral','muscular'];
const active=new Set(['skin',...initialSystems]);
const roots=new Map(),registry=new Map(),pickMeshes=[];
let renderer,scene,camera,controls,skinGroup,platform,selected=null,flight=null,labelsOn=true,muscleOpacity=.42,modelCenter=null,modelScale=1;

function setupScene(){
  const host=$('#world-canvas');renderer=new THREE.WebGLRenderer({antialias:true,powerPreference:'high-performance'});renderer.setPixelRatio(Math.min(devicePixelRatio,1.65));renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.05;host.append(renderer.domElement);
  scene=new THREE.Scene();scene.background=new THREE.Color(0x070b13);scene.fog=new THREE.FogExp2(0x070b13,.12);camera=new THREE.PerspectiveCamera(42,1,.01,50);camera.position.set(0,.1,3.25);
  controls=new OrbitControls(camera,renderer.domElement);controls.enableDamping=true;controls.dampingFactor=.055;controls.enablePan=true;controls.minDistance=.55;controls.maxDistance=7;controls.target.set(0,0,0);controls.autoRotateSpeed=.8;controls.touches={ONE:THREE.TOUCH.ROTATE,TWO:THREE.TOUCH.DOLLY_PAN};
  scene.add(new THREE.HemisphereLight(0xbfdcff,0x261624,1.45));const key=new THREE.DirectionalLight(0xfff7ef,2.7);key.position.set(3,5,4);scene.add(key);const rim=new THREE.DirectionalLight(0x56bdff,2);rim.position.set(-4,2,-3);scene.add(rim);
  platform=new THREE.Group();const disc=new THREE.Mesh(new THREE.CylinderGeometry(1.08,1.25,.035,80),new THREE.MeshPhysicalMaterial({color:0x132331,metalness:.55,roughness:.35,transparent:true,opacity:.86}));platform.add(disc);for(const radius of [.62,.86,1.1]){const ring=new THREE.Mesh(new THREE.TorusGeometry(radius,.008,5,90),new THREE.MeshBasicMaterial({color:0x4bbcff,transparent:true,opacity:.45}));ring.rotation.x=Math.PI/2;ring.position.y=.025;platform.add(ring)}scene.add(platform);
  addEventListener('resize',resize);resize();renderer.domElement.addEventListener('pointerdown',e=>pickPart.downX=e.clientX);renderer.domElement.addEventListener('pointerup',pickPart);animate();
}

async function boot(){
  hydrateIcons();installAudio({musicButton:$('#music-toggle'),theme:'biology'});wireUI();
  await Promise.all(initialSystems.map(loadSystem));
  fitBody();buildSkin();buildCallouts();buildPartsList();$('#load-status').classList.add('done');
}

const draco=new DRACOLoader();draco.setDecoderPath('assets/anatomy/draco/');draco.preload();
const loader=new GLTFLoader();loader.setDRACOLoader(draco);
async function loadSystem(system){
  if(roots.has(system))return roots.get(system);
  const gltf=await loader.loadAsync(`assets/anatomy/models/${system}.glb`);const root=gltf.scene;root.name=system;if(modelCenter){root.position.sub(modelCenter);root.scale.setScalar(modelScale)}roots.set(system,root);scene.add(root);
  const walk=(node,parentPart=null)=>{let part=parentPart;const id=node.userData?.za_name;if(id){part=registry.get(id)||{id,system,node,meshes:[]};registry.set(id,part)}if(node.isMesh){node.userData.part=part;if(part)part.meshes.push(node);pickMeshes.push(node);node.castShadow=false;node.receiveShadow=false;if(system==='muscular')setMeshOpacity(node,muscleOpacity)}node.children.forEach(child=>walk(child,part))};walk(root);
  root.visible=active.has(system);return root;
}

function setMeshOpacity(mesh,opacity){if(!mesh.userData.opacityMaterial){mesh.material=Array.isArray(mesh.material)?mesh.material.map(m=>m.clone()):mesh.material.clone();mesh.userData.opacityMaterial=true}const mats=Array.isArray(mesh.material)?mesh.material:[mesh.material];mats.forEach(mat=>{if(!mat)return;mat.transparent=opacity<.99;mat.opacity=opacity;mat.depthWrite=opacity>.7;mat.side=THREE.DoubleSide})}

function fitBody(){
  const box=new THREE.Box3();roots.forEach(root=>box.expandByObject(root));const size=box.getSize(new THREE.Vector3());modelCenter=box.getCenter(new THREE.Vector3());roots.forEach(root=>root.position.sub(modelCenter));modelScale=1.75/size.y;roots.forEach(root=>root.scale.setScalar(modelScale));const floor=-size.y*modelScale/2;platform.position.y=floor-.045;camera.position.set(0,.12,2.75);controls.target.set(0,.03,0);controls.update();
}

function buildSkin(){
  const source=roots.get('muscular'),saved=[];source.traverse(node=>{if(node.userData?.part){saved.push([node,node.userData.part]);delete node.userData.part}});try{skinGroup=source.clone(true)}finally{saved.forEach(([node,part])=>node.userData.part=part)}skinGroup.name='skin-surface';skinGroup.scale.multiplyScalar(1.004);const skinMaterial=new THREE.MeshPhysicalMaterial({color:0xe8a984,roughness:.68,metalness:0,clearcoat:.12,clearcoatRoughness:.72,side:THREE.DoubleSide});skinGroup.traverse(node=>{if(!node.isMesh)return;node.material=skinMaterial;node.userData={}});scene.add(skinGroup);updateSkinAppearance();
}

function updateSkinAppearance(){if(!skinGroup)return;const insideVisible=['muscular','skeletal','visceral','nervous','cardiovascular'].some(system=>active.has(system));const opacity=insideVisible?.065:1;skinGroup.visible=active.has('skin');skinGroup.traverse(node=>{if(!node.isMesh)return;node.material.transparent=opacity<1;node.material.opacity=opacity;node.material.depthWrite=opacity>.75})}

function wireUI(){
  document.querySelectorAll('.layer-toggle').forEach(button=>button.addEventListener('click',async()=>{const system=button.dataset.layer;const on=!active.has(system);if(on){active.add(system);button.classList.add('active');button.setAttribute('aria-pressed','true');button.lastElementChild.dataset.icon='eye';hydrateIcons(button);if(system!=='skin'&&!roots.has(system)){button.classList.add('loading');await loadSystem(system);button.classList.remove('loading');buildCallouts();buildPartsList()}}else{active.delete(system);button.classList.remove('active');button.setAttribute('aria-pressed','false');button.lastElementChild.dataset.icon='eye-off';hydrateIcons(button)}if(system!=='skin'&&roots.get(system))roots.get(system).visible=on;updateSkinAppearance();updateCallouts();buildPartsList();playSfx('toggle')}));
  $('#muscle-opacity').addEventListener('input',e=>{muscleOpacity=e.target.value/100;$('#muscle-opacity-value').textContent=`${e.target.value}%`;roots.get('muscular')?.traverse(x=>x.isMesh&&setMeshOpacity(x,muscleOpacity))});
  $('#part-search').addEventListener('input',buildPartsList);$('#open-finder').onclick=()=>{$('.finder-panel').classList.toggle('open');if($('.finder-panel').classList.contains('open'))$('#part-search').focus();playSfx('tap')};$('#close-finder').onclick=()=>$('.finder-panel').classList.remove('open');$('#reset-view').onclick=resetView;$('#auto-rotate').onclick=e=>{controls.autoRotate=!controls.autoRotate;e.currentTarget.classList.toggle('active',controls.autoRotate);e.currentTarget.setAttribute('aria-pressed',String(controls.autoRotate));playSfx('tap')};$('#toggle-labels').onclick=e=>{labelsOn=!labelsOn;e.currentTarget.classList.toggle('active',labelsOn);e.currentTarget.setAttribute('aria-pressed',String(labelsOn));updateCallouts();playSfx('tap')};$('#fullscreen').onclick=()=>document.fullscreenElement?document.exitFullscreen():$('.anatomy-app').requestFullscreen?.();$('#close-fact').onclick=()=>{$('#fact-panel').classList.remove('is-open');organAudio(null)};
}

function buildPartsList(){
  const q=$('#part-search').value.trim().toLowerCase(),host=$('#parts-list');host.textContent='';let parts=[];
  if(q){parts=[...registry.values()].filter(p=>active.has(p.system)&&p.id.toLowerCase().includes(q)).sort((a,b)=>a.id.length-b.id.length).slice(0,18)}else{const seen=new Set();calloutSpecs.forEach(([,system,patterns])=>{if(!active.has(system))return;const part=findPart(system,patterns);if(part&&!seen.has(part.id)){seen.add(part.id);parts.push(part)}})}
  parts.forEach(part=>{const b=document.createElement('button');b.className='part-row';b.textContent=part.calloutName||friendly(part.id);b.style.borderColor=`${colors[part.system]}33`;b.onclick=()=>selectPart(part);host.append(b)});if(!parts.length)host.innerHTML='<p class="empty-parts">Turn on a layer to discover parts!</p>';$('#part-count').textContent=parts.length;
}

function buildCallouts(){
  const host=$('#anatomy-labels');host.textContent='';calloutSpecs.forEach(([label,system,patterns],index)=>{const part=findPart(system,patterns);if(!part)return;const button=document.createElement('button');button.className=`anatomy-label ${index%2?'right':''}`;button.textContent=label.toUpperCase();button.style.setProperty('--label',colors[system]);button.onclick=()=>selectPart(part);host.append(button);part.callout=button;part.calloutName=label});updateCallouts();
}
function findPart(system,patterns){for(const pattern of patterns){const exact=registry.get(pattern);if(exact&&exact.system===system)return exact;const p=pattern.toLowerCase();const found=[...registry.values()].find(x=>x.system===system&&x.id.toLowerCase().includes(p));if(found)return found}return null}

function pickPart(e){if(Math.abs(e.clientX-(pickPart.downX??e.clientX))>8)return;const rect=renderer.domElement.getBoundingClientRect(),pointer=new THREE.Vector2((e.clientX-rect.left)/rect.width*2-1,-(e.clientY-rect.top)/rect.height*2+1),ray=new THREE.Raycaster();ray.setFromCamera(pointer,camera);const visible=pickMeshes.filter(m=>m.visible&&active.has(m.userData.part?.system));const hit=ray.intersectObjects(visible,false)[0];if(hit?.object.userData.part)selectPart(hit.object.userData.part)}

function selectPart(part){
  restoreSelection();selected=part;part.meshes.forEach(mesh=>{const mats=Array.isArray(mesh.material)?mesh.material:[mesh.material];mats.forEach(mat=>{if(!mat)return;mat.userData.oldEmissive=mat.emissive?.clone();mat.userData.oldIntensity=mat.emissiveIntensity;if(mat.emissive){mat.emissive.set(colors[part.system]);mat.emissiveIntensity=.65}})});document.querySelectorAll('.part-row').forEach(x=>x.classList.toggle('active',x.textContent===friendly(part.id)));document.querySelectorAll('.anatomy-label').forEach(x=>x.classList.toggle('active',x===part.callout));
  const label=part.calloutName||friendly(part.id),key=Object.keys(facts).find(k=>label.toLowerCase().includes(k)||part.id.toLowerCase().includes(k));$('#fact-system').textContent=names[part.system]?.toUpperCase()||'BODY';$('#fact-system').style.color=colors[part.system];$('#fact-title').textContent=label;$('#fact-copy').textContent=facts[key]||`This ${label.toLowerCase()} is one of the amazing parts that helps your body work.`;$('#fact-chip span').textContent='Part found!';$('.finder-panel').classList.remove('open');$('#fact-panel').classList.add('is-open');playSfx('select');organAudio(part);focusPart(part);
}
function restoreSelection(){if(!selected)return;selected.meshes.forEach(mesh=>{const mats=Array.isArray(mesh.material)?mesh.material:[mesh.material];mats.forEach(mat=>{if(mat?.emissive&&mat.userData.oldEmissive){mat.emissive.copy(mat.userData.oldEmissive);mat.emissiveIntensity=mat.userData.oldIntensity??1}})})}
function focusPart(part){const box=new THREE.Box3();part.meshes.forEach(m=>box.expandByObject(m));if(box.isEmpty())return;const center=box.getCenter(new THREE.Vector3()),size=box.getSize(new THREE.Vector3()).length(),dir=camera.position.clone().sub(controls.target).normalize();flight={from:camera.position.clone(),to:center.clone().add(dir.multiplyScalar(Math.max(.45,Math.min(1.5,size*2.8)))),targetFrom:controls.target.clone(),target:center,start:performance.now()}}
function resetView(){organAudio(null);flight={from:camera.position.clone(),to:new THREE.Vector3(0,.12,2.75),targetFrom:controls.target.clone(),target:new THREE.Vector3(0,.03,0),start:performance.now()};playSfx('tap')}

function updateCallouts(){registry.forEach(part=>{if(part.callout)part.callout.hidden=!labelsOn||!active.has(part.system)})}
function friendly(id){return id.replace(/\.(l|r)$/i,(_,s)=>s==='l'?' · left':' · right').replace(/[()]/g,'')}
function partCenter(part){const box=new THREE.Box3();part.meshes.forEach(m=>box.expandByObject(m));return box.isEmpty()?null:box.getCenter(new THREE.Vector3())}
function updateLabels(){
  const w=innerWidth,h=innerHeight,mobile=w<760,minX=mobile?68:95,maxX=mobile?w-68:w-300,offset=mobile?48:75;registry.forEach(part=>{if(!part.callout||part.callout.hidden)return;const v=partCenter(part);if(!v)return;v.project(camera);const x=(v.x*.5+.5)*w,y=(-v.y*.5+.5)*h;const top=82,bottom=h-(mobile?100:135),offscreen=v.z<-1||v.z>1||y<top-20||y>bottom+20||x<-40||x>w+40;part.callout.style.left=`${Math.max(minX,Math.min(maxX,x+(part.callout.classList.contains('right')?offset:-offset)))}px`;part.callout.style.top=`${Math.max(top,Math.min(bottom,y))}px`;part.callout.style.display=offscreen?'none':''})
}
function resize(){const w=innerWidth,h=innerHeight;renderer.setSize(w,h);camera.aspect=w/h;camera.fov=w<760?48:42;camera.updateProjectionMatrix()}
function animate(now=0){requestAnimationFrame(animate);if(flight){const p=Math.min(1,(now-flight.start)/700),e=1-(1-p)**3;camera.position.lerpVectors(flight.from,flight.to,e);controls.target.lerpVectors(flight.targetFrom,flight.target,e);if(p===1)flight=null}controls.update();updateLabels();renderer.render(scene,camera)}

try{setupScene();boot().catch(error=>{console.error(error);$('#fallback').hidden=false;$('#load-status').classList.add('done')})}catch(error){console.error(error);$('#fallback').hidden=false;$('#load-status').classList.add('done')}
