@echo off
chcp 65001 >nul
title KodAtlasi - Yerel Sunucu

echo.
echo   KodAtlasi baslatiliyor...
echo.

where node >nul 2>nul
if errorlevel 1 (
  echo   [HATA] Node.js bulunamadi.
  echo   Lutfen https://nodejs.org adresinden Node.js 18+ kurun ve tekrar deneyin.
  echo.
  pause
  exit /b 1
)

node server.js --open

echo.
echo   Sunucu durduruldu.
pause
