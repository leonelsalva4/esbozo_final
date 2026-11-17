@echo off
REM Inicio de desarrollo. Preparar la conexión y los datos según SETUP.md.
cd /d "%~dp0.."

if not exist node_modules (call npm ci)
if not exist backend\node_modules (cd backend && call npm ci && cd ..)
if not exist desktop\node_modules (cd desktop && call npm ci && cd ..)
if not exist backend\.env (copy backend\.env.example backend\.env)

call npm run dev
pause
