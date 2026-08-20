export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname;
    const channelId = url.searchParams.get("channelId");
    const maxResults = Math.min(Math.max(Number(url.searchParams.get("maxResults") || 9),1),20);
    const headers = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET,OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "public, max-age=60"
    };
    if (request.method === "OPTIONS") return new Response(null,{headers});
    if (!channelId) return json({error:"channelId required"},400,headers);
    if (!env.YOUTUBE_API_KEY) return json({error:"YOUTUBE_API_KEY missing"},500,headers);

    const key = env.YOUTUBE_API_KEY;
    const yt = "https://www.googleapis.com/youtube/v3";

    try {
      if (path === "/channel") {
        const r = await fetch(`${yt}/channels?part=snippet,statistics&id=${encodeURIComponent(channelId)}&key=${key}`);
        const d = await r.json();
        const item = d.items?.[0];
        if (!item) return json({error:"channel not found"},404,headers);
        const s = item.statistics || {};
        const sn = item.snippet || {};
        return json({
          title: sn.title,
          description: sn.description,
          handle: sn.customUrl || "",
          thumbnail: sn.thumbnails?.high?.url || sn.thumbnails?.medium?.url || sn.thumbnails?.default?.url || "",
          subscriberCount: s.subscriberCount,
          viewCount: s.viewCount,
          videoCount: s.videoCount
        },200,headers);
      }

      if (path === "/latest" || path === "/popular") {
        const order = path === "/popular" ? "viewCount" : "date";
        const sr = await fetch(`${yt}/search?part=snippet&type=video&order=${order}&channelId=${encodeURIComponent(channelId)}&maxResults=${maxResults}&key=${key}`);
        const sd = await sr.json();
        const ids = (sd.items || []).map(x=>x.id?.videoId).filter(Boolean);
        const items = await hydrate(ids, key, yt);
        return json({items},200,headers);
      }

      if (path === "/shorts") {
        // YouTube Data API has no dedicated Shorts endpoint.
        // We take recent uploads and keep videos up to 3 minutes.
        const sr = await fetch(`${yt}/search?part=snippet&type=video&order=date&channelId=${encodeURIComponent(channelId)}&maxResults=20&key=${key}`);
        const sd = await sr.json();
        const ids = (sd.items || []).map(x=>x.id?.videoId).filter(Boolean);
        const items = (await hydrate(ids,key,yt)).filter(x => Number(x.durationSeconds||9999) <= 180).slice(0,maxResults);
        return json({items},200,headers);
      }

      if (path === "/live") {
        const liveNow = await searchLive("live",channelId,maxResults,key,yt);
        const upcoming = await searchLive("upcoming",channelId,maxResults,key,yt);
        return json({items:[...liveNow,...upcoming].slice(0,maxResults)},200,headers);
      }

      if (path === "/past-live") {
        const items = await searchLive("completed",channelId,maxResults,key,yt);
        return json({items},200,headers);
      }

      return json({error:"not found"},404,headers);
    } catch (e) {
      return json({error:"proxy error",detail:String(e?.message||e)},500,headers);
    }
  }
};

function json(data,status,headers){
  return new Response(JSON.stringify(data),{status,headers});
}

async function hydrate(ids,key,yt){
  if(!ids.length) return [];
  const r = await fetch(`${yt}/videos?part=snippet,statistics,contentDetails,liveStreamingDetails&id=${ids.join(",")}&key=${key}`);
  const d = await r.json();
  return (d.items||[]).map(x=>{
    const durationSeconds = isoToSeconds(x.contentDetails?.duration || "PT0S");
    return {
      id:x.id,
      title:x.snippet?.title || "",
      thumbnail:x.snippet?.thumbnails?.high?.url || x.snippet?.thumbnails?.medium?.url || "",
      views:x.statistics?.viewCount || "0",
      likes:x.statistics?.likeCount || "0",
      comments:x.statistics?.commentCount || "0",
      publishedAt:x.snippet?.publishedAt || "",
      duration:formatDuration(durationSeconds),
      durationSeconds,
      liveBroadcastContent:x.snippet?.liveBroadcastContent || "none",
      scheduledStartTime:x.liveStreamingDetails?.scheduledStartTime || "",
      actualStartTime:x.liveStreamingDetails?.actualStartTime || ""
    };
  });
}

async function searchLive(eventType,channelId,maxResults,key,yt){
  const r = await fetch(`${yt}/search?part=snippet&type=video&eventType=${eventType}&order=date&channelId=${encodeURIComponent(channelId)}&maxResults=${maxResults}&key=${key}`);
  const d = await r.json();
  const ids = (d.items||[]).map(x=>x.id?.videoId).filter(Boolean);
  return hydrate(ids,key,yt);
}

function isoToSeconds(iso){
  const m = String(iso).match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if(!m) return 0;
  return Number(m[1]||0)*3600 + Number(m[2]||0)*60 + Number(m[3]||0);
}

function formatDuration(s){
  s=Number(s||0);
  const h=Math.floor(s/3600), m=Math.floor((s%3600)/60), sec=s%60;
  return h ? `${h}:${String(m).padStart(2,"0")}:${String(sec).padStart(2,"0")}` : `${m}:${String(sec).padStart(2,"0")}`;
}
