@echo off
cd /d "%~dp0"
where node >nul 2>&1
if errorlevel 1 (
  echo Node.js was not found. Install Node.js, then run this file again.
  pause
  exit /b 1
)
echo NFS sunset - local preview
echo Open http://127.0.0.1:4176/ in Edge or Chrome.
echo Keep this window open while playing. Press Ctrl+C to stop.
node serve.cjs 4176
pause
