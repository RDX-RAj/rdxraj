window.EDITOR_RAJ_CONFIG=window.EDITOR_RAJ_CONFIG||{};
'use strict';

const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)];
const body=document.body,
      audio=$('#audio'),
      heroPlay=$('#heroPlay'),
      miniPlay=$('#miniPlay'),
      wave=$('#wave'),
      miniPlayer=$('#miniPlayer'),
      progress=$('#progress'),
      toast=$('#toast');

const CHANNEL_ID='UCXBXbRGKFvyH83jjgCVD2gQ';

const FALLBACK=[
  {id:'mQGjBsBttLE',title:'Featured Lofi Edit',category:'haryanvi',views:'Popular',likes:'—',comments:'—',date:'Featured'},
  {id:'cnVmRi_q0l0',title:'Late Night Melody',category:'rajasthani',views:'Popular',likes:'—',comments:'—',date:'Featured'},
  {id:'OmGzOoHEJbo',title:'Cinematic Reverb Mix',category:'bollywood',views:'Popular',likes:'—',comments:'—',date:'Featured'}
];

let latestVideos=[],activeFilter='all';

const css=document.createElement('style');
css.textContent=`
.video-grid{align-items:start!important}
.video-card{width:100%!important;min-width:0!important}
.video-card .thumb{display:block!important;width:100%!important;height:auto!important;aspect-ratio:16/9!important;overflow:hidden!important}
.video-card .thumb img{display:block!important;width:100%!important;height:100%!important;aspect-ratio:16/9!important;object-fit:cover!important;object-position:center!important}
.video-stats{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:7px;margin-top:13px}
.video-stat{display:flex;align-items:center;justify-content:center;gap:5px;padding:8px 5px;border:1px solid var(--line);border-radius:10px;background:rgba(255,255,255,.04);color:var(--muted);font-size:10px;white-space:nowrap}
.video-actions{display:flex;align-items:center;justify-content:space-between;gap:8px;margin-top:10px}
.video-date{color:var(--muted);font-size:9px}
.video-share{border:1px solid var(--line);background:var(--card);color:var(--text);border-radius:999px;padding:7px 11px;font-size:10px;cursor:pointer}
.video-share i{margin-right:5px}
.duration{display:block!important;z-index:3}
@media(max-width:650px){
  .video-grid{grid-template-columns:1fr!important}
  .video-card .thumb,.video-card .thumb img{aspect-ratio:16/9!important}
  .video-info{padding:14px!important}
  .video-stats{gap:5px}
  .video-stat{font-size:9px;padding:7px 3px}
}`;
document.head.appendChild(css);

addEventListener('load',()=>setTimeout(()=>body.classList.add('loaded'),300));
addEventListener('scroll',()=>{
  $('#topbar').classList.toggle('scrolled',scrollY>30);
  miniPlayer.classList.toggle('show',scrollY>430);
});

$('#menuBtn').onclick=()=>$('#navLinks').classList.toggle('open');
$$('#navLinks a').forEach(a=>a.onclick=()=>$('#navLinks').classList.remove('open'));

const saved=localStorage.getItem('editor-raj-theme');
if(saved==='light')body.classList.add('light');

function themeIcon(){
  $('#themeBtn').innerHTML=body.classList.contains('light')
    ?'<i class="fa-solid fa-sun"></i>'
    :'<i class="fa-solid fa-moon"></i>';
}
themeIcon();

$('#themeBtn').onclick=()=>{
  body.classList.toggle('light');
  localStorage.setItem('editor-raj-theme',body.classList.contains('light')?'light':'dark');
  themeIcon();
};

/* ---------------- RANDOM MUSIC PLAYLIST ---------------- */

const tracks = [
  { title: 'Midnight Edit Session', artist: 'EDITOR RAJ', file: 'music-1.mp3' },
  { title: 'Late Night Vibes', artist: 'EDITOR RAJ', file: 'music-2.mp3' },
  { title: 'Cinematic Mood', artist: 'EDITOR RAJ', file: 'music-3.mp3' },
  { title: 'Slowed Reverb Mix', artist: 'EDITOR RAJ', file: 'music-4.mp3' },
  { title: 'After Dark Session', artist: 'EDITOR RAJ', file: 'music-5.mp3' },
  { title: 'Dreamy Night Edit', artist: 'EDITOR RAJ', file: 'music-6.mp3' }
];

let currentTrack = Math.floor(Math.random() * tracks.length);

function setTrackText(track){
  const heroTitle=document.querySelector('.track-row h3');
  const heroArtist=document.querySelector('.track-row p');
  const miniTitle=document.querySelector('.mini-meta b');
  const miniArtist=document.querySelector('.mini-meta span');

  if(heroTitle)heroTitle.textContent=track.title;
  if(heroArtist)heroArtist.textContent=track.artist;
  if(miniTitle)miniTitle.textContent=track.title;
  if(miniArtist)miniArtist.textContent=track.artist;
}

