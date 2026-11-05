# Finsight — Free Tier Deployment

Target stack:
- **Backend** → Hugging Face Spaces (Docker SDK, free, 16 GB RAM — enough for the BERT emotion model)
- **Frontend** → Vercel (free, static build)

Everything in this repo is already wired for it. You need:
- A Groq API key — https://console.groq.com (free)
- A Hugging Face account — https://huggingface.co/join
- A Vercel account — https://vercel.com/signup (sign in with GitHub)

---

## 1. Deploy the backend to Hugging Face Spaces

1. Go to https://huggingface.co/new-space
   - **Space name:** `finsight` (or anything)
   - **License:** MIT
   - **SDK:** **Docker** → **Blank**
   - **Hardware:** CPU Basic (free)
   - Visibility: Public
2. Click **Create Space**.
3. On the Space page, open **Files** → click **+ Add file** → **Upload files**.
   Upload the whole contents of this repo (or clone it in locally, copy over, and `git push` to the Space's git remote — see below).
4. Open **Settings** → **Variables and secrets** → **New secret**:
   - Name: `GROQ_API_KEY`
   - Value: your Groq key
5. The Space will rebuild automatically. First build takes ~8–12 min (torch + transformers + model download). Watch the **Logs** tab.
6. When logs show `Uvicorn running on http://0.0.0.0:7860` and `RAG pipeline ready.` → the backend is up at:
   ```
   https://<your-hf-username>-finsight.hf.space
   ```
   Test it: `https://<...>.hf.space/` should return `{"status":"ok","app":"Finsight API"}`.

### Faster alternative — push via git

```bash
# Assuming you're inside this repo
git remote add space https://huggingface.co/spaces/<your-hf-username>/finsight
git push space HEAD:main
```
You'll be prompted for an HF access token (create at https://huggingface.co/settings/tokens → `write` scope).

---

## 2. Deploy the frontend to Vercel

1. Go to https://vercel.com/new
2. **Import Git Repository** → pick `anchalpreet-15/finsight`.
3. Configure:
   - **Root Directory:** `frontend`
   - **Framework Preset:** Vite (auto-detected)
   - **Build Command:** `npm run build` (default)
   - **Output Directory:** `dist` (default)
4. **Environment Variables** → add:
   - Name: `VITE_API_URL`
   - Value: `https://<your-hf-username>-finsight.hf.space` (from step 1.6, **no trailing slash**)
5. Click **Deploy**. Takes ~1 min.
6. Open the Vercel URL. Chat should work.

---

## Troubleshooting

| Symptom | Fix |
|---|---|
| HF Space build fails on `torch` | Hardware set to CPU Basic? The Dockerfile pins CPU-only torch. |
| `Build exceeded memory limit` on HF | Free CPU Basic has 16 GB — should fit. Hit **Factory rebuild** once. |
| Frontend chat returns network error | CORS: backend currently allows `*`. Confirm `VITE_API_URL` has no trailing slash and no `/api` suffix. |
| HF Space cold start takes 1 min | Expected on free tier after inactivity. First request wakes it. |
| 401 from Groq | `GROQ_API_KEY` secret not set in the Space's Settings → Variables and secrets. |

---

## What's in this repo for deploy

- `Dockerfile` (repo root) — builds the FastAPI backend for HF Space.
- `.dockerignore` — keeps the image lean.
- `README.md` — HF Space YAML frontmatter at the top configures the Space.
- `frontend/vercel.json` — pins Vercel to Vite build.
