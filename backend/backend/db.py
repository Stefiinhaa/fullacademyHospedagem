import os
import pymysql
from pymysql.cursors import DictCursor
from dotenv import load_dotenv

load_dotenv()

def get_connection():
    host = os.getenv("DB_HOST", "localhost")
    port = int(os.getenv("DB_PORT", 3306))
    connect_timeout = int(os.getenv("DB_CONNECT_TIMEOUT", 5))
    read_timeout = int(os.getenv("DB_READ_TIMEOUT", 30))
    write_timeout = int(os.getenv("DB_WRITE_TIMEOUT", 30))

    try:
        return pymysql.connect(
            host=host,
            user=os.getenv("DB_USER", "root"),
            password=os.getenv("DB_PASSWORD", ""),
            database=os.getenv("DB_NAME"),
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
