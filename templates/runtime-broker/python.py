"""Dual-mode AppYard adapter. Generated application code exports invoke and optional handle_http."""
import asyncio
import concurrent.futures
import importlib.util
import inspect
import json
import os
import re
import mimetypes
import sys
import threading
import urllib.parse
import urllib.request
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

MAX = 2_000_000
TIMEOUT = 30
protocol_output = sys.stdout
mode, entrypoint = sys.argv[1:3]
if mode not in ("--stdio", "--serve", "--invoke"):
    raise ValueError("Choose --stdio, --serve or --invoke")
if mode != "--serve":
    sys.stdout = sys.stderr
sys.path.insert(0, os.path.dirname(os.path.abspath(entrypoint)))
spec = importlib.util.spec_from_file_location("fleet_application", entrypoint)
implementation = importlib.util.module_from_spec(spec)
spec.loader.exec_module(implementation)
if not callable(getattr(implementation, "invoke", None)):
    raise ValueError("Application must export invoke(input, context)")
output_lock = threading.Lock()
state_lock = threading.Lock()
pending = {}
sequence = 0
calls = 0
operations = []
static_config = None
static_root = None
if mode != "--stdio" and len(sys.argv) > 3:
    with open(sys.argv[3], encoding="utf-8") as config:
        configuration = json.load(config)
    operations = configuration if isinstance(configuration, list) else configuration.get("operations", [])
    static_config = configuration.get("static") if isinstance(configuration, dict) else None
    if static_config:
        static_root = os.path.realpath(os.path.join(os.path.dirname(os.path.abspath(sys.argv[3])), static_config["root"]))
if not isinstance(operations, list):
    raise ValueError("Integration configuration must contain an operation array")


def encode(value):
    return json.dumps(value, ensure_ascii=False, allow_nan=False, separators=(",", ":"))


def frame(value):
    text = encode(value) + "\n"
    if len(text.encode("utf-8")) > MAX:
        raise ValueError("Runtime response exceeds 2 MB")
    with output_lock:
        protocol_output.write(text)
        protocol_output.flush()


class NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        raise ValueError("Integration redirects are not allowed")


