export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname;
    const channelId = url.searchParams.get("channelId");
    const maxResults = clamp(Number(url.searchParams.get("maxResults") || 12), 1, 50);
    const headers = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET,OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "public, max-age=60"
    };
    if(request.method === "OPTIONS") return new Response(null,{headers});
    if(!channelId) return json({error:"channelId required"},400,headers);
    if(!env.YOUTUBE_API_KEY) return json({error:"YOUTUBE_API_KEY missing"},500,headers);

    const key = env.YOUTUBE_API_KEY;
    const yt = "https://www.googleapis.com/youtube/v3";

    try{
      if(path === "/channel"){
        const d = await ytJson(`${yt}/channels?part=snippet,statistics,contentDetails&id=${enc(channelId)}&key=${key}`);
        const x = d.items?.[0];
        if(!x) return json({error:"channel not found"},404,headers);
        return json({
          title:x.snippet?.title || "",
          description:x.snippet?.description || "",
          handle:x.snippet?.customUrl || "",
          thumbnail:x.snippet?.thumbnails?.high?.url || x.snippet?.thumbnails?.medium?.url || x.snippet?.thumbnails?.default?.url || "",
          subscriberCount:x.statistics?.subscriberCount || "0",
          viewCount:x.statistics?.viewCount || "0",
          videoCount:x.statistics?.videoCount || "0",
          uploadsPlaylist:x.contentDetails?.relatedPlaylists?.uploads || ""
        },200,headers);
      }

      if(path === "/videos"){
        const sort = url.searchParams.get("sort") || "latest";
        let items=[];
        if(sort === "oldest") items = await oldestVideos(channelId,maxResults,key,yt);
        else items = await searchedVideos(channelId,sort,maxResults,key,yt);
        return json({items},200,headers);
      }

      // Backward compatibility with your old page
      if(path === "/latest"){
        return json({items:await searchedVideos(channelId,"latest",maxResults,key,yt)},200,headers);
      }
      if(path === "/popular"){
        return json({items:await searchedVideos(channelId,"popular",maxResults,key,yt)},200,headers);
      }

      if(path === "/shorts"){
        // Official API has no "isShort" flag. We mirror recent videos <= 3 minutes.
        const recent = await searchedVideos(channelId,"latest",50,key,yt);
        const items = recent.filter(v=>Number(v.durationSeconds||99999)<=180).slice(0,maxResults);
        return json({items},200,headers);
      }

      if(path === "/live"){
        const live = await liveSearch(channelId,"live",maxResults,key,yt);
        const upcoming = await liveSearch(channelId,"upcoming",maxResults,key,yt);
        return json({items:[...live,...upcoming].slice(0,maxResults)},200,headers);
      }

      if(path === "/past-live"){
        return json({items:await liveSearch(channelId,"completed",maxResults,key,yt)},200,headers);
      }

      if(path === "/posts"){
        const html = await youtubeHtml(`https://www.youtube.com/channel/${channelId}/community?hl=en&gl=IN`);
        const data = extractInitialData(html);
        const posts = [];
        walk(data,(obj)=>{
          const r=obj?.backstagePostRenderer || obj?.postRenderer;
          if(r){
            const p=parsePost(r);
            if(p && !posts.some(x=>x.id===p.id)) posts.push(p);
          }
        });
        return json({items:posts.slice(0,maxResults)},200,headers);
      }

      if(path === "/home"){
        const html = await youtubeHtml(`https://www.youtube.com/channel/${channelId}/featured?hl=en&gl=IN`);
        const data = extractInitialData(html);
        const shelves = [];
        walk(data,(obj)=>{
          const s=obj?.shelfRenderer || obj?.richShelfRenderer;
          if(!s) return;
          const title = textOf(s.title) || textOf(s.header?.richListHeaderRenderer?.title) || "";
          if(!title) return;
          const items = collectVideos(s).slice(0,12);
          if(items.length && !shelves.some(x=>x.title===title)) shelves.push({title,items});
        });
        return json({shelves:shelves.slice(0,10)},200,headers);
      }

      if(path === "/tab"){
        const name=(url.searchParams.get("name")||"").toLowerCase();
        if(!["podcasts"].includes(name)) return json({items:[]},200,headers);
        const html = await youtubeHtml(`https://www.youtube.com/channel/${channelId}/${name}?hl=en&gl=IN`);
        const data = extractInitialData(html);
        const items = collectVideos(data).slice(0,maxResults);
        return json({items},200,headers);
      }

      return json({error:"not found"},404,headers);
    }catch(e){
      return json({error:"proxy error",detail:String(e?.message||e)},500,headers);
    }
  }
};

