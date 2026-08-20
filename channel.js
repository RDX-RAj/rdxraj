(() => {
  "use strict";
  const CFG = window.CHANNEL_CONFIG || {};
  const API = String(CFG.API_BASE || "").replace(/\/$/,"");
  const CID = CFG.CHANNEL_ID || "UCXBXbRGKFvyH83jjgCVD2gQ";
  const GOAL = Number(CFG.SUBSCRIBER_GOAL || 100000);
  const YT = `https://www.youtube.com/channel/${CID}`;
  const $ = s => document.querySelector(s);
  const $$ = s => [...document.querySelectorAll(s)];

  let channel = {};
  let currentSort = "latest";
  const cache = {};

  const svgMusic = "♪";

  function fmt(n){
    n=Number(n||0);
    if(n>=1e9)return (n/1e9).toFixed(n>=1e10?0:1).replace(".0","")+"B";
    if(n>=1e6)return (n/1e6).toFixed(n>=1e7?0:1).replace(".0","")+"M";
    if(n>=1e3)return (n/1e3).toFixed(n>=1e4?0:1).replace(".0","")+"K";
    return String(n);
  }
  function esc(v=""){
    return String(v).replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[m]));
  }
  function ago(value){
    if(!value)return "";
    const t=new Date(value).getTime();
    if(!Number.isFinite(t))return "";
    let sec=Math.max(1,Math.floor((Date.now()-t)/1000));
    if(sec<60)return `${sec} seconds ago`;
    let m=Math.floor(sec/60); if(m<60)return `${m} minute${m===1?"":"s"} ago`;
    let h=Math.floor(m/60); if(h<24)return `${h} hour${h===1?"":"s"} ago`;
    let d=Math.floor(h/24); if(d<30)return `${d} day${d===1?"":"s"} ago`;
    let mo=Math.floor(d/30); if(mo<12)return `${mo} month${mo===1?"":"s"} ago`;
    let y=Math.floor(mo/12); return `${y} year${y===1?"":"s"} ago`;
  }
  async function api(path){
    if(!API) throw new Error("Missing API_BASE");
    const r=await fetch(API+path,{cache:"no-store"});
    if(!r.ok) throw new Error(`${path}: ${r.status}`);
    return r.json();
  }

  function setLinks(){
    const q=encodeURIComponent((channel.title||"EDITOR RAJ"));
    $("#searchLink").href=`https://www.youtube.com/results?search_query=${q}`;
    $("#openChannel").href=YT;
    $("#channelHandle").href=YT;
    $("#subscribeBtn").href=YT+"?sub_confirmation=1";
    $("#communityBtn").href=YT+"/community";
    $("#youNav").href=YT;
    $("#bioChannelLink").href=YT;
  }

  function renderChannel(c){
    channel=c||{};
    const title=c.title||"EDITOR RAJ";
    const handle=c.handle || "@theeditorraj";
    const subs=Number(c.subscriberCount||0);
    $("#channelTitle").textContent=title;
    $("#stickyTitle").textContent=title;
    $("#bioModalTitle").textContent=title;
    $("#channelHandle").textContent=handle.startsWith("@")?handle:"@"+handle;
    $("#subscriberCount").textContent=fmt(subs);
    $("#videoCount").textContent=fmt(c.videoCount||0);
    $("#goalCurrent").textContent=fmt(subs);
    $("#goalFill").style.width=Math.min(100,(subs/GOAL)*100)+"%";
    const bio=(c.description||"HELLO FRIENDS 👋").trim();
    $("#channelBio").textContent=bio.split(/\n/)[0]||"HELLO FRIENDS 👋";
    $("#bioModalText").textContent=bio;
    if(c.thumbnail){
      $("#avatar").src=c.thumbnail;
      $("#bottomAvatar").src=c.thumbnail;
    }
    setLinks();
  }

  function videoCard(v){
    const url=`https://www.youtube.com/watch?v=${v.id}`;
    const thumb=v.thumbnail||`https://i.ytimg.com/vi/${v.id}/hqdefault.jpg`;
    const live=v.liveBroadcastContent==="live";
    return `<article class="video-card">
      <a class="video-thumb" href="${url}" target="_blank" rel="noopener">
        <img loading="lazy" src="${thumb}" alt="${esc(v.title)}" onerror="this.src='https://i.ytimg.com/vi/${v.id}/hqdefault.jpg'">
        ${live?'<span class="live-badge">LIVE</span>':(v.duration?`<span class="duration"><span class="music-note">${svgMusic}</span>${esc(v.duration)}</span>`:"")}
      </a>
      <div class="video-copy">
        <a href="${url}" target="_blank" rel="noopener"><h3>${esc(v.title)}</h3></a>
        <div class="meta">${v.views!==undefined?fmt(v.views)+" views":""}${v.publishedAt?` · ${ago(v.publishedAt)}`:""}</div>
        <span class="dots">⋮</span>
      </div>
    </article>`;
  }

  function shortCard(v){
    const url=`https://www.youtube.com/shorts/${v.id}`;
    const thumb=v.thumbnail||`https://i.ytimg.com/vi/${v.id}/hqdefault.jpg`;
    return `<a class="short-card" href="${url}" target="_blank" rel="noopener">
      <div class="short-thumb"><img loading="lazy" src="${thumb}" alt="${esc(v.title)}"></div>
      <div class="short-title">${esc(v.title)}</div>
      <div class="short-meta">${v.views!==undefined?fmt(v.views)+" views":""}</div>
    </a>`;
  }

  function postCard(p){
    const avatar=p.authorThumbnail||channel.thumbnail||"1762319150601.jpg";
    const media=p.image?`<div class="post-media"><img loading="lazy" src="${p.image}" alt=""></div>`:"";
    const video=p.videoId?`<div class="post-video">${videoCard({id:p.videoId,title:p.videoTitle||"Community video",thumbnail:p.videoThumbnail||"",views:p.videoViews||0,publishedAt:p.publishedAt||""})}</div>`:"";
    return `<article class="post-card">
      <div class="post-head">
        <img class="post-avatar" src="${avatar}" alt="">
        <div class="post-head-copy">
          <div class="post-author">${esc(p.author||channel.title||"EDITOR RAJ")}</div>
          <div class="post-time">${esc(p.publishedText||ago(p.publishedAt)||"")}</div>
        </div>
        <span class="dots">⋮</span>
      </div>
      <div class="post-text">${esc(p.text||"").replace(/\n/g,"<br>")}</div>
      ${media}${video}
      <div class="post-footer"><span>♡ ${p.likes?fmt(p.likes):""}</span><span>💬 ${p.comments?fmt(p.comments):""}</span></div>
    </article>`;
  }

  function skeletons(n=5){
    return Array.from({length:n},()=>'<div class="skeleton"></div>').join("");
  }
  function renderVideoList(el,items,limit=20){
    if(!items?.length){el.innerHTML='<div class="empty">No videos found.</div>';return;}
    el.innerHTML=items.slice(0,limit).map(videoCard).join("");
  }

  async function loadChannel(){
    const c=await api(`/channel?channelId=${CID}`);
    renderChannel(c);
  }

  async function loadHome(){
    const root=$("#homeShelves");
    root.innerHTML=`<section class="shelf"><h2 class="shelf-title">Popular videos <span class="arrow">›</span></h2><div class="video-list">${skeletons(4)}</div></section>`;
    try{
      const d=await api(`/home?channelId=${CID}`);
      if(d.shelves?.length){
        root.innerHTML=d.shelves.map(s=>{
          const title=esc(s.title||"Videos");
          const items=(s.items||[]).slice(0,6);
          if(!items.length)return "";
          return `<section class="shelf">
            <h2 class="shelf-title">${title} <span class="arrow">›</span></h2>
            <div class="video-list">${items.map(videoCard).join("")}</div>
          </section>`;
        }).join("");
        if(root.innerHTML.trim())return;
      }
    }catch(e){ console.warn("Home scrape unavailable",e); }

    const [popular,latest,past,posts]=await Promise.allSettled([
      api(`/videos?channelId=${CID}&sort=popular&maxResults=6`),
      api(`/videos?channelId=${CID}&sort=latest&maxResults=5`),
      api(`/past-live?channelId=${CID}&maxResults=4`),
      api(`/posts?channelId=${CID}&maxResults=2`)
    ]);

    const parts=[];
    if(popular.status==="fulfilled"&&popular.value.items?.length)
      parts.push(`<section class="shelf"><h2 class="shelf-title">Popular videos <span class="arrow">›</span></h2><div class="video-list">${popular.value.items.map(videoCard).join("")}</div></section>`);
    if(posts.status==="fulfilled"&&posts.value.items?.length)
      parts.push(`<section class="shelf"><h2 class="shelf-title">Posts <span class="arrow">›</span></h2><div class="posts-list">${posts.value.items.map(postCard).join("")}</div></section>`);
    if(past.status==="fulfilled"&&past.value.items?.length)
      parts.push(`<section class="shelf"><h2 class="shelf-title">Past live streams <span class="arrow">›</span></h2><div class="video-list">${past.value.items.map(videoCard).join("")}</div></section>`);
    if(latest.status==="fulfilled"&&latest.value.items?.length)
      parts.push(`<section class="shelf"><h2 class="shelf-title">Latest uploads <span class="arrow">›</span></h2><div class="video-list">${latest.value.items.map(videoCard).join("")}</div></section>`);
    root.innerHTML=parts.join("")||'<div class="empty">Home sections could not be loaded.</div>';
  }

  async function loadVideos(sort=currentSort){
    currentSort=sort;
    const el=$("#videosList");
    el.innerHTML=skeletons(6);
    try{
      const d=await api(`/videos?channelId=${CID}&sort=${encodeURIComponent(sort)}&maxResults=20`);
      cache["videos:"+sort]=d.items||[];
      renderVideoList(el,d.items,20);
    }catch(e){
      // Compatibility with old worker:
      try{
        const endpoint=sort==="popular"?"/popular":"/latest";
        const d=await api(`${endpoint}?channelId=${CID}&maxResults=12`);
        renderVideoList(el,d.items,12);
      }catch{
        el.innerHTML='<div class="empty">Videos could not be loaded.</div>';
      }
    }
  }

  async function loadShorts(){
    const el=$("#shortsGrid");
    el.innerHTML=skeletons(6);
    try{
      const d=await api(`/shorts?channelId=${CID}&maxResults=20`);
      el.innerHTML=d.items?.length?d.items.map(shortCard).join(""):'<div class="empty">No Shorts found.</div>';
    }catch{
      el.innerHTML=`<div class="empty">Shorts need the enhanced Cloudflare Worker.<br><br><a href="${YT}/shorts" target="_blank" rel="noopener"><b>Open Shorts on YouTube ↗</b></a></div>`;
    }
  }

  async function loadLive(){
    $("#liveList").innerHTML=skeletons(3);
    $("#pastLiveList").innerHTML=skeletons(5);
    const [live,past]=await Promise.allSettled([
      api(`/live?channelId=${CID}&maxResults=10`),
      api(`/past-live?channelId=${CID}&maxResults=10`)
    ]);
    if(live.status==="fulfilled")renderVideoList($("#liveList"),live.value.items,10);
    else $("#liveList").innerHTML='<div class="empty">No live data available.</div>';
    if(past.status==="fulfilled")renderVideoList($("#pastLiveList"),past.value.items,10);
    else $("#pastLiveList").innerHTML='<div class="empty">Past live data unavailable.</div>';
  }

  async function loadPodcasts(){
    const el=$("#podcastsList");
    el.innerHTML=skeletons(4);
    try{
      const d=await api(`/tab?channelId=${CID}&name=podcasts`);
      if(d.items?.length){
        el.innerHTML=`<section class="shelf"><h2 class="shelf-title">Podcasts</h2><div class="video-list">${d.items.map(videoCard).join("")}</div></section>`;
      }else{
        el.innerHTML='<div class="empty">No Podcasts are currently shown on this channel.</div>';
      }
    }catch{
      el.innerHTML=`<div class="empty">Podcast tab could not be mirrored automatically.<br><br><a href="${YT}/podcasts" target="_blank" rel="noopener"><b>Open Podcasts on YouTube ↗</b></a></div>`;
    }
  }

  async function loadPosts(){
    const el=$("#postsList");
    el.innerHTML=skeletons(4);
    try{
      const d=await api(`/posts?channelId=${CID}&maxResults=20`);
      el.innerHTML=d.items?.length?d.items.map(postCard).join(""):`<div class="empty">No public posts found.<br><br><a href="${YT}/community" target="_blank" rel="noopener"><b>Open Community ↗</b></a></div>`;
    }catch{
      el.innerHTML=`<div class="empty">Posts need the enhanced Cloudflare Worker.<br><br><a href="${YT}/community" target="_blank" rel="noopener"><b>Open Community ↗</b></a></div>`;
    }
  }

  function selectTab(name){
    $$(".channel-tab").forEach(b=>b.classList.toggle("active",b.dataset.tab===name));
    $$(".tab-panel").forEach(p=>p.classList.toggle("active",p.id==="tab-"+name));
    const btn=$(`.channel-tab[data-tab="${name}"]`);
    btn?.scrollIntoView({behavior:"smooth",block:"nearest",inline:"center"});
    if(name==="videos"&&!cache["videos:latest"])loadVideos("latest");
    if(name==="shorts"&&!cache.shorts){cache.shorts=true;loadShorts();}
    if(name==="live"&&!cache.live){cache.live=true;loadLive();}
    if(name==="podcasts"&&!cache.podcasts){cache.podcasts=true;loadPodcasts();}
    if(name==="posts"&&!cache.posts){cache.posts=true;loadPosts();}
  }

  $$(".channel-tab").forEach(btn=>btn.addEventListener("click",()=>selectTab(btn.dataset.tab)));
  $$(".sort-btn").forEach(btn=>btn.addEventListener("click",()=>{
    $$(".sort-btn").forEach(b=>b.classList.remove("active"));
    btn.classList.add("active");
    loadVideos(btn.dataset.sort);
  }));

  $("#bioBtn").addEventListener("click",()=>$("#bioModal").classList.add("show"));
  $("#bioClose").addEventListener("click",()=>$("#bioModal").classList.remove("show"));
  $("#bioModal").addEventListener("click",e=>{if(e.target.id==="bioModal")$("#bioModal").classList.remove("show")});

  $("#moreBtn").addEventListener("click",()=>$("#moreMenu").classList.toggle("show"));
  document.addEventListener("click",e=>{
    if(!e.target.closest("#moreBtn")&&!e.target.closest("#moreMenu"))$("#moreMenu").classList.remove("show");
  });

  async function refreshAll(){
    $("#status").textContent="Refreshing live YouTube data…";
    cache.shorts=cache.live=cache.podcasts=cache.posts=false;
    try{
      await Promise.all([loadChannel(),loadHome()]);
      $("#status").textContent="Live YouTube data connected · "+new Date().toLocaleString("en-IN");
    }catch(e){
      console.error(e);
      $("#status").textContent="Some live data could not be loaded. Check the Cloudflare Worker.";
    }
  }
  $("#refreshBtn").addEventListener("click",refreshAll);

  const top=$("#ytTop"), hero=$("#channelHero");
  const compact=()=>top.classList.toggle("compact",window.scrollY>Math.max(120,hero.offsetHeight-80));
  window.addEventListener("scroll",compact,{passive:true});
  compact();

  setLinks();
  refreshAll();
  setInterval(loadChannel,120000);
})();
