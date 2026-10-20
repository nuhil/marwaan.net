// Space page simulations: a realistic solar eclipse and staged Moon / Mars missions seen at system scale.
import * as THREE from 'three';
import {CSS2DObject} from 'three/addons/renderers/CSS2DRenderer.js';
import {play,quindar,preload,whoosh} from './core/audio.js';

// Sounds belonging to the current mission step; they stop when the step changes or the simulation ends.
const stepSounds=new Set();
function stepSound(name,options){const h=play(name,options);stepSounds.add(h);return h}
function stopStepSounds(fade=.6){stepSounds.forEach(h=>h.stop(fade));stepSounds.clear()}
// A radio call: Quindar beep, the recording, and the closing beep.
function radio(name,{volume=.6,delay=0,offset=0}={}){quindar('start',delay);return stepSound(name,{bus:'voice',volume,delay:delay+.3,offset})}
preload(['launch-roar','houston-launch','houston-orbit','descent-chatter','eagle-landed','small-step','stage-separation','thruster','crowd-cheer']);

const V=(x=0,y=0,z=0)=>new THREE.Vector3(x,y,z);
const UP=V(0,1,0);
const U=a=>V(Math.cos(a),0,-Math.sin(a));
const angleOf=v=>Math.atan2(-v.z,v.x);
const smooth=t=>t*t*(3-2*t);
const clamp01=t=>Math.min(1,Math.max(0,t));
const polar=(focus,r,a)=>focus.clone().addScaledVector(U(a),r);
// Point on a Kepler ellipse (focus at the planet), perigee rp, apogee ra, perigee direction phi, mean anomaly M.
function kepler(focus,rp,ra,phi,M){const a=(rp+ra)/2,e=(ra-rp)/(ra+rp),c=a*e,b=a*Math.sqrt(1-e*e);let E=M;for(let i=0;i<8;i++)E-=(E-e*Math.sin(E)-M)/(1-e*Math.cos(E));return focus.clone().addScaledVector(U(phi),a*Math.cos(E)-c).addScaledVector(U(phi+Math.PI/2),b*Math.sin(E))}
const bezier=(a,b,c,d)=>{const curve=new THREE.CubicBezierCurve3(a,b,c,d);return t=>curve.getPoint(t)};
function circleOverlap(d,r1,r2){if(d>=r1+r2)return 0;if(d<=Math.abs(r2-r1))return Math.PI*Math.min(r1,r2)**2;const a=r1*r1*Math.acos((d*d+r1*r1-r2*r2)/(2*d*r1)),b=r2*r2*Math.acos((d*d+r2*r2-r1*r1)/(2*d*r2)),c=.5*Math.sqrt((-d+r1+r2)*(d+r1-r2)*(d-r1+r2)*(d+r1+r2));return a+b-c}