function enc(v){return encodeURIComponent(v)}
function clamp(n,a,b){return Math.min(Math.max(Number.isFinite(n)?n:a,a),b)}
function json(data,status,headers){return new Response(JSON.stringify(data),{status,headers})}

async function ytJson(url){
  const r=await fetch(url);
  const d=await r.json();
  if(!r.ok || d.error) throw new Error(d.error?.message || `YouTube API ${r.status}`);
  return d;
}

async function searchedVideos(channelId,sort,maxResults,key,yt){
  const order=sort==="popular"?"viewCount":"date";
  const d=await ytJson(`${yt}/search?part=snippet&type=video&order=${order}&channelId=${enc(channelId)}&maxResults=${maxResults}&key=${key}`);
  const ids=(d.items||[]).map(x=>x.id?.videoId).filter(Boolean);
  return hydrate(ids,key,yt);
}

async function oldestVideos(channelId,maxResults,key,yt){
  const c=await ytJson(`${yt}/channels?part=contentDetails&id=${enc(channelId)}&key=${key}`);
  const pl=c.items?.[0]?.contentDetails?.relatedPlaylists?.uploads;
  if(!pl) return [];
  let token="", all=[];
  do{
    const d=await ytJson(`${yt}/playlistItems?part=contentDetails&playlistId=${pl}&maxResults=50${token?`&pageToken=${enc(token)}`:""}&key=${key}`);
    all.push(...(d.items||[]).map(x=>x.contentDetails?.videoId).filter(Boolean));
    token=d.nextPageToken||"";
    if(all.length>2000) break;
  }while(token);
  const ids=all.slice(-maxResults).reverse();
  return hydrate(ids,key,yt);
}

async function liveSearch(channelId,eventType,maxResults,key,yt){
  const d=await ytJson(`${yt}/search?part=snippet&type=video&eventType=${eventType}&order=date&channelId=${enc(channelId)}&maxResults=${maxResults}&key=${key}`);
  return hydrate((d.items||[]).map(x=>x.id?.videoId).filter(Boolean),key,yt);
}

async function hydrate(ids,key,yt){
  if(!ids.length) return [];
  const d=await ytJson(`${yt}/videos?part=snippet,statistics,contentDetails,liveStreamingDetails&id=${ids.join(",")}&key=${key}`);
  return (d.items||[]).map(x=>{
    const sec=isoToSeconds(x.contentDetails?.duration||"PT0S");
    return {
      id:x.id,
      title:x.snippet?.title||"",
      thumbnail:x.snippet?.thumbnails?.high?.url || x.snippet?.thumbnails?.medium?.url || "",
      views:x.statistics?.viewCount || "0",
      likes:x.statistics?.likeCount || "0",
      comments:x.statistics?.commentCount || "0",
      publishedAt:x.snippet?.publishedAt || "",
      duration:formatDuration(sec),
      durationSeconds:sec,
      liveBroadcastContent:x.snippet?.liveBroadcastContent || "none",
      scheduledStartTime:x.liveStreamingDetails?.scheduledStartTime || "",
      actualStartTime:x.liveStreamingDetails?.actualStartTime || ""
    };
  });
}

function isoToSeconds(iso){
  const m=String(iso).match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  return m ? Number(m[1]||0)*3600+Number(m[2]||0)*60+Number(m[3]||0) : 0;
}
function formatDuration(s){
  s=Number(s||0);
  const h=Math.floor(s/3600),m=Math.floor((s%3600)/60),sec=s%60;
  return h?`${h}:${String(m).padStart(2,"0")}:${String(sec).padStart(2,"0")}`:`${m}:${String(sec).padStart(2,"0")}`;
}

async function youtubeHtml(url){
  const r=await fetch(url,{headers:{
    "User-Agent":"Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 Chrome/126 Mobile Safari/537.36",
    "Accept-Language":"en-IN,en;q=0.9"
  }});
  if(!r.ok) throw new Error(`YouTube page ${r.status}`);
  return r.text();
}

