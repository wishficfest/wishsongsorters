/* globals supaTrack */
const START_BTN = document.getElementById('btn-start');
const SCREEN_COMPARE = document.getElementById('screen-compare');

const imgA = document.getElementById('imgA');
const imgB = document.getElementById('imgB');
const titleA = document.getElementById('titleA');
const titleB = document.getElementById('titleB');
const spotifyA = document.getElementById('spotifyA');
const spotifyB = document.getElementById('spotifyB');
const youtubeA = document.getElementById('youtubeA');
const youtubeB = document.getElementById('youtubeB');
const previewA = document.getElementById('previewA');
const previewB = document.getElementById('previewB');

const btnsChoose = Array.from(document.querySelectorAll('.choose'));
const btnTie = document.getElementById('btn-tie');
const btnCancel = document.getElementById('btn-cancel');

const bar = document.getElementById('bar');
const progressText = document.getElementById('progressText');

const modal = document.getElementById('previewModal');
const modalClose = document.getElementById('modalClose');
const spotifyFrame = document.getElementById('spotifyFrame');

let SONGS = [];
let totalComparisonsEstimated = 0;
let comparisonsDone = 0;

let stack = [];
let current = null;
let A = null;
let B = null;

function shuffle(arr){ for(let i=arr.length-1;i>0;i--){ const j=Math.floor(Math.random()*(i+1)); [arr[i],arr[j]]=[arr[j],arr[i]]; } return arr; }

async function loadSongs(){
  const res = await fetch('songs.json', {cache:'no-store'});
  if(!res.ok) throw new Error('Failed to load songs.json');
  const data = await res.json();
  return data.map((s, idx) => ({ ...s, _idx: idx }));
}

function estimateComparisons(n){ return Math.ceil(n * Math.log2(Math.max(2, n))); }

function startSorting(items){
  stack = [{ arr: shuffle(items.slice()), pivot: null, i: 0, less: [], eq: [], greater: [] }];
  comparisonsDone = 0;
  totalComparisonsEstimated = estimateComparisons(items.length);
  document.querySelector('.turntable-hero').style.display = 'none';
  SCREEN_COMPARE.classList.remove('hidden');
  nextStep();
}

function nextStep(){
  while(stack.length){
    current = stack[stack.length-1];
    if(current.arr.length <= 1){
      const done = current.arr.length === 1 ? current.arr : [];
      stack.pop();
      if(stack.length){ collapseIntoParent(done); continue; }
      persistAndFinish(done); return;
    }
    if(current.pivot === null){
      current.pivot = current.arr[0]; current.i = 1;
      current.less = []; current.eq = [current.pivot]; current.greater = [];
    }
    if(current.i < current.arr.length){ A = current.pivot; B = current.arr[current.i]; renderComparison(A,B); return; }

    const merged = current.less.concat(current.eq, current.greater); // eslint-disable-line
    stack.pop();
    if(current.greater.length > 1) stack.push({ arr: current.greater, pivot:null, i:0, less:[], eq:[], greater:[] });
    else if(current.greater.length === 1) collapseIntoParent([current.greater[0]]);
    collapseIntoParent(current.eq);
    if(current.less.length > 1) stack.push({ arr: current.less, pivot:null, i:0, less:[], eq:[], greater:[] });
    else if(current.less.length === 1) collapseIntoParent([current.less[0]]);
  }
}

function collapseIntoParent(resArr){
  if(!stack.length){ stack.push({ arr: resArr, pivot:null, i:0, less:[], eq:[], greater:[] }); return; }
  const parent = stack[stack.length-1];
  if(!parent._mergedParts) parent._mergedParts = [];
  parent._mergedParts.push(resArr);
}

function setLink(el, url){ el.href = url || '#'; el.classList.toggle('disabled', !url); }

function renderComparison(a,b){
  imgA.src = a.cover || ''; imgA.alt = a.title || '';
  imgB.src = b.cover || ''; imgB.alt = b.title || '';
  titleA.textContent = a.title || '—'; titleB.textContent = b.title || '—';

  setLink(spotifyA, a.spotify); setLink(spotifyB, b.spotify);
  setLink(youtubeA, a.youtube); setLink(youtubeB, b.youtube);

  previewA.onclick = () => openSpotifyPreview(a.spotify);
  previewB.onclick = () => openSpotifyPreview(b.spotify);

  comparisonsDone++;
  const pct = Math.min(100, Math.round((comparisonsDone / Math.max(1,totalComparisonsEstimated))*100));
  bar.style.width = pct + '%';
  progressText.textContent = `${comparisonsDone} / ~${totalComparisonsEstimated}`;
}

/* open a small Spotify embed (no API key required) */
function openSpotifyPreview(url){
  const id = extractSpotifyTrackId(url);
  if(!id){ alert('No Spotify track for this song yet.'); return; }
  spotifyFrame.src = `https://open.spotify.com/embed/track/${id}?utm_source=generator`;
  modal.classList.remove('hidden');
}
modalClose.addEventListener('click', () => { modal.classList.add('hidden'); spotifyFrame.src=''; });
modal.addEventListener('click', (e) => { if(e.target === modal){ modal.classList.add('hidden'); spotifyFrame.src=''; }});

