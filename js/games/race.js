// Star Road: steer a toy car between three lanes to collect stars. Cones only slow you down.
import {THREE,RoundedBoxGeometry,V,surface,tween,wait,ease,makeSky,starGeometry,goldMaterial,labelSprite,shadowed,rng} from './kit.js';
import {makeTree} from '../worlds/math-scenery.js';
import {engine,whoosh} from '../core/audio.js';
let motor=null;

const LANES=[-2.3,0,2.3],GOALS=[8,12,16],SPEEDS=[9,11.5,14],CONE_CHANCE=[.25,.45,.6];
const ROAD_LEN=220,SPAWN_Z=-90,SPACING=9;
let ctx,root,car,wheels=[],lane=1,speed=0,boost=0,slowUntil=0,items=[],scenery=[],stars=0,goal=8,level=1,distanceToSpawn=0,finish=null,finished=false,roadMats=[];

function scrollingTexture(draw,repeat){const c=document.createElement('canvas');c.width=128;c.height=512;draw(c.getContext('2d'));const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;t.wrapS=t.wrapT=THREE.RepeatWrapping;t.repeat.set(...repeat);t.anisotropy=8;return t}
function buildWorld(){
  root.add(makeSky());
  const road=surface('asphalt_02',{repeat:[1.6,ROAD_LEN/7],color:'#9a9a9a',roughness:.9,normal:1,unique:true}),grass=surface('leafy_grass',{repeat:[30,40],color:'#a7d67a',roughness:.95,unique:true});
  const roadMesh=new THREE.Mesh(new THREE.PlaneGeometry(7.6,ROAD_LEN),road);roadMesh.rotation.x=-Math.PI/2;roadMesh.position.set(0,.01,-ROAD_LEN/2+20);roadMesh.receiveShadow=true;root.add(roadMesh);
  const ground=new THREE.Mesh(new THREE.PlaneGeometry(160,ROAD_LEN),grass);ground.rotation.x=-Math.PI/2;ground.position.set(0,0,-ROAD_LEN/2+20);ground.receiveShadow=true;root.add(ground);
  const lines=scrollingTexture(g=>{g.clearRect(0,0,128,512);g.fillStyle='#f8f4e8';for(const x of [41,87])g.fillRect(x-3,40,6,200);g.fillStyle='#f8f4e8';g.fillRect(2,0,6,512);g.fillRect(120,0,6,512)},[1,ROAD_LEN/14]);
  const lineMesh=new THREE.Mesh(new THREE.PlaneGeometry(7.6,ROAD_LEN),new THREE.MeshStandardMaterial({map:lines,transparent:true,roughness:.7,depthWrite:false}));lineMesh.rotation.x=-Math.PI/2;lineMesh.position.set(0,.02,-ROAD_LEN/2+20);root.add(lineMesh);
  const curb=scrollingTexture(g=>{for(let i=0;i<8;i++){g.fillStyle=i%2?'#ffffff':'#d9342b';g.fillRect(0,i*64,128,64)}},[1,ROAD_LEN/4]);
  [-4.15,4.15].forEach(x=>{const m=new THREE.Mesh(new THREE.BoxGeometry(.7,.12,ROAD_LEN),new THREE.MeshStandardMaterial({map:curb,roughness:.6}));m.position.set(x,.06,-ROAD_LEN/2+20);m.receiveShadow=true;root.add(m)});
  roadMats=[[road.map,ROAD_LEN/7],[road.normalMap,ROAD_LEN/7],[grass.map,40],[grass.normalMap,40],[lines,ROAD_LEN/14],[curb,ROAD_LEN/4]];
  const rand=rng(5);for(let i=0;i<14;i++){const side=i%2?1:-1,t=makeTree(30+i);t.position.set(side*(7.5+rand()*6),0,-i*13);t.rotation.y=rand()*6;t.scale.multiplyScalar(.9+rand()*.3);root.add(t);scenery.push(t)}
}
function makeCar(){
  const g=new THREE.Group(),paint=new THREE.MeshPhysicalMaterial({color:'#e8261f',metalness:.3,roughness:.32,clearcoat:1,clearcoatRoughness:.08}),glass=new THREE.MeshPhysicalMaterial({color:'#1b2a3a',metalness:.2,roughness:.05,clearcoat:1}),trim=new THREE.MeshStandardMaterial({color:'#24262b',roughness:.6}),chrome=new THREE.MeshStandardMaterial({color:'#e8edf2',metalness:1,roughness:.18});
  const body=new THREE.Mesh(new RoundedBoxGeometry(1.8,.6,3.4,4,.22),paint);body.position.y=.62;g.add(body);
  const hood=new THREE.Mesh(new RoundedBoxGeometry(1.7,.2,1,3,.1),paint);hood.position.set(0,.95,-1.05);hood.rotation.x=.1;g.add(hood);
  const cabin=new THREE.Mesh(new RoundedBoxGeometry(1.5,.56,1.7,4,.2),glass);cabin.position.set(0,1.12,.25);g.add(cabin);
  const roof=new THREE.Mesh(new RoundedBoxGeometry(1.52,.1,1.25,3,.05),paint);roof.position.set(0,1.42,.32);g.add(roof);
  [[-1.72,'#fff7d6',1.5],[1.72,'#ff3030',1.2]].forEach(([z,color,k])=>[-.58,.58].forEach(x=>{const l=new THREE.Mesh(new RoundedBoxGeometry(.38,.16,.06,2,.03),new THREE.MeshStandardMaterial({color,emissive:color,emissiveIntensity:k}));l.position.set(x,.72,z);g.add(l)}));
  [-1.74,1.74].forEach(z=>{const b=new THREE.Mesh(new RoundedBoxGeometry(1.86,.18,.14,2,.06),trim);b.position.set(0,.42,z);g.add(b)});
  const grille=new THREE.Mesh(new RoundedBoxGeometry(.8,.14,.04,2,.02),chrome);grille.position.set(0,.6,-1.72);g.add(grille);
  wheels=[];[[-.92,-1.1],[.92,-1.1],[-.92,1.1],[.92,1.1]].forEach(([x,z])=>{const w=new THREE.Group(),tire=new THREE.Mesh(new THREE.CylinderGeometry(.4,.4,.34,28),new THREE.MeshStandardMaterial({color:'#17181b',roughness:.85}));tire.rotation.z=Math.PI/2;const rim=new THREE.Mesh(new THREE.CylinderGeometry(.25,.25,.36,20),chrome);rim.rotation.z=Math.PI/2;const hub=new THREE.Mesh(new THREE.BoxGeometry(.37,.06,.4),chrome);w.add(tire,rim,hub);w.position.set(x,.4,z);g.add(w);wheels.push(w)});
  const shadow=new THREE.Mesh(new THREE.PlaneGeometry(2.2,3.8),new THREE.MeshBasicMaterial({color:'#000',transparent:true,opacity:.25,depthWrite:false}));shadow.rotation.x=-Math.PI/2;shadow.position.y=.03;g.add(shadow);
  return shadowed(g);
}
function makeCone(){const g=new THREE.Group(),orange=new THREE.MeshPhysicalMaterial({color:'#ff6a13',roughness:.45,clearcoat:.4}),white=new THREE.MeshStandardMaterial({color:'#f5f5f5',roughness:.5});
  const base=new THREE.Mesh(new RoundedBoxGeometry(.95,.1,.95,2,.04),orange);base.position.y=.05;const cone=new THREE.Mesh(new THREE.CylinderGeometry(.07,.38,1.05,24),orange);cone.position.y=.6;const band=new THREE.Mesh(new THREE.CylinderGeometry(.2,.26,.2,24),white);band.position.y=.62;g.add(base,cone,band);return shadowed(g)}
