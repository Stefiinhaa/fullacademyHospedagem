#!/usr/bin/env bash
set -Eeuo pipefail

REPO_DIR="$HOME/fullacademyHospedagem"
VENV_DIR="$HOME/venv"

# Atualiza os arquivos do repositório
cd "$REPO_DIR"
git pull --ff-only origin main

# Ativa o ambiente virtual do Python
source "$VENV_DIR/bin/activate"

# Instala as dependências do backend
cd "$REPO_DIR/backend/backend"
python -m pip install -r requirements.txt