export function createSims(api){
  const {group,camera,controls,assetTexture,glowTexture,makeRocket,setInfo,sfx,$}=api;
  let sim=null,userAt=-1e9;
  api.canvas.addEventListener('pointerdown',()=>userAt=performance.now());
  api.canvas.addEventListener('wheel',()=>userAt=performance.now(),{passive:true});

  // ---------- shared pieces ----------
  function label(text,accent){const el=document.createElement('div');el.className='planet-label';el.textContent=text;el.style.borderColor=accent+'66';const o=new CSS2DObject(el);return o}
  function planet(radius,texture,{bump=0,clouds=null,atmosphere=null,basic=false}={}){
    const g=new THREE.Group(),tilt=new THREE.Group(),map=assetTexture(texture);g.add(tilt);
    const mat=basic?new THREE.MeshBasicMaterial({map}):new THREE.MeshStandardMaterial({map,roughness:.85,bumpMap:bump?map:null,bumpScale:bump});
    const body=new THREE.Mesh(new THREE.SphereGeometry(radius,96,64),mat);tilt.add(body);g.userData={body,tilt,radius};
    if(clouds){const shell=new THREE.Mesh(new THREE.SphereGeometry(radius*1.012,96,64),new THREE.MeshStandardMaterial({color:0xffffff,alphaMap:assetTexture(clouds),transparent:true,opacity:.55,depthWrite:false}));tilt.add(shell);g.userData.clouds=shell}
    if(atmosphere){const m=new THREE.ShaderMaterial({transparent:true,blending:THREE.AdditiveBlending,depthWrite:false,uniforms:{color:{value:new THREE.Color(atmosphere)}},
      vertexShader:'varying vec3 vN;varying vec3 vV;void main(){vec4 mv=modelViewMatrix*vec4(position,1.);vN=normalize(normalMatrix*normal);vV=normalize(-mv.xyz);gl_Position=projectionMatrix*mv;}',
      fragmentShader:'uniform vec3 color;varying vec3 vN;varying vec3 vV;void main(){float f=pow(1.-max(dot(vN,vV),0.),2.6);gl_FragColor=vec4(color*f*1.4,f);}'});
      g.add(new THREE.Mesh(new THREE.SphereGeometry(radius*1.06,64,48),m))}
    return g;
  }
  function sunBall(radius,glow){const s=planet(radius,'sun.jpg',{basic:true}),halo=new THREE.Sprite(new THREE.SpriteMaterial({map:glowTexture(),transparent:true,blending:THREE.AdditiveBlending,depthWrite:false}));halo.scale.setScalar(glow);s.add(halo);return s}
  function orbitLine(points,color,opacity=.5,dashed=true){const geo=new THREE.BufferGeometry().setFromPoints(points),mat=dashed?new THREE.LineDashedMaterial({color,dashSize:.35,gapSize:.25,transparent:true,opacity}):new THREE.LineBasicMaterial({color,transparent:true,opacity});const line=new THREE.Line(geo,mat);if(dashed)line.computeLineDistances();return line}
  function ring(focus,r,color,opacity){return orbitLine(Array.from({length:181},(_,i)=>polar(focus,r,i/180*Math.PI*2)),color,opacity,false)}
  function setProgress(labelText,value){$('#progress-label').textContent=labelText;$('#progress-value').textContent=`${Math.round(value*100)}%`;$('#progress-bar').style.width=`${value*100}%`}

  // Auto camera: eases toward the current shot unless the child has just dragged or zoomed.
  function driveCamera(dt){
    if(!sim?.cam||performance.now()-userAt<4000)return;const c=sim.cam,target=(typeof c.target==='function'?c.target():c.target).clone(),dir=(typeof c.dir==='function'?c.dir():c.dir).clone().normalize(),k=1-Math.exp(-(c.speed||2)*dt);
    // On wide screens the info panel covers the left, so frame the action in the space to its right.
    // Tall phone screens pull back so wide shots fit, and lift the action above the bottom info sheet.
    const dist=c.dist*(camera.aspect<1?Math.min(2.2,.9/camera.aspect):1),visH=2*dist*Math.tan(THREE.MathUtils.degToRad(camera.fov)/2),right=V().crossVectors(UP,dir).normalize();
    if(innerWidth>760){const panel=Math.min(360,innerWidth*.3);target.addScaledVector(right,-(panel/2)/innerWidth*visH*camera.aspect)}
    else{const sheet=$('#info-panel').offsetHeight+90,camUp=V().crossVectors(dir,right).normalize();target.addScaledVector(camUp,-(sheet/2-40)/innerHeight*visH)}
    controls.target.lerp(target,k);camera.position.lerp(target.clone().addScaledVector(dir,dist),k);
  }

  // ---------- eclipse ----------
  function eclipseShadow(material,uniforms){
    material.onBeforeCompile=sh=>{Object.assign(sh.uniforms,uniforms);
      sh.vertexShader='varying vec3 vWorldE;\n'+sh.vertexShader.replace('#include <project_vertex>','#include <project_vertex>\nvWorldE=(modelMatrix*vec4(transformed,1.)).xyz;');
      sh.fragmentShader='uniform vec3 uSunE,uMoonE;uniform float uUmbra,uPenumbra;varying vec3 vWorldE;\n'+sh.fragmentShader.replace('#include <dithering_fragment>','vec3 axisE=normalize(uMoonE-uSunE);vec3 relE=vWorldE-uMoonE;float alongE=dot(relE,axisE);float distE=length(relE-axisE*alongE);float shadeE=alongE>0.?smoothstep(uUmbra,uPenumbra,distE):1.;gl_FragColor.rgb*=mix(.05,1.,shadeE);\n#include <dithering_fragment>')};
    material.customProgramCacheKey=()=>'eclipse-shadow';material.needsUpdate=true;
  }
  function eclipse(){
    const S=V(-17,0,0),E=V(0,0,0),R=1.6,orbit=5.2,sun=sunBall(2.8,24),earth=planet(R,'earth.jpg',{bump:.018,clouds:'earth-clouds.jpg',atmosphere:'#4aa8ff'}),moon=planet(.45,'moon.jpg',{bump:.02});
    sun.position.copy(S);earth.userData.tilt.rotation.z=.41;group.add(sun,earth,moon);
    const light=new THREE.DirectionalLight(0xfff3dc,3.4);light.position.copy(S);light.target=earth;group.add(light);
    const uniforms={uSunE:{value:S.clone()},uMoonE:{value:V()},uUmbra:{value:.12},uPenumbra:{value:.95}};
    eclipseShadow(earth.userData.body.material,uniforms);eclipseShadow(earth.userData.clouds.material,uniforms);
    group.add(ring(E,orbit,0x8fb4ff,.22));
    const sunTag=label('SUN','#ffb43d');sunTag.position.set(0,3.8,0);sun.add(sunTag);const earthTag=label('EARTH','#57c8ff');earthTag.position.set(0,R+.7,0);earth.add(earthTag);const moonTag=label('MOON','#dddddd');moonTag.position.set(0,.85,0);moon.add(moonTag);
    const view=$('#eclipse-view'),canvas=view.querySelector('canvas'),g=canvas.getContext('2d');view.hidden=false;
    const wide={target:()=>camera.aspect<1?V(-2.4,.3,0):V(-5.5,.3,0),dir:V(-.1,.42,1),dist:15,speed:1.2},close={target:V(-.9,0,0),dir:V(-.8,.38,.55),dist:6.2,speed:1.2};
    let theta=0,phase='',hadTotality=false,cheered=false;
    sim={kind:'eclipse',cam:wide,update(dt,t){
      const fromNew=Math.atan2(Math.sin(theta-Math.PI),Math.cos(theta-Math.PI)),slow=.18+.82*smooth(clamp01((Math.abs(fromNew)-.08)/.8));theta+=dt*.62*slow;
      const m=polar(E,orbit,theta);moon.position.copy(m);moon.userData.tilt.rotation.y=theta+Math.PI/2;uniforms.uMoonE.value.copy(m);
      earth.userData.body.rotation.y+=dt*.22;earth.userData.clouds.rotation.y+=dt*.26;
      const between=m.x<E.x,lateral=Math.hypot(m.z,m.y),s=lateral/.95*2.03,coverage=between?Math.min(1,circleOverlap(s,1,1.03)/Math.PI):0;
      drawSky(g,canvas.width,between?s*Math.sign(m.z||1):3,coverage,t);
      sim.cam=Math.abs(fromNew)<.85?close:wide;setProgress('SUN COVERED',coverage);
      const next=coverage>=.995?'total':coverage>0?'partial':hadTotality&&Math.abs(fromNew)<1.6?'after':'orbit';
      if(next!==phase){phase=next;
        if(phase==='orbit'){hadTotality=false;setInfo('MOON ORBIT','The Moon circles Earth','It goes around Earth about once a month. Watch it pass between the Sun and Earth.')}
        if(phase==='partial')setInfo('PARTIAL ECLIPSE','The Moon covers part of the Sun','The soft outer shadow, the penumbra, dims part of Earth. Look at the small window!');
        if(phase==='total'){if(!cheered){cheered=true;play('crowd-cheer',{volume:.42})}hadTotality=true;sfx('correct');setInfo('TOTAL ECLIPSE','Day turns dark!','Inside the Moon’s dark shadow, the umbra, the Sun’s glowing corona appears.')}
        if(phase==='after')setInfo('AFTER THE ECLIPSE','The Moon moves on','Eclipses are rare because the Moon’s path is tilted a little, so its shadow usually misses Earth.')}
    },stop(){view.hidden=true}};
  }
  const skyStars=Array.from({length:40},(_,i)=>[(Math.sin(i*91.7)*.5+.5),(Math.sin(i*47.3+2)*.5+.5),.5+(i%3)*.4]);
  function drawSky(g,w,offset,coverage,t){
    const c=w/2,rS=w*.16;g.clearRect(0,0,w,w);g.save();g.beginPath();g.arc(c,c,c,0,Math.PI*2);g.clip();
    const day=new THREE.Color('#62b3ec').lerp(new THREE.Color('#070b1f'),Math.pow(coverage,4));g.fillStyle=`#${day.getHexString()}`;g.fillRect(0,0,w,w);
    const night=clamp01((coverage-.96)/.04);if(night>0){g.fillStyle=`rgba(255,255,255,${night*.9})`;skyStars.forEach(([x,y,r])=>{g.beginPath();g.arc(x*w,y*w,r,0,Math.PI*2);g.fill()})}
    const glow=g.createRadialGradient(c,c,rS*.8,c,c,rS*(2.2+night*1.6));glow.addColorStop(0,night>0?`rgba(220,235,255,${.55*night+.25})`:'rgba(255,248,220,.75)');glow.addColorStop(1,'rgba(255,248,220,0)');g.fillStyle=glow;g.fillRect(0,0,w,w);
    if(night>0){g.strokeStyle=`rgba(225,238,255,${.4*night})`;g.lineCap='round';for(let i=0;i<22;i++){const a=i/22*Math.PI*2+Math.sin(i*3.1)*.2,len=rS*(1.5+Math.abs(Math.sin(i*1.7))*1.2+Math.sin(t*.8+i)*.08);g.lineWidth=1+Math.abs(Math.sin(i*2.3))*2;g.beginPath();g.moveTo(c+Math.cos(a)*rS,c+Math.sin(a)*rS);g.lineTo(c+Math.cos(a)*len,c+Math.sin(a)*len);g.stroke()}}
    const disk=g.createRadialGradient(c,c,0,c,c,rS);disk.addColorStop(0,'#fffbe8');disk.addColorStop(.85,'#ffe7a3');disk.addColorStop(1,'#ffc96b');g.fillStyle=disk;g.beginPath();g.arc(c,c,rS,0,Math.PI*2);g.fill();
    if(Math.abs(offset)<2.1){g.save();if(night<=0){g.beginPath();g.arc(c,c,rS+1,0,Math.PI*2);g.clip()}g.fillStyle='#14161d';g.beginPath();g.arc(c+offset*rS,c+offset*rS*.08,rS*1.03,0,Math.PI*2);g.fill();g.restore()}
    g.restore();$('#eclipse-cover').textContent=`${Math.round(coverage*100)}%`;
  }

  // ---------- spacecraft models ----------
  const gold=()=>new THREE.MeshPhysicalMaterial({color:'#d9a441',metalness:.9,roughness:.32,clearcoat:.4});
  const panel=()=>new THREE.MeshStandardMaterial({color:'#1d3f8f',metalness:.5,roughness:.3,emissive:'#0a1a40',emissiveIntensity:.4});
  const metal=()=>new THREE.MeshStandardMaterial({color:'#c9ced6',metalness:.85,roughness:.3});
  function plume(size=.3){const g=new THREE.Group(),outer=new THREE.Mesh(new THREE.ConeGeometry(size,size*2.6,18,1,true),new THREE.MeshBasicMaterial({color:0xff7a2a,transparent:true,opacity:.8,blending:THREE.AdditiveBlending,depthWrite:false})),inner=new THREE.Mesh(new THREE.ConeGeometry(size*.5,size*1.7,14,1,true),new THREE.MeshBasicMaterial({color:0xfff0a8,transparent:true,opacity:.95,blending:THREE.AdditiveBlending,depthWrite:false}));outer.rotation.x=inner.rotation.x=Math.PI;outer.position.y=-size*1.3;inner.position.y=-size*.85;g.add(outer,inner);g.visible=false;return g}
  function makeProbe(){const g=new THREE.Group(),body=new THREE.Mesh(new THREE.CylinderGeometry(.32,.32,.9,16),gold());g.add(body);[-1,1].forEach(s=>{const arm=new THREE.Mesh(new THREE.BoxGeometry(.9,.03,.06),metal());arm.position.x=s*.7;const p=new THREE.Mesh(new THREE.BoxGeometry(1.1,.03,.5),panel());p.position.x=s*1.5;g.add(arm,p)});const dish=new THREE.Mesh(new THREE.SphereGeometry(.3,20,10,0,Math.PI*2,0,Math.PI/2.6),metal());dish.position.y=.5;g.add(dish);const nozzle=new THREE.Mesh(new THREE.ConeGeometry(.16,.25,14,1,true),metal());nozzle.position.y=-.55;g.add(nozzle);const fire=plume(.22);fire.position.y=-.65;g.add(fire);g.userData.plume=fire;return g}
  function makeLander(){
    const g=new THREE.Group(),body=new THREE.Mesh(new THREE.CylinderGeometry(.55,.6,.42,8),gold());body.position.y=.55;g.add(body);
    const deck=new THREE.Mesh(new THREE.CylinderGeometry(.5,.5,.06,8),new THREE.MeshStandardMaterial({color:'#2b2f38',metalness:.4,roughness:.5}));deck.position.y=.79;g.add(deck);
    const solar=new THREE.Mesh(new THREE.BoxGeometry(.7,.03,.7),panel());solar.position.y=.84;solar.rotation.y=Math.PI/8;g.add(solar);
    const mast=new THREE.Mesh(new THREE.CylinderGeometry(.02,.02,.5,6),metal());mast.position.set(.25,1.05,.1);g.add(mast);const dish=new THREE.Mesh(new THREE.SphereGeometry(.12,14,8,0,Math.PI*2,0,Math.PI/2.4),metal());dish.position.set(.25,1.3,.1);dish.rotation.x=.6;g.add(dish);
    const legs=[];for(let i=0;i<4;i++){const a=i/4*Math.PI*2+Math.PI/4,pivot=new THREE.Group();pivot.position.set(Math.cos(a)*.5,.5,Math.sin(a)*.5);pivot.rotation.y=-a;const leg=new THREE.Mesh(new THREE.CylinderGeometry(.03,.03,.7,6),metal());leg.position.set(.22,-.25,0);leg.rotation.z=.75;const foot=new THREE.Mesh(new THREE.CylinderGeometry(.11,.11,.03,12),metal());foot.position.set(.45,-.5,0);pivot.add(leg,foot);g.add(pivot);legs.push(pivot)}
    const nozzle=new THREE.Mesh(new THREE.ConeGeometry(.14,.22,14,1,true),metal());nozzle.position.y=.25;g.add(nozzle);const fire=plume(.2);fire.position.y=.12;g.add(fire);
    g.userData={plume:fire,legs,deploy(k){legs.forEach(p=>p.rotation.z=(1-k)*-.9)}};g.userData.deploy(0);return g;
  }
  function makeCapsule(){const g=new THREE.Group(),shield=new THREE.Mesh(new THREE.ConeGeometry(.75,.35,28),new THREE.MeshStandardMaterial({color:'#6b4a33',roughness:.8}));shield.rotation.x=Math.PI;shield.position.y=-.1;const back=new THREE.Mesh(new THREE.ConeGeometry(.6,.7,28),new THREE.MeshStandardMaterial({color:'#e9ecef',roughness:.5,metalness:.2}));back.position.y=.4;g.add(shield,back);
    const heat=new THREE.Sprite(new THREE.SpriteMaterial({map:glowTexture('#fff2c0','#ff5a1f'),transparent:true,blending:THREE.AdditiveBlending,depthWrite:false,opacity:0}));heat.scale.setScalar(2.6);heat.position.y=-.4;g.add(heat);
    const chute=new THREE.Group(),canopy=new THREE.Mesh(new THREE.SphereGeometry(1.1,24,10,0,Math.PI*2,0,Math.PI/2.4),new THREE.MeshStandardMaterial({color:'#f1f3f5',side:THREE.DoubleSide,roughness:.7})),stripes=new THREE.Mesh(new THREE.SphereGeometry(1.11,24,10,0,Math.PI*2,Math.PI/4.2,Math.PI/9),new THREE.MeshStandardMaterial({color:'#e03131',side:THREE.DoubleSide}));canopy.position.y=stripes.position.y=1.6;chute.add(canopy,stripes);for(let i=0;i<8;i++){const a=i/8*Math.PI*2,l=orbitLine([V(0,.7,0),V(Math.cos(a)*.95,2.1,Math.sin(a)*.95)],0xdddddd,.8,false);chute.add(l)}chute.visible=false;g.add(chute);
    g.userData={heat,chute};return g}
  function dust(at,normal,color){const geo=new THREE.BufferGeometry(),n=90,pos=new Float32Array(n*3),vel=[];const side=V().crossVectors(normal,V(1,0,0)).normalize(),side2=V().crossVectors(normal,side);for(let i=0;i<n;i++){pos.set([at.x,at.y,at.z],i*3);const a=Math.random()*Math.PI*2;vel.push(side.clone().multiplyScalar(Math.cos(a)).addScaledVector(side2,Math.sin(a)).multiplyScalar(.15+Math.random()*.2).addScaledVector(normal,.04+Math.random()*.08))}geo.setAttribute('position',new THREE.BufferAttribute(pos,3));const pts=new THREE.Points(geo,new THREE.PointsMaterial({color,size:.03,transparent:true,opacity:.9,depthWrite:false}));group.add(pts);let life=2.2;return dt=>{if(life<=0)return;life-=dt;const p=geo.attributes.position;for(let i=0;i<n;i++){p.setXYZ(i,p.getX(i)+vel[i].x*dt,p.getY(i)+vel[i].y*dt,p.getZ(i)+vel[i].z*dt)}p.needsUpdate=true;pts.material.opacity=Math.max(0,life/2.2)*.9}}

  // ---------- missions ----------
  function moonPlan(){
    const E=V(0,0,0),R=1.6,M=V(18,0,-2),mR=.5,earth=planet(R,'earth.jpg',{bump:.018,clouds:'earth-clouds.jpg',atmosphere:'#4aa8ff'}),moon=planet(mR,'moon.jpg',{bump:.02}),sun=sunBall(3,26);
    earth.userData.tilt.rotation.z=.41;moon.position.copy(M);sun.position.set(-60,8,-40);group.add(earth,moon,sun);
    const light=new THREE.DirectionalLight(0xfff3dc,3.2);light.position.set(-60,8,-40);light.target=moon;group.add(light);
    const t1=label('EARTH','#62d9ff');t1.position.y=R+.6;earth.add(t1);const t2=label('MOON','#dddddd');t2.position.y=mR+.5;moon.add(t2);
    const arrive=M.clone().add(V(-.3,0,1.25)),ra=arrive.length(),phi=angleOf(arrive.clone().negate()),rp=2.4,park=kepler(E,rp,rp,phi,0),site=polar(E,R,phi-.75);
    const cap={rp:arrive.distanceTo(M),ra:5,phi:angleOf(arrive.clone().sub(M))},llo=.85,landA=cap.phi+.95,landing=polar(M,mR,landA);
    const along=(fn,t,dt=.004)=>{const a=fn(Math.min(t,1-dt)),b=fn(Math.min(1,t+dt));return b.sub(a).normalize()};
    const s1=bezier(site,site.clone().multiplyScalar(1.5),park.clone().add(U(phi+Math.PI/2).multiplyScalar(-1.2)),park);
    const steps=[
      {name:'Launch',kicker:'1 · LAUNCH',copy:'The rocket lifts off and drops its empty stages to get lighter.',dur:7,path:s1,craft:'rocket',burn:()=>true,cam:{target:()=>sim.craftPos,dir:()=>sim.craftPos.clone().normalize().multiplyScalar(.5).add(V(0,.45,1)),dist:4,speed:2.5}},
      {name:'Earth orbit',kicker:'2 · PARKING ORBIT',copy:'The spacecraft circles Earth and checks that everything works.',dur:6,path:t=>kepler(E,rp,rp,phi,t*Math.PI*2),craft:'lander',cam:{target:E,dir:V(0,.7,1),dist:10}},
      {name:'Phasing orbits',kicker:'3 · EARTH PHASING ORBITS',copy:'Each engine burn stretches the orbit bigger, like a swing going higher.',dur:10,path:t=>t<.45?kepler(E,rp,6.5,phi,t/.45*Math.PI*2):kepler(E,rp,11,phi,(t-.45)/.55*Math.PI*2),craft:'lander',burn:t=>t<.04||Math.abs(t-.45)<.03,cam:{target:V(2.5,0,-.3),dir:V(0,.8,.75),dist:22}},
      {name:'To the Moon',kicker:'4 · LUNAR TRANSIT',copy:'A big burn sends the spacecraft on a long loop out to the Moon.',dur:8,path:t=>kepler(E,rp,ra,phi,t*Math.PI),craft:'lander',burn:t=>t<.08,cam:{target:V(8.5,0,-.6),dir:V(0,.85,.6),dist:31,speed:1.4}},
      {name:'Moon capture',kicker:'5 · LUNAR CAPTURE ORBIT',copy:'It fires its engine to slow down, so the Moon’s gravity can catch it.',dur:7,path:t=>kepler(M,cap.rp,cap.ra,cap.phi,t*Math.PI*2),craft:'lander',burn:t=>t<.07,cam:{target:M,dir:V(.2,.75,.75),dist:11}},
      {name:'Low orbit',kicker:'6 · LOW LUNAR ORBIT',copy:'Lower and lower! It skims over craters, looking for a safe landing spot.',dur:6,path:t=>polar(M,THREE.MathUtils.lerp(cap.rp,llo,smooth(clamp01(t/.45))),cap.phi+t*Math.PI*2),craft:'lander',burn:t=>t<.3,cam:{target:M,dir:V(.35,.6,.8),dist:4.5}},
      {name:'Touchdown',kicker:'7 · DESCENT & TOUCHDOWN',copy:'The legs unfold, the engine slows the fall, and… touchdown on the Moon!',dur:7,path:bezier(polar(M,llo,cap.phi),polar(M,llo*.95,cap.phi+.5),landing.clone().sub(M).normalize().multiplyScalar(mR+.22).add(M),landing.clone().sub(M).normalize().multiplyScalar(mR+.005).add(M)),craft:'lander',burn:t=>t<.96,land:{at:landing,normal:landing.clone().sub(M).normalize(),color:0xbbbbbb},cam:{target:()=>sim.craftPos,dir:()=>landing.clone().sub(M).normalize().multiplyScalar(.7).add(V(.5,.35,.7)),dist:1.6,speed:1.6}}
    ];
    return{title:'Moon mission',done:['ON THE MOON','Touchdown!','The lander is safe on the Moon. Its science work can begin!'],color:0x7ff3ff,lineColor:0x3d8bff,scale:.075,steps,spin(dt){earth.userData.body.rotation.y+=dt*.05;earth.userData.clouds.rotation.y+=dt*.06},along};
  }
  function marsPlan(){
    const S=V(0,0,0),R1=11,R2=16.7,eR=.8,mR=.6,sun=sunBall(2.2,16),earth=planet(eR,'earth.jpg',{clouds:'earth-clouds.jpg',atmosphere:'#4aa8ff'}),mars=planet(mR,'mars.jpg',{bump:.025,atmosphere:'#ff9a6a'});
    group.add(sun,earth,mars,ring(S,R1,0x5aa9ff,.3),ring(S,R2,0xff8d67,.3));const light=new THREE.PointLight(0xfff1c9,420,0,1.2);group.add(light);
    const tags=[['SUN',sun,3,'#ffb43d'],['EARTH',earth,eR+.55,'#62d9ff'],['MARS',mars,mR+.5,'#ef7953']];tags.forEach(([t,o,y,c])=>{const l=label(t,c);l.position.y=y;o.add(l)});
    const th0=THREE.MathUtils.degToRad(205),earthAt=q=>polar(S,R1,th0+THREE.MathUtils.degToRad(254)*q),marsAt=q=>polar(S,R2,th0+Math.PI-THREE.MathUtils.degToRad(136)*(1-q));
    let q=0;const place=()=>{earth.position.copy(earthAt(q));mars.position.copy(marsAt(q))};place();
    const E0=earthAt(0),park=1.3,phiE=angleOf(E0),start=polar(S,R1+1.4,th0),arrive=polar(S,R2-1.1,th0+Math.PI),Mf=marsAt(1),capPhi=angleOf(arrive.clone().sub(Mf)),landA=capPhi+1;
    const landing=polar(Mf,mR,landA),landN=landing.clone().sub(Mf).normalize(),site=polar(E0,eR,phiE-.8),parkStart=polar(E0,park,phiE);
    const along=(fn,t,dt=.004)=>{const a=fn(Math.min(t,1-dt)),b=fn(Math.min(1,t+dt));return b.sub(a).normalize()};
    const steps=[
      {name:'Launch',kicker:'1 · LAUNCH',copy:'The rocket blasts off from Earth and drops its empty stages.',dur:6,path:bezier(site,site.clone().sub(E0).multiplyScalar(1.6).add(E0),parkStart.clone().addScaledVector(U(phiE+Math.PI/2),-.9),parkStart),craft:'rocket',burn:()=>true,cam:{target:()=>sim.craftPos,dir:()=>sim.craftPos.clone().sub(E0).normalize().multiplyScalar(.5).add(V(0,.45,1)),dist:3,speed:2.5}},
      {name:'Earth orbit',kicker:'2 · PARKING ORBIT',copy:'It circles Earth and waits for the right moment. Mars has to be in the right place!',dur:5,path:t=>polar(E0,park,phiE+t*Math.PI*2),craft:'probe',cam:{target:E0,dir:V(0,.7,1),dist:6}},
      {name:'Leave Earth',kicker:'3 · TRANS-MARS INJECTION',copy:'A big engine burn sends it away from Earth, into an orbit around the Sun.',dur:4,path:bezier(parkStart,parkStart.clone().addScaledVector(U(phiE+Math.PI/2),1.4),start.clone().addScaledVector(U(th0+Math.PI/2),-1.6),start),craft:'probe',burn:t=>t<.7,cam:{target:()=>sim.craftPos,dir:V(0,.8,.9),dist:10}},
      {name:'Cruise',kicker:'4 · CRUISE TO MARS',copy:'For months it coasts along half an orbit around the Sun, while Mars moves to meet it.',dur:13,path:t=>kepler(S,R1+1.4,R2-1.1,th0,t*Math.PI),craft:'probe',onTick:t=>{q=t;place()},cam:{target:V(0,0,0),dir:V(0,.9,.42),dist:46,speed:1.2}},
      {name:'Mars orbit',kicker:'5 · MARS CAPTURE ORBIT',copy:'It fires its engine to slow down, and Mars’s gravity catches it.',dur:6,path:t=>kepler(Mf,arrive.distanceTo(Mf),2.8,capPhi,t*Math.PI*2),craft:'probe',burn:t=>t<.08,onTick:()=>{q=1;place()},cam:{target:Mf,dir:V(.2,.75,.8),dist:7}},
      {name:'Entry',kicker:'6 · ENTRY & PARACHUTE',copy:'The heat shield glows hot in the air, then a big parachute opens.',dur:8,path:bezier(polar(Mf,arrive.distanceTo(Mf),capPhi),polar(Mf,mR+.55,capPhi+.55),landN.clone().multiplyScalar(mR+.4).add(Mf),landN.clone().multiplyScalar(mR+.13).add(Mf)),craft:'capsule',land:{at:landing,normal:landN,color:0xd9774a},cam:{target:()=>sim.craftPos,dir:()=>landN.clone().multiplyScalar(.6).add(V(.5,.3,.75)),dist:1.8,speed:1.6}},
      {name:'Touchdown',kicker:'7 · TOUCHDOWN',copy:'Rockets slow the last bit, the legs touch the red dust… welcome to Mars!',dur:4,path:t=>landing.clone().addScaledVector(landN,.005+.12*(1-smooth(t))),craft:'lander',burn:t=>t<.85,land:{at:landing,normal:landN,color:0xd9774a},cam:{target:()=>sim.craftPos,dir:()=>landN.clone().multiplyScalar(.7).add(V(.55,.3,.7)),dist:1.3,speed:1.6}}
    ];
    return{onEnter(i){q=i>3?1:0;place()},title:'Mars mission',done:['ON MARS','Welcome to Mars!','The lander is safe in the red dust. Time to explore!'],color:0xffb37a,lineColor:0xff8d67,scale:.07,steps,spin(dt){earth.userData.body.rotation.y+=dt*.3;mars.userData.body.rotation.y+=dt*.12},along};
  }

  function mission(kind){
    let thrusterOn=null;
    // Mission soundtrack: real NASA launch roar and radio loops per step; thrusters follow every engine burn.
    const moonTrip=kind==='moon';
    function stepAudio(i){
      if(i===0){radio('houston-launch',{volume:.5});stepSound('launch-roar',{volume:.95,delay:.6})}
      else if(i===1)radio('houston-orbit',{volume:.42});
      else if(i===2)radio('houston-orbit',{volume:.38,offset:12});
      else if(i===3)radio('houston-orbit',{volume:moonTrip?.38:.22,offset:4});
      else if(i===4)radio('houston-orbit',{volume:.34,offset:18});
      else if(i===5){if(moonTrip)quindar('start');else stepSound('launch-roar',{volume:.55,rate:.55,fadeIn:.6})}
      else if(i===6&&moonTrip)radio('descent-chatter',{volume:.6});
    }
    const onLanded=()=>{quindar('start');if(moonTrip){stepSound('eagle-landed',{bus:'voice',volume:.85,delay:.3});quindar('end',5.7);stepSound('crowd-cheer',{volume:.32,delay:6});radio('small-step',{volume:.6,delay:9.5})}else{stepSound('crowd-cheer',{volume:.45,delay:.4});quindar('end',3)}};
    const plan=kind==='moon'?moonPlan():marsPlan(),scale=plan.scale;
    // Planned route (dashed), numbered markers and a trail that draws as the craft flies.
    plan.steps.forEach((s,i)=>{if(i>0)group.add(orbitLine(Array.from({length:161},(_,k)=>s.path(k/160)),plan.lineColor,.45));const el=document.createElement('div');el.className='mission-marker';el.textContent=i+1;const m=new CSS2DObject(el);m.position.copy(s.path(0));group.add(m);s.marker=el});
    const trailGeo=new THREE.BufferGeometry(),trailPos=new Float32Array(6000*3);trailGeo.setAttribute('position',new THREE.BufferAttribute(trailPos,3));trailGeo.setDrawRange(0,0);const trail=new THREE.Line(trailGeo,new THREE.LineBasicMaterial({color:plan.color,transparent:true,opacity:.9}));group.add(trail);let trailN=0;const last=V(1e9,0,0);
    const addTrail=p=>{if(p.distanceTo(last)<.03||trailN>=6000)return;trailPos.set([p.x,p.y,p.z],trailN*3);trailN++;trailGeo.setDrawRange(0,trailN);trailGeo.attributes.position.needsUpdate=true;last.copy(p)};
    const crafts={rocket:null,probe:makeProbe(),lander:makeLander(),capsule:makeCapsule()};Object.values(crafts).forEach(c=>{if(c){c.scale.setScalar(scale);c.visible=false;group.add(c)}});
    const debris=[];let rocket=null,stage=0,dustTick=null;
    const freshRocket=()=>{if(rocket)group.remove(rocket);rocket=makeRocket();rocket.scale.setScalar(scale*1.6);group.add(rocket);crafts.rocket=rocket;stage=0};
    const detach=(part)=>{if(!part)return;play('stage-separation',{volume:.8});const p=part.getWorldPosition(V()),q=part.getWorldQuaternion(new THREE.Quaternion()),s=part.getWorldScale(V());group.attach(part);part.position.copy(p);part.quaternion.copy(q);part.scale.copy(s);debris.push({o:part,v:sim.craftPos.clone().normalize().multiplyScalar(-.25).add(V((Math.random()-.5)*.2,-.15,(Math.random()-.5)*.2)),spin:(Math.random()-.5)*2});/* separation sound plays in detach() */};
    const timeline=$('#mission-timeline');timeline.innerHTML=plan.steps.map((s,i)=>`<button type="button" class="ms-step" data-i="${i}"><b>${i+1}</b><span>${s.name}</span></button>`).join('');timeline.hidden=false;
    timeline.querySelectorAll('.ms-step').forEach(b=>b.onclick=()=>{enter(Number(b.dataset.i));sfx('tap')});
    function enter(i){
      stopStepSounds();thrusterOn=null;stepAudio(i);
      sim.step=i;sim.t=0;sim.done=false;const s=plan.steps[i];
      if(s.craft==='rocket')freshRocket();else if(rocket){group.remove(rocket);rocket=null}
      Object.entries(crafts).forEach(([k,c])=>{if(c)c.visible=k===s.craft});if(crafts.lander)crafts.lander.userData.deploy(s.land?0:0);
      // Rebuild the trail from the earlier steps so jumping ahead keeps the route drawn.
      trailN=0;last.set(1e9,0,0);for(let k=0;k<i;k++)for(let j=0;j<=80;j++)addTrail(plan.steps[k].path(j/80));
      plan.steps.forEach((st,k)=>{st.marker.classList.toggle('reached',k<=i);st.marker.classList.toggle('active',k===i)});
      timeline.querySelectorAll('.ms-step').forEach((b,k)=>{b.classList.toggle('active',k===i);b.classList.toggle('done',k<i)});
      setInfo(`${plan.title.toUpperCase()} · STEP ${i+1} OF ${plan.steps.length}`,s.name,s.copy);sim.cam=s.cam;if(i>0)sfx('tap');
      plan.onEnter?.(i);if(s.onTick)s.onTick(0);
    }
    sim={kind,step:0,t:0,craftPos:plan.steps[0].path(0),cam:null,update(dt,time){
      plan.spin(dt);debris.forEach(d=>{d.o.position.addScaledVector(d.v,dt);d.o.rotation.z+=d.spin*dt});dustTick?.(dt);
      if(sim.done)return;const s=plan.steps[sim.step];sim.t=Math.min(1,sim.t+dt/s.dur);const t=sim.t,p=s.path(t);sim.craftPos=p;addTrail(p);s.onTick?.(t);
      const craft=crafts[s.craft];if(!craft)return;craft.position.copy(p);
      const fwd=plan.along(s.path,t),qFly=new THREE.Quaternion().setFromUnitVectors(UP,fwd);
      if(s.land){const qUp=new THREE.Quaternion().setFromUnitVectors(UP,s.land.normal),k=smooth(clamp01((t-.15)/.6));craft.quaternion.copy(qFly).slerp(qUp,s.craft==='capsule'?1:k)}else craft.quaternion.copy(qFly);
      const burning=s.burn?s.burn(t):false;if(burning&&!thrusterOn)thrusterOn=stepSound('thruster',{loop:true,volume:s.land?.55:.4,fadeIn:.15,rate:s.craft==='rocket'?.8:1});else if(!burning&&thrusterOn){thrusterOn.stop(.4);stepSounds.delete(thrusterOn);thrusterOn=null}if(craft.userData.plume){craft.userData.plume.visible=burning;craft.userData.plume.scale.y=.85+Math.sin(time*40)*.15}
      if(s.craft==='rocket'){const f=rocket.userData;[f.flame1,f.flame2].forEach(fl=>fl&&(fl.scale.y=.8+Math.sin(time*35)*.18));if(t>.4&&stage===0){detach(f.stage1);f.stage1=null;f.flame2.visible=true;stage=1}if(t>.78&&stage===1){detach(f.stage2);f.stage2=null;stage=2}}
      if(s.craft==='lander'&&s.land)craft.userData.deploy(smooth(clamp01((t-.2)/.4)));
      if(s.craft==='capsule'){const u=craft.userData;u.heat.material.opacity=Math.sin(Math.PI*clamp01(t/.5))*.95;if(t>.55&&!u.chute.visible){play('soft-thud',{volume:.8});whoosh(false,.5);stepSounds.forEach(h=>h.volume(.12,.8))}u.chute.visible=t>.55;if(u.chute.visible)u.chute.scale.setScalar(Math.min(1,(t-.55)/.08))}
      const pct=(sim.step+t)/plan.steps.length;setProgress(`STEP ${sim.step+1} · ${s.name.toUpperCase()}`,pct);
      if(t>=1){
        if(s.land&&!s.landed){s.landed=true;dustTick=dust(s.land.at,s.land.normal,s.land.color);if(s.craft!=='capsule')play('soft-thud',{volume:.9})}
        if(sim.step<plan.steps.length-1){
          // Swap the capsule for the lander at the end of the Mars entry step.
          if(s.craft==='capsule'){const l=crafts.lander;l.position.copy(p);l.quaternion.copy(craft.quaternion)}
          enter(sim.step+1);
        }else{sim.done=true;crafts.lander.userData.deploy(1);onLanded();if(crafts.lander.userData.plume)crafts.lander.userData.plume.visible=false;setProgress('MISSION COMPLETE',1);const [k,ti,c]=plan.done;setInfo(k,ti,c);sfx('correct');timeline.querySelectorAll('.ms-step').forEach(b=>b.classList.add('done'))}
      }
    },stop(){timeline.hidden=true;timeline.innerHTML='';stopStepSounds(.4)}};
    enter(0);
  }

  return{
    start(kind){
      api.stopFlight();controls.autoRotate=false;controls.minDistance=.6;api.solarLight.visible=false;api.viewLight.intensity=6;userAt=-1e9;
      if(kind==='eclipse')eclipse();else mission(kind);return sim;
    },
    update(dt,now){if(!sim)return;sim.update(dt,now/1000);driveCamera(dt)},
    stop(){if(!sim)return;sim.stop?.();sim=null;controls.minDistance=4;api.solarLight.visible=true;api.viewLight.intensity=58}
  };
}