function extractInitialData(html){
  const markers=[
    "var ytInitialData = ",
    "window[\"ytInitialData\"] = ",
    "ytInitialData = "
  ];
  for(const marker of markers){
    const i=html.indexOf(marker);
    if(i<0) continue;
    const start=html.indexOf("{",i+marker.length);
    if(start<0) continue;
    const end=findJsonEnd(html,start);
    if(end>start){
      try{return JSON.parse(html.slice(start,end+1))}catch{}
    }
  }
  throw new Error("ytInitialData not found");
}

function findJsonEnd(s,start){
  let depth=0,inStr=false,esc=false;
  for(let i=start;i<s.length;i++){
    const c=s[i];
    if(inStr){
      if(esc){esc=false;continue}
      if(c==="\\"){esc=true;continue}
      if(c==='"')inStr=false;
      continue;
    }
    if(c==='"'){inStr=true;continue}
    if(c==="{")depth++;
    else if(c==="}"){
      depth--;
      if(depth===0)return i;
    }
  }
  return -1;
}

function walk(v,fn){
  if(!v || typeof v!=="object") return;
  fn(v);
  if(Array.isArray(v)){for(const x of v)walk(x,fn)}
  else{for(const k in v)walk(v[k],fn)}
}

function textOf(v){
  if(!v)return "";
  if(typeof v==="string")return v;
  if(v.simpleText)return v.simpleText;
  if(Array.isArray(v.runs))return v.runs.map(x=>x.text||"").join("");
  return "";
}

function collectVideos(root){
  const out=[];
  walk(root,(obj)=>{
    const r=obj?.videoRenderer || obj?.gridVideoRenderer || obj?.compactVideoRenderer || obj?.playlistVideoRenderer;
    if(!r?.videoId)return;
    const id=r.videoId;
    if(out.some(x=>x.id===id))return;
    const thumbs=r.thumbnail?.thumbnails||[];
    const thumb=thumbs[thumbs.length-1]?.url||"";
    out.push({
      id,
      title:textOf(r.title),
      thumbnail:thumb,
      views:parseCount(textOf(r.viewCountText)||textOf(r.shortViewCountText)),
      publishedAt:"",
      duration:textOf(r.lengthText)||"",
      durationSeconds:0,
      liveBroadcastContent:r.badges?.some(b=>textOf(b.metadataBadgeRenderer?.label).toLowerCase().includes("live"))?"live":"none"
    });
  });
  return out;
}

function parseCount(t){
  const s=String(t||"").replace(/views?/i,"").trim().toUpperCase().replace(/,/g,"");
  const m=s.match(/([\d.]+)\s*([KMB])?/);
  if(!m)return "0";
  let n=Number(m[1]||0), mult=1;
  if(m[2]==="K")mult=1e3;if(m[2]==="M")mult=1e6;if(m[2]==="B")mult=1e9;
  return String(Math.round(n*mult));
}

function parsePost(r){
  const id=r.postId || r.postIdString || r.publishedTimeText?.runs?.[0]?.navigationEndpoint?.browseEndpoint?.browseId || Math.random().toString(36).slice(2);
  const p={
    id,
    author:textOf(r.authorText)||textOf(r.authorName)||"",
    authorThumbnail:(r.authorThumbnail?.thumbnails||[]).slice(-1)[0]?.url||"",
    text:textOf(r.contentText)||textOf(r.postText)||"",
    publishedText:textOf(r.publishedTimeText)||"",
    likes:parseCount(textOf(r.voteCount)||textOf(r.likeCountText)||"0"),
    comments:parseCount(textOf(r.replyCount)||textOf(r.commentCountText)||"0")
  };
  let image="",vid="";
  walk(r,(o)=>{
    if(!image && o?.imageRenderer?.image?.thumbnails?.length){
      image=o.imageRenderer.image.thumbnails.slice(-1)[0].url||"";
    }
    const vr=o?.videoRenderer || o?.compactVideoRenderer;
    if(!vid && vr?.videoId){
      vid=vr.videoId;
      p.videoId=vid;
      p.videoTitle=textOf(vr.title);
      p.videoThumbnail=(vr.thumbnail?.thumbnails||[]).slice(-1)[0]?.url||"";
      p.videoViews=parseCount(textOf(vr.viewCountText)||textOf(vr.shortViewCountText)||"0");
    }
  });
  p.image=image;
  if(!p.text && !p.image && !p.videoId)return null;
  return p;
}
