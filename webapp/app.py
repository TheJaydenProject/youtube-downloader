import os
import queue
import re
import threading
import uuid

from flask import Flask, abort, jsonify, render_template, request, send_from_directory
import yt_dlp

app = Flask(__name__)

DOWNLOAD_DIR = "/downloads"
os.makedirs(DOWNLOAD_DIR, exist_ok=True)

URL_RE = re.compile(r"^https?://", re.IGNORECASE)

jobs = {}
job_queue = queue.Queue()


def run_download(job_id, url):
    job = jobs[job_id]
    job["status"] = "starting"

    def progress_hook(d):
        if d["status"] == "downloading":
            total = d.get("total_bytes") or d.get("total_bytes_estimate")
            downloaded = d.get("downloaded_bytes", 0)
            if total:
                job["progress"] = round(downloaded / total * 100, 1)
            job["status"] = "downloading"
        elif d["status"] == "finished":
            job["status"] = "processing"
            job["progress"] = 100

    def postprocessor_hook(d):
        if d["status"] == "finished":
            job["filename"] = os.path.relpath(d["info_dict"]["filepath"], DOWNLOAD_DIR)

    ydl_opts = {
        "format": "bv*[ext=mp4][vcodec^=avc1]+ba[ext=m4a]/b[ext=mp4]",
        "merge_output_format": "mp4",
        "restrictfilenames": True,
        "outtmpl": os.path.join(DOWNLOAD_DIR, "%(title).120s.%(ext)s"),
        "noplaylist": True,
        "progress_hooks": [progress_hook],
        "postprocessor_hooks": [postprocessor_hook],
        "quiet": True,
        "no_warnings": True,
    }

    try:
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(url, download=True)
            job["title"] = info.get("title")
            if "filename" not in job:
                job["filename"] = os.path.relpath(ydl.prepare_filename(info), DOWNLOAD_DIR)
            job["status"] = "finished"
            job["progress"] = 100
    except Exception as e:
        job["status"] = "error"
        job["error"] = str(e)


def worker():
    while True:
        job_id, url = job_queue.get()
        run_download(job_id, url)
        job_queue.task_done()


threading.Thread(target=worker, daemon=True).start()


@app.route("/")
def index():
    return render_template("index.html")


@app.route("/api/preview", methods=["POST"])
def preview():
    data = request.get_json(force=True, silent=True) or {}
    url = (data.get("url") or "").strip()

    if not url or not URL_RE.match(url):
        return jsonify({"error": "Please enter a valid http(s) URL"}), 400

    ydl_opts = {
        "quiet": True,
        "no_warnings": True,
        "skip_download": True,
        "noplaylist": True,
    }

    try:
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(url, download=False)
    except Exception as e:
        return jsonify({"error": str(e)}), 422

    return jsonify({
        "title": info.get("title"),
        "thumbnail": info.get("thumbnail"),
        "duration": info.get("duration"),
        "uploader": info.get("uploader") or info.get("channel"),
    })


@app.route("/api/download", methods=["POST"])
def start_download():
    data = request.get_json(force=True, silent=True) or {}
    urls = data.get("urls")

    if not isinstance(urls, list):
        return jsonify({"error": "Please provide a list of URLs"}), 400

    urls = [u.strip() for u in urls if isinstance(u, str) and u.strip()]

    if not urls:
        return jsonify({"error": "Please enter at least one valid URL"}), 400

    if any(not URL_RE.match(u) for u in urls):
        return jsonify({"error": "Please enter valid http(s) URLs"}), 400

    job_ids = []
    for url in urls:
        job_id = uuid.uuid4().hex
        jobs[job_id] = {"status": "queued", "progress": 0}
        job_queue.put((job_id, url))
        job_ids.append(job_id)

    return jsonify({"job_ids": job_ids})


@app.route("/api/status/<job_id>")
def status(job_id):
    job = jobs.get(job_id)
    if not job:
        abort(404)
    return jsonify(job)


@app.route("/api/file/<job_id>")
def file(job_id):
    job = jobs.get(job_id)
    if not job or job.get("status") != "finished":
        abort(404)
    return send_from_directory(DOWNLOAD_DIR, job["filename"], as_attachment=True)


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, threaded=True)