function extractSpotifyTrackId(url){
  if(!url) return null;
  // supports https://open.spotify.com/track/{id} and spotify:track:{id}
  const m1 = url.match(/spotify\.com\/track\/([A-Za-z0-9]{10,})/);
  if(m1) return m1[1];
  const m2 = url.match(/spotify:track:([A-Za-z0-9]{10,})/);
  if(m2) return m2[1];
  return null;
}

function choose(side){
  const frame = current; if(!frame) return;
  if(side === 'A'){ frame.greater.push(B); }
  else if(side === 'B'){ frame.less.push(B); }
  else if(side === 'TIE'){ frame.eq.push(B); }
  frame.i += 1; nextStep();
}

function persistAndFinish(sortedArr){
  const clean = sortedArr.map(({_idx, ...rest}) => rest);
  const payload = { created_at: new Date().toISOString(), count: clean.length, ranking: clean };
  try{ localStorage.setItem('song_sorter_result', JSON.stringify(payload)); }catch(_){}
  try{ if(typeof supaTrack === 'function') supaTrack(payload);}catch(_){}
  window.location.href = 'result.html';
}

function cancel(){
  document.querySelector('.turntable-hero').style.display = '';
  SCREEN_COMPARE.classList.add('hidden'); stack=[]; current=null; comparisonsDone=0;
  bar.style.width='0%'; progressText.textContent='0 / 0';
}

btnsChoose.forEach(btn => btn.addEventListener('click', () => choose(btn.dataset.choice)));
btnTie.addEventListener('click', () => choose('TIE'));
btnCancel.addEventListener('click', cancel);
START_BTN?.addEventListener('click', async () => {
  try{ SONGS = await loadSongs(); if(!SONGS.length) throw new Error('No songs in songs.json'); startSorting(SONGS); }
  catch(e){ alert('Failed to start: ' + e.message); console.error(e); }
/* refs */
const START_BTN   = document.getElementById('btn-start');
const HERO        = document.querySelector('.turntable-hero');
const PLATTER     = document.querySelector('.platter');
const TONEARM     = document.querySelector('.tonearm');
const SCREEN_COMPARE = document.getElementById('screen-compare');
/* (ref lain tetap seperti sebelumnya: imgA, imgB, dsb.) */

/* ...fungsi shuffle/loadSongs/estimateComparisons tetap... */

function startSorting(items){
  // inisialisasi quicksort stack (sama seperti sebelumnya)
  stack = [{ arr: shuffle(items.slice()), pivot: null, i: 0, less: [], eq: [], greater: [] }];
  comparisonsDone = 0;
  totalComparisonsEstimated = estimateComparisons(items.length);

  // sembunyikan hero, tampilkan compare
  HERO.style.display = 'none';
  SCREEN_COMPARE.classList.remove('hidden');
  nextStep();
}

/* animasi: tombol vinyl geser ke tengah piringan */
function moveButtonToCenter(btn, container, target){
  return new Promise(resolve => {
    const contRect = container.getBoundingClientRect();
    const platRect = target.getBoundingClientRect();
    const btnRect  = btn.getBoundingClientRect();

    // target posisi relatif ke container
    const targetLeft = (platRect.left - contRect.left) + platRect.width/2 - btnRect.width/2;
    const targetTop  = (platRect.top  - contRect.top ) + platRect.height/2 - btnRect.height/2;

    // ubah ke layout absolute terhadap container
    btn.classList.add('moving');
    btn.style.right = 'auto';
    btn.style.left  = `${btnRect.left - contRect.left}px`;
    btn.style.top   = `${btnRect.top  - contRect.top }px`;

    requestAnimationFrame(() => {
      btn.style.left = `${Math.round(targetLeft)}px`;
      btn.style.top  = `${Math.round(targetTop)}px`;
    });

    const done = () => { btn.removeEventListener('transitionend', done); resolve(); };
    btn.addEventListener('transitionend', done, { once:true });
  });
}

/* Start flow */
START_BTN?.addEventListener('click', async () => {
  try{
    const songs = await loadSongs();          // pre-load data (hindari 0/0)
    await moveButtonToCenter(START_BTN, HERO, PLATTER); // tombol geser ke tengah
    document.body.classList.add('playing');   // tonearm turun
    setTimeout(() => startSorting(songs), 750); // beri waktu tonearm mendarat
  }catch(e){
    alert('Failed to start: ' + e.message);
    console.error(e);
  }
});

/* cancel() tetap sama: kembalikan hero & angkat tonearm */
function cancel(){
  document.body.classList.remove('playing');
  HERO.style.display = '';
  SCREEN_COMPARE.classList.add('hidden');
  stack = []; current = null; comparisonsDone = 0;
  bar.style.width = '0%'; progressText.textContent = '0 / 0';
}

  
});