def integration(operation_id, payload=None):
    global sequence, calls
    payload = {} if payload is None else payload
    with state_lock:
        calls += 1
        if calls > 100:
            raise ValueError("Integration budget exceeded")
        sequence += 1
        request_id = "integration_" + str(sequence)
    if mode == "--stdio":
        event = threading.Event()
        entry = {"event": event}
        with state_lock:
            pending[request_id] = entry
        frame({"version": 1, "type": "integration", "id": request_id, "operationId": operation_id, "input": payload})
        if not event.wait(TIMEOUT):
            with state_lock:
                pending.pop(request_id, None)
            raise ValueError("Integration request timed out")
        result = entry["result"]
        if not result.get("ok"):
            raise ValueError(result.get("error", "Integration failed"))
        return result.get("value")
    operation = next((item for item in operations if item.get("id") == operation_id), None)
    if operation is None:
        raise ValueError("Integration operation is not configured")
    origin = urllib.parse.urlsplit(operation["origin"])
    route = operation["path"]
    if origin.scheme != "https" or origin.username or origin.password or origin.path or origin.query or origin.fragment or not origin.hostname or "." not in origin.hostname or ":" in origin.hostname or re.fullmatch(r"[0-9.]+", origin.hostname) or re.search(r"(?:^|\.)(?:localhost|local|internal)$", origin.hostname) or not route.startswith("/") or route.startswith("//") or re.search(r"[\\?#\x00-\x20]|%2f|%5c|%2e", route, re.I) or any(part in (".", "..") for part in route.split("/")):
        raise ValueError("Invalid fixed HTTPS endpoint")
    if not isinstance(payload, dict) or any(key not in ("query", "body") for key in payload):
        raise ValueError("Invalid integration input")
    query = payload.get("query", {})
    if any(key not in operation.get("queryKeys", []) or not isinstance(value, str) or len(value) > 10000 for key, value in query.items()):
        raise ValueError("Integration query key is not allowed")
    method = operation["method"]
    if method not in ("GET", "POST", "PUT", "PATCH", "DELETE") or method == "GET" and "body" in payload:
        raise ValueError("Invalid integration method/body")
    url = operation["origin"] + route + (("?" + urllib.parse.urlencode(query)) if query else "")
    body = encode(payload["body"]).encode("utf-8") if "body" in payload else None
    if len(body or b"") + len(url.encode("utf-8")) > MAX:
        raise ValueError("Integration input exceeds 2 MB")
    headers = {"Accept": "application/json" if operation["responseType"] == "json" else "text/plain"}
    if body is not None:
        headers["Content-Type"] = "application/json"
    secret = None
    auth = operation.get("auth")
    if auth:
        if auth.get("type") not in ("bearer", "header-key"):
            raise ValueError("Unsupported integration authentication")
        secret = os.environ.get(auth["envName"])
        if not secret or any(char in secret for char in "\r\n\0"):
            raise ValueError("Set " + auth["envName"] + " before calling this integration")
        header = "Authorization" if auth["type"] == "bearer" else auth["headerName"]
        if not header.replace("-", "").isalnum() or header.lower() in ("host", "connection", "content-length", "transfer-encoding", "cookie") or header.lower().startswith(("proxy-", "sec-")):
            raise ValueError("Invalid authentication header")
        headers[header] = ("Bearer " if auth["type"] == "bearer" else "") + secret
    try:
        opener = urllib.request.build_opener(urllib.request.ProxyHandler({}), NoRedirect())
        with opener.open(urllib.request.Request(url, body, headers, method=method), timeout=TIMEOUT) as response:
            content = response.read(MAX + 1)
            if len(content) > MAX:
                raise ValueError("Integration response exceeds 2 MB")
            content_type = response.headers.get_content_type()
            if operation["responseType"] == "json" and not (content_type == "application/json" or content_type.endswith("+json")):
                raise ValueError("Integration did not return JSON")
            if operation["responseType"] != "json" and not (content_type.startswith("text/") or content_type in ("application/json", "application/xml")):
                raise ValueError("Unsupported integration response type")
            def redact(value):
                if isinstance(value, str):
                    return value.replace(secret, "[redacted]") if secret else value
                if isinstance(value, list):
                    return [redact(item) for item in value]
                if isinstance(value, dict):
                    return {redact(key): redact(item) for key, item in value.items()}
                return "[redacted]" if secret and str(value) == secret else value
            text = content.decode("utf-8")
            return redact(json.loads(text) if operation["responseType"] == "json" else text)
    except Exception as error:
        raise ValueError(str(error).replace(secret, "[redacted]") if secret else str(error)) from None


context = {"integrations": {"invoke": integration}}


def invoke_function(function, value):
    result = function(value, context) if len(inspect.signature(function).parameters) >= 2 else function(value)
    return asyncio.run(result) if inspect.isawaitable(result) else result


def handle(kind, value):
    if kind == "invoke":
        return invoke_function(implementation.invoke, value)
    if kind != "http":
        raise ValueError("Unsupported runtime request")
    if callable(getattr(implementation, "handle_http", None)):
        return invoke_function(implementation.handle_http, value)
    if value["method"] == "GET" and value["path"] == "/health":
        return {"status": 200, "headers": {"content-type": "application/json"}, "body": '{"ok":true}'}
    if value["method"] == "POST" and value["path"] == "/api/invoke":
        return {"status": 200, "headers": {"content-type": "application/json"}, "body": encode(invoke_function(implementation.invoke, json.loads(value["body"])))}
    return {"status": 404, "body": "Not found"}


