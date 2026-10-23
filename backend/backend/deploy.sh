
#!/usr/bin/env bash
set -Eeuo pipefail

REPO_DIR="$HOME/fullacademyHospedagem"
VENV_DIR="$HOME/venv"

# 1. Atualizar o código
cd "$REPO_DIR"
git pull --ff-only origin main

# 2. Compilar o frontend React
cd "$REPO_DIR/Fullacademy"
npm ci
npm run build

# 3. Atualizar as dependências Python
source "$VENV_DIR/bin/activate"
cd "$REPO_DIR/backend/backend"
python -m pip install -r requirements.txt
