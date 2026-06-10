# yt-downloader 🎬

![Docker](https://img.shields.io/badge/Docker-2496ED?style=for-the-badge&logo=docker&logoColor=white)
![yt-dlp](https://img.shields.io/badge/yt--dlp-FF0000?style=for-the-badge&logo=youtube&logoColor=white)
![Python](https://img.shields.io/badge/Python-3.11-3776AB?style=for-the-badge&logo=python&logoColor=white)
![FFmpeg](https://img.shields.io/badge/FFmpeg-007808?style=for-the-badge&logo=ffmpeg&logoColor=white)
![License](https://img.shields.io/badge/License-Unlicense-blue?style=for-the-badge)

A small, self-contained Docker setup for downloading videos with [yt-dlp](https://github.com/yt-dlp/yt-dlp) — either through a **point-and-click web UI** (just paste a link) or the command line. No Python environment or dependencies to manage on your host machine.

---

## ✨ Features

- 🌐 **Web GUI** — paste a link, click Download, watch a progress bar, save the file. No coding required.
- 🚀 **One-click launch** — `start.bat` (Windows) / `start.sh` (Mac/Linux) builds, starts, and opens the app in your browser automatically
- 📂 **Custom save folders** — optionally enter a folder name in the UI to organize downloads into subfolders
- 🐳 **Fully containerized** — `yt-dlp` and `ffmpeg` run inside Docker, your host stays clean
- 🎞️ **MP4 output** — automatically merges best video (H.264/AVC) + audio (M4A) into MP4
- 📁 **Downloads to a local folder** — files land directly in this project's `downloads/` folder via a volume mount
- 🔤 **Filename-safe** — `--restrict-filenames` avoids spaces and special characters
- ⚙️ **Easy to customize** — tweak the format selector or output template as needed

---

## 📋 Prerequisites

- [Docker](https://docs.docker.com/get-docker/) installed and running (Docker Compose included for the web UI)

---

## 🌐 Web GUI (recommended)

The easiest way to use this — no command line knowledge needed after setup.

### Option A: One-click start

- **Windows:** double-click `start.bat`
- **Mac/Linux:** run `./start.sh`

This builds the image (first time only), starts the app, and automatically opens **http://localhost:5000** in your default browser once it's ready.

### Option B: Manual start

```bash
docker compose up --build
```

Then open **http://localhost:5000** in your browser.

### Using the app

1. Paste a video link into the box.
2. *(Optional)* Enter a folder name to organize this download (e.g. `movies`, `music`) — it'll be saved into `downloads/<folder name>/`.
3. Click **Download** and wait for the progress bar to finish.
4. Click **Save File** to download it to your computer.

Files are saved to the `downloads/` folder in this project while the container is running. Stop the app with `Ctrl+C` (or `docker compose down` if started in the background).

---

## ⌨️ Command-line usage

For advanced/scripted use, build and run the CLI image directly.

### Build the image

From the project root:

```bash
docker build -t yt-dlp:local .
```

Rebuild with the same command any time you want to update `yt-dlp` to the latest version (the build re-pulls it from PyPI).

### Run

Run from the directory where you want the downloaded file to be saved:

```bash
docker run --rm -v "${PWD}:/downloads" yt-dlp:local --newline -f "bv*[ext=mp4][vcodec^=avc1]+ba[ext=m4a]/b[ext=mp4]" --merge-output-format mp4 --restrict-filenames -o "/downloads/%(title).120s.%(ext)s" "yt-link"
```

Replace `"yt-link"` with the URL of the video you want to download.

### What this command does

| Flag | Purpose |
| --- | --- |
| `--rm` | Remove the container after it exits |
| `-v "${PWD}:/downloads"` | Mount your current directory into the container as `/downloads` |
| `--newline` | Print progress on separate lines (cleaner logs) |
| `-f "bv*[ext=mp4][vcodec^=avc1]+ba[ext=m4a]/b[ext=mp4]"` | Pick the best MP4 video (H.264) + M4A audio, falling back to a combined MP4 |
| `--merge-output-format mp4` | Ensure the final container is `.mp4` |
| `--restrict-filenames` | Use ASCII-only, space-free filenames |
| `-o "/downloads/%(title).120s.%(ext)s"` | Save as `<title (max 120 chars)>.<ext>` in the mounted folder |

---

## 🛠️ Customization

- **Audio only:** swap the `-f` flag for `-f "ba[ext=m4a]/b"` and add `-x --audio-format mp3` for an MP3 extraction.
- **Different resolution cap:** e.g. `-f "bv*[height<=720][ext=mp4]+ba[ext=m4a]/b[ext=mp4]"` for max 720p.
- **Playlist support:** pass a playlist URL — yt-dlp downloads every entry by default.

See the [yt-dlp documentation](https://github.com/yt-dlp/yt-dlp#readme) for the full list of options.

---

## ⚠️ Security note

The web GUI lets anyone who can reach it trigger downloads from arbitrary URLs. It's intended for **local/trusted-network use only** — don't expose port 5000 directly to the internet without adding authentication.

---

## 📄 License

Released into the public domain under the [Unlicense](LICENSE).
