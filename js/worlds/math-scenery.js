// The Number Pals Meadow island: terrain, grass, trees, barn, pond, props, and sky.
// Surfaces use CC0 Poly Haven textures from assets/math/textures; plants and buildings are built here.
import * as THREE from 'three';
import {RoundedBoxGeometry} from 'three/addons/geometries/RoundedBoxGeometry.js';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {makeFlower,mulberry} from './math-models.js';

const V=(x,y,z)=>new THREE.Vector3(x,y,z);
const ISLAND_RADIUS=17;

// ---------- textures and materials ----------
// Each image loads once; differently tiled copies share its pixels and are refreshed when it arrives.
const loader=new THREE.TextureLoader(),images=new Map(),textures=new Map();
function texture(name,kind,repeat){
  const key=`${name}:${kind}:${repeat}`;if(textures.has(key))return textures.get(key);
  const file=`${name}-${kind}`;if(!images.has(file)){const entry={base:null,copies:[]};entry.base=loader.load(`assets/math/textures/${file}.jpg`,()=>entry.copies.forEach(c=>{c.source=entry.base.source;c.needsUpdate=true}));images.set(file,entry)}
  const {base,copies}=images.get(file),t=new THREE.Texture();if(base.image){t.source=base.source;t.needsUpdate=true}else copies.push(t);t.wrapS=t.wrapT=THREE.RepeatWrapping;t.repeat.set(...repeat);t.anisotropy=8;if(kind==='color')t.colorSpace=THREE.SRGBColorSpace;
  textures.set(key,t);return t;
}
const surfaces=new Map();
function surface(name,options={}){
  const key=name+JSON.stringify(options);if(!surfaces.has(key))surfaces.set(key,makeSurface(name,options));return surfaces.get(key);
}
function makeSurface(name,{repeat=[1,1],color='#ffffff',roughness=.85,metalness=0,normal=1}={}){
  return new THREE.MeshStandardMaterial({map:texture(name,'color',repeat),normalMap:texture(name,'normal',repeat),normalScale:new THREE.Vector2(normal,normal),color,roughness,metalness});
}
const shadowed=o=>{o.traverse(m=>{if(m.isMesh){m.castShadow=true;m.receiveShadow=true}});return o};

// ---------- noise ----------
function hash(x,y){const s=Math.sin(x*127.1+y*311.7)*43758.5453;return s-Math.floor(s)}
function noise(x,y){const ix=Math.floor(x),iy=Math.floor(y),fx=x-ix,fy=y-iy,u=fx*fx*(3-2*fx),v=fy*fy*(3-2*fy);return THREE.MathUtils.lerp(THREE.MathUtils.lerp(hash(ix,iy),hash(ix+1,iy),u),THREE.MathUtils.lerp(hash(ix,iy+1),hash(ix+1,iy+1),u),v)*2-1}
const fbm=(x,y)=>noise(x,y)*.6+noise(x*2.1,y*2.1)*.28+noise(x*4.3,y*4.3)*.12;