function loadTrack(index){
  const track=tracks[index];
  currentTrack=index;
  audio.src=track.file;
  setTrackText(track);
  audio.load();
  if(progress)progress.style.width='0%';
}

function syncAudio(){
  const icon=audio.paused?'play':'pause';
  heroPlay.innerHTML=`<i class="fa-solid fa-${icon}"></i>`;
  miniPlay.innerHTML=`<i class="fa-solid fa-${icon}"></i>`;
  wave.classList.toggle('playing',!audio.paused);
}

async function toggleAudio(){
  try{
    if(!audio.src)loadTrack(currentTrack);
    if(audio.paused){
      await audio.play();
    }else{
      audio.pause();
    }
    syncAudio();
  }catch(e){
    showToast('MP3 file load nahi hui ya browser ne playback block kiya.');
    console.error('Audio playback error:',e);
  }
}

function getNextRandomTrack(){
  if(tracks.length<=1)return 0;
  let next;
  do{
    next=Math.floor(Math.random()*tracks.length);
  }while(next===currentTrack);
  return next;
}

async function playRandomTrack(){
  loadTrack(getNextRandomTrack());
  try{
    await audio.play();
    syncAudio();
  }catch(e){
    syncAudio();
    showToast('Next track ready hai. Play button dabayein.');
  }
}

heroPlay.onclick=toggleAudio;
miniPlay.onclick=toggleAudio;
audio.onplay=syncAudio;
audio.onpause=syncAudio;
audio.onended=playRandomTrack;
audio.onerror=()=>{
  console.error('Could not load:',tracks[currentTrack]?.file);
  showToast(`${tracks[currentTrack]?.file||'Music file'} load nahi hui.`);
};

audio.ontimeupdate=()=>{
  if(audio.duration&&progress){
    progress.style.width=(audio.currentTime/audio.duration*100)+'%';
  }
};

loadTrack(currentTrack);
syncAudio();

/* ------------------------------------------------------- */

$('#year').textContent=new Date().getFullYear();
$('#topBtn').onclick=()=>scrollTo({top:0,behavior:'smooth'});
$('#shareBtn').onclick=()=>shareUrl(location.href,document.title);

async function shareUrl(url,title){
  try{
    if(navigator.share)await navigator.share({title,url});
    else{
      await navigator.clipboard.writeText(url);
      showToast('Link copied');
    }
  }catch(e){}
}

function showToast(t){
  toast.textContent=t;
  toast.classList.add('show');
  clearTimeout(showToast.t);
  showToast.t=setTimeout(()=>toast.classList.remove('show'),2200);
}

const io=new IntersectionObserver(
  es=>es.forEach(e=>e.isIntersecting&&e.target.classList.add('show')),
  {threshold:.12}
);
$$('.reveal').forEach(x=>io.observe(x));

function fmt(n){
  n=Number(n||0);
  if(n>=1e9)return(n/1e9).toFixed(1)+'B';
  if(n>=1e6)return(n/1e6).toFixed(1)+'M';
  if(n>=1e3)return(n/1e3).toFixed(1)+'K';
  return String(n);
}

function escapeHtml(s=''){
  return String(s).replace(/[&<>"']/g,m=>({
    '&':'&amp;',
    '<':'&lt;',
    '>':'&gt;',
    '"':'&quot;',
    "'":'&#039;'
  }[m]));
}

function card(v){
  const thumb=v.thumbnail||`https://i.ytimg.com/vi/${v.id}/maxresdefault.jpg`;
  const url=`https://www.youtube.com/watch?v=${v.id}`;

  return `<article class="video-card reveal show" data-category="${v.category||'all'}">
    <a class="thumb" target="_blank" rel="noopener" href="${url}">
      <img loading="lazy" src="${thumb}" onerror="this.src='https://i.ytimg.com/vi/${v.id}/hqdefault.jpg'" alt="${escapeHtml(v.title)}">
      <span class="play-overlay"><i class="fa-solid fa-play"></i></span>
      ${v.duration?`<span class="duration">${v.duration}</span>`:''}
    </a>
    <div class="video-info">
      <small>${(v.category||'lofi').toUpperCase()} • EDITOR RAJ</small>
      <h3>${escapeHtml(v.title)}</h3>
      <div class="video-stats">
        <span class="video-stat"><i class="fa-regular fa-eye"></i>${v.views||'—'}</span>
        <span class="video-stat"><i class="fa-regular fa-thumbs-up"></i>${v.likes||'—'}</span>
        <span class="video-stat"><i class="fa-regular fa-comment"></i>${v.comments||'—'}</span>
      </div>
      <div class="video-actions">
        <span class="video-date">${v.date||''}</span>
        <button class="video-share" data-url="${url}" data-title="${escapeHtml(v.title)}">
          <i class="fa-solid fa-share-nodes"></i>Share
        </button>
      </div>
    </div>
  </article>`;
}

