// Wonder Lab sound engine: sample playback, generative music and ambience per world, and live-synthesised effects.
// Nothing makes a sound until the visitor interacts with the page (browser autoplay rules).
// Samples live in assets/audio (CC0 / public domain, see assets/audio/ATTRIBUTION.md).

let ctx=null,master,musicBus,ambienceBus,sfxBus,voiceBus,reverb,theme='wonder',musicOn=false,musicTimer=null,ambience=null,lastTap=0;
const buffers=new Map(),loading=new Map();
const AUDIO_DIR='assets/audio/';
// Tests can set window.__audioLog=[] to see which sounds play.
const log=name=>window.__audioLog?.push(name);

// ---------- context and buses ----------
function makeReverb(c,seconds=2.4){const len=c.sampleRate*seconds,buf=c.createBuffer(2,len,c.sampleRate);for(let ch=0;ch<2;ch++){const d=buf.getChannelData(ch);for(let i=0;i<len;i++)d[i]=(Math.random()*2-1)*Math.pow(1-i/len,2.6)}const conv=c.createConvolver();conv.buffer=buf;return conv}
function ready(){
  if(!ctx){
    ctx=new(window.AudioContext||window.webkitAudioContext)();
    master=ctx.createDynamicsCompressor();master.threshold.value=-14;master.ratio.value=3;master.connect(ctx.destination);
    const bus=v=>{const g=ctx.createGain();g.gain.value=v;g.connect(master);return g};
    musicBus=bus(.32);ambienceBus=bus(.5);sfxBus=bus(.8);voiceBus=bus(.9);
    reverb=makeReverb(ctx);const wet=ctx.createGain();wet.gain.value=.35;reverb.connect(wet).connect(master);
    // Everything pauses with the tab (engines, music, ambience) and resumes when the child comes back.
    document.addEventListener('visibilitychange',()=>{if(document.hidden)ctx.suspend();else ctx.resume()});
  }
  if(ctx.state==='suspended')ctx.resume();
  return ctx;
}
export function unlock(){ready()}
const busFor=name=>({music:musicBus,ambience:ambienceBus,voice:voiceBus}[name]||sfxBus);

// ---------- samples ----------
function load(name){
  if(buffers.has(name))return Promise.resolve(buffers.get(name));
  if(!loading.has(name)){ready();loading.set(name,fetch(`${AUDIO_DIR}${name}.mp3`).then(r=>r.arrayBuffer()).then(b=>ctx.decodeAudioData(b)).then(buf=>{buffers.set(name,buf);return buf}).catch(()=>null))}
  return loading.get(name);
}
export function preload(names){if(ctx)names.forEach(load);else preload.pending=[...(preload.pending||[]),...names]}
// Plays a sample and returns a handle; safe to call before it has loaded (it starts when ready unless stopped).
export function play(name,{volume=1,rate=1,loop=false,delay=0,bus='sfx',fadeIn=0,detune=0,offset=0}={}){
  log(name);const c=ready(),gain=c.createGain();gain.connect(busFor(bus));let src=null,stopped=false;
  const t0=c.currentTime+delay;if(fadeIn){gain.gain.setValueAtTime(0,t0);gain.gain.linearRampToValueAtTime(volume,t0+fadeIn)}else gain.gain.value=volume;
  load(name).then(buf=>{if(!buf||stopped)return;src=c.createBufferSource();src.buffer=buf;src.loop=loop;src.playbackRate.value=rate;src.detune.value=detune;src.connect(gain);src.start(Math.max(c.currentTime,t0),offset);src.onended=()=>{if(!loop)gain.disconnect()}});
  return{
    stop(fade=.25){if(stopped)return;stopped=true;const n=c.currentTime;gain.gain.cancelScheduledValues(n);gain.gain.setValueAtTime(gain.gain.value,n);gain.gain.linearRampToValueAtTime(0,n+fade);setTimeout(()=>{try{src?.stop()}catch{}gain.disconnect()},fade*1000+60)},
    volume(v,time=.2){const n=c.currentTime;gain.gain.cancelScheduledValues(n);gain.gain.setValueAtTime(gain.gain.value,n);gain.gain.linearRampToValueAtTime(v,n+time)},
    rate(r){if(src)src.playbackRate.setTargetAtTime(r,c.currentTime,.1)}
  };
}

