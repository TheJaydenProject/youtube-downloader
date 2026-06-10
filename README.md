# yt-downloader

![Docker](https://img.shields.io/badge/Docker-2496ED?style=for-the-badge&logo=docker&logoColor=white)
![yt-dlp](https://img.shields.io/badge/yt--dlp-FF0000?style=for-the-badge&logo=youtube&logoColor=white)
![Python](https://img.shields.io/badge/Python-3.11-3776AB?style=for-the-badge&logo=python&logoColor=white)
![FFmpeg](https://img.shields.io/badge/FFmpeg-007808?style=for-the-badge&logo=ffmpeg&logoColor=white)
![License](https://img.shields.io/badge/License-Unlicense-blue?style=for-the-badge)

A self-contained Docker setup for downloading videos with [yt-dlp](https://github.com/yt-dlp/yt-dlp), with a web interface for pasting a link and downloading, or a command-line option for advanced use.

Everything (Python, yt-dlp, ffmpeg) runs inside Docker, so nothing needs to be installed on your computer besides Docker itself.

---

## Features

- Web interface — paste a link and download, no command line required
- Queue multiple links and download them one after another
- Progress bar during download
- Preview (thumbnail, title, duration) before downloading
- Output saved as MP4

---

## Requirements

- [Docker Desktop](https://www.docker.com/products/docker-desktop/), installed and running

---

## Getting started

1. Clone or download this repository.
2. Make sure Docker Desktop is running.
3. Start the app:
   - **Windows:** double-click `start.bat`
   - **macOS/Linux:** run `./start.sh`
4. The app opens automatically at **http://localhost:5000**. If it doesn't, open that address in your browser manually.

The first run takes a little longer, since Docker needs to build the image. Subsequent runs start quickly.

---

## Using the web interface

1. Paste a video URL into the input field. A preview (thumbnail, title, and duration) appears once it's recognized.
2. To download more than one video, click **Add another link** and paste additional URLs.
3. Click **Download**. Videos are downloaded one at a time; the progress bar shows which one is currently downloading.
4. As each video finishes, the browser automatically downloads it (to your browser's normal downloads location).
5. Once everything is done, click **Download another** to clear the form and start again.

---

## File storage

Both the web interface and the command-line image save videos to the `downloads/` folder inside this project.

---

## Stopping the app

```bash
docker compose down
```

This stops the containers. Downloaded files remain in the `downloads/` folder.

---

## Security

The web interface allows anyone who can reach it to trigger downloads. It is intended for local or trusted-network use only — do not expose port `5000` to the internet without adding authentication.

---

## Advanced: command-line usage

For scripted or advanced use, the `yt-dlp` CLI image can be used directly.

<details>
<summary>Show command-line instructions</summary>

### Build the image

From the project root:

```bash
docker build -t yt-dlp:local .
```

Rebuild with the same command to update `yt-dlp` to the latest version.

### Run

Run from the project root — downloaded files are saved into the `downloads/` folder:

```bash
docker run --rm -v "${PWD}/downloads:/downloads" yt-dlp:local --newline -f "bv*[ext=mp4][vcodec^=avc1]+ba[ext=m4a]/b[ext=mp4]" --merge-output-format mp4 --restrict-filenames -o "/downloads/%(title).120s.%(ext)s" "yt-link"
```

Replace `"yt-link"` with the URL of the video to download.

### What this command does

| Flag | Purpose |
| --- | --- |
| `--rm` | Remove the container after it exits |
| `-v "${PWD}/downloads:/downloads"` | Mount the project's `downloads/` folder into the container as `/downloads` |
| `--newline` | Print progress on separate lines |
| `-f "bv*[ext=mp4][vcodec^=avc1]+ba[ext=m4a]/b[ext=mp4]"` | Select the best MP4 video (H.264) and M4A audio, falling back to a combined MP4 |
| `--merge-output-format mp4` | Ensure the final container is `.mp4` |
| `--restrict-filenames` | Use ASCII-only, space-free filenames |
| `-o "/downloads/%(title).120s.%(ext)s"` | Save as `<title (max 120 chars)>.<ext>` in the mounted folder |

### Customizing downloads

- **Audio only (MP3):** replace the `-f` flag with `-f "ba[ext=m4a]/b"` and add `-x --audio-format mp3`.
- **Limit resolution:** e.g. `-f "bv*[height<=720][ext=mp4]+ba[ext=m4a]/b[ext=mp4]"` for a 720p maximum.
- **Playlists:** pass a playlist URL — yt-dlp downloads every video in it by default.

See the [yt-dlp documentation](https://github.com/yt-dlp/yt-dlp#readme) for the full list of options.

</details>

---

## License

Released into the public domain under the [Unlicense](LICENSE).
