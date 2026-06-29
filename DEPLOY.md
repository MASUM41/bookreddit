# Deploy Readit for free (Render)

One URL serves the React app and the API. **Cost: $0** on Render’s free tier.

## What you get

- Live link to share in WhatsApp (e.g. `https://readit.onrender.com`)
- ~28k books baked in at **build time** from `Final_Merged_Dataset.csv`
- Signups, posts, ratings work until the next **redeploy** (free tier disk is not permanent across deploys)

## Steps

### 1. Push code to GitHub

**Important:** the book catalog CSV is not in git by default. Add it once (≈34 MB, OK for GitHub):

```bash
git add backend/Final_Merged_Dataset.csv
git add .
git commit -m "Add catalog and Render deployment"
git push origin main
```

Without the CSV, only a tiny sample catalog deploys.

### 2. Deploy on Render

1. Go to [render.com](https://render.com) → sign up (GitHub login).
2. **New → Blueprint** → connect your repo.
3. Render reads `render.yaml` and creates the **readit** web service.
4. Wait for the build (~10–15 min first time — imports the book catalog).
5. Open the URL Render gives you (e.g. `https://readit-xxxx.onrender.com`).

### 3. Optional: custom name

In Render → your service → **Settings** → change name to `readit` → URL becomes `https://readit.onrender.com` if available.

## Free tier limits (know these)

| Limit | Effect |
|--------|--------|
| Sleeps after ~15 min idle | First visit after sleep takes ~30–60s to wake |
| Ephemeral disk on redeploy | New deploy wipes users/posts; catalog is re-imported from image |
| 512 MB RAM | Fine for demo; heavy traffic may need paid plan |

For a **university demo**, this is enough. Tell readers the first load after idle may be slow.

## Test locally (production Docker)

```bash
docker build -t readit .
docker run -p 8001:8001 -e JWT_SECRET=dev-secret readit
```

Open http://localhost:8001

## Split deploy (optional)

**Frontend:** Vercel — set `VITE_API_BASE_URL=https://your-api.onrender.com`  
**Backend:** same Render service without the root `Dockerfile` — use `backend/Dockerfile` only  

Default setup uses **one** Render service (simpler).

## Troubleshooting

- **Build fails on import** — check Render logs; ensure CSV is in `backend/`.
- **Blank page** — check `/health` returns `{"status":"ok"}`.
- **Slow recommendations** — first request after wake trains models in background; wait ~1 min.
