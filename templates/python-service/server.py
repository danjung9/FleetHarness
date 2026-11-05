"""Standard-library HTTP transport. Domain computation belongs in compute.py."""
import json
import math
import os
from pathlib import Path
import signal
import sys
import threading
import time
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

from compute import compute

PUBLIC = Path(__file__).resolve().parent / "public"
ROUTES = {
    "/": ("index.html", "text/html; charset=utf-8"),
    "/index.html": ("index.html", "text/html; charset=utf-8"),
    "/app.js": ("app.js", "text/javascript; charset=utf-8"),
    "/styles.css": ("styles.css", "text/css; charset=utf-8"),
}
MAX_INPUT_BYTES = 1_000_000
MAX_OUTPUT_BYTES = 2_000_000
TIMEOUT_SECONDS = 10


class Problem(Exception):
    def __init__(self, status, message):
        super().__init__(message)
        self.status = status


def validate_json(value):
    pending = [(value, 0)]
    count = 0
    while pending:
        item, depth = pending.pop()
        count += 1
        if count > 100_000 or depth > 64:
            raise ValueError("JSON exceeds its structural limits.")
        if item is None or type(item) in (str, bool):
            continue
        if type(item) is int and abs(item) <= sys.float_info.max:
            continue
        if type(item) is float and math.isfinite(item):
            continue
        if type(item) is list:
            pending.extend((entry, depth + 1) for entry in item)
        elif type(item) is dict and all(type(key) is str for key in item):
            pending.extend((entry, depth + 1) for entry in item.values())
        else:
            raise ValueError("Computation must use JSON values with finite numbers and string keys.")


class ApplicationServer(ThreadingHTTPServer):
    daemon_threads = True
    block_on_close = False
    request_queue_size = 16

    def __init__(self, address, computation):
        self.computation = computation
        self.compute_slots = threading.BoundedSemaphore(4)
        self.request_slots = threading.BoundedSemaphore(32)
        super().__init__(address, Handler)

    def process_request(self, request, client_address):
        if not self.request_slots.acquire(blocking=False):
            self.shutdown_request(request)
            return
        try:
            super().process_request(request, client_address)
        except BaseException:
            self.request_slots.release()
            raise

    def process_request_thread(self, request, client_address):
        try:
            super().process_request_thread(request, client_address)
        finally:
            self.request_slots.release()

    def invoke(self, input_value):
        if not self.compute_slots.acquire(blocking=False):
            raise Problem(503, "The service is busy. Try again when a computation finishes.")
        done, result = threading.Event(), {}

        def run():
            try:
                output = self.computation(input_value)
                validate_json(output)
                encoded = json.dumps(output, allow_nan=False, ensure_ascii=True).encode("utf-8")
                if len(encoded) > MAX_OUTPUT_BYTES:
                    raise Problem(500, "Computation output exceeds the response size limit.")
                result["output"] = encoded
            except BaseException as error:
                result["error"] = error
            finally:
                self.compute_slots.release()
                done.set()

        threading.Thread(target=run, daemon=True).start()
        if not done.wait(TIMEOUT_SECONDS):
            raise Problem(504, "Computation exceeded its time limit.")
        if "error" in result:
            raise result["error"]
        return result["output"]


