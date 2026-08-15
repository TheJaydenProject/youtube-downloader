<#
.SYNOPSIS
    Builds the standalone Windows VideoDownloader.exe.
    Used by both CI (.github/workflows/build-windows-exe.yml) and manual local builds.
    Run from the repository root: powershell -File packaging\build_exe.ps1
#>
param(
    [string]$FfmpegUrl = "https://github.com/GyanD/codexffmpeg/releases/download/9.0.1/ffmpeg-9.0.1-essentials_build.zip",
    [string]$FfmpegSha256 = "FEC81AE03971D9DD4BE3EBE02E263BD2EC1D789483F931BDBA5F5715E65DA2E9"
)
$ErrorActionPreference = "Stop"

$repoRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
Push-Location $repoRoot
try {
    $work = Join-Path $repoRoot "build\ffmpeg-download"
    New-Item -ItemType Directory -Force -Path $work | Out-Null
    $ffmpegZip = Join-Path $work "ffmpeg.zip"
    $ffmpegExtracted = Join-Path $work "extracted"

    Write-Host "Downloading pinned ffmpeg build..."
    Invoke-WebRequest -Uri $FfmpegUrl -OutFile $ffmpegZip

    $actualHash = (Get-FileHash $ffmpegZip -Algorithm SHA256).Hash
    if ($actualHash -ne $FfmpegSha256) {
        throw "ffmpeg.zip checksum mismatch. Expected $FfmpegSha256, got $actualHash"
    }

    Write-Host "Extracting ffmpeg..."
    Expand-Archive -Path $ffmpegZip -DestinationPath $ffmpegExtracted -Force
    $ffmpegExe = (Get-ChildItem -Path $ffmpegExtracted -Recurse -Filter "ffmpeg.exe" | Select-Object -First 1).FullName
    if (-not $ffmpegExe) {
        throw "Could not find ffmpeg.exe inside the downloaded archive"
    }

    # PyInstaller resolves relative --add-data/--add-binary paths against the .spec file's
    # own directory (--specpath), not the invocation directory -- use absolute paths to avoid that.
    $templatesDir = Join-Path $repoRoot "webapp\templates"
    $staticDir = Join-Path $repoRoot "webapp\static"
    $iconFile = Join-Path $repoRoot "packaging\app.ico"
    $entryScript = Join-Path $repoRoot "webapp\desktop_launcher.py"

    Write-Host "Running PyInstaller..."
    pyinstaller `
        --name VideoDownloader `
        --onefile `
        --windowed `
        --icon "$iconFile" `
        --add-data "$templatesDir;templates" `
        --add-data "$staticDir;static" `
        --add-binary "$ffmpegExe;ffmpeg" `
        --distpath dist `
        --workpath build\pyi-work `
        --specpath build `
        "$entryScript"

    if (-not (Test-Path "dist\VideoDownloader.exe")) {
        throw "Build did not produce dist\VideoDownloader.exe"
    }

    Write-Host "Built dist\VideoDownloader.exe"
}
finally {
    Pop-Location
}
