#!/bin/bash
cd ~/fullacademyHospedagem
git pull origin main
source ~/venv/bin/activate
cd backend/backend
pip install -r requirements.txt
touch ~/admin/wsgi/fullacademy.alwaysdata.net.wsgi