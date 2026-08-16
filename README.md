# Editor Raj Ultimate V3

## GitHub repository me replace/upload karein
- index.html
- style.css
- script.js
- config.js
- manifest.json
- service-worker.js

## Ye existing files root folder me rehni chahiye
- 1762319150601.jpg
- IMG_20260323_213556.jpg
- music.mp3

## Real-time YouTube data setup
GitHub Pages static hosting API key ko secure nahi rakh sakti. Isliye ZIP me `cloudflare-worker.js` diya hai.

1. Cloudflare dashboard me Workers & Pages kholen.
2. Create Worker karein.
3. `cloudflare-worker.js` ka code paste karke deploy karein.
4. Worker Settings > Variables and Secrets me secret banayein:
   - Name: YOUTUBE_API_KEY
   - Value: apni YouTube Data API key
5. Worker URL copy karein.
6. `config.js` me `API_BASE` ke saamne Worker URL paste karein.
7. Updated `config.js` GitHub me upload karein.

Proxy connect na hone par bhi website featured fallback videos ke saath properly chalegi.