// ---------- tiny synth helpers ----------
function tone(freq,d=.09,type='sine',gain=.16,delay=0,bus=sfxBus){const c=ready(),o=c.createOscillator(),g=c.createGain(),t=c.currentTime+delay;o.type=type;o.frequency.value=freq;g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(gain,t+.008);g.gain.exponentialRampToValueAtTime(.001,t+d);o.connect(g).connect(bus);o.start(t);o.stop(t+d+.03);return o}
let noiseBuffer=null;function noise(){if(!noiseBuffer){const c=ready(),len=c.sampleRate*2;noiseBuffer=c.createBuffer(1,len,c.sampleRate);const d=noiseBuffer.getChannelData(0);for(let i=0;i<len;i++)d[i]=Math.random()*2-1}const s=ctx.createBufferSource();s.buffer=noiseBuffer;s.loop=true;return s}
function burst({freq=1000,q=1,type='bandpass',d=.05,gain=.2,delay=0,bus=sfxBus}={}){const c=ready(),s=noise(),f=c.createBiquadFilter(),g=c.createGain(),t=c.currentTime+delay;f.type=type;f.frequency.value=freq;f.Q.value=q;g.gain.setValueAtTime(gain,t);g.gain.exponentialRampToValueAtTime(.001,t+d);s.connect(f).connect(g).connect(bus);s.start(t,Math.random());s.stop(t+d+.02)}

// NASA "Quindar" tones: 2525 Hz marks the start of a radio call, 2475 Hz the end.
export function quindar(kind='start',delay=0){log('quindar');tone(kind==='start'?2525:2475,.25,'sine',.08,delay,voiceBus)}
export function crunch(){log('crunch');for(let i=0;i<5;i++)burst({freq:1800+Math.random()*1500,q:.8,d:.035,gain:.22,delay:i*.03+Math.random()*.01})}
export function whoosh(up=true,d=.7){log('whoosh');const c=ready(),s=noise(),f=c.createBiquadFilter(),g=c.createGain(),t=c.currentTime;f.type='bandpass';f.Q.value=1.2;f.frequency.setValueAtTime(up?300:2400,t);f.frequency.exponentialRampToValueAtTime(up?2400:300,t+d);g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(.25,t+d*.4);g.gain.linearRampToValueAtTime(0,t+d);s.connect(f).connect(g).connect(sfxBus);s.start(t);s.stop(t+d+.05)}
export function countTick(n){log('countTick');tone(440*Math.pow(2,Math.min(n,24)/12),.12,'triangle',.11);tone(880*Math.pow(2,Math.min(n,24)/12),.06,'sine',.04,.01)}

