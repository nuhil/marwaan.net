/* Math Galaxy: animated, touch-first learning without external services. */
(() => {
  const $ = (selector) => document.querySelector(selector);
  const state = { mode: 'count', mission: 1, target: 5, selected: 0, answer: null, correct: null, solved: false };
  const modes = {
    count: { label: 'Number Garden', title: 'Plant the right number of stars', emoji: '🌟' },
    add: { label: 'Addition Orbit', title: 'Bring two star teams together', emoji: '🛸' },
    subtract: { label: 'Dino Takeaway', title: 'Watch the dinos march away', emoji: '🦕' },
    pattern: { label: 'Pattern Factory', title: 'Repair the pattern machine', emoji: '⚙️' }
  };
  const playSpace = $('#play-space');
  const answers = $('#answer-zone');
  const equation = $('#visual-equation');
  const feedback = $('#feedback');
  const checkButton = $('#check-button');
  const nextButton = $('#next-button');
  const progress = $('#progress-fill');
  let stars = Number(localStorage.getItem('wonder_math_stars') || 0);
  $('#total-stars').textContent = stars;

  const random = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
  const shuffle = (items) => items.sort(() => Math.random() - .5);
  const objectButton = (emoji, index, selectable = false) => `<button class="math-object${selectable ? ' correct-target' : ' selected'}" type="button" data-index="${index}" aria-label="${selectable ? 'Sleeping seed' : 'Math object'}">${emoji}</button>`;
  const setPrompt = (text) => { $('#mission-prompt').textContent = text; };
  const setEquation = (...parts) => { equation.innerHTML = parts.map((part, i) => `<span class="${Number.isInteger(part) ? 'equation-number' : 'equation-symbol'}" data-part="${i}">${part}</span>`).join(''); };

  function answerOptions(correct) {
    const values = new Set([correct]);
    while (values.size < 3) values.add(Math.max(0, correct + random(-3, 3)));
    answers.innerHTML = shuffle([...values]).map(value => `<button class="answer-chip" type="button" data-value="${value}">${value}</button>`).join('');
    answers.querySelectorAll('button').forEach(button => button.addEventListener('click', () => {
      answers.querySelectorAll('button').forEach(item => item.classList.remove('selected'));
      button.classList.add('selected'); state.answer = Number(button.dataset.value);
    }));
  }

  function buildCount() {
    state.target = random(3, 10); state.selected = 0; state.correct = state.target;
    setPrompt(`Tap ${state.target} sleepy seeds to wake them up!`); setEquation(state.selected, 'of', state.target);
    playSpace.innerHTML = Array.from({ length: 10 }, (_, i) => objectButton('🌟', i, true)).join(''); answers.innerHTML = '';
    playSpace.querySelectorAll('button').forEach(button => button.addEventListener('click', () => {
      button.classList.toggle('selected'); state.selected = playSpace.querySelectorAll('.selected').length;
      equation.querySelector('.equation-number').textContent = state.selected;
      button.setAttribute('aria-label', button.classList.contains('selected') ? 'Awake star' : 'Sleeping seed');
    }));
  }

  function buildAdd() {
    const a = random(1, 5); const b = random(1, 5); state.correct = a + b; state.answer = null;
    setPrompt(`${a} explorers meet ${b} explorers. How many altogether?`); setEquation(a, '+', b, '=', '?');
    playSpace.innerHTML = `<div class="group-wrap"><div class="object-group left">${Array.from({length:a},(_,i)=>objectButton('🛸',i)).join('')}</div><span class="group-plus">+</span><div class="object-group right">${Array.from({length:b},(_,i)=>objectButton('🚀',i)).join('')}</div></div>`;
    answerOptions(state.correct);
  }

  function buildSubtract() {
    const a = random(4, 10); const b = random(1, a - 1); state.correct = a - b; state.answer = null; state.removeCount = b;
    setPrompt(`${a} dinos are playing. ${b} march home. How many stay?`); setEquation(a, '−', b, '=', '?');
    playSpace.innerHTML = Array.from({length:a},(_,i)=>objectButton(i < b ? '🦕' : '🦖',i)).join('');
    answerOptions(state.correct);
  }

  function buildPattern() {
    const patterns = [['🔵','🟡'],['🦖','🌿','🌿'],['🚀','⭐','🪐'],['🔺','🔵','🔺','🟢']];
    const base = patterns[random(0, patterns.length - 1)]; const sequence = Array.from({length:7},(_,i)=>base[i % base.length]);
    const missing = random(2,5); state.correct = sequence[missing]; state.answer = null;
    setPrompt('Which piece makes the pattern continue?'); equation.innerHTML = '';
    playSpace.innerHTML = `<div class="pattern-strip">${sequence.map((item,i)=>`<span class="pattern-item ${i===missing?'mystery':''}">${i===missing?'?':item}</span>`).join('')}</div>`;
    const choices = shuffle([...new Set([state.correct,'⭐','🟡','🦖','🔵','🌿','🚀'])]).slice(0,3); if(!choices.includes(state.correct)) choices[0]=state.correct;
    answers.innerHTML = shuffle(choices).map(value=>`<button class="answer-chip" type="button" data-value="${value}">${value}</button>`).join('');
    answers.querySelectorAll('button').forEach(button=>button.addEventListener('click',()=>{answers.querySelectorAll('button').forEach(x=>x.classList.remove('selected'));button.classList.add('selected');state.answer=button.dataset.value;}));
  }

  function newMission() {
    state.solved = false; state.answer = null; feedback.textContent = ''; nextButton.hidden = true; checkButton.hidden = false;
    $('#mission-label').textContent = `${modes[state.mode].label} • Mission ${state.mission}`; $('#mission-name').textContent = modes[state.mode].title;
    progress.style.width = `${Math.min(100, ((state.mission - 1) % 5) * 25)}%`;
    document.querySelector('.math-console').classList.remove('hinting');
    ({count:buildCount,add:buildAdd,subtract:buildSubtract,pattern:buildPattern})[state.mode]();
  }

  function showMotionHint() {
    document.querySelector('.math-console').classList.add('hinting');
    if (state.mode === 'count') feedback.textContent = `Count slowly: ${Array.from({length:state.target},(_,i)=>i+1).join(', ')}.`;
    if (state.mode === 'add') { playSpace.querySelector('.left')?.classList.add('merge-left'); playSpace.querySelector('.right')?.classList.add('merge-right'); feedback.textContent = 'Move both teams together, then count every explorer.'; }
    if (state.mode === 'subtract') { [...playSpace.children].slice(0,state.removeCount).forEach((item,i)=>setTimeout(()=>item.classList.add('fly-away'),i*100)); feedback.textContent = 'Watch some dinos leave. Count the friends who remain.'; }
    if (state.mode === 'pattern') feedback.textContent = 'Look for the smallest group that repeats again and again.';
  }

  function check() {
    if (state.solved) return;
    const given = state.mode === 'count' ? state.selected : state.answer;
    if (given === null) { feedback.textContent = 'Choose an answer first — you can do it!'; return; }
    if (given === state.correct) {
      state.solved = true; stars += 1; localStorage.setItem('wonder_math_stars', stars); $('#total-stars').textContent = stars;
      feedback.textContent = ['Brilliant thinking! ✨','Mission powered! 🚀','You found the pattern! 🌟'][random(0,2)];
      progress.style.width = '100%'; checkButton.hidden = true; nextButton.hidden = false;
      const selected = answers.querySelector('.selected'); if (selected) selected.classList.add('correct');
      const lastEquation = equation.querySelector('.equation-number:last-child'); if(lastEquation && lastEquation.textContent === '?'){lastEquation.textContent=state.correct;lastEquation.classList.add('reveal');}
      celebrate();
    } else {
      feedback.textContent = 'Almost! Let’s watch it once more and try again.';
      const selected = answers.querySelector('.selected'); if(selected){selected.classList.add('wrong');setTimeout(()=>selected.classList.remove('wrong'),500);} showMotionHint();
    }
  }

  function celebrate() {
    for(let i=0;i<12;i++){const spark=document.createElement('i');spark.className='celebration-spark';spark.textContent=i%2?'⭐':'✦';spark.style.setProperty('--x',`${random(-180,180)}px`);spark.style.setProperty('--y',`${random(-180,40)}px`);playSpace.appendChild(spark);setTimeout(()=>spark.remove(),1000);}
  }

  document.querySelectorAll('.mission-tab').forEach(tab => tab.addEventListener('click', () => {document.querySelectorAll('.mission-tab').forEach(t=>t.classList.remove('active'));tab.classList.add('active');state.mode=tab.dataset.mode;state.mission=1;newMission();}));
  $('#hint-button').addEventListener('click', showMotionHint); checkButton.addEventListener('click', check); nextButton.addEventListener('click',()=>{state.mission++;newMission();});
  $('#speak-prompt').addEventListener('click',()=>{if('speechSynthesis'in window){speechSynthesis.cancel();speechSynthesis.speak(new SpeechSynthesisUtterance($('#mission-prompt').textContent));}});
  newMission();
})();