function makeRoadStar(){const g=new THREE.Group(),s=new THREE.Mesh(starGeometry(.55,.24,.18),goldMaterial());s.position.y=1.1;g.add(s);const glow=new THREE.Mesh(new THREE.CircleGeometry(.75,32),new THREE.MeshBasicMaterial({color:'#ffe066',transparent:true,opacity:.35,depthWrite:false}));glow.rotation.x=-Math.PI/2;glow.position.y=.04;g.add(glow);g.userData.spin=s;return shadowed(g)}
function makeFinish(){const g=new THREE.Group(),post=new THREE.MeshStandardMaterial({color:'#f1f3f5',roughness:.4,metalness:.4});[-4.3,4.3].forEach(x=>{const p=new THREE.Mesh(new THREE.CylinderGeometry(.14,.14,4.4,12),post);p.position.set(x,2.2,0);g.add(p)});
  const c=document.createElement('canvas');c.width=512;c.height=96;const x=c.getContext('2d');for(let i=0;i<32;i++)for(let j=0;j<6;j++){x.fillStyle=(i+j)%2?'#111':'#fff';x.fillRect(i*16,j*16,16,16)}const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;
  const banner=new THREE.Mesh(new THREE.BoxGeometry(8.8,.9,.1),new THREE.MeshStandardMaterial({map:t,roughness:.6}));banner.position.y=4.1;g.add(banner);const label=labelSprite('FINISH',{ring:'#e03131',scale:.8});label.position.y=5.1;g.add(label);return shadowed(g)}