function bindShares(){
  $$('.video-share').forEach(b=>b.onclick=()=>shareUrl(b.dataset.url,b.dataset.title));
}

function renderLatest(){
  const q=$('#videoSearch').value.toLowerCase().trim();
  const f=latestVideos.filter(v=>
    (activeFilter==='all'||v.category===activeFilter)&&
    v.title.toLowerCase().includes(q)
  );

  $('#latestGrid').innerHTML=f.length
    ?f.map(card).join('')
    :'<p class="no-results">Koi matching video nahi mila.</p>';

  bindShares();
}

function renderPopular(vs){
  $('#popularGrid').innerHTML=vs.slice(0,6).map(card).join('');
  bindShares();
}

function guessCategory(title=''){
  const t=title.toLowerCase();
  if(/dj|remix/.test(t))return'dj';
  if(/rajasthani|marwadi|meena/.test(t))return'rajasthani';
  if(/bollywood|hindi/.test(t))return'bollywood';
  return'haryanvi';
}

async function api(path){
  const base=(window.EDITOR_RAJ_CONFIG.API_BASE||'').replace(/\/$/,'');
  if(!base)throw new Error('No proxy');
  const r=await fetch(base+path,{cache:'no-store'});
  if(!r.ok)throw new Error('API');
  return r.json();
}

async function loadLive(){
  try{
    const [stats,latest,popular]=await Promise.all([
      api(`/channel?channelId=${CHANNEL_ID}`),
      api(`/latest?channelId=${CHANNEL_ID}&maxResults=9`),
      api(`/popular?channelId=${CHANNEL_ID}&maxResults=6`)
    ]);

    $('#subscriberCount').textContent=fmt(stats.subscriberCount);
    $('#viewCount').textContent=fmt(stats.viewCount);
    $('#videoCount').textContent=fmt(stats.videoCount);

    latestVideos=(latest.items||[]).map(x=>({
      ...x,
      category:guessCategory(x.title),
      views:fmt(x.views),
      likes:fmt(x.likes),
      comments:fmt(x.comments),
      date:x.publishedAt
        ?new Date(x.publishedAt).toLocaleDateString('en-IN',{day:'numeric',month:'short',year:'numeric'})
        :''
    }));

    const pop=(popular.items||[]).map(x=>({
      ...x,
      category:guessCategory(x.title),
      views:fmt(x.views),
      likes:fmt(x.likes),
      comments:fmt(x.comments),
      date:x.publishedAt
        ?new Date(x.publishedAt).toLocaleDateString('en-IN',{day:'numeric',month:'short',year:'numeric'})
        :''
    }));

    $('#dataStatus').textContent='Live YouTube data connected';
    renderLatest();
    renderPopular(pop);
  }catch(e){
    latestVideos=FALLBACK;
    renderLatest();
    renderPopular(FALLBACK.slice().reverse());
    $('#dataStatus').textContent='Showing featured videos. Connect the secure proxy for real-time stats, latest and popular uploads.';
  }finally{
    $('#latestSkeleton').classList.add('hide');
  }
}

$('#videoSearch').oninput=renderLatest;

$$('#filters button').forEach(b=>b.onclick=()=>{
  $$('#filters button').forEach(x=>x.classList.remove('active'));
  b.classList.add('active');
  activeFilter=b.dataset.filter;
  renderLatest();
});

const canvas=$('#particles'),
      ctx=canvas.getContext('2d');

let dots=[];

function resize(){
  canvas.width=innerWidth;
  canvas.height=innerHeight;
  dots=Array.from(
    {length:Math.min(90,Math.floor(innerWidth/14))},
    ()=>({
      x:Math.random()*canvas.width,
      y:Math.random()*canvas.height,
      r:Math.random()*1.7+.2,
      s:Math.random()*.35+.08,
      a:Math.random()*.42+.1
    })
  );
}

function animate(){
  ctx.clearRect(0,0,canvas.width,canvas.height);
  dots.forEach(d=>{
    d.y+=d.s;
    if(d.y>canvas.height){
      d.y=-2;
      d.x=Math.random()*canvas.width;
    }
    ctx.fillStyle=`rgba(215,205,255,${d.a})`;
    ctx.beginPath();
    ctx.arc(d.x,d.y,d.r,0,Math.PI*2);
    ctx.fill();
  });
  requestAnimationFrame(animate);
}

resize();
animate();
addEventListener('resize',resize);

if('serviceWorker'in navigator){
  addEventListener('load',()=>{
    navigator.serviceWorker.register('./service-worker.js').catch(()=>{});
  });
}

loadLive();