// ---------- terrain ----------
// Play spots stay flat; hills rise between them and the island edge rolls off into the cliff.
function makeHeight(flatSpots){
  const hills=[[-13,-10,1.6,26],[12,-9,1.1,20],[-14,6,.9,16],[10,10,.7,14]];
  return(x,z)=>{
    const r=Math.hypot(x,z);let flat=1;for(const [sx,sz,radius] of flatSpots){const d=Math.hypot(x-sx,z-sz);flat=Math.min(flat,THREE.MathUtils.smoothstep(d,radius,radius+2.5))}
    let h=fbm(x*.18,z*.18)*.28;for(const [hx,hz,height,spread] of hills)h+=height*Math.exp(-((x-hx)**2+(z-hz)**2)/spread);
    h*=flat;if(r>ISLAND_RADIUS-2)h-=((r-(ISLAND_RADIUS-2))/2)**2*.7;return h;
  };
}
function terrainMesh(heightAt){
  const rings=60,segments=180,pos=[],uv=[],index=[];
  for(let i=0;i<=rings;i++){const r=ISLAND_RADIUS*Math.pow(i/rings,.85);for(let j=0;j<=segments;j++){const a=j/segments*Math.PI*2,x=Math.cos(a)*r,z=Math.sin(a)*r;pos.push(x,heightAt(x,z),z);uv.push(x/5,z/5)}}
  for(let i=0;i<rings;i++)for(let j=0;j<segments;j++){const a=i*(segments+1)+j,b=a+segments+1;index.push(a,a+1,b,b,a+1,b+1)}
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));g.setIndex(index);g.computeVertexNormals();
  const ground=new THREE.Mesh(g,surface('leafy_grass',{repeat:[1,1],color:'#9fcf6a',roughness:.95,normal:.8}));ground.receiveShadow=true;return ground;
}
function cliffMesh(heightAt){
  const top=heightAt(ISLAND_RADIUS,0),g=new THREE.CylinderGeometry(ISLAND_RADIUS,ISLAND_RADIUS*.62,6.5,140,14,true),p=g.attributes.position,v=new THREE.Vector3();
  for(let i=0;i<p.count;i++){v.fromBufferAttribute(p,i);const a=Math.atan2(v.z,v.x),t=(v.y+3.25)/6.5,push=t>.97?0:fbm(a*6,v.y*.7)*.9+fbm(a*18,v.y*2)*.25;const len=Math.hypot(v.x,v.z)+push;v.x=Math.cos(a)*len;v.z=Math.sin(a)*len;v.y=v.y-3.25+top;p.setXYZ(i,v.x,v.y,v.z)}
  g.computeVertexNormals();const cliff=new THREE.Mesh(g,surface('cliff_side',{repeat:[10,1.6],roughness:.95,normal:1.4}));cliff.receiveShadow=true;
  const base=new THREE.ConeGeometry(ISLAND_RADIUS*.64,7,40,6),bp=base.attributes.position;for(let i=0;i<bp.count;i++){v.fromBufferAttribute(bp,i);const a=Math.atan2(v.z,v.x),s=1+fbm(a*5,v.y*.5)*.18;bp.setXYZ(i,v.x*s,v.y,v.z*s)}base.computeVertexNormals();
  const rock=new THREE.Mesh(base,surface('rock_04',{repeat:[4,2],color:'#b9a998',normal:1.2}));rock.rotation.x=Math.PI;rock.position.y=top-6.5-3.5+.01;
  const group=new THREE.Group();group.add(cliff,rock);return group;
}

// ---------- grass that sways in the wind ----------
function makeGrass(heightAt,keepClear,count=14000){
  const blade=new THREE.PlaneGeometry(.06,.3,1,4),p=blade.attributes.position,colors=[];blade.translate(0,.15,0);
  for(let i=0;i<p.count;i++){const y=p.getY(i)/.3;p.setX(i,p.getX(i)*(1-y*.9));p.setZ(i,y*y*.08);const c=new THREE.Color('#3d7a2c').lerp(new THREE.Color('#b5df72'),y);colors.push(c.r,c.g,c.b)}
  blade.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));blade.computeVertexNormals();
  const material=new THREE.MeshStandardMaterial({vertexColors:true,side:THREE.DoubleSide,roughness:.85});const time={value:0};
  material.onBeforeCompile=shader=>{shader.uniforms.uTime=time;shader.vertexShader='uniform float uTime;\n'+shader.vertexShader.replace('#include <begin_vertex>',`#include <begin_vertex>
    vec4 root=instanceMatrix*vec4(0.,0.,0.,1.);float bend=pow(position.y/.3,2.);float gust=sin(uTime*1.6+root.x*.45+root.z*.3)*.11+sin(uTime*3.1+root.x*1.7)*.035;
    transformed.x+=gust*bend;transformed.z+=gust*.5*bend;`)};
  const mesh=new THREE.InstancedMesh(blade,material,count),m4=new THREE.Matrix4(),q=new THREE.Quaternion(),s=new THREE.Vector3(),rand=mulberry(99);let placed=0;
  for(let tries=0;placed<count&&tries<count*4;tries++){
    const a=rand()*Math.PI*2,r=Math.sqrt(rand())*(ISLAND_RADIUS-.4),x=Math.cos(a)*r,z=Math.sin(a)*r;if(keepClear(x,z))continue;
    q.setFromAxisAngle(V(0,1,0),rand()*Math.PI*2);const k=.65+rand()*.6;s.set(k,k*(.7+rand()*.6),k);m4.compose(V(x,heightAt(x,z)-.02,z),q,s);mesh.setMatrixAt(placed++,m4);
  }
  mesh.count=placed;mesh.receiveShadow=true;mesh.userData.time=time;return mesh;
}