function spawnRow(z=SPAWN_Z){
  const starLane=Math.floor(Math.random()*3),star=makeRoadStar();star.position.set(LANES[starLane],0,z);root.add(star);items.push({kind:'star',lane:starLane,obj:star});
  if(Math.random()<CONE_CHANCE[level-1]){let coneLane;do coneLane=Math.floor(Math.random()*3);while(coneLane===starLane);const cone=makeCone();cone.position.set(LANES[coneLane],0,z-SPACING/2);root.add(cone);items.push({kind:'cone',lane:coneLane,obj:cone})}
}
function removeItem(item){root.remove(item.obj);item.obj.traverse(o=>{o.geometry?.dispose();if(o.material&&!o.material.userData.shared)o.material.dispose()});items.splice(items.indexOf(item),1)}
function steer(dir){if(finished)return;const next=THREE.MathUtils.clamp(lane+dir,0,2);if(next!==lane){lane=next;ctx.sfx('tap')}}
function start(lv){
  [...items].forEach(removeItem);if(finish){root.remove(finish);finish=null}
  level=Math.min(lv,3);goal=GOALS[level-1];stars=0;lane=1;speed=0;boost=0;slowUntil=0;finished=false;distanceToSpawn=SPACING;
  car.position.set(0,0,0);car.rotation.set(0,0,0);ctx.progress(0,goal);
  ctx.hud(`Collect ${goal} stars`,'Steer into the stars. Cones just slow you down!');
  for(let z=-22;z>SPAWN_Z;z-=SPACING)spawnRow(z);
  layout();
}
function layout(){const portrait=innerHeight>innerWidth;ctx.camera.position.set(0,portrait?6.2:4.3,portrait?11:8.2);ctx.camera.lookAt(0,portrait?.4:1,-7)}

export default{
  id:'race',name:'Star Road',kicker:'RACE',icon:'race',
  keys:[['← →','Change lane'],['↑','Zoom!']],
  enter(c){ctx=c;root=c.root;items=[];scenery=[];buildWorld();car=makeCar();root.add(car);motor?.stop(.1);motor=engine();ctx.lights('outdoor');
    ctx.setPad([{label:'◀',code:'ArrowLeft',cls:'big'},{label:'▶',code:'ArrowRight',cls:'big'}],'split');start(ctx.level)},
  exit(){items=[];scenery=[];finish=null;car=null;motor?.stop(.3);motor=null},
  restart(){start(ctx.level)},
  layout,
  update(dt,t){
    if(!car)return;
    const now=performance.now(),target=finished?0:SPEEDS[level-1]*(now<slowUntil?.45:1)*(1+boost);speed=THREE.MathUtils.damp(speed,target,finished?1.2:2.2,dt);boost=Math.max(0,boost-dt*.6);
    const move=speed*dt;motor?.set(850+speed*330*(1+boost*.6),Math.min(1,speed/14+boost),.2);
    car.position.x=THREE.MathUtils.damp(car.position.x,LANES[lane],7,dt);car.rotation.y=THREE.MathUtils.damp(car.rotation.y,(car.position.x-LANES[lane])*.18,8,dt);car.rotation.z=now<slowUntil?Math.sin(t*30)*.04:0;
    wheels.forEach(w=>w.rotation.x-=move/.4);
    roadMats.forEach(([tex,rep])=>tex.offset.y+=move*rep/ROAD_LEN);
    scenery.forEach(s=>{s.position.z+=move;if(s.position.z>14)s.position.z-=14*13});
    distanceToSpawn-=move;if(distanceToSpawn<=0&&!finish){spawnRow();distanceToSpawn=SPACING}
    for(const item of [...items]){
      const o=item.obj;o.position.z+=move;if(item.kind==='star')o.userData.spin.rotation.y+=dt*3;
      if(item.flying){o.position.y+=dt*6;o.rotation.x+=dt*8;if(o.position.y>6)removeItem(item);continue}
      if(Math.abs(o.position.z)<1.4&&Math.abs(o.position.x-car.position.x)<(item.kind==='star'?1.5:1.05)&&!item.hit){
        item.hit=true;
        if(item.kind==='star'){stars++;ctx.sfx('coin',{volume:.8,rate:1+Math.min(stars,16)*.03});ctx.sfx('pluck',{volume:.5});ctx.progress(stars,goal);removeItem(item);if(stars===goal){finish=makeFinish();finish.position.z=-40;root.add(finish);ctx.feedback('All the stars! Drive to the finish!');items.forEach(i=>i.flying=true)}else if(stars%4===0)ctx.feedback(`${stars} stars! Keep going!`)}
        else{slowUntil=now+1300;item.flying=true;ctx.sfx('cone-bump',{volume:.9});ctx.feedback('Bump! Steer around the cones.')}
        continue;
      }
      if(o.position.z>12)removeItem(item);
    }
    if(finish){finish.position.z+=move;if(finish.position.z>-.5&&!finished){finished=true;ctx.celebrate(V(0,3,-2));ctx.win({title:'You finished!',text:`You collected all ${goal} stars.`})}}
  },
  key(code,down){if(!down)return;if(code==='ArrowLeft'||code==='KeyA')steer(-1);else if(code==='ArrowRight'||code==='KeyD')steer(1);else if(code==='ArrowUp'||code==='KeyW'){boost=.5;whoosh(true,.5)}},
  tap(e){const r=ctx.renderer.domElement.getBoundingClientRect();steer(e.clientX<r.left+r.width/2?-1:1)},
  hover(){return true}
};
