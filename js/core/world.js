import * as THREE from 'three';
import {hydrateIcons} from './icons.js';
import {installAudio,playSfx} from './audio.js';
export {THREE};
export function createWorld({container,background=0x050817,camera=[10,8,18],target=[0,1,0]}){
 let renderer;try{renderer=new THREE.WebGLRenderer({antialias:true,alpha:false})}catch(error){throw error}
 renderer.setPixelRatio(Math.min(devicePixelRatio,1.7));renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.1;container.appendChild(renderer.domElement);
 const scene=new THREE.Scene();scene.background=new THREE.Color(background);scene.fog=new THREE.FogExp2(background,.026);const cam=new THREE.PerspectiveCamera(46,1,.1,160);cam.position.fromArray(camera);cam.lookAt(...target);
 scene.add(new THREE.HemisphereLight(0xbfd8ff,0x201536,1.45));const key=new THREE.DirectionalLight(0xffffff,3);key.position.set(7,12,8);scene.add(key);const floor=new THREE.Mesh(new THREE.CircleGeometry(28,80),new THREE.MeshStandardMaterial({color:0x0b1230,metalness:.35,roughness:.7}));floor.rotation.x=-Math.PI/2;floor.position.y=-2;scene.add(floor);const grid=new THREE.GridHelper(55,44,0x34508a,0x172449);grid.position.y=-1.98;scene.add(grid);
 const group=new THREE.Group();scene.add(group);let running=true;document.addEventListener('visibilitychange',()=>running=!document.hidden);
 function resize(){const w=innerWidth,h=innerHeight;renderer.setSize(w,h);cam.aspect=w/h;cam.fov=w<760?57:46;cam.updateProjectionMatrix()}addEventListener('resize',resize);resize();
 const tickers=[];function frame(t){if(running){tickers.forEach(fn=>fn(t));renderer.render(scene,cam)}requestAnimationFrame(frame)}requestAnimationFrame(frame);
 return{renderer,scene,camera:cam,group,tickers,clear(){while(group.children.length){const o=group.children.pop();o.traverse(x=>{x.geometry?.dispose();if(Array.isArray(x.material))x.material.forEach(m=>m.dispose());else x.material?.dispose()})}},resize};
}
export function roundedBox(size=1,color=0x58e6ff){const mesh=new THREE.Mesh(new THREE.BoxGeometry(size,size,size,3,3,3),new THREE.MeshStandardMaterial({color,roughness:.25,metalness:.18,emissive:new THREE.Color(color).multiplyScalar(.16)}));const edges=new THREE.LineSegments(new THREE.EdgesGeometry(mesh.geometry),new THREE.LineBasicMaterial({color:0xffffff,transparent:true,opacity:.28}));mesh.add(edges);return mesh}
export function buttonRaycast(renderer,camera,objects,onPick){const ray=new THREE.Raycaster(),pointer=new THREE.Vector2();renderer.domElement.addEventListener('pointerup',e=>{const r=renderer.domElement.getBoundingClientRect();pointer.set((e.clientX-r.left)/r.width*2-1,-(e.clientY-r.top)/r.height*2+1);ray.setFromCamera(pointer,camera);const hit=ray.intersectObjects(objects,true)[0];if(hit)onPick(hit.object,hit)})}
export function setMission(tag,title,copy){document.querySelector('#mission-tag').textContent=tag;document.querySelector('#mission-title').textContent=title;document.querySelector('#mission-copy').textContent=copy}
export function feedback(message,tone='auto'){const el=document.querySelector('#feedback');el.textContent=message;el.classList.add('show');const good=/right|great|built|complete|balanced|yes|made|helps|light on|found|pair|team|fair|bubbles/i.test(message);const retry=/try|again|first|different|look|count/i.test(message);playSfx(tone==='auto'?(good?'correct':retry?'wrong':'tap'):tone);clearTimeout(feedback.timer);feedback.timer=setTimeout(()=>el.classList.remove('show'),2200)}
export function wireCommon(theme='wonder'){hydrateIcons();installAudio({musicButton:document.querySelector('#music-toggle'),theme});setTimeout(()=>document.querySelector('.world-loading')?.classList.add('done'),650)}
