NutriTracker PWA – GitHub Pages setup

1. Unzip this folder.
2. Upload/commit ALL files and folders to the root of your existing GitHub repository
   (the same folder where index.html currently lives). Keep the folder structure:
     index.html
     manifest.json
     sw.js
     icons/icon-192.png
     icons/icon-512.png
3. Wait for GitHub Pages to redeploy, then open:
   https://crazybanana7074.github.io/nutritracker/
4. In Chrome or Edge, use the Install App button or the install icon in the address bar.
   On iPhone/iPad: Safari > Share > Add to Home Screen.

Notes:
- PWA installation requires HTTPS; GitHub Pages provides HTTPS.
- The service worker caches the app shell and icons. External CDN/API features still need an internet connection.
- If an older service worker is cached, reload the site after deployment. In DevTools > Application > Service Workers,
  you can unregister the old worker and reload if needed.
