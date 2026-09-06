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
8000 and Vite on 5173 together; Ctrl+C stops both. If these ports are occupied,
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

## Original Vite template notes

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and [`typescript-eslint`](https://typescript-eslint.io) in your project.