class Handler(BaseHTTPRequestHandler):
    server_version = "AppYard/1"
    sys_version = ""

    def setup(self):
        super().setup()
        self.connection.settimeout(TIMEOUT_SECONDS)

    def log_message(self, format, *args):
        pass

    def send_bytes(self, status, body, content_type="application/json; charset=utf-8", headers=None):
        self.send_response(status)
        self.send_header("Content-Type", content_type)
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Content-Security-Policy", "default-src 'self'; connect-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; object-src 'none'; base-uri 'none'; form-action 'self'")
        self.send_header("X-Content-Type-Options", "nosniff")
        self.send_header("Referrer-Policy", "no-referrer")
        self.send_header("Cache-Control", "no-store")
        self.send_header("Connection", "close")
        for key, value in (headers or {}).items():
            self.send_header(key, value)
        self.end_headers()
        self.close_connection = True
        if self.command != "HEAD":
            self.wfile.write(body)

    def send_json(self, status, value, headers=None):
        self.send_bytes(status, json.dumps(value, allow_nan=False).encode("utf-8"), headers=headers)

    def read_json(self):
        content_type = self.headers.get("Content-Type", "").split(";")[0].strip().lower()
        if content_type != "application/json":
            raise Problem(415, "Send Content-Type: application/json.")
        if self.headers.get("Content-Encoding", "identity") != "identity":
            raise Problem(415, "Compressed request bodies are not supported.")
        if self.headers.get("Transfer-Encoding") or len(self.headers.get_all("Content-Length", [])) != 1:
            raise Problem(411, "Send one Content-Length header; chunked requests are not supported.")
        try:
            length = int(self.headers["Content-Length"])
        except ValueError:
            raise Problem(400, "Content-Length must be an integer.")
        if length < 1:
            raise Problem(400, "Send a JSON request body.")
        if length > MAX_INPUT_BYTES:
            raise Problem(413, "Input exceeds the request size limit.")
        try:
            chunks, remaining = [], length
            deadline = time.monotonic() + TIMEOUT_SECONDS
            while remaining:
                wait = deadline - time.monotonic()
                if wait <= 0:
                    raise TimeoutError("The request body took too long to arrive.")
                self.connection.settimeout(wait)
                chunk = self.rfile.read1(min(remaining, 65_536))
                if not chunk:
                    raise ValueError("Incomplete request")
                chunks.append(chunk)
                remaining -= len(chunk)
            value = json.loads(b"".join(chunks).decode("utf-8"))
            validate_json(value)
            return value
        except (ValueError, UnicodeError, RecursionError):
            raise Problem(400, "Send valid UTF-8 JSON within the structural limits.")

    def dispatch(self):
        try:
            authority = "127.0.0.1:" + str(self.server.server_port)
            if self.headers.get_all("Host") != [authority]:
                raise Problem(403, "Use the assigned loopback address.")
            # Preview iframe navigation can be cross-site; computation must be same-origin.
            if self.command == "POST":
                origin = self.headers.get("Origin")
                site = self.headers.get("Sec-Fetch-Site")
                if (origin and origin != "http://" + authority) or (site and site not in ("same-origin", "none")):
                    raise Problem(403, "Cross-origin computation is not allowed.")
            route = self.path.split("?", 1)[0]
            if route == "/health" and self.command in ("GET", "HEAD"):
                return self.send_json(200, {"status": "ok"})
            if route in ROUTES and self.command in ("GET", "HEAD"):
                filename, content_type = ROUTES[route]
                return self.send_bytes(200, (PUBLIC / filename).read_bytes(), content_type)
            if route != "/api/invoke":
                raise Problem(404, "Route not found.")
            if self.command != "POST":
                return self.send_json(405, {"error": {"message": "Use POST for computation."}}, {"Allow": "POST"})
            return self.send_bytes(200, self.server.invoke(self.read_json()))
        except (BrokenPipeError, ConnectionResetError):
            pass
        except Exception as error:
            status = error.status if isinstance(error, Problem) else (
                501 if isinstance(error, NotImplementedError) else
                422 if isinstance(error, (TypeError, ValueError)) else
                408 if isinstance(error, TimeoutError) else 500
            )
            try:
                self.send_json(status, {"error": {"message": str(error)[:2000] or "Computation failed."}})
            except (OSError, ValueError):
                pass

    do_GET = dispatch
    do_HEAD = dispatch
    do_POST = dispatch
    do_OPTIONS = dispatch
    do_PUT = dispatch
    do_PATCH = dispatch
    do_DELETE = dispatch


def create_server(host="127.0.0.1", port=3000, computation=compute):
    if host not in ("127.0.0.1", "0.0.0.0"):
        raise ValueError("HOST must be 127.0.0.1 or 0.0.0.0.")
    if not isinstance(port, int) or not 0 <= port <= 65535:
        raise ValueError("PORT must be a valid TCP port.")
    return ApplicationServer((host, port), computation)


if __name__ == "__main__":
    application = create_server(os.environ.get("HOST", "127.0.0.1"), int(os.environ.get("PORT", "3000")))
    print("Application listening at http://127.0.0.1:" + str(application.server_port) + "/", flush=True)

    def stop(signum, frame):
        threading.Thread(target=application.shutdown, daemon=True).start()

    signal.signal(signal.SIGINT, stop)
    signal.signal(signal.SIGTERM, stop)
    try:
        application.serve_forever(poll_interval=0.1)
    finally:
        application.server_close()
