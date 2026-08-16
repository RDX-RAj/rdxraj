export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname;
    const channelId = url.searchParams.get("channelId");
    const maxResults = Math.min(Number(url.searchParams.get("maxResults") || 9), 12);
    const headers = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET,OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
      "Content-Type": "application/json"
    };
    if (request.method === "OPTIONS") return new Response(null,{headers});
    if (!channelId) return new Response(JSON.stringify({error:"channelId required"}),{status:400,headers});
    const key = env.YOUTUBE_API_KEY;
    try {
      if (path === "/channel") {
        const r = await fetch(`https://www.googleapis.com/youtube/v3/channels?part=statistics&id=${channelId}&key=${key}`);
        const d = await r.json(); const s=d.items?.[0]?.statistics||{};
        return new Response(JSON.stringify({subscriberCount:s.subscriberCount,viewCount:s.viewCount,videoCount:s.videoCount}),{headers});
      }
      if (path === "/latest") {
        const r=await fetch(`https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&order=date&channelId=${channelId}&maxResults=${maxResults}&key=${key}`);
        const d=await r.json(); const ids=(d.items||[]).map(x=>x.id.videoId).filter(Boolean);
        const vr=await fetch(`https://www.googleapis.com/youtube/v3/videos?part=snippet,statistics&id=${ids.join(",")}&key=${key}`); const vd=await vr.json();
        const items=(vd.items||[]).map(x=>({id:x.id,title:x.snippet.title,thumbnail:x.snippet.thumbnails.high?.url||x.snippet.thumbnails.medium?.url,views:x.statistics.viewCount,publishedAt:x.snippet.publishedAt}));
        return new Response(JSON.stringify({items}),{headers});
      }
      if (path === "/popular") {
        const r=await fetch(`https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&order=viewCount&channelId=${channelId}&maxResults=${maxResults}&key=${key}`);
        const d=await r.json(); const ids=(d.items||[]).map(x=>x.id.videoId).filter(Boolean);
        const vr=await fetch(`https://www.googleapis.com/youtube/v3/videos?part=snippet,statistics&id=${ids.join(",")}&key=${key}`); const vd=await vr.json();
        const items=(vd.items||[]).map(x=>({id:x.id,title:x.snippet.title,thumbnail:x.snippet.thumbnails.high?.url||x.snippet.thumbnails.medium?.url,views:x.statistics.viewCount,publishedAt:x.snippet.publishedAt}));
        return new Response(JSON.stringify({items}),{headers});
      }
      return new Response(JSON.stringify({error:"not found"}),{status:404,headers});
    } catch (e) {
      return new Response(JSON.stringify({error:"proxy error"}),{status:500,headers});
    }
  }
};