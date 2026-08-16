EDITOR RAJ RANDOM MUSIC FIX

Repo:
RDX-RAj/theeditorraj

Steps:
1. ZIP extract karo.
2. Repo ki purani script.js ko is script.js se replace karo.
3. index.html me ye line rehni chahiye:
   <audio id="audio" preload="metadata"></audio>

Required MP3 filenames in repo root:
music-1.mp3
music-2.mp3
music-3.mp3
music-4.mp3
music-5.mp3
music-6.mp3

Important:
- MP3 files actual audio honi chahiye, 0-byte blank files nahi.
- Browser pehli baar autoplay block kar sakta hai; ek baar Play dabana padega.
- Song khatam hone ke baad next random track automatically chalega.
