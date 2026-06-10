@echo off
echo Starting Video Downloader...

docker compose up -d --build
if errorlevel 1 (
    echo.
    echo Failed to start. Is Docker running?
    pause
    exit /b 1
)

echo Waiting for the app to become ready...

:wait
curl -s -o nul http://localhost:5000
if errorlevel 1 (
    timeout /t 1 /nobreak >nul
    goto wait
)

start "" http://localhost:5000
echo Done! Opening http://localhost:5000 in your browser.
