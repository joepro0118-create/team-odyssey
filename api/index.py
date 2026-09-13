"""Unified Vercel Serverless Function entrypoint for Team Odyssey.

Merges calendar assessment endpoints (server.py) and AI chat/recovery
endpoints (chat_api.py) into a single ASGI application.
"""

import json
import os
import sys
from pathlib import Path
from fastapi import Request
from fastapi.responses import JSONResponse

# Ensure backend directory is in the Python search path
ROOT_DIR = Path(__file__).resolve().parent.parent
BACKEND_DIR = ROOT_DIR / "backend"
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))
if str(ROOT_DIR) not in sys.path:
    sys.path.insert(0, str(ROOT_DIR))

from chat_api import create_app, is_allowed_origin  # noqa: E402
from server import assess, MAX_REQUEST_BYTES  # noqa: E402

app = create_app()


@app.get("/api/health")
@app.get("/health")
def health():
    return {"status": "ok"}


@app.get("/api/chat/health")
def chat_health_alias():
    return {"status": "ok", "configured": bool(os.getenv("GEMINI_API_KEY") or os.getenv("GOOGLE_API_KEY"))}


@app.post("/api/capacity")
@app.post("/capacity")
async def capacity(request: Request):
    origin = request.headers.get("origin")
    if origin and not is_allowed_origin(origin):
        return JSONResponse({"error": "Use the local application to submit a calendar."}, status_code=403)

    content_type = request.headers.get("content-type", "")
    if "application/json" not in content_type:
        return JSONResponse({"error": "Send application/json."}, status_code=415)

    try:
        body = await request.body()
        if not 0 < len(body) <= MAX_REQUEST_BYTES:
            return JSONResponse({"error": "Request is empty or too large (10 MB limit)."}, status_code=413)
        payload = json.loads(body.decode("utf-8"))
        result = assess(payload)
        return JSONResponse(result, status_code=200)
    except (ValueError, UnicodeError) as exc:
        message = "Invalid JSON request." if isinstance(exc, (json.JSONDecodeError, UnicodeError)) else str(exc)
        return JSONResponse({"error": message}, status_code=400)
    except Exception:
        return JSONResponse({"error": "Calendar assessment failed. Please try again."}, status_code=500)
