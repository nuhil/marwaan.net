// Toy Match: flip cards on a wooden table to find pairs of real-looking toys.
import {THREE,RoundedBoxGeometry,V,surface,tween,wait,arcTo,scaleTo,ease,shuffle,TOYS,shadowed} from './kit.js';

const PAIRS=[3,4,6],COLS={3:3,4:4,6:4},CARD=[1.5,2],GAP=[1.85,2.35];
let ctx,root,cards=[],open=[],busy=false,cursor=0,cols=3,rows=2,found=0,total=0,ring,backMat,faceMat,cardGeo;

function cardTextures(){
  if(backMat)return;
  const c=document.createElement('canvas');c.width=300;c.height=400;const g=c.getContext('2d'),grad=g.createLinearGradient(0,0,300,400);grad.addColorStop(0,'#3b5bdb');grad.addColorStop(1,'#7048e8');
  g.fillStyle='#fffaf0';g.beginPath();g.roundRect(0,0,300,400,34);g.fill();g.fillStyle=grad;g.beginPath();g.roundRect(14,14,272,372,26);g.fill();
  g.globalAlpha=.16;g.fillStyle='#fff';for(let y=0;y<9;y++)for(let x=0;x<6;x++){g.beginPath();g.arc(30+x*48+(y%2)*24,30+y*46,7,0,Math.PI*2);g.fill()}g.globalAlpha=1;
  g.fillStyle='#ffd43b';g.font='900 150px Nunito, system-ui, sans-serif';g.textAlign='center';g.textBaseline='middle';g.shadowColor='#0005';g.shadowBlur=12;g.fillText('?',150,210);
  const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;t.anisotropy=8;backMat=new THREE.MeshStandardMaterial({map:t,roughness:.55,alphaTest:.5});
  const f=document.createElement('canvas');f.width=300;f.height=400;const h=f.getContext('2d');h.fillStyle='#fffaf0';h.beginPath();h.roundRect(0,0,300,400,34);h.fill();h.strokeStyle='#ffd8a8';h.lineWidth=10;h.beginPath();h.roundRect(18,18,264,364,24);h.stroke();
  const ft=new THREE.CanvasTexture(f);ft.colorSpace=THREE.SRGBColorSpace;faceMat=new THREE.MeshStandardMaterial({map:ft,roughness:.6,alphaTest:.5});
  cardGeo=new RoundedBoxGeometry(CARD[0],.05,CARD[1],4,.2);cardGeo.userData.shared=true;[backMat,faceMat,backMat.map,faceMat.map].forEach(o=>o.userData.shared=true);
}
let edge;function edgeMat(){if(!edge){edge=new THREE.MeshStandardMaterial({color:'#fffaf0',roughness:.6});edge.userData.shared=true}return edge}
function makeRing(){
  const c=document.createElement('canvas');c.width=320;c.height=420;const g=c.getContext('2d');g.strokeStyle='#ffd43b';g.lineWidth=16;g.shadowColor='#ffd43b';g.shadowBlur=18;g.beginPath();g.roundRect(14,14,292,392,40);g.stroke();
  const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;const m=new THREE.Mesh(new THREE.PlaneGeometry(CARD[0]*1.2,CARD[1]*1.18),new THREE.MeshBasicMaterial({map:t,transparent:true,depthWrite:false,toneMapped:false}));m.rotation.x=-Math.PI/2;m.position.y=.02;return m;
}
function buildRoom(){
  const table=new THREE.Mesh(new THREE.BoxGeometry(18,.6,13),surface('wood_table_001',{repeat:[3,2.2],roughness:.45,normal:.8,clearcoat:.4}));table.position.y=-.3;table.receiveShadow=true;root.add(table);
  const floor=new THREE.Mesh(new THREE.PlaneGeometry(80,80),surface('brown_planks_05',{repeat:[16,16],color:'#9c7b62',roughness:.8}));floor.rotation.x=-Math.PI/2;floor.position.y=-7;root.add(floor);
}
function slot(i){const c=i%cols,r=Math.floor(i/cols);return V((c-(cols-1)/2)*GAP[0],0,(r-(rows-1)/2)*GAP[1])}
function deal(level){
  cards.forEach(c=>root.remove(c.group,c.toy));cards=[];open=[];busy=false;found=0;cursor=0;
  const pairs=PAIRS[Math.min(level,PAIRS.length)-1];total=pairs;cols=COLS[pairs];rows=pairs*2/cols;
  const kinds=shuffle(Object.keys(TOYS)).slice(0,pairs),deck=shuffle([...kinds,...kinds]);
  deck.forEach((kind,i)=>{
    const group=new THREE.Group(),body=new THREE.Mesh(cardGeo,edgeMat()),back=new THREE.Mesh(new THREE.PlaneGeometry(CARD[0]*.98,CARD[1]*.98),backMat),face=new THREE.Mesh(new THREE.PlaneGeometry(CARD[0]*.98,CARD[1]*.98),faceMat);
    back.rotation.x=-Math.PI/2;back.position.y=.027;face.rotation.x=Math.PI/2;face.position.y=-.027;group.add(body,back,face);shadowed(group);
    const home=slot(i);group.position.copy(home).add(V(0,6,0));group.rotation.y=(Math.random()-.5)*.6;root.add(group);
    const toy=TOYS[kind][1]();toy.position.copy(home);toy.visible=false;toy.scale.setScalar(.01);root.add(toy);
    const card={kind,name:TOYS[kind][0],group,toy,home,up:false,done:false};[body,back,face].forEach(m=>m.userData.card=card);cards.push(card);
    const delay=i*70;tween({delay,duration:520,ease:ease.out,update:k=>{group.position.y=THREE.MathUtils.lerp(6,.03,k);group.rotation.y*=1-k*.2}}).then(()=>{group.rotation.y=0;ctx.sfx('card-deal',{volume:.7,rate:.9+Math.random()*.2})});
  });
  ctx.hud(`Find ${pairs} pairs`,'Flip two cards. If the toys match, you keep them!');ctx.progress(0,pairs);placeRing();ctx.fit(cols*GAP[0]+.6,rows*GAP[1]+.8,V(0,0,.3),{elevation:1.15});
}
async function flip(card,up){
  card.up=up;const g=card.group,from=g.rotation.z,to=up?Math.PI:0;
  await tween({duration:420,update:(k,p)=>{g.rotation.z=THREE.MathUtils.lerp(from,to,k);g.position.y=.03+Math.sin(Math.PI*p)*.8}});g.position.y=.03;
  if(up){card.toy.visible=true;await scaleTo(card.toy,1,320,ease.back)}else{card.toy.scale.setScalar(.01);card.toy.visible=false}
}
async function choose(card){
  if(busy||!card||card.up||card.done)return;
  busy=open.length===1;ctx.sfx('card-flip',{volume:.85});open.push(card);await flip(card,true);ctx.feedback(`${card.name}!`);
  if(open.length<2){busy=false;return}
  const [a,b]=open;open=[];
  if(a.kind===b.kind){
    a.done=b.done=true;found++;ctx.sfx('correct');ctx.progress(found,total);
    await Promise.all([a,b].map(c=>tween({duration:520,update:(k,p)=>{c.toy.position.y=c.home.y+Math.sin(Math.PI*p)*.7;c.toy.rotation.y=k*Math.PI*2}})));
    if(found===total){ctx.celebrate(V(0,1,0));ctx.win({title:'All pairs found!',text:`You matched ${total} pairs of toys.`})}
  }else{ctx.sfx('wrong');ctx.feedback(`${a.name} and ${b.name} don’t match. Try again!`);await wait(700);await Promise.all([flip(a,false),flip(b,false)])}
  busy=false;
}
function placeRing(){const c=cards[cursor];if(!c||!ring)return;ring.position.set(c.home.x,.035,c.home.z)}
function move(dx,dz){const c=cursor%cols,r=Math.floor(cursor/cols);cursor=THREE.MathUtils.clamp(r+dz,0,rows-1)*cols+THREE.MathUtils.clamp(c+dx,0,cols-1);ring.visible=true;placeRing();ctx.sfx('tap')}

