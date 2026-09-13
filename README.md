# Equilibrium — Team Odyssey

## Run the calendar integration locally

Use Node.js supported by the installed Vite version and Python 3.10+.
From the repository root, on Windows:

```powershell
npm install
py -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r backend/requirements.txt
npm run dev
```

Open http://127.0.0.1:5173. The command starts the local Python API on port
8000, the FastAPI chat service on 8001, and Vite on 5173 together; Ctrl+C stops all three. If these ports are occupied,
stop the previous instance first. The launcher uses `.venv` automatically;
`EQUILIBRIUM_PYTHON` can specify another Python executable. On macOS/Linux,
create the environment with `python3 -m venv .venv` and install with
`.venv/bin/python -m pip install -r backend/requirements.txt`.

1. In **Your capacity**, click **Try sample calendar** for a reproducible
   backend calculation: 51% load, 2 deadlines, 13 work/study hours, 2 social
   hours, 5.5h average sleep, and 4 errands. The sample uses September 2, 2026
   at 09:00 Malaysia time, regardless of today's date.
2. To use your own schedule, select an `.ics` export (up to 5 MB), enter one
   to three recent sleep durations and a pending-errand count, then click
   **Calculate my capacity**. Uploads use the current server time.
3. Tag event titles with `[DEADLINE]`, `[STUDY]`, `[WORK]`, or `[SOCIAL]`.
   Equivalent calendar categories are accepted. Untagged events are ignored
   with a warning. Empty calendars are valid and give zero calendar totals.
4. Open **7-Day Forecast** to explore the imported schedule. Today’s score
   comes from the Python scoring engine; the forecast retains the existing
   JavaScript scenario formula. It assumes the entered average sleep for
   each future night, uses scheduled social events and assumes no recovery
   blocks. It is a planning estimate, not a clinical prediction.

The task list becomes a calendar planning preview after import. Completing
or moving tasks updates the forecast scenario, not the uploaded file or
Today’s submitted score. Reimport to recalculate Today’s assessment and reset
planning edits. Mood and recovery sections retain their existing demo behavior.

This MVP does not store uploads, connect to a calendar account, or write back
to calendars. Results live in the browser session and clear on refresh.
Failed submissions show an error and preserve the last successful result.
`npm run dev:frontend` runs only the sample UI; calendar assessment requires
the Python server. A static frontend deployment alone will not provide it.
The Python server is for local development, not an authenticated public service.

## Verify

```powershell
.\.venv\Scripts\python.exe -m unittest discover -s backend -p "test_*.py" -v
node src/utils/forecastEngine.js
npm run lint
npm run build
```

See `backend/README.md` for the calendar ingestion command and data contracts.

## Odyssey Guide chatbot

The round chat button at the bottom right opens Odyssey Guide after the face
screen. It can explain the current module and hold follow-up conversations.

1. Install the updated `backend/requirements.txt` into `.venv` using the command above.
2. Copy `.env.example` to `.env` in the repository root.
3. Set `GEMINI_API_KEY` in that file to your Google AI Studio API key.
   Keep `GEMINI_MODEL=gemini-3.8-flash`, or choose another available Interactions model.
4. Run `npm run dev`, open the chat button, and send a message.

The app works without a key, but the widget shows a setup notice instead of AI
replies. Restart the dev command after changing `.env`. Never put the key in
frontend code or a `VITE_` environment variable. `.env` is ignored by Git.

With **Include this page** enabled, the active module's rendered text is sent to
Google Gemini alongside your message. You can preview it or switch sharing off.
Form values, raw .ics files, camera images and the chat panel are excluded.
Rendered calendar task names and workload/mood information may be included.
Turning sharing off does not remove context already sent earlier in a conversation;
use **New chat** to start over. Closing the panel retains the conversation; refreshing
starts a new one. Chats expire after 30 minutes idle or 20 successful replies.
While Gemini is responding, use either **Stop response** control to cancel the
provider request. Slow requests end automatically after 25 seconds.

See [backend/CHATBOT.md](backend/CHATBOT.md) for the API contract, tests and local
service limitations. FastAPI's interactive docs are at http://127.0.0.1:8001/docs.

## Deploy to Vercel

The application is configured for unified fullstack deployment on Vercel using Vite static hosting and Python Serverless Functions.

1. Push this repository to GitHub/GitLab/Bitbucket.
2. In the [Vercel Dashboard](https://vercel.com/new), import the repository.
3. Vercel automatically detects the Vite framework and builds with `npm run build` (`dist`).
4. In **Project Settings → Environment Variables**, add:
   - `GEMINI_API_KEY`: your Google AI Studio API key (required for Odyssey Guide & Recovery Recommender).
   - `GEMINI_MODEL`: `gemini-3.8-flash` (optional, defaults to `gemini-3.8-flash`).
5. Click **Deploy**. Both the Vite frontend and the Python serverless API (`/api/capacity`, `/api/health`, `/chat`, `/api/recovery-recommend`) will be deployed under the same domain.

## Original Vite template notes

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and [`typescript-eslint`](https://typescript-eslint.io) in your project.
