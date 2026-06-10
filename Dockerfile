FROM python:3.11-slim

RUN apt-get update && \
    apt-get install -y --no-install-recommends \
        ffmpeg \
        git \
        ca-certificates && \
    rm -rf /var/lib/apt/lists/*

RUN pip install --no-cache-dir yt-dlp

RUN mkdir -p /downloads

WORKDIR /downloads

ENTRYPOINT ["yt-dlp"]