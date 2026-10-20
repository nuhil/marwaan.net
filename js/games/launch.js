// Castle Launch: aim a wooden catapult and knock the golden stars off a crate castle (real physics via cannon-es).
import {THREE,RoundedBoxGeometry,V,surface,paintedWood,tween,ease,makeSky,starGeometry,goldMaterial,shadowed} from './kit.js';

const CASTLE_X=7.5,PLATFORM=[6.4,1.1,3.2],CRATE=.9,CATAPULT=V(-8.5,0,0);
const LEVELS=[
  {crates:[[-.5,0],[.5,0],[0,1]],stars:[[0,2]]},
  {crates:[[-1.6,0],[-1.6,1],[-1.6,2],[1.6,0],[1.6,1],[1.6,2]],stars:[[-1.6,3],[1.6,3]]},
  {crates:[[-1.8,0],[-.9,0],[0,0],[.9,0],[1.8,0],[-1.35,1],[1.35,1],[-1.35,2],[1.35,2],[0,1]],planks:[[0,3.05,4.2]],stars:[[-1.35,3.6],[0,2.05],[1.35,3.6]]}
];
const REST=.42,RELEASE=-1.9;
let simTime=0,loaded,ctx,root,CANNON,world,bodies=[],stars=[],balls=[],angle=45,power=11.5,catapultArm,cup,dots,aiming=true,shots=0,knocked=0,level=1,dragStart=null,winShown=false,missHint=0;

