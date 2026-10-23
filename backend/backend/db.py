import os
import pymysql
from pymysql.cursors import DictCursor
from dotenv import load_dotenv

load_dotenv()

def get_connection():
    # O endereço do servidor MySQL do Alwaysdata vai aqui no host:
    host = os.getenv("DB_HOST", "mysql-fullacademy.alwaysdata.net")
    port = int(os.getenv("DB_PORT", 3306))
    connect_timeout = int(os.getenv("DB_CONNECT_TIMEOUT", 5))
    read_timeout = int(os.getenv("DB_READ_TIMEOUT", 30))
    write_timeout = int(os.getenv("DB_WRITE_TIMEOUT", 30))

    try:
        return pymysql.connect(
            host=host,
            # O nome do usuário MySQL criado no painel vai aqui:
            user=os.getenv("DB_USER", "fullacademy_user"),
            password=os.getenv("DB_PASSWORD", "Fullacademy2026"),
            database=os.getenv("DB_NAME", "fullacademy_2026"),
            port=port,
            cursorclass=DictCursor,
            autocommit=True,
            connect_timeout=connect_timeout,
            read_timeout=read_timeout,
            write_timeout=write_timeout,
            init_command="SET SESSION lock_wait_timeout = 10",
        )
    except pymysql.err.OperationalError as erro:
        raise RuntimeError(
            f"Nao foi possivel conectar ao MySQL em {host}:{port}. "
            "Inicie o MySQL, confira a porta e valide o arquivo .env."
        ) from erro