if mode == "--stdio":
    executor = concurrent.futures.ThreadPoolExecutor(max_workers=4)
    requests = set()
    active = set()

    def execute(message):
        try:
            value = handle(message["kind"], message["input"])
            frame({"version": 1, "type": "response", "id": message["id"], "ok": True, "value": value})
        except Exception as error:
            frame({"version": 1, "type": "response", "id": message["id"], "ok": False, "error": str(error)[:2000]})
        finally:
            with state_lock:
                active.discard(message["id"])

    frame({"version": 1, "type": "ready"})
    for raw in iter(lambda: sys.stdin.buffer.readline(MAX + 1), b""):
        if len(raw) > MAX or not raw.endswith(b"\n"):
            os._exit(2)
        message = json.loads(raw)
        if message.get("version") != 1 or not isinstance(message.get("id"), str):
            os._exit(2)
        if message["type"] == "integration-result":
            with state_lock:
                entry = pending.pop(message["id"], None)
            if entry is None:
                os._exit(2)
            entry["result"] = message
            entry["event"].set()
        elif message["type"] == "request":
            with state_lock:
                if message["id"] in requests or len(active) >= 32:
                    os._exit(2)
                requests.add(message["id"])
                active.add(message["id"])
            executor.submit(execute, message)
        else:
            os._exit(2)
    os._exit(0)
elif mode == "--invoke":
    raw = sys.stdin.buffer.read(MAX + 1)
    if len(raw) > MAX:
        raise ValueError("Input exceeds 2 MB")
    protocol_output.write(encode(handle("invoke", json.loads(raw))) + "\n")
