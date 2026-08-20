(() => {
  "use strict";
  const CFG = window.CHANNEL_CONFIG || {};
  const API_BASE = String(CFG.API_BASE || "").replace(/\/$/, "");
  const CHANNEL_ID = CFG.CHANNEL_ID || "UCXBXbRGKFvyH83jjgCVD2gQ";
  const GOAL = Number(CFG.SUBSCRIBER_GOAL || 100000);
  const YT_BASE = `https://www.youtube.com/channel/${CHANNEL_ID}`;

  const $ = (s) => document.querySelector(s);
  const $$ = (s) => [...document.querySelectorAll(s)];

  const skeletons = (count=3) => Array.from({length:count},()=>'<div class="skeleton"></div>').join("");
  ["popularList","latestHomeList","pastLiveHomeList","videosList","liveList","pastLiveList"].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.innerHTML = skeletons(id.includes("Home") ? 3 : 5);
  });
  $("#shortsList").innerHTML = skeletons(4);

  function fmt(n){
    n=Number(n||0);
    if(n>=1e9) return (n/1e9).toFixed(n>=1e10?0:1).replace(".0","")+"B";
    if(n>=1e6) return (n/1e6).toFixed(n>=1e7?0:1).replace(".0","")+"M";
    if(n>=1e3) return (n/1e3).toFixed(n>=1e4?0:1).replace(".0","")+"K";
    return String(n);
  }
  function esc(s=""){
    return String(s).replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[m]));
  }
  function relDate(value){
    if(!value) return "";
    const d=new Date(value), diff=Date.now()-d.getTime();
    const days=Math.floor(diff/86400000);
    if(days<1) return "today";
    if(days<30) return `${days} day${days===1?"":"s"} ago`;
    const months=Math.floor(days/30);
    if(months<12) return `${months} month${months===1?"":"s"} ago`;
    const years=Math.floor(months/12);
    return `${years} year${years===1?"":"s"} ago`;
  }
  async function api(path){
    if(!API_BASE) throw new Error("API base missing");
    const r=await fetch(API_BASE+path,{cache:"no-store"});
    if(!r.ok) throw new Error(`API ${r.status}`);
    return r.json();
  }

  function videoCard(v, live=false){
    const thumb=v.thumbnail || `https://i.ytimg.com/vi/${v.id}/hqdefault.jpg`;
    const url=`https://www.youtube.com/watch?v=${v.id}`;
    return `<article class="video-card">
      <a class="video-thumb" href="${url}" target="_blank" rel="noopener">
        <img loading="lazy" src="${thumb}" alt="${esc(v.title)}" onerror="this.src='https://i.ytimg.com/vi/${v.id}/hqdefault.jpg'">
        ${v.duration?`<span class="video-duration">${esc(v.duration)}</span>`:""}
        ${live||v.liveBroadcastContent==="live"?'<span class="live-badge">LIVE</span>':""}
      </a>
      <div class="video-info">
        <a href="${url}" target="_blank" rel="noopener"><h3 class="video-title">${esc(v.title)}</h3></a>
        <div class="video-meta">${v.views!==undefined?`${fmt(v.views)} views`:""}${v.publishedAt?` · ${relDate(v.publishedAt)}`:""}</div>
      </div>
    </article>`;
  }
  function shortCard(v){
    const thumb=v.thumbnail || `https://i.ytimg.com/vi/${v.id}/hqdefault.jpg`;
    const url=`https://www.youtube.com/shorts/${v.id}`;
    return `<a class="short-card" href="${url}" target="_blank" rel="noopener">
      <div class="short-thumb"><img loading="lazy" src="${thumb}" alt="${esc(v.title)}"></div>
      <div class="short-title">${esc(v.title)}</div>
      <div class="short-meta">${v.views!==undefined?fmt(v.views)+" views":""}</div>
    </a>`;
  }
  function renderList(el, items, limit=20, live=false){
    if(!items?.length){el.innerHTML='<div class="empty">No items available right now.</div>';return;}
    el.innerHTML=items.slice(0,limit).map(v=>videoCard(v,live)).join("");
  }
  function renderShorts(el, items){
    if(!items?.length){el.innerHTML='<div class="empty">Shorts API is not enabled on the current worker yet.</div>';return;}
    el.innerHTML=items.slice(0,8).map(shortCard).join("");
  }

  async function loadChannel(){
    const stats=await api(`/channel?channelId=${CHANNEL_ID}`);
    const subs=Number(stats.subscriberCount||0);
    $("#subscriberCount").textContent=fmt(subs);
    $("#videoCount").textContent=fmt(stats.videoCount||0);
    $("#goalCurrent").textContent=fmt(subs);
    $("#goalFill").style.width=Math.min(100,(subs/GOAL)*100)+"%";
    if(stats.title) $("#channelTitle").textContent=stats.title;
    if(stats.handle){
      $("#channelHandle").textContent=stats.handle.startsWith("@")?stats.handle:"@"+stats.handle;
      $("#channelHandle").href=YT_BASE;
    }
    if(stats.description) $("#channelBio").textContent=stats.description;
    else $("#channelBio").textContent="HELLO FRIENDS 👋 ...more";
    if(stats.thumbnail) $("#channelAvatar").src=stats.thumbnail;
  }

  async function loadCore(){
    const [popular, latest]=await Promise.all([
      api(`/popular?channelId=${CHANNEL_ID}&maxResults=9`),
      api(`/latest?channelId=${CHANNEL_ID}&maxResults=12`)
    ]);
    renderList($("#popularList"),popular.items,6);
    renderList($("#latestHomeList"),latest.items,5);
    renderList($("#videosList"),latest.items,12);
  }

  async function loadExtended(){
    const results=await Promise.allSettled([
      api(`/shorts?channelId=${CHANNEL_ID}&maxResults=12`),
      api(`/live?channelId=${CHANNEL_ID}&maxResults=10`),
      api(`/past-live?channelId=${CHANNEL_ID}&maxResults=10`)
    ]);
    const shorts=results[0].status==="fulfilled"?results[0].value.items:[];
    const live=results[1].status==="fulfilled"?results[1].value.items:[];
    const past=results[2].status==="fulfilled"?results[2].value.items:[];
    renderShorts($("#shortsList"),shorts);
    renderList($("#liveList"),live,10,true);
    renderList($("#pastLiveList"),past,10);
    renderList($("#pastLiveHomeList"),past,3);
    if(!past.length) $("#pastLiveHomeSection").style.display="none";
    return results.some(x=>x.status==="fulfilled");
  }

  async function refreshAll(){
    $("#statusLine").textContent="Connecting live YouTube data…";
    try{
      await Promise.all([loadChannel(),loadCore()]);
      const extended=await loadExtended();
      $("#statusLine").textContent=extended
        ? "Live YouTube data connected"
        : "Live stats/videos connected · Shorts/Live need the enhanced worker";
      $("#lastUpdated").textContent="Last updated: "+new Date().toLocaleString("en-IN");
    }catch(e){
      console.error(e);
      $("#statusLine").textContent="Could not load YouTube data. Check the Cloudflare Worker/API key.";
      ["popularList","latestHomeList","videosList","liveList","pastLiveList","pastLiveHomeList"].forEach(id=>{
        const el=document.getElementById(id); if(el) el.innerHTML='<div class="empty">Live data unavailable right now.</div>';
      });
      $("#shortsList").innerHTML='<div class="empty">Live data unavailable right now.</div>';
    }
  }

  $$(".tab").forEach(btn=>{
    btn.addEventListener("click",()=>{
      $$(".tab").forEach(x=>x.classList.remove("active"));
      $$(".tab-panel").forEach(x=>x.classList.remove("active"));
      btn.classList.add("active");
      $("#panel-"+btn.dataset.tab).classList.add("active");
    });
  });

  $("#refreshBtn").addEventListener("click",refreshAll);
  refreshAll();
  setInterval(loadChannel,120000);
})();
