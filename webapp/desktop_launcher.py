"""Entrypoint for the standalone Windows build (PyInstaller). Not used by Dockerfile.web."""
import json
import os
import socket
import sys
import threading
import time
import traceback
import webbrowser
from pathlib import Path

import pystray
from PIL import Image

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


def _icon_path():
    if getattr(sys, "frozen", False):
        return os.path.join(sys._MEIPASS, "packaging", "app.ico")
    return str(_exe_dir().parent / "packaging" / "app.ico")


def _settings_path():
    return _exe_dir() / "settings.json"


def _load_settings():
    path = _settings_path()
    if path.exists():
        try:
            return json.loads(path.read_text())
        except (OSError, ValueError):
            pass
    return {}


def _save_settings(settings):
    try:
        _settings_path().write_text(json.dumps(settings, indent=2))
    except OSError:
        pass


def _wait_then_open_browser():
    deadline = time.time() + 20
    while time.time() < deadline:
        if _port_open(HOST, PORT):
            webbrowser.open(URL)
            return
        time.sleep(0.3)


def _pick_folder():
    """Blocks showing a native OS folder picker. Returns the chosen path, or "" if cancelled."""
    import tkinter as tk
    from tkinter import filedialog

    root = tk.Tk()
    root.withdraw()
    root.attributes("-topmost", True)
    chosen = filedialog.askdirectory(title="Choose a download folder")
    root.destroy()
    return chosen


def _run_tray(settings):
    icon_image = Image.open(_icon_path())

    def on_open(icon, item):
        webbrowser.open(URL)

    def _handle_change_folder():
        chosen = _pick_folder()
        if not chosen:
            return

        import app as app_module

        os.makedirs(chosen, exist_ok=True)
        app_module.DOWNLOAD_DIR = chosen
        settings["download_dir"] = chosen
        _save_settings(settings)
        icon.notify(f"Downloads will now save to:\n{chosen}", "Video Downloader")

    def on_change_folder(icon, item):
        # tkinter's dialog needs its own thread -- running it directly on pystray's
        # Win32 message-loop thread makes the two GUI loops fight over the same
        # thread, so the dialog appears but its buttons stop responding.
        threading.Thread(target=_handle_change_folder, daemon=True).start()

    def on_quit(icon, item):
        # Hard-exit rather than relying on icon.stop() unwinding cleanly: this
        # guarantees the server, any open folder-picker dialog, and the tray
        # icon are all gone immediately, regardless of what else is running.
        try:
            icon.visible = False
        except Exception:
            pass
        os._exit(0)

    menu = pystray.Menu(
        pystray.MenuItem("Open", on_open, default=True),
        pystray.MenuItem("Change download folder...", on_change_folder),
        pystray.MenuItem("Quit", on_quit),
    )
    icon = pystray.Icon("VideoDownloader", icon_image, "Video Downloader", menu)
    icon.run()  # blocks until Quit is clicked


def main():
    if _port_open(HOST, PORT):
        # Already running -- just (re)open the browser tab instead of crashing on bind().
        webbrowser.open(URL)
        return

    settings = _load_settings()
    download_dir = settings.get("download_dir") or str(Path.home() / "Downloads")
    os.environ.setdefault("YTDL_DOWNLOAD_DIR", download_dir)
    os.environ.setdefault("YTDL_PORT", str(PORT))

    from app import app  # imported after env vars are set -- DOWNLOAD_DIR is read at import time

    server_thread = threading.Thread(
        target=lambda: app.run(host=HOST, port=PORT, threaded=True, use_reloader=False),
        daemon=True,
    )
    server_thread.start()

    threading.Thread(target=_wait_then_open_browser, daemon=True).start()

    _run_tray(settings)  # blocks on the main thread until Quit; process exits once it returns


if __name__ == "__main__":
    try:
        main()
    except Exception:
        # --windowed builds have no visible console; leave a breadcrumb next to the exe.
        (_exe_dir() / "video-downloader-error.log").write_text(traceback.format_exc())
        raise