// Car engine: firing pulses at rpm/30 Hz (four cylinders) through a growl filter; pitch and grit follow the accelerator.
export function engine(){log('engine');
  const c=ready(),out=c.createGain(),low=c.createBiquadFilter(),shaper=c.createWaveShaper(),body=c.createOscillator(),sub=c.createOscillator(),rough=noise(),roughF=c.createBiquadFilter(),roughG=c.createGain(),wobble=c.createOscillator(),wobbleG=c.createGain();
  const curve=new Float32Array(256);for(let i=0;i<256;i++){const x=i/128-1;curve[i]=Math.tanh(x*3)}shaper.curve=curve;
  body.type='sawtooth';sub.type='square';low.type='lowpass';low.Q.value=4;roughF.type='bandpass';roughF.frequency.value=600;roughF.Q.value=.7;roughG.gain.value=.08;
  wobble.frequency.value=9;wobbleG.gain.value=.12;wobble.connect(wobbleG).connect(out.gain);
  const mix=c.createGain();mix.gain.value=.5;body.connect(mix);sub.connect(mix);rough.connect(roughF).connect(roughG).connect(mix);mix.connect(shaper).connect(low).connect(out);out.connect(sfxBus);out.gain.value=0;
  [body,sub,wobble].forEach(o=>o.start());rough.start();
  const set=(rpm,load=.5,time=.25)=>{const f=rpm/30,n=c.currentTime;body.frequency.setTargetAtTime(f,n,time/3);sub.frequency.setTargetAtTime(f/2,n,time/3);low.frequency.setTargetAtTime(180+rpm*.22+load*600,n,time/3);roughF.frequency.setTargetAtTime(400+rpm*.15,n,time/3);wobble.frequency.setTargetAtTime(f/4,n,time/3)};
  set(800,.2,0);
  // Starter motor: a few quick grinding pulses, then the engine catches.
  for(let i=0;i<5;i++)burst({freq:300,q:2,d:.08,gain:.25,delay:i*.11});
  out.gain.setTargetAtTime(.32,c.currentTime+.55,.12);
  return{set,stop(fade=.6){const n=c.currentTime;out.gain.cancelScheduledValues(n);out.gain.setTargetAtTime(0,n,fade/3);set(500,0,fade);setTimeout(()=>{[body,sub,wobble,rough].forEach(o=>{try{o.stop()}catch{}});out.disconnect()},fade*1500)}};
}
// Heartbeat: a low "lub" and a softer "dub", repeating at the given beats per minute.
export function heartbeat(bpm=72){log('heartbeat');
  let alive=true;const beat=()=>{if(!alive)return;const c=ready(),t=c.currentTime;[[0,1],[.28,.7]].forEach(([dt,k])=>{const o=c.createOscillator(),g=c.createGain();o.frequency.setValueAtTime(70,t+dt);o.frequency.exponentialRampToValueAtTime(38,t+dt+.12);g.gain.setValueAtTime(0,t+dt);g.gain.linearRampToValueAtTime(.55*k,t+dt+.012);g.gain.exponentialRampToValueAtTime(.001,t+dt+.18);o.connect(g).connect(sfxBus);o.start(t+dt);o.stop(t+dt+.2)});timer=setTimeout(beat,60000/bpm)};let timer;beat();
  return{stop(){alive=false;clearTimeout(timer)}};
}
// Breathing: soft filtered air flowing in and out.
export function breathing(seconds=4.2){log('breathing');
  const c=ready(),s=noise(),f=c.createBiquadFilter(),g=c.createGain();f.type='bandpass';f.frequency.value=900;f.Q.value=.6;g.gain.value=0;s.connect(f).connect(g).connect(sfxBus);s.start();
  let alive=true;const cycle=()=>{if(!alive)return;const t=c.currentTime,i=seconds*.42;g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(.12,t+i*.8);g.gain.linearRampToValueAtTime(0,t+i);f.frequency.setValueAtTime(700,t);f.frequency.linearRampToValueAtTime(1300,t+i);g.gain.linearRampToValueAtTime(.09,t+i+.25);g.gain.linearRampToValueAtTime(0,t+seconds*.95);f.frequency.linearRampToValueAtTime(600,t+seconds);timer=setTimeout(cycle,seconds*1000)};let timer;cycle();
  return{stop(){alive=false;clearTimeout(timer);g.gain.setTargetAtTime(0,c.currentTime,.2);setTimeout(()=>{try{s.stop()}catch{}},800)}};
}
// Geiger counter: random clicks; the busier, the more radioactive.
export function geiger(rate=6){log('geiger');
  let alive=true,timer;const click=()=>{if(!alive)return;burst({freq:3500,q:.5,type:'highpass',d:.006,gain:.35});timer=setTimeout(click,-Math.log(Math.random())*1000/rate)};click();
  return{stop(){alive=false;clearTimeout(timer)}};
}
// Gas-discharge tube hum (neon signs buzz at twice the mains frequency).
export function neonHum(volume=.05){log('neonHum');
  const c=ready(),o=c.createOscillator(),o2=c.createOscillator(),f=c.createBiquadFilter(),g=c.createGain();o.type='sawtooth';o.frequency.value=120;o2.type='square';o2.frequency.value=240;f.type='lowpass';f.frequency.value=900;g.gain.value=0;o.connect(f);o2.connect(f);f.connect(g).connect(sfxBus);o.start();o2.start();g.gain.setTargetAtTime(volume,c.currentTime,.3);
  return{stop(){g.gain.setTargetAtTime(0,c.currentTime,.15);setTimeout(()=>{try{o.stop();o2.stop()}catch{}},700)}};
}

// ---------- named effects (legacy names kept for older pages) ----------
const SAMPLE_SFX={tap:['ui-click',.5],select:['ui-select',.6],open:['ui-open',.5],close:['ui-close',.5],toggle:['ui-toggle',.5],correct:['ui-confirm',.7],wrong:['ui-error',.55],pop:['ui-pop',.6],glass:['ui-glass',.6],pluck:['ui-pluck',.6],win:['jingle-win',.7],star:['jingle-small',.6],bigwin:['jingle-big',.7]};
export function playSfx(kind='tap',options={}){
  if(kind==='tap'){const now=performance.now();if(now-lastTap<60)return;lastTap=now}
  if(kind==='chomp'){crunch();tone(120,.07,'triangle',.1);return}
  const entry=SAMPLE_SFX[kind];if(entry)return play(entry[0],{volume:entry[1],...options});
  return play(kind,options);
}