function ground(){
  root.add(makeSky());
  const grass=new THREE.Mesh(new THREE.PlaneGeometry(120,80),surface('leafy_grass',{repeat:[24,16],color:'#a7d67a',roughness:.95}));grass.rotation.x=-Math.PI/2;grass.receiveShadow=true;root.add(grass);
  const hill=new THREE.Mesh(new THREE.SphereGeometry(30,48,16,0,Math.PI*2,0,Math.PI/2),surface('leafy_grass',{repeat:[12,6],color:'#8fc766',roughness:.95}));hill.scale.set(1.6,.22,.6);hill.position.set(4,-.2,-34);root.add(hill);
  const platform=new THREE.Mesh(new RoundedBoxGeometry(...PLATFORM,3,.08),surface('castle_wall_slates',{repeat:[2.4,.5],roughness:.95,normal:1.4}));platform.position.set(CASTLE_X,PLATFORM[1]/2,0);root.add(shadowed(platform));
  const groundBody=new CANNON.Body({mass:0,shape:new CANNON.Plane()});groundBody.quaternion.setFromEuler(-Math.PI/2,0,0);world.addBody(groundBody);
  const pBody=new CANNON.Body({mass:0,shape:new CANNON.Box(new CANNON.Vec3(PLATFORM[0]/2,PLATFORM[1]/2,PLATFORM[2]/2))});pBody.position.set(CASTLE_X,PLATFORM[1]/2,0);world.addBody(pBody);
}
function buildCatapult(){
  const wood=surface('brown_planks_05',{repeat:[.6,.6],color:'#c79a6b',roughness:.85}),dark=new THREE.MeshStandardMaterial({color:'#3d3a36',metalness:.6,roughness:.5}),g=new THREE.Group();
  const beam=(w,h,d,x,y,z,rz=0)=>{const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),wood);m.position.set(x,y,z);m.rotation.z=rz;g.add(m);return m};
  [-.6,.6].forEach(z=>{beam(2.6,.22,.22,0,.35,z);beam(.22,1.5,.22,.35,1,z,-.25)});beam(.22,.22,1.4,.25,1.65,0);beam(.22,.22,1.4,-1.1,.35,0);beam(.22,.22,1.4,1.1,.35,0);
  [[-1.05,-.72],[1.05,-.72],[-1.05,.72],[1.05,.72]].forEach(([x,z])=>{const w=new THREE.Mesh(new THREE.CylinderGeometry(.34,.34,.14,20),wood);w.rotation.x=Math.PI/2;w.position.set(x,.34,z);g.add(w);const hub=new THREE.Mesh(new THREE.CylinderGeometry(.08,.08,.16,10),dark);hub.rotation.x=Math.PI/2;hub.position.copy(w.position);g.add(hub)});
  catapultArm=new THREE.Group();catapultArm.position.set(.25,1.65,0);const arm=new THREE.Mesh(new THREE.BoxGeometry(2.6,.16,.18),wood);arm.position.x=-1.1;catapultArm.add(arm);
  cup=new THREE.Mesh(new THREE.SphereGeometry(.42,20,10,0,Math.PI*2,Math.PI/2,Math.PI/2),wood);cup.position.set(-2.35,.12,0);catapultArm.add(cup);
  loaded=new THREE.Mesh(new THREE.SphereGeometry(.38,24,16),surface('castle_wall_slates',{repeat:[.5,.5],color:'#9a958d',roughness:.9,normal:1.6}));loaded.position.set(-2.35,.42,0);catapultArm.add(loaded);
  catapultArm.rotation.z=REST;g.add(catapultArm);g.position.copy(CATAPULT);root.add(shadowed(g));
  const dotGeo=new THREE.SphereGeometry(.07,10,8);dots=new THREE.InstancedMesh(dotGeo,new THREE.MeshBasicMaterial({color:'#ffffff',transparent:true,opacity:.85,toneMapped:false}),32);root.add(dots);
}
// The ball leaves the cup at the top of the swing, so the aim line starts from that pose.
function launchPoint(){const rest=catapultArm.rotation.z;catapultArm.rotation.z=RELEASE;catapultArm.updateMatrixWorld(true);const p=loaded.getWorldPosition(V());catapultArm.rotation.z=rest;catapultArm.updateMatrixWorld(true);return p}
function velocity(){const a=THREE.MathUtils.degToRad(angle);return V(Math.cos(a)*power,Math.sin(a)*power,0)}
function drawAim(){const m=new THREE.Matrix4(),p0=launchPoint(),v=velocity();for(let i=0;i<32;i++){const t=i*.07,p=V(p0.x+v.x*t,p0.y+v.y*t-4.91*t*t,0),visible=p.y>0&&i<26;m.makeScale(visible?1-i/40:0,visible?1-i/40:0,visible?1-i/40:0);m.setPosition(p);dots.setMatrixAt(i,m)}dots.instanceMatrix.needsUpdate=true;dots.visible=aiming}
function addBox(size,x,y,material,mass=1){const mesh=new THREE.Mesh(new RoundedBoxGeometry(...size,2,.04),material);mesh.castShadow=mesh.receiveShadow=true;root.add(mesh);const body=new CANNON.Body({mass,shape:new CANNON.Box(new CANNON.Vec3(size[0]/2,size[1]/2,size[2]/2)),linearDamping:.05,angularDamping:.1});body.position.set(x,y,0);body.allowSleep=true;body.sleepSpeedLimit=.15;world.addBody(body);bodies.push({mesh,body});onImpact(body);return{mesh,body}}
function buildCastle(lv){
  const L=LEVELS[lv-1],crateMat=surface('brown_planks_05',{repeat:[.45,.45],color:'#d6aa74',roughness:.8}),plankMat=paintedWood('#e9c46a'),top=PLATFORM[1];
  L.crates.forEach(([x,row])=>addBox([CRATE,CRATE,CRATE],CASTLE_X+x,top+CRATE/2+row*CRATE+.001,crateMat,1));
  (L.planks||[]).forEach(([x,y,w])=>addBox([w,.22,CRATE],CASTLE_X+x,top+y,plankMat,.8));
  L.stars.forEach(([x,y])=>{const mesh=new THREE.Mesh(starGeometry(.42,.19,.18),goldMaterial());mesh.castShadow=true;root.add(mesh);const body=new CANNON.Body({mass:.25,shape:new CANNON.Box(new CANNON.Vec3(.38,.38,.12))});const start=V(CASTLE_X+x,top+y+.42,0);body.position.set(start.x,start.y,start.z);body.allowSleep=true;world.addBody(body);const s={mesh,body,start,down:false};bodies.push(s);stars.push(s)});
}
function fire(){
  if(!aiming)return;aiming=false;shots++;ctx.sfx('creak',{volume:.8});setTimeout(()=>ctx.sfx('whoosh',{volume:.55,rate:1.3}),220);const v=velocity();drawAim();
  const from=launchPoint();
  tween({duration:260,ease:t=>t*t,update:k=>catapultArm.rotation.z=THREE.MathUtils.lerp(REST,RELEASE,k)}).then(()=>{loaded.visible=false;
    const ballMesh=new THREE.Mesh(new THREE.SphereGeometry(.42,28,20),surface('castle_wall_slates',{repeat:[.5,.5],color:'#9a958d',roughness:.9,normal:1.6}));ballMesh.castShadow=true;root.add(ballMesh);
    const body=new CANNON.Body({mass:3,shape:new CANNON.Sphere(.42),linearDamping:.01});body.position.set(from.x,from.y,0);body.velocity.set(v.x,v.y,0);world.addBody(body);
    const ball={mesh:ballMesh,body,born:simTime,judged:false};balls.push(ball);bodies.push(ball);
    return tween({duration:700,update:k=>catapultArm.rotation.z=THREE.MathUtils.lerp(RELEASE,REST,k)});
  }).then(()=>{loaded.visible=true;aiming=true;drawAim()});
}
function aim(dAngle,dPower){angle=THREE.MathUtils.clamp(angle+dAngle,15,75);power=THREE.MathUtils.clamp(power+dPower,7,19);ctx.hudNote(`Aim ${Math.round(angle)}° · Power ${Math.round((power-7)/12*100)}%`);drawAim()}
// Crates and planks knock together with a wooden thud scaled by how hard they hit.
let lastHit=0;function onImpact(body){body.addEventListener('collide',e=>{const v=Math.abs(e.contact.getImpactVelocityAlongNormal()),now=performance.now();if(v<2.2||now-lastHit<70)return;lastHit=now;ctx.sfx('crate-hit',{volume:Math.min(1,v/9),rate:.85+Math.random()*.3})})}
function clearPhysics(){bodies.forEach(b=>{world.removeBody(b.body);root.remove(b.mesh);b.mesh.geometry.dispose()});bodies=[];stars=[];balls=[]}
function start(lv){
  level=Math.min(lv,LEVELS.length);clearPhysics();buildCastle(level);shots=0;knocked=0;winShown=false;missHint=0;aiming=true;angle=45;power=11.5;
  ctx.hud(`Knock off ${stars.length} star${stars.length>1?'s':''}`,'Aim with the arrows, then launch! Watch the dotted line.');ctx.progress(0,stars.length);aim(0,0);layout();
}
function layout(){const portrait=innerHeight>innerWidth;ctx.fit(portrait?20.5:25,portrait?9:10,V(-1.2,2.6,0),{elevation:.18,pitch:true})}

