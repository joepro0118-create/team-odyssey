# Odyssey Guide

FastAPI wraps `google.genai.Client().interactions.create` using
`gemini-3.8-flash` by default. The system prompt is tailored to Odyssey's actual
Calendar, Home, Tasks, Tracker and Recovery features, demo data and planning limits.
The service provides explanations only; it has no task/calendar mutation tools.

## Run

From the repository root:

```powershell
.\.venv\Scripts\python.exe -m pip install -r backend/requirements.txt
Copy-Item .env.example .env
# Edit .env: GEMINI_API_KEY=<your key>, GEMINI_MODEL=gemini-3.8-flash
npm run dev
```

Only copy the template if `.env` does not already exist. Set the key locally;
do not commit it or send it through the browser. Environment variables override
the root `.env` file. `GOOGLE_API_KEY` is also accepted when `GEMINI_API_KEY` is unset.
The installed SDK is pinned because the Interactions API payload matters for history.

To run only chat: `.\.venv\Scripts\python.exe backend/chat_api.py`.
This binds to `127.0.0.1:8001`. Calendar remains on port 8000.
Vite forwards `/chat` routes to 8001 in dev and preview.

## API

`POST /chat`, Content-Type `application/json`:

```json
{
  "message": "What should I tackle first?",
  "page_context": {
    "module": "Today's load",
    "content": "Assessment source: Imported calendar\nFinish assignment\nHigh"
  },
  "conversation_id": null,
  "request_id": "b30236d5-e42e-4fe7-afc3-7603448031db"
}
```

Response:

```json
{
  "reply": "Start with the assignment if its deadline is closest...",
  "conversation_id": "7ebf7325-b7ea-4085-a9a9-0c8bc73b650e"
}
```

Send that `conversation_id` on follow-ups with the new message and a fresh page
snapshot. The UUID acts as a temporary conversation token; don't share it.
The browser creates a new `request_id` for each send. While it is running,
`DELETE /chat/requests/{request_id}` cancels the Gemini request without adding
the stopped turn to conversation history. If omitted, the API generates one for
backward compatibility, but the caller cannot stop that request by ID.
Omit `page_context` to send no new page data. The server validates message length
(1–2,000 characters), module label (100), context (8,000), UUID and unknown fields.
Bodies are limited to 64 KiB before JSON parsing.

- `GET /chat/health`: `{ "status": "ok", "configured": true/false }`.
  Configured indicates a key exists, not that its access/quota has been verified.
- `DELETE /chat/{conversation_id}`: deletes local history; returns 204 (idempotent).
- `DELETE /chat/requests/{request_id}`: stops an active reply; returns 204 (idempotent).
- 409: concurrent request or 20-reply limit; 410: expired/deleted conversation.
- 415/422: content type or invalid input; 413: too large; 403: unsupported origin.
- 429: service concurrency/session limit or Gemini quota; 503: missing key/access;
  504: provider timeout; 502: other provider failures or no text output.

Errors return a user-readable `detail` string. Provider exception text, prompts,
API keys and conversation bodies are not logged or returned in errors.

Chat requests 1-3 short sentences (normally under 60 words) with low thinking.
Its 2,048-token safety cap includes internal reasoning, so it is not the visible
answer length. A tiny combined cap can produce no answer. Chat uses one provider
attempt with a 25-second request timeout, and a 35-second browser fallback. The pinned SDK's wrapped
timeout and connection errors map to 504 and 503 respectively; Retry sends a new
attempt without adding a failed turn to history. External provider latency can
still cause timeouts. If the server runs inside a network-restricted sandbox,
start it with outbound network permission; a valid API key alone is insufficient.

After Stop the widget offers Try again and Edit message, or the user can type a
new question. A retry waits for cancellation cleanup and reuses the unanswered
message bubble. Late replies from stopped requests are ignored.

## Context and history

`scanPageContext` in `src/utils/pageContext.js` chooses the module with greatest
horizontal overlap with the dashboard viewport. It walks rendered text inside
that module, including below-the-fold content, and omits hidden elements, form
controls, camera/video/canvas content and anything marked `data-chat-private`.
It scans on opening, navigation, context preview and immediately before sending.
The frontend scans the DOM because the Python server cannot see a browser's live
page. The scan is bounded and requires no extra Gemini tool round trip.

The model sees context as untrusted data inside the user-input JSON. It does not
receive it as system instructions. The widget renders replies as escaped text,
never HTML. Chat stays open across modules and refreshed scans describe the new module.

Each conversation keeps **all** Gemini response steps (including thought signatures)
in server memory and sends those steps with the next user input using `store=False`.
This follows the [documented stateless Interactions flow](https://ai.google.dev/gemini-api/docs/text-generation#stateless-conversations).
It avoids the Interactions API's stored-conversation feature; Google still processes
submitted data under the Gemini API terms. It is not a guarantee of zero provider retention.
The client only receives the text answer and its conversation token, not internal steps.

History is capped at 20 replies, 100 sessions and four concurrent provider requests.
Expired idle sessions are pruned on the next chat request after 30 minutes; restarting
the service clears memory. New chat deletes the known server session. Refresh loses
the browser token; orphaned sessions expire. Failed requests do not append history.

## Verification

```powershell
.\.venv\Scripts\python.exe -m unittest discover -s backend -p "test_*.py" -v
npm run lint
npm run build
```

Chat tests inject a fake provider and require no API key or paid requests. They cover
follow-ups preserving full model steps, updated page context, session isolation,
expiry/reset, limits, validation, origin/body checks and sanitized provider failures.

For a live smoke test, configure a valid key, open the widget and ask "What page
am I looking at?" Switch modules, ask a follow-up, then test New chat. Use sample
data for this first test. A mock-provider pass does not validate Gemini access.

## Local MVP scope

Like the existing calendar service, this service is intended for local use. Run
one process/worker: in-memory sessions are not shared across workers. Before public
deployment add application authentication, per-user quota/rate controls, HTTPS,
configured allowed origins, and an appropriately secured shared session store.
CORS is a browser boundary, not user authentication. A static frontend alone does
not run either Python service. Model availability and billing depend on your Gemini project.
