#!/usr/bin/env bash
# =============================================================================
# setup-mac.sh — One-command dev setup for macOS (Intel & Apple Silicon)
#
# Usage:
#   chmod +x scripts/setup-mac.sh
#   ./scripts/setup-mac.sh
# =============================================================================
set -euo pipefail

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Colour

info()  { echo -e "${GREEN}[✔]${NC} $*"; }
warn()  { echo -e "${YELLOW}[!]${NC} $*"; }
error() { echo -e "${RED}[✘]${NC} $*"; exit 1; }

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "   Sikkim Tourism Assistant — macOS Setup"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# ── 1. Check Homebrew ────────────────────────────────────────────────────────
if ! command -v brew &>/dev/null; then
  warn "Homebrew not found. Installing..."
  /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
else
  info "Homebrew found"
fi

# ── 2. Check Python 3.11 ────────────────────────────────────────────────────
if ! command -v python3.11 &>/dev/null; then
  warn "Python 3.11 not found. Installing via Homebrew..."
  brew install python@3.11
else
  info "Python 3.11 found: $(python3.11 --version)"
fi

# ── 3. Check Node.js ────────────────────────────────────────────────────────
if ! command -v node &>/dev/null; then
  warn "Node.js not found. Installing via Homebrew..."
  brew install node
else
  info "Node.js found: $(node --version)"
fi

# ── 4. Backend setup ────────────────────────────────────────────────────────
echo ""
info "Setting up backend..."
cd backend

if [ ! -d "v_env" ]; then
  python3.11 -m venv v_env
  info "Virtual environment created"
fi

source v_env/bin/activate
pip install --upgrade pip -q
pip install -r requirements.txt -q
info "Backend dependencies installed"

if [ ! -f ".env" ]; then
  cp .env.example .env
  warn "Created backend/.env from .env.example"
  warn "Open backend/.env and add your GEMINI_API_KEY before starting the server"
else
  info "backend/.env already exists"
fi

deactivate
cd ..

# ── 5. Frontend setup ───────────────────────────────────────────────────────
echo ""
info "Setting up frontend..."
cd frontend
npm install --silent
info "Frontend dependencies installed"
cd ..

# ── Done ────────────────────────────────────────────────────────────────────
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "${GREEN}   Setup complete!${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "  Next steps:"
echo "  1. Edit backend/.env  →  add GEMINI_API_KEY (and GROQ_API_KEY)"
echo ""
echo "  2. Start the backend:"
echo "       cd backend && source v_env/bin/activate && python main.py"
echo ""
echo "  3. Start the frontend (new terminal):"
echo "       cd frontend && npm run dev"
echo ""
echo "  4. Open http://localhost:5173"
echo ""
