// Shape Sorter: pick a chunky wooden block and drop it through the hole with the same shape.
import {THREE,V,surface,paintedWood,tween,wait,arcTo,scaleTo,ease,shuffle,shadowed} from './kit.js';

const SHAPES={
  circle:{name:'circle',color:'#e03131',path:(s,p)=>{p.absarc(0,0,s*.5,0,Math.PI*2,false)}},
  square:{name:'square',color:'#1c7ed6',path:(s,p)=>{const h=s*.44;p.moveTo(-h,-h);p.lineTo(h,-h);p.lineTo(h,h);p.lineTo(-h,h);p.closePath()}},
  triangle:{name:'triangle',color:'#f59f00',path:(s,p)=>{const r=s*.58;for(let k=0;k<3;k++){const a=Math.PI/2+k*Math.PI*2/3;k?p.lineTo(Math.cos(a)*r,Math.sin(a)*r-s*.08):p.moveTo(Math.cos(a)*r,Math.sin(a)*r-s*.08)}p.closePath()}},
  star:{name:'star',color:'#7048e8',path:(s,p)=>{for(let k=0;k<10;k++){const r=k%2?s*.24:s*.56,a=Math.PI/2+k*Math.PI/5;k?p.lineTo(Math.cos(a)*r,Math.sin(a)*r):p.moveTo(Math.cos(a)*r,Math.sin(a)*r)}p.closePath()}},
  heart:{name:'heart',color:'#e64980',path:(s,p)=>{const k=s*.5;p.moveTo(0,-k*.9);p.bezierCurveTo(k*.2,-k*.6,k*1.05,-k*.15,k*.95,k*.3);p.bezierCurveTo(k*.85,k*.85,k*.2,k*.95,0,k*.45);p.bezierCurveTo(-k*.2,k*.95,-k*.85,k*.85,-k*.95,k*.3);p.bezierCurveTo(-k*1.05,-k*.15,-k*.2,-k*.6,0,-k*.9)}},
  hexagon:{name:'hexagon',color:'#2f9e44',path:(s,p)=>{const r=s*.5;for(let k=0;k<6;k++){const a=k*Math.PI/3;k?p.lineTo(Math.cos(a)*r,Math.sin(a)*r):p.moveTo(Math.cos(a)*r,Math.sin(a)*r)}p.closePath()}}
};
const LEVELS=[['circle','square','triangle'],['circle','square','triangle','star'],['circle','square','triangle','star','heart','hexagon']];
const HOLE=1.15,BLOCK=1.02,BOX_H=1.6;
let ctx,root,box,blocks=[],holes=[],selected=null,mode='block',cursor=0,busy=false,done=0,total=0,mistakes={};