export default{
  id:'launch',name:'Castle Launch',kicker:'LAUNCH',icon:'launch',
  keys:[['↑ ↓','Aim'],['← →','Power'],['Space','Launch']],
  async enter(c){
    ctx=c;root=c.root;CANNON=await import('cannon-es');
    world=new CANNON.World({gravity:new CANNON.Vec3(0,-9.82,0)});world.allowSleep=true;world.defaultContactMaterial.friction=.45;world.defaultContactMaterial.restitution=.15;
    ground();buildCatapult();ctx.lights('outdoor');
    ctx.setPad([{label:'▲',code:'ArrowUp',title:'Aim higher'},{label:'▼',code:'ArrowDown',title:'Aim lower'},{label:'−',code:'ArrowLeft',title:'Less power'},{label:'+',code:'ArrowRight',title:'More power'},{label:'Launch!',code:'Space',cls:'primary wide'}]);
    start(ctx.level);
  },
  exit(){if(world)clearPhysics();world=null},
  restart(){start(ctx.level)},
  layout,
  update(dt){
    if(!world)return;world.fixedStep(1/60,dt);simTime+=dt;
    bodies.forEach(b=>{b.mesh.position.copy(b.body.position);b.mesh.quaternion.copy(b.body.quaternion)});
    stars.forEach(s=>{if(!s.down&&(s.body.position.y<s.start.y-.7||Math.abs(s.body.position.x-s.start.x)>1.3)){s.down=true;knocked++;ctx.sfx('correct');ctx.progress(knocked,stars.length);ctx.feedback(knocked===stars.length?'Every star is down!':'Star down! Great shot!')}});
    const now=simTime;
    balls.forEach(b=>{if(!b.judged&&(b.body.position.y<.5||now-b.born>3.5)){b.judged=true;const x=b.body.position.x;if(!stars.some(s=>s.down&&now-b.born<4)){missHint++;if(x<CASTLE_X-PLATFORM[0]/2)ctx.feedback(missHint>1?'Too short! Press → for more power.':'Almost! A little more power.');else if(x>CASTLE_X+PLATFORM[0]/2+.5)ctx.feedback('Too far! Press ← for less power.')}}});
    for(const b of [...balls])if(now-b.born>9){world.removeBody(b.body);root.remove(b.mesh);b.mesh.geometry.dispose();balls.splice(balls.indexOf(b),1);bodies.splice(bodies.indexOf(b),1)}
    if(knocked===stars.length&&stars.length&&!winShown){winShown=true;ctx.celebrate(V(CASTLE_X,4,0));setTimeout(()=>ctx.win({title:'The castle is clear!',text:`You knocked down every star in ${shots} shot${shots>1?'s':''}.`}),900)}
  },
  key(code,down){if(!down)return;if(code==='ArrowUp'||code==='KeyW')aim(3,0);else if(code==='ArrowDown'||code==='KeyS')aim(-3,0);else if(code==='ArrowLeft'||code==='KeyA')aim(0,-.6);else if(code==='ArrowRight'||code==='KeyD')aim(0,.6);else if(code==='Space'||code==='Enter')fire()},
  drag(dx,dy,phase){if(phase==='start'){dragStart={angle,power};return}if(!dragStart)return;angle=dragStart.angle;power=dragStart.power;aim(-dy*.15,dx*.03)},
  tap(){fire()},
  hover(){return true}
};