// ---------- trees ----------
let leafTexture=null;
function leaves(){
  if(leafTexture)return leafTexture;const c=document.createElement('canvas');c.width=c.height=256;const g=c.getContext('2d'),rand=mulberry(5);
  for(let i=0;i<34;i++){const x=30+rand()*196,y=30+rand()*196,len=26+rand()*22,a=rand()*Math.PI*2,shade=110+rand()*80;g.save();g.translate(x,y);g.rotate(a);g.fillStyle=`rgb(${shade*.45|0},${shade|0},${shade*.35|0})`;g.beginPath();g.moveTo(0,-len/2);g.quadraticCurveTo(len*.42,0,0,len/2);g.quadraticCurveTo(-len*.42,0,0,-len/2);g.fill();g.strokeStyle='rgba(30,60,20,.45)';g.lineWidth=1.2;g.beginPath();g.moveTo(0,-len/2);g.lineTo(0,len/2);g.stroke();g.restore()}
  leafTexture=new THREE.CanvasTexture(c);leafTexture.colorSpace=THREE.SRGBColorSpace;return leafTexture;
}
function foliage(clusters,rand){
  const cards=[];
  for(const [center,radius] of clusters){
    const n=Math.round(22*radius*radius+8);
    for(let i=0;i<n;i++){
      const card=new THREE.PlaneGeometry(1.15,1.15),dir=V(rand()-.5,rand()-.4,rand()-.5).normalize(),pos=center.clone().addScaledVector(dir,radius*Math.cbrt(rand()));
      card.applyMatrix4(new THREE.Matrix4().makeRotationFromEuler(new THREE.Euler(rand()*6.3,rand()*6.3,rand()*6.3)));card.translate(pos.x,pos.y,pos.z);
      // Normals point away from the canopy centre so the whole crown shades like one soft volume.
      const p=card.attributes.position,nrm=card.attributes.normal,color=new THREE.Color().setHSL(.24+rand()*.06,.5+rand()*.2,.32+rand()*.14),cols=[];
      for(let k=0;k<p.count;k++){const out=V(p.getX(k),p.getY(k),p.getZ(k)).sub(center).normalize();nrm.setXYZ(k,out.x,out.y,out.z);cols.push(color.r,color.g,color.b)}
      card.setAttribute('color',new THREE.Float32BufferAttribute(cols,3));cards.push(card);
    }
  }
  const mesh=new THREE.Mesh(mergeGeometries(cards),new THREE.MeshStandardMaterial({map:leaves(),vertexColors:true,alphaTest:.45,side:THREE.DoubleSide,roughness:.8}));
  mesh.customDepthMaterial=new THREE.MeshDepthMaterial({depthPacking:THREE.RGBADepthPacking,map:leaves(),alphaTest:.45});mesh.castShadow=true;mesh.receiveShadow=true;return mesh;
}
function bentLimb(length,radiusBottom,radiusTop,bend,material,rand){
  const g=new THREE.CylinderGeometry(radiusTop,radiusBottom,length,12,8);g.translate(0,length/2,0);const p=g.attributes.position;
  for(let i=0;i<p.count;i++){const y=p.getY(i)/length,flare=y<.08?1+(1-y/.08)*.45:1;p.setX(i,p.getX(i)*flare+Math.sin(y*Math.PI*.8)*bend);p.setZ(i,p.getZ(i)*flare+Math.sin(y*2.3+rand)*bend*.4)}
  g.computeVertexNormals();return new THREE.Mesh(g,material);
}
export function makeTree(seed){
  const rand=mulberry(seed),tree=new THREE.Group(),bark=surface('bark_brown_02',{repeat:[2,3],roughness:.95,normal:1.3}),height=3.2+rand()*1.4;
  const trunk=bentLimb(height,.34,.17,.25*(rand()-.5),bark,rand());tree.add(trunk);
  const clusters=[[V(0,height+.6,0),1.6]];
  const branches=3+Math.floor(rand()*2);
  for(let i=0;i<branches;i++){const a=i/branches*Math.PI*2+rand(),len=1.3+rand()*.9,y=height*(.55+rand()*.3),limb=bentLimb(len,.12,.05,.15,bark,rand());limb.position.set(0,y,0);limb.rotation.set(0,a,.75+rand()*.35);tree.add(limb);
    const tip=V(0,len,0).applyEuler(limb.rotation).add(limb.position);clusters.push([tip.add(V(0,.25,0)),1+rand()*.4])}
  for(let i=0;i<3;i++){const a=rand()*Math.PI*2;clusters.push([V(Math.cos(a)*.9,height+.1+rand()*.6,Math.sin(a)*.9),1.1+rand()*.3])}
  tree.add(foliage(clusters,rand));shadowed(trunk);tree.children.forEach(c=>{c.castShadow=true;c.receiveShadow=true});
  tree.scale.setScalar(.85+rand()*.35);return tree;
}
function makeBush(seed){const rand=mulberry(seed),clusters=[];for(let i=0;i<3;i++)clusters.push([V((rand()-.5)*1.1,.5+rand()*.25,(rand()-.5)*.8),.65+rand()*.25]);return foliage(clusters,rand)}