// ---------- generative music ----------
const NOTE=n=>440*Math.pow(2,(n-69)/12);
const THEMES={
  wonder:{bpm:84,chords:[[60,64,67,71],[57,60,64,67],[53,57,60,64],[55,59,62,64]],arp:'up',bell:.5,bass:true,pad:.6,mood:'warm'},
  space:{bpm:56,chords:[[50,57,62,64],[46,53,58,62],[53,57,60,64],[48,55,60,62]],arp:'sparse',bell:.35,bass:false,pad:.8,mood:'airy'},
  physics:{bpm:96,chords:[[52,59,62,66],[48,55,59,62],[55,59,62,67],[50,57,62,66]],arp:'pulse',bell:.45,bass:true,pad:.45,mood:'drive'},
  biology:{bpm:70,chords:[[53,57,60,64],[52,55,59,62],[50,53,57,60],[48,52,55,59]],arp:'up',bell:.35,bass:true,pad:.7,mood:'calm'},
  chemistry:{bpm:88,chords:[[57,60,64,67],[53,57,60,64],[60,64,67,71],[55,59,62,67]],arp:'bubbly',bell:.5,bass:true,pad:.5,mood:'curious'},
  math:{bpm:104,chords:[[60,64,67,72],[53,57,60,65],[55,59,62,67],[60,64,67,72]],arp:'bounce',bell:.6,bass:true,pad:.35,mood:'happy'},
  games:{bpm:112,chords:[[60,64,67,72],[57,60,64,69],[53,57,60,65],[55,59,62,67]],arp:'bounce',bell:.55,bass:true,pad:.35,mood:'play'}
};
function padChord(notes,start,dur,level){
  const c=ctx,g=c.createGain(),f=c.createBiquadFilter();f.type='lowpass';f.frequency.value=900;f.Q.value=.5;g.gain.setValueAtTime(0,start);g.gain.linearRampToValueAtTime(level,start+dur*.3);g.gain.linearRampToValueAtTime(level*.8,start+dur*.75);g.gain.linearRampToValueAtTime(0,start+dur);f.connect(g);g.connect(musicBus);g.connect(reverb);
  notes.forEach(n=>[-6,6].forEach(cents=>{const o=c.createOscillator();o.type='sawtooth';o.frequency.value=NOTE(n);o.detune.value=cents;const v=c.createGain();v.gain.value=.05;o.connect(v).connect(f);o.start(start);o.stop(start+dur+.05)}));
}
function bell(note,start,level,decay=1.1){const c=ctx,o=c.createOscillator(),o2=c.createOscillator(),g=c.createGain();o.type='sine';o2.type='triangle';o.frequency.value=NOTE(note);o2.frequency.value=NOTE(note)*2;g.gain.setValueAtTime(0,start);g.gain.linearRampToValueAtTime(level,start+.01);g.gain.exponentialRampToValueAtTime(.001,start+decay);const g2=c.createGain();g2.gain.value=.25;o.connect(g);o2.connect(g2).connect(g);g.connect(musicBus);g.connect(reverb);o.start(start);o2.start(start);o.stop(start+decay+.05);o2.stop(start+decay+.05)}
function bass(note,start,dur){const c=ctx,o=c.createOscillator(),g=c.createGain();o.type='sine';o.frequency.value=NOTE(note-12);g.gain.setValueAtTime(0,start);g.gain.linearRampToValueAtTime(.22,start+.02);g.gain.exponentialRampToValueAtTime(.001,start+dur);o.connect(g).connect(musicBus);o.start(start);o.stop(start+dur+.05)}
let bar=0,nextBarAt=0;
function scheduleBar(){
  if(!musicOn)return;const t=THEMES[theme]||THEMES.wonder,beat=60/t.bpm,barLen=beat*4,chord=t.chords[bar%t.chords.length],start=Math.max(nextBarAt,ctx.currentTime+.05);
  if(bar%2===0)padChord(chord,start,barLen*2,t.pad*.5);
  if(t.bass)bass(chord[0],start,beat*1.8),bass(chord[0],start+beat*2,beat*1.6);
  const steps=t.arp==='sparse'?4:8,stepLen=barLen/steps;
  for(let i=0;i<steps;i++){
    const at=start+i*stepLen;let note=null;
    if(t.arp==='up')note=chord[i%4]+12;
    else if(t.arp==='pulse')note=i%2?chord[(i>>1)%4]+12:chord[0]+12;
    else if(t.arp==='bounce')note=[0,2,1,3,2,1,3,2].map(k=>chord[k]+12)[i];
    else if(t.arp==='bubbly')note=Math.random()<.7?chord[Math.floor(Math.random()*4)]+12+(Math.random()<.3?12:0):null;
    else if(t.arp==='sparse')note=Math.random()<.55?chord[Math.floor(Math.random()*4)]+24:null;
    if(note!==null)bell(note,at,t.bell*.16*(i%4===0?1:.75),t.arp==='sparse'?2.4:1.1);
  }
  bar++;nextBarAt=start+barLen;musicTimer=setTimeout(scheduleBar,Math.max(50,(nextBarAt-ctx.currentTime-.25)*1000));
}

