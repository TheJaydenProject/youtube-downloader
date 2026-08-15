#!/bin/sh
set -e

echo "Starting Video Downloader..."
docker compose up -d --build

echo "Waiting for the app to become ready..."
until curl -s -o /dev/null http://localhost:7001; do
  sleep 1
done

echo "Done! Opening http://localhost:7001 in your browser."
if command -v open >/dev/null 2>&1; then
  open http://localhost:7001
elif command -v xdg-open >/dev/null 2>&1; then
  xdg-open http://localhost:7001
else
  echo "Open http://localhost:7001 in your browser."
fi