// ---------- rocks ----------
function makeBoulder(seed,size){
  const rand=mulberry(seed),g=new THREE.IcosahedronGeometry(1,4),p=g.attributes.position,v=new THREE.Vector3(),o=rand()*50;
  for(let i=0;i<p.count;i++){v.fromBufferAttribute(p,i);const n=fbm(v.x*1.4+o,v.y*1.4+v.z)*.28+fbm(v.z*3+o,v.x*3)*.08;v.multiplyScalar(1+n);v.y*=.62;p.setXYZ(i,v.x,v.y,v.z)}
  g.computeVertexNormals();const rock=new THREE.Mesh(g,surface('rock_04',{repeat:[1.5,1.5],color:'#c9bcae',normal:1.3}));rock.scale.setScalar(size);rock.rotation.y=rand()*6;return shadowed(rock);
}

// ---------- barn, hay, fence ----------
function boxWithRepeat(w,h,d,name,unit,options={}){
  const r=(a,b)=>[a/unit,b/unit],mats=[r(d,h),r(d,h),r(w,d),r(w,d),r(w,h),r(w,h)].map(repeat=>surface(name,{...options,repeat}));
  return new THREE.Mesh(new THREE.BoxGeometry(w,h,d),mats);
}
function gable(width,height,material){const s=new THREE.Shape();s.moveTo(-width/2,0);s.lineTo(width/2,0);s.lineTo(0,height);s.closePath();const g=new THREE.ShapeGeometry(s);const uv=g.attributes.uv;for(let i=0;i<uv.count;i++)uv.setXY(i,uv.getX(i)/2,uv.getY(i)/2);return new THREE.Mesh(g,material)}
function makeBarn(){
  const barn=new THREE.Group(),W=5,H=3,D=3.8,roofRise=1.7,red={color:'#b8463b',roughness:.85},white={color:'#f3efe6',roughness:.8};
  const base=boxWithRepeat(W+.3,.4,D+.3,'cobblestone_floor_07',1.2,{color:'#d8d2c8'});base.position.y=.15;barn.add(base);
  const walls=boxWithRepeat(W,H,D,'distressed_painted_planks',1.6,red);walls.position.y=.35+H/2;barn.add(walls);
  const gableMat=surface('distressed_painted_planks',{...red,repeat:[1/.8,1/.8]});gableMat.side=THREE.DoubleSide;
  for(const z of [D/2+.001,-D/2-.001]){const g=gable(W,roofRise,gableMat);g.position.set(0,.35+H,z);if(z<0)g.rotation.y=Math.PI;barn.add(g)}
  const slope=Math.atan2(roofRise,W/2),slab=Math.hypot(W/2,roofRise)+.45;
  for(const side of [-1,1]){const roof=boxWithRepeat(slab,.1,D+.7,'corrugated_iron_02',1.1,{color:'#8d9298',roughness:.5,metalness:.55,normal:1.4});roof.rotation.z=-side*slope;roof.position.set(side*(W/4+.08),.35+H+roofRise/2+.08,0);barn.add(roof)}
  const ridge=new THREE.Mesh(new THREE.BoxGeometry(.25,.12,D+.75),new THREE.MeshStandardMaterial({color:'#5f6368',metalness:.6,roughness:.4}));ridge.position.y=.35+H+roofRise+.1;barn.add(ridge);
  const trimMat=surface('distressed_painted_planks',{...white,repeat:[.6,.6]}),trim=(w,h,d,x,y,z,rz=0)=>{const b=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),trimMat);b.position.set(x,y,z);b.rotation.z=rz;barn.add(b);return b};
  for(const x of [-W/2,W/2])for(const z of [-D/2,D/2])trim(.16,H,.16,x,.35+H/2,z);
  for(const z of [D/2+.04,-D/2-.04])for(const side of [-1,1]){const len=Math.hypot(W/2,roofRise)+.3;trim(len,.14,.06,side*W/4,.35+H+roofRise/2,z,-side*slope)}
  // Big sliding door with X-braces, its track, and the hayloft door above.
  const doorMat=surface('distressed_painted_planks',{color:'#9e3a31',roughness:.85,repeat:[1.2,1.4]}),z=D/2+.06;
  for(const side of [-1,1]){const door=new THREE.Mesh(new THREE.BoxGeometry(1.05,2.2,.08),doorMat);door.position.set(side*.55,.35+1.1,z);barn.add(door);
    trim(1.05,.12,.03,side*.55,.35+2.15,z+.05);trim(1.05,.12,.03,side*.55,.35+.06,z+.05);trim(.12,2.2,.03,side*(.55+.47),.35+1.1,z+.05);const brace=Math.atan2(2.1,.95);trim(Math.hypot(.95,2.1),.1,.03,side*.55,.35+1.1,z+.06,brace*(side));trim(Math.hypot(.95,2.1),.1,.03,side*.55,.35+1.1,z+.06,-brace*side)}
  const track=new THREE.Mesh(new THREE.BoxGeometry(3.4,.08,.08),new THREE.MeshStandardMaterial({color:'#2f3134',metalness:.8,roughness:.35}));track.position.set(0,.35+2.35,z+.04);barn.add(track);
  const loft=new THREE.Mesh(new THREE.BoxGeometry(.9,.9,.06),doorMat);loft.position.set(0,.35+H+.55,D/2+.04);barn.add(loft);trim(.9,.09,.03,0,.35+H+.55,D/2+.08,Math.PI/4);trim(.9,.09,.03,0,.35+H+.55,D/2+.08,-Math.PI/4);
  const glass=new THREE.MeshPhysicalMaterial({color:'#2a3d52',roughness:.1,metalness:.2,clearcoat:1});
  for(const zz of [-.9,.9]){const win=new THREE.Mesh(new THREE.BoxGeometry(.04,.7,.7),glass);win.position.set(W/2+.02,.35+1.8,zz);barn.add(win);trim(.06,.08,.8,W/2+.04,.35+2.17,zz);trim(.06,.08,.8,W/2+.04,.35+1.43,zz);trim(.06,.78,.08,W/2+.04,.35+1.8,zz+.37);trim(.06,.78,.08,W/2+.04,.35+1.8,zz-.37);trim(.05,.7,.05,W/2+.05,.35+1.8,zz)}
  const vane=new THREE.Group(),metal=new THREE.MeshStandardMaterial({color:'#3a3a3a',metalness:.7,roughness:.4}),pole=new THREE.Mesh(new THREE.CylinderGeometry(.02,.02,.7,6),metal);pole.position.y=.35;vane.add(pole);const arrow=new THREE.Mesh(new THREE.ConeGeometry(.06,.25,4),metal);arrow.rotation.z=-Math.PI/2;arrow.position.set(.25,.6,0);vane.add(arrow);const tail=new THREE.Mesh(new THREE.BoxGeometry(.25,.14,.01),metal);tail.position.set(-.18,.6,0);vane.add(tail);vane.position.y=.35+H+roofRise+.15;vane.rotation.y=.6;barn.add(vane);
  return shadowed(barn);
}
let hayTexture=null;
function hay(){if(hayTexture)return hayTexture;const c=document.createElement('canvas');c.width=c.height=256;const g=c.getContext('2d');g.fillStyle='#d9b45a';g.fillRect(0,0,256,256);for(let i=0;i<1800;i++){const x=Math.random()*256,y=Math.random()*256,l=6+Math.random()*18,shade=150+Math.random()*90;g.strokeStyle=`rgba(${shade},${shade*.82|0},${shade*.35|0},.7)`;g.lineWidth=.6+Math.random();g.beginPath();g.moveTo(x,y);g.lineTo(x+l,y+(Math.random()-.5)*4);g.stroke()}hayTexture=new THREE.CanvasTexture(c);hayTexture.colorSpace=THREE.SRGBColorSpace;hayTexture.wrapS=hayTexture.wrapT=THREE.RepeatWrapping;return hayTexture}
function makeHayBale(){const m=new THREE.MeshStandardMaterial({map:hay(),bumpMap:hay(),bumpScale:.03,roughness:1}),bale=new THREE.Mesh(new THREE.CylinderGeometry(.55,.55,1,28),m);bale.rotation.z=Math.PI/2;bale.position.y=.55;const g=new THREE.Group();g.add(bale);return shadowed(g)}
export function makeFence(length,seed=1){
  const g=new THREE.Group(),rand=mulberry(seed),posts=Math.round(length/1.3)+1;
  const postMat=surface('brown_planks_05',{color:'#c8b49a',repeat:[.3,1.1]});
  for(let i=0;i<posts;i++){const p=new THREE.Mesh(new THREE.BoxGeometry(.13,1.05,.13),postMat);p.position.set(i*length/(posts-1)-length/2,.5,0);p.rotation.set((rand()-.5)*.06,(rand()-.5)*.2,(rand()-.5)*.06);g.add(p)}
  for(const y of [.38,.8]){const rail=boxWithRepeat(length,.11,.05,'brown_planks_05',1.4,{color:'#d2bfa4'});rail.position.set(0,y,.08);rail.rotation.z=(rand()-.5)*.01;g.add(rail)}
  return shadowed(g);
}

