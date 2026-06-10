# yt-downloader 🎬

![Docker](https://img.shields.io/badge/Docker-2496ED?style=for-the-badge&logo=docker&logoColor=white)
![yt-dlp](https://img.shields.io/badge/yt--dlp-FF0000?style=for-the-badge&logo=youtube&logoColor=white)
![Python](https://img.shields.io/badge/Python-3.11-3776AB?style=for-the-badge&logo=python&logoColor=white)
![FFmpeg](https://img.shields.io/badge/FFmpeg-007808?style=for-the-badge&logo=ffmpeg&logoColor=white)
![License](https://img.shields.io/badge/License-Unlicense-blue?style=for-the-badge)

A small, self-contained Docker setup for downloading videos with [yt-dlp](https://github.com/yt-dlp/yt-dlp). Build the image once, then run a single command to grab MP4s into a local folder — no Python environment or dependencies to manage on your host machine.

---

## ✨ Features

- 🐳 **Fully containerized** — `yt-dlp` and `ffmpeg` run inside Docker, your host stays clean
- 🎞️ **MP4 output** — automatically merges best video (H.264/AVC) + audio (M4A) into MP4
- 📁 **Downloads to a local folder** — files land directly in your current directory via a volume mount
- 🔤 **Filename-safe** — `--restrict-filenames` avoids spaces and special characters
- ⚙️ **Easy to customize** — tweak the format selector or output template as needed

---

## 📋 Prerequisites

- [Docker](https://docs.docker.com/get-docker/) installed and running

---

## 🚀 Build the image

From the project root:

```bash
docker build -t yt-dlp:local .
```

Rebuild with the same command any time you want to update `yt-dlp` to the latest version (the build re-pulls it from PyPI).

---

## ▶️ Usage

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

## 📄 License

Released into the public domain under the [Unlicense](LICENSE).
