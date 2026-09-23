@echo off
title MongoDB Server - CRM Velvix
cd /d "%~dp0"
echo Starting MongoDB Server on port 27017...
node start-db.js
pause