// ---------- play areas ----------
export function makeStage(colors){
  const g=new THREE.Group(),top=new THREE.Mesh(new THREE.CylinderGeometry(3.3,3.4,.22,72),[surface('rock_04',{repeat:[6,.3],color:'#d8cfc4'}),surface('cobblestone_floor_07',{repeat:[2.6,2.6],color:'#efe6d8',normal:1.2}),surface('rock_04')]);top.position.y=.06;g.add(top);
  colors.forEach((color,i)=>{const a=i/colors.length*Math.PI*2,tile=new THREE.Mesh(new RoundedBoxGeometry(.6,.08,.6,2,.04),new THREE.MeshStandardMaterial({color,roughness:.55}));tile.position.set(Math.cos(a)*2.85,.2,Math.sin(a)*2.85);tile.rotation.y=-a;g.add(tile)});
  return shadowed(g);
}
export function makeSoilBed(w,d){
  const g=new THREE.Group(),soil=new THREE.Mesh(new THREE.BoxGeometry(w,.22,d),[0,1,2,3,4,5].map(()=>surface('farm_soil',{repeat:[w/2.2,d/2.2],color:'#a88b72',normal:1.6})));soil.position.y=.06;g.add(soil);
  for(const [x,z,len,rot] of [[0,d/2+.08,w+.32,0],[0,-d/2-.08,w+.32,0],[w/2+.08,0,d,Math.PI/2],[-w/2-.08,0,d,Math.PI/2]]){const board=boxWithRepeat(len,.3,.12,'brown_planks_05',1.2,{color:'#b49a7c'});board.position.set(x,.12,z);board.rotation.y=rot;g.add(board)}
  return shadowed(g);
}
function makeBlanket(){
  const c=document.createElement('canvas');c.width=c.height=512;const x=c.getContext('2d');for(let i=0;i<8;i++)for(let j=0;j<8;j++){x.fillStyle=(i+j)%2?'#f7f1e8':'#d9453b';x.fillRect(i*64,j*64,64,64)}
  x.globalAlpha=.12;for(let i=0;i<512;i+=3){x.fillStyle=i%6?'#000':'#fff';x.fillRect(i,0,1,512);x.fillRect(0,i,512,1)}
  const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;const geo=new THREE.PlaneGeometry(6.4,4.2,40,28),p=geo.attributes.position;
  for(let i=0;i<p.count;i++){const px=p.getX(i),py=p.getY(i),edge=Math.max(Math.abs(px)/3.2,Math.abs(py)/2.1);p.setZ(i,fbm(px*.9,py*.9)*.04+(edge>.93?(edge-.93)*.3:0))}
  geo.computeVertexNormals();const m=new THREE.Mesh(geo,new THREE.MeshStandardMaterial({map:t,roughness:.95}));m.rotation.x=-Math.PI/2;m.position.y=.03;m.receiveShadow=true;return m;
}
function rippleNormals(){
  const size=256,c=document.createElement('canvas');c.width=c.height=size;const g=c.getContext('2d'),img=g.createImageData(size,size),h=(x,y)=>Math.sin(x*.19+y*.07)*.5+Math.sin(x*.05-y*.21)*.5+noise(x*.06,y*.06)*.8;
  for(let y=0;y<size;y++)for(let x=0;x<size;x++){const dx=h(x+1,y)-h(x-1,y),dy=h(x,y+1)-h(x,y-1),n=V(-dx,-dy,2).normalize(),i=(y*size+x)*4;img.data[i]=(n.x*.5+.5)*255;img.data[i+1]=(n.y*.5+.5)*255;img.data[i+2]=(n.z*.5+.5)*255;img.data[i+3]=255}
  g.putImageData(img,0,0);const t=new THREE.CanvasTexture(c);t.wrapS=t.wrapT=THREE.RepeatWrapping;t.repeat.set(3,3);return t;
}
function makePond(rand){
  const g=new THREE.Group(),normals=rippleNormals();
  const bed=new THREE.Mesh(new THREE.CircleGeometry(2.55,48),surface('farm_soil',{repeat:[2,2],color:'#6f5a48'}));bed.rotation.x=-Math.PI/2;bed.position.y=-.06;g.add(bed);
  const water=new THREE.Mesh(new THREE.CircleGeometry(2.45,64),new THREE.MeshPhysicalMaterial({color:'#3d9cc2',roughness:.06,metalness:0,normalMap:normals,normalScale:new THREE.Vector2(.35,.35),clearcoat:1,transparent:true,opacity:.86}));water.rotation.x=-Math.PI/2;water.position.y=.02;water.receiveShadow=true;g.add(water);
  for(let i=0;i<16;i++){const a=i/16*Math.PI*2+rand()*.2,stone=makeBoulder(200+i,.22+rand()*.18);stone.position.set(Math.cos(a)*2.6,0,Math.sin(a)*2.6);g.add(stone)}
  const pad=new THREE.MeshStandardMaterial({color:'#4f9a3f',roughness:.6});for(let i=0;i<5;i++){const p=new THREE.Mesh(new THREE.CircleGeometry(.28+rand()*.12,20,.3,Math.PI*1.82),pad);p.rotation.set(-Math.PI/2,0,rand()*6);p.position.set((rand()-.5)*2.6,.04,(rand()-.5)*2.2);g.add(p)}
  const reed=new THREE.MeshStandardMaterial({color:'#5f8f3a',roughness:.7}),tail=new THREE.MeshStandardMaterial({color:'#6b4329',roughness:.9});
  for(let i=0;i<14;i++){const a=Math.PI*(.9+rand()*.7),r=2.1+rand()*.4,h=.8+rand()*.6,stalk=new THREE.Mesh(new THREE.CylinderGeometry(.015,.02,h,5),reed);stalk.position.set(Math.cos(a)*r,h/2,Math.sin(a)*r);stalk.rotation.z=(rand()-.5)*.2;g.add(stalk);if(i%3===0){const top=new THREE.Mesh(new THREE.CapsuleGeometry(.045,.18,4,8),tail);top.position.set(stalk.position.x,h-.05,stalk.position.z);g.add(top)}}
  g.scale.set(1.3,1,1);g.userData.water=normals;return shadowed(g);
}

