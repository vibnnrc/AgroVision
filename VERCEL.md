# Vercel deployment

Import the repository into Vercel from its project root. The included `vercel.json` builds the Vite app from `artifacts/agrivision-ai` and deploys `api/analyze-crop.ts` as a serverless function.

Add `GEMINI_API_KEY` in **Project Settings → Environment Variables** before deploying. The browser never receives this key: it posts the compressed, user-consented image to `/api/analyze-crop`, and the function calls Gemini Vision server-side.

The diagnosis is uncertainty-aware. A low-confidence or unclear image is returned as `uncertain` with photo guidance; the interface does not display a hard-coded disease or treatment in that case. This is decision support, not a laboratory diagnosis, so users should confirm chemical treatment with a local agriculture officer.
