@echo off
REM =============================================================================
REM setup-windows.bat — One-command dev setup for Windows 10 / 11
REM
REM Requirements (install these first if not present):
REM   Python 3.11  →  https://www.python.org/downloads/release/python-3119/
REM                   ⚠ Tick "Add Python to PATH" during install
REM   Node.js 20   →  https://nodejs.org/en/download
REM   Git          →  https://git-scm.com/download/win
REM
REM Usage:
REM   Double-click setup-windows.bat  OR  run in Command Prompt:
REM   scripts\setup-windows.bat
REM =============================================================================

echo.
echo ===================================================
echo    Sikkim Tourism Assistant -- Windows Setup
echo ===================================================
echo.

REM ── 1. Check Python ──────────────────────────────────────────────────────
where python >nul 2>&1
if errorlevel 1 (
    echo [X] Python not found. Please install Python 3.11 from:
    echo     https://www.python.org/downloads/release/python-3119/
    echo     Tick "Add Python to PATH" during installation.
    pause
    exit /b 1
)
echo [OK] Python found:
python --version

REM ── 2. Check Node.js ─────────────────────────────────────────────────────
where node >nul 2>&1
if errorlevel 1 (
    echo [X] Node.js not found. Please install from:
    echo     https://nodejs.org/en/download
    pause
    exit /b 1
)
echo [OK] Node.js found:
node --version

REM ── 3. Backend setup ─────────────────────────────────────────────────────
echo.
echo [..] Setting up backend...
cd backend

if not exist v_env (
    python -m venv v_env
    echo [OK] Virtual environment created
)

call v_env\Scripts\activate.bat
python -m pip install --upgrade pip -q
pip install -r requirements.txt -q
echo [OK] Backend dependencies installed

if not exist .env (
    copy .env.example .env >nul
    echo [!] Created backend\.env from .env.example
    echo [!] Open backend\.env and add your GEMINI_API_KEY before starting
) else (
    echo [OK] backend\.env already exists
)

call v_env\Scripts\deactivate.bat
cd ..

REM ── 4. Frontend setup ────────────────────────────────────────────────────
echo.
echo [..] Setting up frontend...
cd frontend
call npm install --silent
echo [OK] Frontend dependencies installed
cd ..

REM ── Done ─────────────────────────────────────────────────────────────────
echo.
echo ===================================================
echo    Setup complete!
echo ===================================================
echo.
echo   Next steps:
echo.
echo   1. Edit backend\.env  and add GEMINI_API_KEY (and GROQ_API_KEY)
echo.
echo   2. Start the backend  (in this window):
echo        cd backend
echo        v_env\Scripts\activate.bat
echo        python main.py
echo.
echo   3. Start the frontend  (open a second Command Prompt):
echo        cd frontend
echo        npm run dev
echo.
echo   4. Open http://localhost:5173 in your browser
echo.
pause