function shapeFrom(kind,size){const s=new THREE.Shape();SHAPES[kind].path(size,s);return s}
function holePath(kind,size){const p=new THREE.Path();SHAPES[kind].path(size,p);return p}
function flat(geo,depth){geo.rotateX(-Math.PI/2);geo.translate(0,0,0);return geo}
function buildRoom(){
  const table=new THREE.Mesh(new THREE.BoxGeometry(20,.6,14),surface('wood_table_001',{repeat:[3.4,2.4],roughness:.45,normal:.8,clearcoat:.4}));table.position.y=-.3;table.receiveShadow=true;root.add(table);
  const floor=new THREE.Mesh(new THREE.PlaneGeometry(80,80),surface('brown_planks_05',{repeat:[16,16],color:'#9c7b62',roughness:.8}));floor.rotation.x=-Math.PI/2;floor.position.y=-7;root.add(floor);
}
function holeSpots(kinds){const n=kinds.length,perRow=n>4?3:n,rowsN=Math.ceil(n/perRow);return kinds.map((k,i)=>{const r=Math.floor(i/perRow),c=i%perRow,inRow=Math.min(perRow,n-r*perRow);return V((c-(inRow-1)/2)*1.75,0,(r-(rowsN-1)/2)*1.6)})}
function buildBox(kinds){
  if(box){root.remove(box);box.traverse(o=>o.geometry?.dispose())}
  box=new THREE.Group();const spots=holeSpots(kinds),perRow=kinds.length>4?3:kinds.length,rowsN=Math.ceil(kinds.length/perRow),W=perRow*1.75+.9,D=rowsN*1.6+.9,wood=paintedWood('#f3d9a4',[.8,.8]);
  const lid=new THREE.Shape();lid.moveTo(-W/2,-D/2);lid.lineTo(W/2,-D/2);lid.lineTo(W/2,D/2);lid.lineTo(-W/2,D/2);lid.closePath();
  kinds.forEach((k,i)=>{const p=holePath(k,HOLE);p.getPoints(40);const hole=new THREE.Path();const pts=p.getPoints(48).map(v=>v.add(new THREE.Vector2(spots[i].x,-spots[i].z)));hole.setFromPoints(pts.reverse());lid.holes.push(hole)});
  const top=new THREE.Mesh(flat(new THREE.ExtrudeGeometry(lid,{depth:.22,bevelEnabled:true,bevelSize:.05,bevelThickness:.05,bevelSegments:3,curveSegments:24})),wood);top.position.y=BOX_H;box.add(top);
  const wall=(w,d,x,z)=>{const m=new THREE.Mesh(new THREE.BoxGeometry(w,BOX_H,d),wood);m.position.set(x,BOX_H/2,z);box.add(m)};
  wall(W,.22,0,D/2-.11);wall(W,.22,0,-D/2+.11);wall(.22,D,W/2-.11,0);wall(.22,D,-W/2+.11,0);
  const inside=new THREE.Mesh(new THREE.PlaneGeometry(W-.4,D-.4),new THREE.MeshStandardMaterial({color:'#2a1d12',roughness:1}));inside.rotation.x=-Math.PI/2;inside.position.y=.02;box.add(inside);
  holes=kinds.map((k,i)=>{const hit=new THREE.Mesh(new THREE.CylinderGeometry(.75,.75,.6,24),new THREE.MeshBasicMaterial({visible:false}));hit.position.set(spots[i].x,BOX_H+.3,spots[i].z);box.add(hit);
    const glow=new THREE.Mesh(new THREE.ShapeGeometry(shapeFrom(k,HOLE*1.12),24),new THREE.MeshBasicMaterial({color:'#ffd43b',transparent:true,opacity:0,depthWrite:false,toneMapped:false}));glow.rotation.x=-Math.PI/2;glow.position.set(spots[i].x,BOX_H+.28,spots[i].z);box.add(glow);
    const hole={kind:k,pos:spots[i].clone().setY(BOX_H),hit,glow};hit.userData.hole=hole;return hole});
  box.position.set(0,0,-1.2);root.add(shadowed(box));holes.forEach(h=>h.pos.add(box.position));return{W,D};
}
function deal(level){
  blocks.forEach(b=>root.remove(b.mesh));blocks=[];selected=null;mode='block';cursor=0;busy=false;done=0;mistakes={};
  const kinds=LEVELS[Math.min(level,LEVELS.length)-1];total=kinds.length;const {W}=buildBox(shuffle(kinds));
  shuffle(kinds).forEach((k,i)=>{
    const geo=flat(new THREE.ExtrudeGeometry(shapeFrom(k,BLOCK),{depth:.55,bevelEnabled:true,bevelSize:.06,bevelThickness:.06,bevelSegments:3,curveSegments:24}));
    const mesh=new THREE.Mesh(geo,paintedWood(SHAPES[k].color).clone());mesh.material.emissive=new THREE.Color('#000');mesh.castShadow=true;mesh.receiveShadow=true;
    const home=V((i-(total-1)/2)*1.55,.06,2.5+(i%2)*.25);mesh.position.copy(home).add(V(0,5,0));mesh.rotation.y=(Math.random()-.5)*.9;root.add(mesh);
    const block={kind:k,mesh,home,yaw:mesh.rotation.y,done:false};mesh.userData.block=block;blocks.push(block);
    tween({delay:i*90,duration:520,ease:ease.out,update:q=>mesh.position.y=THREE.MathUtils.lerp(5,.06,q)}).then(()=>ctx.sfx('tap'));
  });
  ctx.hud('Feed the box!','Pick a block, then drop it in the hole with the same shape.');ctx.progress(0,total);ctx.fit(Math.max(W,total*1.55)+1.4,6.6,V(0,.6,.7),{elevation:.9});highlight();
}
function remaining(){return blocks.filter(b=>!b.done)}
function highlight(){
  blocks.forEach(b=>b.mesh.material.emissive.set(b===selected?'#664400':'#000'));
  const keyboardBlock=mode==='block'&&ctx.usingKeys?remaining()[cursor]:null;if(keyboardBlock&&keyboardBlock!==selected)keyboardBlock.mesh.material.emissive.set('#3a2a00');
  holes.forEach((h,i)=>h.glow.userData.target=(mode==='hole'&&ctx.usingKeys&&i===cursor)?.55:(selected&&mistakes[selected.kind]>=1&&h.kind===selected.kind)?.4:0);
}
function select(block){
  if(busy||!block||block.done)return;
  if(selected&&selected!==block)tween({duration:200,update:k=>selected&&(selected.mesh.position.y=THREE.MathUtils.lerp(.7,.06,k))});
  selected=block;mode='hole';cursor=0;ctx.sfx('tap');ctx.feedback(`The ${SHAPES[block.kind].name}! Now pick its hole.`);
  const m=block.mesh,y=m.position.y;tween({duration:220,update:k=>m.position.y=THREE.MathUtils.lerp(y,.7,k)});highlight();
}
async function drop(hole){
  if(busy||!selected||!hole)return;busy=true;const b=selected,m=b.mesh,above=hole.pos.clone().add(V(0,1.1,0)),yaw=m.rotation.y;ctx.sfx('tap');
  await Promise.all([arcTo(m,above,{duration:560,height:1}),tween({duration:560,update:k=>m.rotation.y=THREE.MathUtils.lerp(yaw,0,k)})]);
  if(hole.kind===b.kind){
    await tween({duration:420,ease:t=>t*t,update:k=>m.position.y=THREE.MathUtils.lerp(above.y,hole.pos.y-1.2,k)});m.visible=false;b.done=true;done++;ctx.sfx('correct');ctx.progress(done,total);ctx.feedback(`Plop! The ${SHAPES[b.kind].name} fits!`);
    tween({duration:260,update:(k,p)=>box.scale.set(1+Math.sin(Math.PI*p)*.03,1-Math.sin(Math.PI*p)*.04,1+Math.sin(Math.PI*p)*.03)});
    selected=null;mode='block';cursor=0;
    if(done===total){await wait(300);ctx.celebrate(hole.pos.clone().add(V(0,1,0)));ctx.win({title:'Every shape fits!',text:`You sorted ${total} shapes.`})}
  }else{
    mistakes[b.kind]=(mistakes[b.kind]||0)+1;ctx.sfx('wrong');
    await tween({duration:380,update:(k,p)=>{m.position.x=above.x+Math.sin(p*Math.PI*6)*.15*(1-p);m.position.y=above.y-Math.sin(Math.PI*p)*.25}});
    ctx.feedback(`Bonk! A ${SHAPES[b.kind].name} needs the ${SHAPES[b.kind].name} hole. Look for the glow!`);
    await Promise.all([arcTo(m,b.home.clone().setY(.7),{duration:520,height:1}),tween({duration:520,update:k=>m.rotation.y=THREE.MathUtils.lerp(0,b.yaw,k)})]);
  }
  busy=false;highlight();
}

