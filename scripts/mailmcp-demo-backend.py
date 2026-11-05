#!/usr/bin/env python3
"""Run the unmodified MailMCP source in an explicitly offline demo workspace.

The upstream Windows persistent-cache requirement is intentionally replaced by
its supported development memory store. All outbound GenAI HTTP calls use a
local rejecting transport. Data resets when this process exits.
"""

from contextlib import asynccontextmanager
import os
from pathlib import Path
import sys

import httpx
import uvicorn
from starlette.responses import JSONResponse, Response
from starlette.routing import Route

_root = Path(__file__).resolve().parent
_default_source = _root / "source" if (_root / "source").is_dir() else _root / "workspace" / "source"
SOURCE = Path(os.environ.get("SOURCE_ROOT") or (sys.argv[1] if len(sys.argv) > 1 else str(_default_source))).resolve()
if not (SOURCE / "app" / "server.py").is_file():
    raise RuntimeError("SOURCE_ROOT must point to the MailMCP source checkout")
sys.path.insert(0, str(SOURCE))

from app import demo  # noqa: E402
from app.server import create_app  # noqa: E402


def offline_gateway(request):
    return httpx.Response(503, json={"error": {
        "message": "This installed demonstration is offline. GenAI connections are disabled."
    }})


app = create_app(memory_only=True, transport=httpx.MockTransport(offline_gateway))
upstream_lifespan = app.router.lifespan_context

# Keep the source checkout unchanged. In this installed demo, serve the upstream
# frontend with one explicit startup adjustment: open its first fictional email
# instead of asking for a GenAI token that this offline build cannot use.
_javascript = (SOURCE / "app" / "static" / "app.js").read_text()
_startup = "if (!connected()) openConnect();"
if _javascript.count(_startup) != 1:
    raise RuntimeError("The pinned frontend startup hook changed; rebuild the demo adapter")
_demo_javascript = _javascript.replace(_startup,
    "if (state.boot?.demo && state.messages.length) await openMessage(state.messages[0].id); else if (!connected()) openConnect();")


async def demo_javascript(request):
    return Response(_demo_javascript, media_type="text/javascript")


async def offline_connect(request):
    return JSONResponse({"detail": "This installed demo runs offline. You can explore mail, local briefs, search, and editable drafts without a token.",
        "code": "demo_offline"}, status_code=503)


app.router.routes[0:0] = [
    Route("/static/app.js", demo_javascript, methods=["GET"]),
    Route("/api/session/connect", offline_connect, methods=["POST"]),
]


@app.middleware("http")
async def allow_installed_preview(request, call_next):
    response = await call_next(request)
    # AppYard's packaged renderer has a file: origin. This wrapper is loopback
    # only and offline; permit it to embed both the app and its nested previews.
    if "X-Frame-Options" in response.headers:
        del response.headers["X-Frame-Options"]
    policy = response.headers.get("Content-Security-Policy")
    if policy:
        response.headers["Content-Security-Policy"] = policy.replace("frame-ancestors 'self'", "frame-ancestors 'self' file:")
    return response


@asynccontextmanager
async def demo_lifespan(application):
    async with upstream_lifespan(application):
        store = application.state.store
        store.set_folders(demo.demo_folders())
        store.upsert_messages(demo.demo_messages())
        store.set_profile({"display_name": "Alex Morgan", "email": "alex.morgan@example.com"})
        store.save_signatures([demo.demo_signature()])
        store.set_demo(True)
        store.update_settings({"auto_brief": False})
        yield


app.router.lifespan_context = demo_lifespan


if __name__ == "__main__":
    port = int(os.environ.get("PORT", "8765"))
    if not 1 <= port <= 65535:
        raise ValueError("PORT must be between 1 and 65535")
    uvicorn.run(app, host="127.0.0.1", port=port, access_log=True)