// ---------- ambience beds ----------
function startAmbience(kind){
  stopAmbience();const c=ready(),nodes=[],timers=[];let alive=true;
  const loopNoise=(type,freq,q,level)=>{const s=noise(),f=c.createBiquadFilter(),g=c.createGain();f.type=type;f.frequency.value=freq;f.Q.value=q;g.gain.value=0;g.gain.setTargetAtTime(level,c.currentTime,1);s.connect(f).connect(g).connect(ambienceBus);s.start();nodes.push(s,g);return{f,g}};
  const every=(min,max,fn)=>{const go=()=>{if(!alive)return;fn();timers.push(setTimeout(go,min+Math.random()*(max-min)))};timers.push(setTimeout(go,min*Math.random()))};
  if(kind==='space'){loopNoise('lowpass',180,.5,.18);const o=c.createOscillator(),g=c.createGain();o.frequency.value=55;g.gain.value=0;g.gain.setTargetAtTime(.05,c.currentTime,1.5);o.connect(g).connect(ambienceBus);o.start();nodes.push(o,g)}
  if(kind==='meadow'){loopNoise('bandpass',500,.4,.05);every(900,3200,()=>{const base=2400+Math.random()*1800,n=2+Math.floor(Math.random()*4);for(let i=0;i<n;i++){const t=c.currentTime+i*.11,o=c.createOscillator(),g=c.createGain();o.frequency.setValueAtTime(base,t);o.frequency.exponentialRampToValueAtTime(base*(1.2+Math.random()*.5),t+.07);g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(.05,t+.01);g.gain.exponentialRampToValueAtTime(.001,t+.09);o.connect(g).connect(ambienceBus);o.start(t);o.stop(t+.1)}})}
  if(kind==='lab'){loopNoise('lowpass',300,.4,.04);every(140,900,()=>{const t=c.currentTime,o=c.createOscillator(),g=c.createGain(),f0=250+Math.random()*500;o.frequency.setValueAtTime(f0,t);o.frequency.exponentialRampToValueAtTime(f0*2.4,t+.06);g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(.05,t+.008);g.gain.exponentialRampToValueAtTime(.001,t+.07);o.connect(g).connect(ambienceBus);o.start(t);o.stop(t+.08)})}
  if(kind==='workshop'){loopNoise('lowpass',220,.6,.08);every(4000,9000,()=>burst({freq:2500,q:6,d:.15,gain:.04,bus:ambienceBus}))}
  if(kind==='body'){loopNoise('lowpass',140,.5,.1)}
  if(kind==='room'){loopNoise('lowpass',400,.4,.03)}
  ambience={stop(){alive=false;timers.forEach(clearTimeout);nodes.forEach(n=>{if(n.gain)n.gain.setTargetAtTime(0,c.currentTime,.4);else setTimeout(()=>{try{n.stop()}catch{}},1500)})}};
}
function stopAmbience(){ambience?.stop();ambience=null}
const AMBIENCE={space:'space',math:'meadow',chemistry:'lab',physics:'workshop',biology:'body',games:'room'};

export function toggleMusic(nextTheme=theme){
  ready();theme=nextTheme;musicOn=!musicOn;clearTimeout(musicTimer);
  if(musicOn){bar=0;nextBarAt=ctx.currentTime+.1;scheduleBar();if(AMBIENCE[theme])startAmbience(AMBIENCE[theme])}else stopAmbience();
  return musicOn;
}
export const isMusicOn=()=>musicOn;

export function installAudio({musicButton,theme:pageTheme='wonder',preload:names=[]}={}){
  theme=pageTheme;
  const first=()=>{ready();preload([...(preload.pending||[]),...names]);preload.pending=[]};
  addEventListener('pointerdown',first,{once:true,capture:true});addEventListener('keydown',first,{once:true,capture:true});
  document.addEventListener('click',e=>{if(e.target.closest('button,a,[role="button"]'))playSfx('tap')});
  if(musicButton)musicButton.addEventListener('click',()=>{const on=toggleMusic(pageTheme);musicButton.classList.toggle('on',on);musicButton.setAttribute('aria-pressed',String(on));const label=musicButton.querySelector('span');if(label)label.textContent=on?'Music on':'Music off'});
}
