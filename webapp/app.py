import os
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


def run_download(job_id, url):
    job = jobs[job_id]

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
            job["filename"] = os.path.basename(d["info_dict"]["filepath"])

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
            if "filename" not in job:
                job["filename"] = os.path.basename(ydl.prepare_filename(info))
            job["status"] = "finished"
            job["progress"] = 100
    except Exception as e:
        job["status"] = "error"
        job["error"] = str(e)


@app.route("/")
def index():
    return render_template("index.html")


@app.route("/api/download", methods=["POST"])
def start_download():
    data = request.get_json(force=True, silent=True) or {}
    url = (data.get("url") or "").strip()

    if not url or not URL_RE.match(url):
        return jsonify({"error": "Please enter a valid http(s) URL"}), 400

    job_id = uuid.uuid4().hex
    jobs[job_id] = {"status": "starting", "progress": 0}

    thread = threading.Thread(target=run_download, args=(job_id, url), daemon=True)
    thread.start()

    return jsonify({"job_id": job_id})


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
    app.run(host="0.0.0.0", port=5000)