// ---------- sky ----------
function makeSky(renderer,scene,sunDirection){
  // A gradient dome: deep blue overhead, pale near the horizon, with a soft glow around the sun.
  const material=new THREE.ShaderMaterial({side:THREE.BackSide,depthWrite:false,fog:false,uniforms:{top:{value:new THREE.Color('#2f7fd6')},horizon:{value:new THREE.Color('#cfe9f7')},ground:{value:new THREE.Color('#9fc6dc')},sun:{value:sunDirection.clone()}},
    vertexShader:'varying vec3 vDir;void main(){vDir=normalize(position);gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
    fragmentShader:'uniform vec3 top,horizon,ground,sun;varying vec3 vDir;void main(){float h=vDir.y;vec3 c=h>0.?mix(horizon,top,pow(h,.55)):mix(horizon,ground,min(1.,-h*3.));float glow=max(dot(normalize(vDir),normalize(sun)),0.);c+=vec3(1.,.93,.75)*(pow(glow,64.)*.9+pow(glow,8.)*.18);gl_FragColor=vec4(c,1.);}'});
  const sky=new THREE.Mesh(new THREE.SphereGeometry(900,32,16),material);sky.renderOrder=-1;
  const pmrem=new THREE.PMREMGenerator(renderer),envScene=new THREE.Scene(),envSky=new THREE.Mesh(new THREE.SphereGeometry(50,32,16),material);envScene.add(envSky);scene.environment=pmrem.fromScene(envScene).texture;pmrem.dispose();scene.environmentIntensity=.45;
  return sky;
}
function makeCloud(seed){const g=new THREE.Group(),rand=mulberry(seed),m=new THREE.MeshStandardMaterial({color:'#ffffff',roughness:1,emissive:'#dfe9f2',emissiveIntensity:.35});for(let i=0;i<9;i++){const s=new THREE.Mesh(new THREE.IcosahedronGeometry(1,3),m);const k=.7+rand()*1.1;s.scale.set(k*1.3,k*.75,k);s.position.set((i-4)*.85+rand()*.4,rand()*.6-(Math.abs(i-4)*.08),(rand()-.5)*1.2);g.add(s)}return g}

