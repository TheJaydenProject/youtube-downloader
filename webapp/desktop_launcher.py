"""Entrypoint for the standalone Windows build (PyInstaller). Not used by Dockerfile.web."""
import os
import socket
import sys
import threading
import time
import traceback
import webbrowser
from pathlib import Path

HOST = "127.0.0.1"
PORT = int(os.environ.get("YTDL_PORT", "7001"))
URL = f"http://{HOST}:{PORT}/"


def _port_open(host, port, timeout=0.4):
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as sock:
        sock.settimeout(timeout)
        return sock.connect_ex((host, port)) == 0


def _exe_dir():
    if getattr(sys, "frozen", False):
        return Path(sys.executable).resolve().parent
    return Path(__file__).resolve().parent


def _wait_then_open_browser():
    deadline = time.time() + 20
    while time.time() < deadline:
        if _port_open(HOST, PORT):
            webbrowser.open(URL)
            return
        time.sleep(0.3)


def main():
    if _port_open(HOST, PORT):
        # Already running -- just (re)open the browser tab instead of crashing on bind().
        webbrowser.open(URL)
        return

    os.environ.setdefault("YTDL_DOWNLOAD_DIR", str(_exe_dir() / "downloads"))
    os.environ.setdefault("YTDL_PORT", str(PORT))

    from app import app  # imported after env vars are set -- DOWNLOAD_DIR is read at import time

    threading.Thread(target=_wait_then_open_browser, daemon=True).start()
    app.run(host=HOST, port=PORT, threaded=True)


if __name__ == "__main__":
    try:
        main()
    except Exception:
        # --windowed builds have no visible console; leave a breadcrumb next to the exe.
        (_exe_dir() / "video-downloader-error.log").write_text(traceback.format_exc())
        raise