else:
    class HTTPInputError(ValueError):
        def __init__(self, status, message):
            super().__init__(message)
            self.status = status

    # Frame the whole request before calling application code. In particular,
    # BaseHTTPRequestHandler does not decode Transfer-Encoding for rfile.
    token = rb"[!#$%&'*+\-.^_`|~0-9A-Za-z]+"
    quoted = rb'"(?:[\t \x21\x23-\x5b\x5d-\x7e\x80-\xff]|\\[\t \x21-\x7e\x80-\xff])*"'
    chunk_header = re.compile(rb"([0-9A-Fa-f]+)(?:[ \t]*;[ \t]*" + token
                              + rb"(?:[ \t]*=[ \t]*(?:" + token + rb"|" + quoted + rb"))?)*\r\n")
    trailer_header = re.compile(token + rb":[\t \x21-\x7e\x80-\xff]*\r\n")

    def read_http_body(handler):
        lengths = handler.headers.get_all("Content-Length", [])
        encodings = handler.headers.get_all("Transfer-Encoding", [])
        if len(lengths) > 1 or (lengths and encodings):
            raise HTTPInputError(400, "Ambiguous request body framing")

        def read_exact(size):
            data = handler.rfile.read(size)
            if len(data) != size:
                raise HTTPInputError(400, "Incomplete request body")
            return data

        if not encodings:
            length = lengths[0].strip(" \t") if lengths else "0"
            if not re.fullmatch(r"[0-9]+", length):
                raise HTTPInputError(400, "Invalid Content-Length")
            length = length.lstrip("0") or "0"
            if len(length) > len(str(MAX)) or int(length) > MAX:
                raise HTTPInputError(413, "Input exceeds 2 MB")
            return read_exact(int(length)).decode("utf-8")

        if handler.request_version == "HTTP/1.0":
            raise HTTPInputError(400, "Transfer-Encoding requires HTTP/1.1")
        if ",".join(encodings).strip(" \t").lower() != "chunked":
            raise HTTPInputError(501, "Unsupported Transfer-Encoding; use chunked")

        metadata_bytes = 0

        def read_metadata():
            nonlocal metadata_bytes
            line = handler.rfile.readline(8193)
            metadata_bytes += len(line)
            if len(line) > 8192 or metadata_bytes > 65536:
                raise HTTPInputError(413, "Chunk metadata exceeds its limit")
            if not line.endswith(b"\r\n"):
                raise HTTPInputError(400, "Incomplete or malformed chunk framing")
            return line

        body = bytearray()
        while True:
            match = chunk_header.fullmatch(read_metadata())
            if not match:
                raise HTTPInputError(400, "Invalid chunk size or extension")
            size = int(match[1], 16)
            if size > MAX - len(body):
                raise HTTPInputError(413, "Input exceeds 2 MB")
            if size == 0:
                while True:
                    trailer = read_metadata()
                    if trailer == b"\r\n":
                        # Trailers are consumed but never overwrite request headers.
                        return body.decode("utf-8")
                    if not trailer_header.fullmatch(trailer):
                        raise HTTPInputError(400, "Invalid chunk trailer")
            body.extend(read_exact(size))
            if read_exact(2) != b"\r\n":
                raise HTTPInputError(400, "Invalid chunk data terminator")
            metadata_bytes += 2
            if metadata_bytes > 65536:
                raise HTTPInputError(413, "Chunk metadata exceeds its limit")

    def static_response(method, route):
        if not static_root or method != "GET":
            return None
        relative = urllib.parse.unquote(urllib.parse.urlsplit(route).path).lstrip("/") or static_config.get("index", "index.html")
        if relative not in static_config.get("files", []):
            return None
        file = os.path.realpath(os.path.join(static_root, relative))
        if not file.startswith(static_root + os.sep):
            raise ValueError("Invalid static file path")
        with open(file, "rb") as stream:
            content = stream.read(MAX + 1)
        if len(content) > MAX:
            raise ValueError("Static file exceeds 2 MB")
        # Match preview/Node decoding even when the document has no charset metadata.
        content_type = {
            ".html": "text/html; charset=utf-8",
            ".css": "text/css; charset=utf-8",
            ".js": "text/javascript; charset=utf-8",
            ".mjs": "text/javascript; charset=utf-8",
        }.get(os.path.splitext(file)[1], mimetypes.guess_type(file)[0] or "application/octet-stream")
        return {"status": 200, "headers": {"content-type": content_type}, "body": content}

    class Handler(BaseHTTPRequestHandler):
        def dispatch(self):
            try:
                self.connection.settimeout(TIMEOUT)
                try:
                    body = read_http_body(self)
                except UnicodeDecodeError:
                    raise HTTPInputError(400, "Request body is not valid UTF-8") from None
                except TimeoutError:
                    raise HTTPInputError(408, "Request body read timed out") from None
                # Match the host/Node HTTP boundary: names are lowercase, values
                # stay intact. HTTPMessage lookup retains its first-value policy.
                headers = {key.lower(): self.headers[key] for key in self.headers}
                result = static_response(self.command, self.path) or handle("http", {"method": self.command, "path": self.path, "headers": headers, "body": body})
                content = result["body"] if isinstance(result["body"], bytes) else result["body"].encode("utf-8")
                if len(content) > MAX:
                    raise ValueError("Response exceeds 2 MB")
                self.send_response(result["status"])
                for key, value in result.get("headers", {}).items():
                    self.send_header(key, value)
                self.end_headers()
                # Match Node's HTTP server: HEAD reaches the application but
                # sends only its status and headers, never its response body.
                if self.command != "HEAD":
                    self.wfile.write(content)
            except HTTPInputError as error:
                self.close_connection = True
                self.send_error(error.status, str(error))
            except Exception as error:
                self.send_error(500, str(error))
        do_GET = dispatch
        do_HEAD = dispatch
        do_OPTIONS = dispatch
        do_POST = dispatch
        do_PUT = dispatch
        do_PATCH = dispatch
        do_DELETE = dispatch
    server = ThreadingHTTPServer((os.environ.get("HOST", "127.0.0.1"), int(os.environ.get("PORT", "3000"))), Handler)
    print("Application server ready: http://" + os.environ.get("HOST", "127.0.0.1") + ":" + str(server.server_port), file=sys.stderr, flush=True)
    server.serve_forever()
