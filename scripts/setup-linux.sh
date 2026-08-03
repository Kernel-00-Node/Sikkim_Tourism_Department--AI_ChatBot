#!/usr/bin/env bash
# =============================================================================
# setup-linux.sh — One-command dev setup for Linux (Ubuntu / Debian / Fedora)
#
# Usage:
#   chmod +x scripts/setup-linux.sh
#   ./scripts/setup-linux.sh
# =============================================================================
set -euo pipefail

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

info()  { echo -e "${GREEN}[✔]${NC} $*"; }
warn()  { echo -e "${YELLOW}[!]${NC} $*"; }
error() { echo -e "${RED}[✘]${NC} $*"; exit 1; }

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "   Sikkim Tourism Assistant — Linux Setup"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# ── 1. Detect distro and install system deps ─────────────────────────────────
if command -v apt-get &>/dev/null; then
  info "Detected apt-based distro (Debian/Ubuntu)"
  sudo apt-get update -qq
  sudo apt-get install -y python3.11 python3.11-venv python3-pip curl firefox -qq
  # Install Node.js 20 via NodeSource if not present
  if ! command -v node &>/dev/null; then
    warn "Node.js not found. Installing Node.js 20 via NodeSource..."
    curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
    sudo apt-get install -y nodejs -qq
  fi
elif command -v dnf &>/dev/null; then
  info "Detected dnf-based distro (Fedora/RHEL)"
  sudo dnf install -y python3.11 python3-pip nodejs curl firefox -q
elif command -v pacman &>/dev/null; then
  info "Detected pacman-based distro (Arch)"
  sudo pacman -Sy --noconfirm python nodejs npm firefox
else
  warn "Unknown distro — ensure Python 3.11+, Node.js 18+, and Firefox are installed manually"
fi

info "Python: $(python3.11 --version 2>/dev/null || python3 --version)"
info "Node.js: $(node --version)"

# Resolve python3.11 or fall back to python3
PYTHON=$(command -v python3.11 || command -v python3)

# ── 2. Backend setup ────────────────────────────────────────────────────────
echo ""
info "Setting up backend..."
cd backend

if [ ! -d "v_env" ]; then
  $PYTHON -m venv v_env
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

# ── 3. Frontend setup ───────────────────────────────────────────────────────
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