// ---------- the whole island ----------
// spots: {plaza, patch, farm, picnic} positions. Returns the ground height function and a per-frame update.
export function buildScenery(scene,renderer,spots,stageColors){
  const sunDirection=V(-.45,.62,.38).normalize(),rand=mulberry(7);
  scene.add(makeSky(renderer,scene,sunDirection));
  const pondAt=V(4.8,0,7.6),barnAt=spots.farm.clone().add(V(-4.6,0,-3.6)),blanket=spots.picnic.clone().add(V(0,0,.4));
  const flat=[[spots.plaza.x,spots.plaza.z,4],[spots.patch.x+.6,spots.patch.z,3.8],[spots.farm.x,spots.farm.z,4.2],[spots.picnic.x,spots.picnic.z,4.2],[pondAt.x,pondAt.z,3.8],[barnAt.x,barnAt.z,3.6]];
  const heightAt=makeHeight(flat);
  scene.add(terrainMesh(heightAt),cliffMesh(heightAt));
  const keepClear=(x,z)=>Math.hypot(x-spots.plaza.x,z-spots.plaza.z)<3.6||(Math.abs(x-spots.patch.x-.6)<3.2&&Math.abs(z-spots.patch.z)<2.1)||(Math.abs(x-blanket.x)<3.4&&Math.abs(z-blanket.z)<2.3)||Math.hypot((x-pondAt.x)/1.3,z-pondAt.z)<2.75||(Math.abs(x-barnAt.x)<3.4&&Math.abs(z-barnAt.z)<2.8)||(Math.abs(x-spots.farm.x)<3.6&&Math.abs(z-spots.farm.z-.6)<1.4);
  const grass=makeGrass(heightAt,keepClear);scene.add(grass);
  const place=(object,x,z)=>{object.position.set(x,heightAt(x,z),z);scene.add(object);return object};
  const stage=makeStage(stageColors);place(stage,spots.plaza.x,spots.plaza.z);
  place(makeSoilBed(5.6,3.4),spots.patch.x+.6,spots.patch.z);
  const barn=makeBarn();place(barn,barnAt.x,barnAt.z);barn.rotation.y=.35;
  [[-1.6,1.8],[-.6,2.3],[-1.1,2.05]].forEach(([dx,dz],i)=>{const bale=makeHayBale();const p=barnAt.clone().add(V(dx+3.6,0,dz));place(bale,p.x,p.z);bale.rotation.y=.4+i*.5;if(i===2)bale.position.y+=.95});
  const coop=makeFence(7.8,3);place(coop,spots.farm.x,spots.farm.z-2.1);
  const sideFence=makeFence(4.2,8);place(sideFence,spots.farm.x+4,spots.farm.z-.1);sideFence.rotation.y=Math.PI/2;
  const blanketMesh=makeBlanket();place(blanketMesh,blanket.x,blanket.z);blanketMesh.position.y+=.03;
  const pond=makePond(rand);place(pond,pondAt.x,pondAt.z);
  const blockers=[];
  [[-13,-2],[-13.5,7.5],[-3.2,14.6],[1.5,12.5],[12,7],[13,-5.5],[6.5,-11],[-1,-12.8],[14.2,1.5],[-14.4,-7.5],[-9.5,-12],[10,-13]].forEach(([x,z],i)=>{const t=makeTree(i+3);t.rotation.y=rand()*6;place(t,x,z);blockers.push([t,2.6])});
  [[-14.5,10.5],[3.5,11],[11,4.5],[-3,-11],[13.5,-9],[-15,2.5],[8,9]].forEach(([x,z],i)=>blockers.push([place(makeBush(40+i),x,z),1.6]));
  [[-15.2,-3,.9],[14.6,-3.2,.7],[-5,13.6,.6],[9,12.4,.8],[15,5,.5],[-12.5,-11.5,.75],[2,-14.6,.6]].forEach(([x,z,s],i)=>{const b=makeBoulder(i+11,s);place(b,x,z);b.position.y-=s*.25});
  // Flowers are merged into one mesh per material so 120 of them cost only a few draw calls.
  const flowerParts=new Map();
  for(let i=0;i<120;i++){const a=rand()*Math.PI*2,r=4+rand()*12,x=Math.cos(a)*r,z=Math.sin(a)*r;if(keepClear(x,z)||Math.hypot(x-spots.farm.x,z-spots.farm.z)<4)continue;const f=makeFlower(i);f.position.set(x,heightAt(x,z),z);f.updateMatrixWorld(true);f.traverse(m=>{if(!m.isMesh)return;const g=m.geometry.clone().applyMatrix4(m.matrixWorld);if(!flowerParts.has(m.material))flowerParts.set(m.material,[]);flowerParts.get(m.material).push(g)})}
  flowerParts.forEach((geos,material)=>{const mesh=new THREE.Mesh(mergeGeometries(geos),material);mesh.castShadow=true;scene.add(mesh)});
  const clouds=new THREE.Group();for(let i=0;i<8;i++){const c=makeCloud(i+1),a=i/8*Math.PI*2;c.position.set(Math.cos(a)*30,12+(i%3)*3,Math.sin(a)*30-6);c.scale.setScalar(1.4+(i%3)*.5);clouds.add(c)}scene.add(clouds);
  // Trees and bushes the camera ends up inside are hidden, so no screen shape gets a face full of leaves.
  const hideNear=camera=>blockers.forEach(([o,r])=>{o.visible=Math.hypot(camera.position.x-o.position.x,camera.position.z-o.position.z)>r+1.2||camera.position.y>o.position.y+7});
  return{heightAt,sunDirection,hideNear,update(t,dt){grass.userData.time.value=t;pond.userData.water.offset.set(t*.012,t*.008);clouds.rotation.y+=dt*.006}};
}
