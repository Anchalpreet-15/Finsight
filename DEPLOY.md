# Finsight — Free Tier Deployment

Target stack:
- **Backend** → Hugging Face Spaces (Docker SDK, free, 16 GB RAM — enough for the BERT emotion model)
- **Frontend** → Cloudflare Pages *(recommended)*, Netlify, or Vercel — all free, all pre-configured in this repo

You need:
- A Groq API key — https://console.groq.com (free)
- A Hugging Face account — https://huggingface.co/join
- A hosting account for the frontend — pick one:
  - Cloudflare Pages — https://dash.cloudflare.com/sign-up *(best free tier: unlimited bandwidth, 500 builds/month)*
  - Netlify — https://app.netlify.com/signup
  - Vercel — https://vercel.com/signup

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

## 2. Deploy the frontend — pick ONE

### 2a. Cloudflare Pages *(recommended — unlimited bandwidth, fastest CDN)*

1. Go to https://dash.cloudflare.com → **Workers & Pages** → **Create** → **Pages** → **Connect to Git**.
2. Authorize GitHub → select `anchalpreet-15/finsight`.
3. **Set up builds and deployments**:
   - **Framework preset:** Vite
   - **Build command:** `npm run build`
   - **Build output directory:** `dist`
   - **Root directory:** `frontend`
4. **Environment variables** → add:
   - `VITE_API_URL` = `https://<your-hf-username>-finsight.hf.space` (**no trailing slash**)
5. **Save and Deploy**. First build ~1–2 min. URL is `https://<project>.pages.dev`.
6. SPA routing works out of the box — the `frontend/public/_redirects` file in this repo tells Cloudflare to send unknown paths to `index.html`.

### 2b. Netlify

1. Go to https://app.netlify.com/start → authorize GitHub → pick the repo.
2. Netlify reads `frontend/netlify.toml` and fills in base/command/publish automatically.
3. **Site configuration → Environment variables** → add `VITE_API_URL` as above.
4. Deploy. URL is `https://<random>.netlify.app` (rename in **Site settings**).

### 2c. Vercel

1. Go to https://vercel.com/new → **Import** `anchalpreet-15/finsight`.
2. **Root Directory:** `frontend`. Framework auto-detects as Vite.
3. **Environment Variables** → `VITE_API_URL` = HF Space URL.
4. Deploy.

---

## Quick comparison

| Host | Bandwidth free tier | Build minutes | Cold start | SPA routing |
|---|---|---|---|---|
| **Cloudflare Pages** | **Unlimited** | 500/month | None | ✓ via `_redirects` |
| Netlify | 100 GB/month | 300/month | None | ✓ via `netlify.toml` |
| Vercel | 100 GB/month | 6000 min/month | None | ✓ auto |

For a student project with unknown traffic, Cloudflare wins because an unexpected spike won't push you to a paid tier.

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
- `frontend/vercel.json` — Vercel (Vite preset).
- `frontend/netlify.toml` — Netlify build + SPA fallback.
- `frontend/public/_redirects` — Cloudflare Pages / Netlify SPA routing fallback.

## Groq credit efficiency

This repo has token-saving code paths so you don't burn through Groq's free tier in an hour:
- Trivial messages ("hi", "thanks", "ok", …) → canned reply, zero Groq call.
- Tool schemas sent to Groq are filtered per-message (keyword routed) — saves ~1500-2000 input tokens per call when only one calculator is relevant.
- Compact system prompt (~500 chars shorter than v1).
- `max_tokens` 900 → 500; `max_iterations` 4 → 3.
- Tool outputs are truncated before being re-sent to the LLM.
- 5-minute in-process response cache for identical messages.
- Conversation history re-sent to the LLM is capped at the last 1 turn.