export default{
  id:'memory',name:'Toy Match',kicker:'MEMORY',icon:'memory',
  keys:[['Arrows','Move'],['Enter','Flip']],
  enter(c){ctx=c;root=c.root;cardTextures();buildRoom();ring=makeRing();ring.visible=false;root.add(ring);ctx.setPad([]);ctx.lights('indoor');deal(ctx.level)},
  exit(){cards=[];open=[];ring=null},
  restart(){deal(ctx.level)},
  update(dt,t){if(ring?.visible)ring.material.opacity=.65+Math.sin(t*5)*.3;cards.forEach(c=>{if(c.up&&!c.done&&c.toy.visible)c.toy.rotation.y+=dt*.8})},
  key(code){if(code==='ArrowLeft')move(-1,0);else if(code==='ArrowRight')move(1,0);else if(code==='ArrowUp')move(0,-1);else if(code==='ArrowDown')move(0,1);else if(code==='Enter'||code==='Space'){ring.visible=true;choose(cards[cursor])}},
  tap(e){const hit=ctx.ray(e,root.children.flatMap(o=>o.children)).find(h=>h.object.userData.card);if(!hit)return;const card=hit.object.userData.card;cursor=cards.indexOf(card);placeRing();choose(card)},
  hover(e){return!!ctx.ray(e,cards.flatMap(c=>c.group.children)).length}
};
