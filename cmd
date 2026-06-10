docker run --rm -v "${PWD}:/downloads" yt-dlp:local --newline -f "bv*[ext=mp4][vcodec^=avc1]+ba[ext=m4a]/b[ext=mp4]" --merge-output-format mp4 --restrict-filenames -o "/downloads/%(title).120s.%(ext)s" "yt-link"

build again if not built
docker build -t yt-dlp:local .

docker run --rm -v "${PWD}:/downloads" yt-dlp:local --newline -f "bv*[ext=mp4][vcodec^=avc1]+ba[ext=m4a]/b[ext=mp4]" --merge-output-format mp4 --restrict-filenames -o "/downloads/%(title).120s.%(ext)s" "https://www.youtube.com/watch?v=-lPD4oxp9wk&t=90s"