export default{
  id:'sorter',name:'Shape Sorter',kicker:'SHAPES',icon:'puzzle',
  keys:[['← →','Choose'],['Enter','Pick / drop'],['Esc','Put back']],
  enter(c){ctx=c;root=c.root;buildRoom();ctx.setPad([]);ctx.lights('indoor');deal(ctx.level)},
  exit(){blocks=[];holes=[];box=null;selected=null},
  restart(){deal(ctx.level)},
  update(dt,t){holes.forEach(h=>{const target=h.glow.userData.target||0;h.glow.material.opacity=THREE.MathUtils.damp(h.glow.material.opacity,target*(target?.75+Math.sin(t*6)*.25:1),10,dt)});if(selected&&!busy)selected.mesh.rotation.y=selected.yaw+Math.sin(t*2)*.15},
  key(code){
    const list=mode==='block'?remaining():holes;if(!list.length)return;
    if(code==='ArrowLeft'||code==='ArrowUp'){cursor=(cursor-1+list.length)%list.length;ctx.sfx('tap')}
    else if(code==='ArrowRight'||code==='ArrowDown'){cursor=(cursor+1)%list.length;ctx.sfx('tap')}
    else if(code==='Enter'||code==='Space'){if(mode==='block')select(list[cursor]);else drop(list[cursor])}
    else if(code==='Escape'&&selected&&!busy){const m=selected.mesh;tween({duration:200,update:k=>m.position.y=THREE.MathUtils.lerp(.7,.06,k)});selected=null;mode='block';cursor=0}
    highlight();
  },
  tap(e){const hits=ctx.ray(e,[...blocks.filter(b=>!b.done).map(b=>b.mesh),...holes.map(h=>h.hit)]);const hit=hits[0]?.object;if(!hit)return;if(hit.userData.block)select(hit.userData.block);else if(hit.userData.hole){if(selected)drop(hit.userData.hole);else ctx.feedback('Pick a block first!')}highlight()},
  hover(e){return!!ctx.ray(e,[...blocks.filter(b=>!b.done).map(b=>b.mesh),...(selected?holes.map(h=>h.hit):[])]).length}
};
