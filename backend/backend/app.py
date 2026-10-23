import email
import os
import random
import datetime
import jwt
import re
import uuid
from flask import Flask, request, jsonify, send_from_directory
from flask import Flask, send_from_directory
from flask_cors import CORS
from werkzeug.security import generate_password_hash, check_password_hash
from werkzeug.exceptions import HTTPException
from PIL import Image, ImageOps, UnidentifiedImageError
from dotenv import load_dotenv

from db import get_connection
from email_utils import enviar_email

from functools import wraps

load_dotenv()

import subprocess
from flask import request

@app.route('/webhook', methods=['POST'])
def webhook():
    if request.method == 'POST':
        # Executa o script de deploy em segundo plano ou direto
        subprocess.run(['bash', '/home/fullacademy/fullacademyHospedagem/backend/backend/deploy.sh'])
        return 'Atualizado com sucesso!', 200
    return 'Método não permitido', 405

app = Flask(__name__, static_folder='frontend_build', static_url_path='')
CORS(app)  # Habilita CORS para o frontend React


@app.route('/', defaults={'path': ''})
@app.route('/<path:path>')
def serve_react(path):
    if path != "" and os.path.exists(os.path.join(app.static_folder, path)):
        return send_from_directory(app.static_folder, path)
    return send_from_directory(app.static_folder, 'index.html')

class RemoverPrefixoApi:
    """Aceita /api/login, /api/perfil etc. como /login, /perfil...
    O frontend chama as rotas com o prefixo /api, mas aqui elas são
    registradas sem ele. Este middleware remove o prefixo antes do Flask
    procurar a rota, então funciona com ou sem rewrite no proxy do Vite."""

    def __init__(self, wsgi_app):
        self.wsgi_app = wsgi_app

    def __call__(self, environ, start_response):
        caminho = environ.get("PATH_INFO", "")
        if caminho == "/api":
            environ["PATH_INFO"] = "/"
        elif caminho.startswith("/api/"):
            environ["PATH_INFO"] = caminho[4:]  # tira o "/api"
        return self.wsgi_app(environ, start_response)


app.wsgi_app = RemoverPrefixoApi(app.wsgi_app)

JWT_SECRET = os.getenv("JWT_SECRET", "troque-esta-chave")

CARGO_PADRAO = {
    "root": "Administrador geral",
    "admin": "Coordenador",
    "aluno": "Aluno",
}

TAMANHO_MAXIMO_FOTO = 5 * 1024 * 1024
FORMATOS_FOTO = {"JPEG", "PNG", "WEBP"}
DIMENSAO_MAXIMA_FOTO = 6000
app.config["MAX_CONTENT_LENGTH"] = TAMANHO_MAXIMO_FOTO + 512 * 1024

LADO_FOTO = 400
PASTA_FOTOS = os.path.join(os.path.dirname(os.path.abspath(__file__)), "uploads", "fotos")
os.makedirs(PASTA_FOTOS, exist_ok=True)


def agora_utc():
    return datetime.datetime.now(datetime.timezone.utc).replace(tzinfo=None)


def get_table_columns(cursor, table_name: str):
    database = os.getenv("DB_NAME")
    if not database:
        return set()

    cursor.execute(
        "SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = %s AND TABLE_NAME = %s",
        (database, table_name),
    )
    return {row["COLUMN_NAME"] for row in cursor.fetchall()}


def validar_senha(senha: str):
    if len(senha) < 8:
        return False, "A senha deve ter no mínimo 8 caracteres."
    if not re.search(r'[A-Z]', senha):
        return False, "A senha deve conter ao menos uma letra maiúscula."
    if not re.search(r'[a-z]', senha):
        return False, "A senha deve conter ao menos uma letra minúscula."
    if not re.search(r'[^A-Za-z0-9\s]', senha):
        return False, "A senha deve conter ao menos um caractere especial."
    return True, "Senha válida."


def validar_email(email: str):
    if not isinstance(email, str):
        return False, "Formato de email inválido."

    email = email.strip()
    if not email or email.count("@") != 1 or " " in email:
        return False, "Formato de email inválido."

    usuario, dominio = email.split("@")
    if not usuario or not dominio:
        return False, "Formato de email inválido."

    return True, "Email válido."


def abrir_imagem_enviada(arquivo):
    if not arquivo or not arquivo.filename:
        return None, "nenhuma imagem foi enviada"

    try:
        imagem = Image.open(arquivo.stream)
        imagem.verify()
    except (UnidentifiedImageError, OSError, Image.DecompressionBombError):
        return None, "o arquivo enviado não é uma imagem válida"

    if imagem.format not in FORMATOS_FOTO:
        return None, "envie uma imagem JPG, PNG ou WEBP"

    largura, altura = imagem.size
    if largura > DIMENSAO_MAXIMA_FOTO or altura > DIMENSAO_MAXIMA_FOTO:
        return None, f"a imagem deve ter no máximo {DIMENSAO_MAXIMA_FOTO} x {DIMENSAO_MAXIMA_FOTO} pixels"

    arquivo.stream.seek(0)
    return Image.open(arquivo.stream), None


def url_da_foto(nome_arquivo):
    return f"/uploads/fotos/{nome_arquivo}" if nome_arquivo else ""


def apagar_foto(nome_arquivo):
    if not nome_arquivo:
        return

    caminho = os.path.join(PASTA_FOTOS, os.path.basename(nome_arquivo))
    try:
        if os.path.isfile(caminho):
            os.remove(caminho)
    except OSError as erro:
        app.logger.warning(f"Não foi possível apagar a foto antiga {caminho}: {erro}")


def salvar_foto_usuario(imagem, id_usuario):
    imagem = ImageOps.exif_transpose(imagem)
    imagem = ImageOps.fit(imagem.convert("RGBA"), (LADO_FOTO, LADO_FOTO))

    nome_arquivo = f"{id_usuario}_{uuid.uuid4().hex}.webp"
    imagem.save(os.path.join(PASTA_FOTOS, nome_arquivo), "WEBP", quality=85)
    return nome_arquivo


def criar_token_usuario(usuario):
    tipo_usuario = usuario["tipo_usuario"]
    token = jwt.encode(
        {
            "id_usuario": usuario["id_usuario"],
            "email": usuario["email"],
            "tipo": tipo_usuario,
            "exp": agora_utc() + datetime.timedelta(hours=2),
        },
        JWT_SECRET,
        algorithm="HS256",
    )
    return token


def token_obrigatorio(funcao):
    @wraps(funcao)
    def decorada(*args, **kwargs):
        cabecalho = request.headers.get("Authorization", "")
        if not cabecalho.startswith("Bearer "):
            return jsonify({"erro": "token não informado"}), 401

        token = cabecalho.split(" ", 1)[1].strip()
        try:
            dados_token = jwt.decode(token, JWT_SECRET, algorithms=["HS256"])
        except (jwt.ExpiredSignatureError, jwt.InvalidTokenError):
            return jsonify({"erro": "token inválido ou expirado"}), 401

        return funcao(dados_token, *args, **kwargs)

    decorada.__name__ = funcao.__name__
    return decorada


def resposta_usuario(usuario):
    resposta = {
        "id": usuario["id_usuario"],
        "email": usuario["email"],
    }
    if usuario["tipo_usuario"] == "aluno":
        resposta["nome_completo"] = usuario["nome"]
    else:
        resposta["nome"] = usuario["nome"]
    return resposta

def resposta_perfil(usuario):
    tipo = usuario["tipo_usuario"]
    criado_em = usuario.get("criado_em")

    return {
        "id_usuario": usuario["id_usuario"],
        "nome": usuario["nome"],
        "email": usuario["email"],
        "tipo_usuario": tipo,
        "cargo": usuario.get("cargo") or CARGO_PADRAO.get(tipo, "Usuário"),
        "criado_em": criado_em.strftime("%d/%m/%Y") if criado_em else "",
        "status": "Ativo" if usuario.get("ativo", True) else "Inativo",
        "foto_url": url_da_foto(usuario.get("foto")),
    }

def garantir_colunas_recuperacao():
    try:
        conexao = get_connection()
    except RuntimeError as erro:
        print(f"Aviso: não foi possível conectar ao banco para validar colunas: {erro}")
        return

    try:
        with conexao.cursor() as cursor:
            cursor.execute(
                """SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
                   WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'usuarios'"""
            )
            colunas = {linha["COLUMN_NAME"] for linha in cursor.fetchall()}
            if "codigo_recuperacao" not in colunas:
                cursor.execute(
                    "ALTER TABLE usuarios ADD COLUMN codigo_recuperacao VARCHAR(6) NULL"
                )
            if "codigo_expira_em" not in colunas:
                cursor.execute(
                    "ALTER TABLE usuarios ADD COLUMN codigo_expira_em DATETIME NULL"
                )
    except Exception as erro:
        print(f"Aviso: não foi possível verificar as colunas do banco: {erro}")
    finally:
        conexao.close()


def garantir_colunas_perfil():
    try:
        conexao = get_connection()
    except RuntimeError as erro:
        print(f"Aviso: não foi possível conectar ao banco para validar colunas de perfil: {erro}")
        return

    try:
        with conexao.cursor() as cursor:
            cursor.execute(
                """SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS 
                WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'usuarios'"""
            )
            colunas = {linha["COLUMN_NAME"] for linha in cursor.fetchall()}
                
            if "cargo" not in colunas:
                cursor.execute("ALTER TABLE usuarios ADD COLUMN cargo VARCHAR(100) NULL")

            if "ativo" not in colunas:
                cursor.execute("ALTER TABLE usuarios ADD COLUMN ativo TINYINT(1) NOT NULL DEFAULT 1")

            if "criado_em" not in colunas:
                cursor.execute(
                    "ALTER TABLE usuarios ADD COLUMN criado_em TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP"
                )
                cursor.execute("UPDATE usuarios SET criado_em = NOW() WHERE criado_em IS NULL")

            if "foto" not in colunas:
                cursor.execute("ALTER TABLE usuarios ADD COLUMN foto VARCHAR(255) NULL")
    except Exception as erro:
        print(f"Aviso: não foi possível verificar as colunas de perfil: {erro}")
    finally:
        conexao.close()


def cadastrar_usuario(dados, tipo_padrao=None):
    nome = dados.get("nome_completo") or dados.get("nome")
    email = dados.get("email")
    senha = dados.get("senha")
    tipo_usuario = dados.get("tipo_usuario") or tipo_padrao
    grupo_id = dados.get("grupo_id")
    ativo = dados.get("ativo", True)

    if not nome or not email or not senha or not tipo_usuario:
        return jsonify({
            "erro": "nome, email, senha e tipo_usuario são obrigatórios"
        }), 400

    tipo_usuario = str(tipo_usuario).strip().lower()
    if tipo_usuario not in {"root", "admin", "aluno"}:
        return jsonify({
            "erro": "tipo_usuario deve ser root, admin ou aluno"
        }), 400

    email = str(email).strip().lower()
    email_valido, mensagem_erro_email = validar_email(email)
    if not email_valido:
        return jsonify({"erro": mensagem_erro_email}), 400

    senha = str(senha).strip()
    senha_valida, mensagem_erro = validar_senha(senha)
    if not senha_valida:
        return jsonify({"erro": mensagem_erro}), 400

    if grupo_id in ("", None):
        grupo_id = None
    else:
        try:
            grupo_id = int(grupo_id)
        except (TypeError, ValueError):
            return jsonify({"erro": "grupo_id deve ser um número inteiro"}), 400

    if isinstance(ativo, str):
        ativo = ativo.lower() in {"true", "1", "ativo"}
    else:
        ativo = bool(ativo)

    conexao = get_connection()
    try:
        with conexao.cursor() as cursor:
            cursor.execute("SELECT id_usuario FROM usuarios WHERE email = %s", (email,))
            if cursor.fetchone():
                return jsonify({"erro": "já existe um usuário com esse email"}), 409

            cursor.execute(
                "INSERT INTO usuarios (nome, email, senha, tipo_usuario, grupo_id, ativo) "
                "VALUES (%s, %s, %s, %s, %s, %s)",
                (
                    str(nome).strip(),
                    email,
                    generate_password_hash(senha),
                    tipo_usuario,
                    grupo_id,
                    ativo,
                ),
            )
            novo_id = cursor.lastrowid
    finally:
        conexao.close()

    return jsonify({
        "mensagem": "usuário cadastrado com sucesso",
        "id_usuario": novo_id,
        "tipo_usuario": tipo_usuario,
    }), 201


@app.route("/cadastroRoot", methods=["POST"])
def cadastro_root():
    dados = request.get_json(silent=True) or {}
    return cadastrar_usuario(dados, tipo_padrao="root")


@app.route("/cadastroAdmin", methods=["POST"])
def cadastro_admin():
    dados = request.get_json(silent=True) or {}
    return cadastrar_usuario(dados, tipo_padrao="admin")


@app.route("/cadastro", methods=["POST"])
def cadastro_usuario():
    dados = request.get_json(silent=True) or {}
    return cadastrar_usuario(dados)


@app.route("/usuarios/<int:id_usuario>", methods=["PUT"])
def atualizar_usuario(id_usuario):
    dados = request.get_json(silent=True) or {}
    nome = str(dados.get("nome_completo") or dados.get("nome") or "").strip()
    email = str(dados.get("email") or "").strip().lower()
    tipo_usuario = str(dados.get("tipo_usuario") or "").strip().lower()
    senha = dados.get("senha")
    ativo = dados.get("ativo", True)

    if not nome or not email or not tipo_usuario:
        return jsonify({"erro": "nome, email e tipo_usuario são obrigatórios"}), 400

    email_valido, mensagem_erro_email = validar_email(email)
    if not email_valido:
        return jsonify({"erro": mensagem_erro_email}), 400

    if tipo_usuario not in {"root", "admin", "aluno"}:
        return jsonify({"erro": "tipo_usuario deve ser root, admin ou aluno"}), 400

    if senha:
        senha = str(senha).strip()
        senha_valida, mensagem_erro = validar_senha(senha)
        if not senha_valida:
            return jsonify({"erro": mensagem_erro}), 400

    if isinstance(ativo, str):
        ativo = ativo.lower() in {"true", "1", "ativo"}
    else:
        ativo = bool(ativo)

    conexao = get_connection()
    try:
        with conexao.cursor() as cursor:
            cursor.execute(
                "SELECT id_usuario FROM usuarios WHERE id_usuario = %s",
                (id_usuario,),
            )
            if not cursor.fetchone():
                return jsonify({"erro": "usuário não encontrado"}), 404

            cursor.execute(
                "SELECT id_usuario FROM usuarios "
                "WHERE email = %s AND id_usuario <> %s",
                (email, id_usuario),
            )
            if cursor.fetchone():
                return jsonify({"erro": "já existe um usuário com esse email"}), 409

            campos = ["nome = %s", "email = %s", "tipo_usuario = %s", "ativo = %s"]
            valores = [nome, email, tipo_usuario, ativo]

            if senha:
                campos.append("senha = %s")
                valores.append(generate_password_hash(senha))

            valores.append(id_usuario)
            cursor.execute(
                f"UPDATE usuarios SET {', '.join(campos)} WHERE id_usuario = %s",
                valores,
            )
    finally:
        conexao.close()

    return jsonify({"mensagem": "usuário atualizado com sucesso"}), 200


@app.route("/login", methods=["POST"])
def login_unificado():
    """Autentica qualquer tipo de usuário pela tabela usuarios."""
    dados = request.get_json(silent=True) or {}

    email = dados.get("email")
    senha = dados.get("senha")

    if not email or not senha:
        return jsonify({"erro": "email e senha são obrigatórios"}), 400

    email = email.strip().lower()
    senha = str(senha).strip()

    conexao = get_connection()
    try:
        with conexao.cursor() as cursor:
            cursor.execute(
                "SELECT id_usuario, nome, email, senha, tipo_usuario, ativo "
                "FROM usuarios WHERE email = %s",
                (email,),
            )
            usuario = cursor.fetchone()

            if not usuario:
                return jsonify({"erro": "email ou senha inválidos"}), 401

            ativo = usuario.get("ativo")
            if isinstance(ativo, str):
                ativo = ativo.strip().lower() in {"true", "1", "ativo", "sim"}
            else:
                ativo = bool(ativo if ativo is not None else True)

            if not ativo:
                return jsonify({"erro": "conta inativada"}), 403

            if not check_password_hash(usuario["senha"], senha):
                return jsonify({"erro": "email ou senha inválidos"}), 401

            return jsonify({
                "mensagem": "login realizado com sucesso",
                "token": criar_token_usuario(usuario),
                "tipo_usuario": usuario["tipo_usuario"],
                "usuario": resposta_usuario(usuario),
            }), 200

    finally:
        conexao.close()


@app.route("/saude", methods=["GET"])
def saude():
    conexao = get_connection()
    try:
        with conexao.cursor() as cursor:
            cursor.execute("SELECT 1 AS ok")
            cursor.fetchone()
    finally:
        conexao.close()
    return jsonify({"servidor": "ok", "banco": "ok"}), 200

@app.route("/deletarusuario", methods=["DELETE"])
def deletar_usuario():
    dados = request.get_json(silent=True) or {}
    id_usuario = dados.get("id_usuario")

    if not id_usuario:
        return jsonify({"erro": "id_usuario é obrigatório"}), 400

    conexao = get_connection()
    try:
        with conexao.cursor() as cursor:
            cursor.execute(
                "SELECT id_usuario, nome, email, tipo_usuario "
                "FROM usuarios WHERE id_usuario = %s",
                (id_usuario,),
            )
            usuario = cursor.fetchone()

            if not usuario:
                return jsonify({"erro": "usuário não encontrado"}), 404

            cursor.execute(
                "DELETE FROM usuarios WHERE id_usuario = %s",
                (id_usuario,),
            )
    finally:
        conexao.close()

    return jsonify({
        "mensagem": "usuário deletado com sucesso",
        "usuario": usuario,
    }), 200


@app.route("/esqueci-senha", methods=["POST"])
def esqueci_senha():
    dados = request.get_json(silent=True) or {}
    email = dados.get("email")
    tipo_usuario = dados.get("tipo_usuario")

    if not email:
        return jsonify({"erro": "email é obrigatório"}), 400

    codigo = f"{random.randint(0, 999999):06d}"
    expira_em = agora_utc() + datetime.timedelta(minutes=15)

    conexao = get_connection()
    try:
        with conexao.cursor() as cursor:
            cursor.execute(
                "SELECT id_usuario, tipo_usuario FROM usuarios WHERE email = %s",
                (email,),
            )
            usuario = cursor.fetchone()
            if not usuario:
                return jsonify({"erro": "não existe usuário cadastrado com esse email"}), 404
            if tipo_usuario and tipo_usuario != usuario["tipo_usuario"]:
                return jsonify({"erro": "o tipo de usuário não corresponde ao email"}), 400

            cursor.execute(
                "UPDATE usuarios SET codigo_recuperacao = %s, codigo_expira_em = %s "
                "WHERE id_usuario = %s",
                (codigo, expira_em, usuario["id_usuario"]),
            )
    finally:
        conexao.close()

    try:
        enviar_email(
            destinatario=email,
            assunto="Código de recuperação de senha",
            corpo=f"Seu código de recuperação é: {codigo}\nEle expira em 15 minutos.",
        )
    except Exception as erro:
        return jsonify({"erro": f"não foi possível enviar o email: {str(erro)}"}), 500

    return jsonify({"mensagem": "código enviado para o email informado"}), 200


@app.route("/verificar-codigo", methods=["POST"])
def verificar_codigo():
    dados = request.get_json(silent=True) or {}
    email = dados.get("email")
    codigo = dados.get("codigo")
    tipo_usuario = dados.get("tipo_usuario")

    if not email or not codigo:
        return jsonify({"erro": "email e código são obrigatórios"}), 400

    conexao = get_connection()
    try:
        with conexao.cursor() as cursor:
            cursor.execute(
                "SELECT codigo_recuperacao, codigo_expira_em, tipo_usuario "
                "FROM usuarios WHERE email = %s",
                (email,),
            )
            usuario = cursor.fetchone()
    finally:
        conexao.close()

    if not usuario or not usuario["codigo_recuperacao"]:
        return jsonify({"erro": "nenhum código foi solicitado para esse email"}), 400

    if tipo_usuario and tipo_usuario != usuario["tipo_usuario"]:
        return jsonify({"erro": "o tipo de usuário não corresponde ao email"}), 400

    if str(usuario["codigo_recuperacao"]) != str(codigo):
        return jsonify({"erro": "código inválido"}), 400

    if agora_utc() > usuario["codigo_expira_em"]:
        return jsonify({"erro": "código expirado, solicite um novo"}), 400

    return jsonify({"mensagem": "código válido"}), 200


@app.route("/redefinir-senha", methods=["POST"])
def redefinir_senha():
    dados = request.get_json(silent=True) or {}
    email = dados.get("email")
    codigo = dados.get("codigo")
    nova_senha = dados.get("nova_senha")
    tipo_usuario = dados.get("tipo_usuario")

    if not email or not codigo or not nova_senha:
        return jsonify({"erro": "email, código e nova_senha são obrigatórios"}), 400

    nova_senha = str(nova_senha).strip()
    
    # Validação da senha
    senha_valida, mensagem_erro = validar_senha(nova_senha)
    if not senha_valida:
        return jsonify({"erro": mensagem_erro}), 400

    conexao = get_connection()
    try:
        with conexao.cursor() as cursor:
            cursor.execute(
                "SELECT id_usuario, codigo_recuperacao, codigo_expira_em, tipo_usuario "
                "FROM usuarios WHERE email = %s",
                (email,),
            )
            usuario = cursor.fetchone()

            if not usuario or not usuario["codigo_recuperacao"]:
                return jsonify({"erro": "nenhum código foi solicitado para esse email"}), 400

            if tipo_usuario and tipo_usuario != usuario["tipo_usuario"]:
                return jsonify({"erro": "o tipo de usuário não corresponde ao email"}), 400

            if str(usuario["codigo_recuperacao"]) != str(codigo):
                return jsonify({"erro": "código inválido"}), 400

            if agora_utc() > usuario["codigo_expira_em"]:
                return jsonify({"erro": "código expirado, solicite um novo"}), 400

            senha_hash = generate_password_hash(nova_senha)
            
            cursor.execute(
                """UPDATE usuarios
                   SET senha = %s, codigo_recuperacao = NULL, codigo_expira_em = NULL
                   WHERE id_usuario = %s""",
                (senha_hash, usuario["id_usuario"]),
            )
    finally:
        conexao.close()

    return jsonify({"mensagem": "senha redefinida com sucesso"}), 200


@app.route("/perfil", methods=["GET"])
@token_obrigatorio
def consultar_perfil(dados_token):
    conexao = get_connection()
    try:
        with conexao.cursor() as cursor:
            cursor.execute(
                """SELECT id_usuario, nome, email, tipo_usuario, 
                cargo, criado_em, ativo, foto
                   FROM usuarios WHERE id_usuario = %s""",
                (dados_token["id_usuario"],),
            )
            usuario = cursor.fetchone()
    finally:
        conexao.close()

    if not usuario:
        return jsonify({"erro": "usuário não encontrado"}), 404

    return jsonify({"usuario": resposta_perfil(usuario)}), 200


@app.route("/perfil", methods=["PUT"])
@token_obrigatorio
def atualizar_perfil(dados_token):
    dados = request.get_json(silent=True) or {}
    senha_atual = str(dados.get("senha_atual") or "")
    nova_senha = str(dados.get("nova_senha") or "").strip()

    if not senha_atual or not nova_senha:
        return jsonify({"erro": "informe a senha atual e a nova senha"}), 400

    senha_valida, mensagem_senha = validar_senha(nova_senha)
    if not senha_valida:
        return jsonify({"erro": mensagem_senha}), 400

    conexao = get_connection()
    try:
        with conexao.cursor() as cursor:
            cursor.execute(
                "SELECT id_usuario, senha FROM usuarios WHERE id_usuario = %s",
                (dados_token["id_usuario"],),
            )
            usuario = cursor.fetchone()

            if not usuario:
                return jsonify({"erro": "usuário não encontrado"}), 404

            if not check_password_hash(usuario["senha"], senha_atual):
                return jsonify({"erro": "a senha atual está incorreta"}), 400

            cursor.execute(
                "UPDATE usuarios SET senha = %s WHERE id_usuario = %s",
                (generate_password_hash(nova_senha), dados_token["id_usuario"]),
            )
    finally:
        conexao.close()

    return jsonify({"mensagem": "senha alterada com sucesso"}), 200


def trocar_foto_do_usuario(id_usuario):
    """Salva a foto enviada no campo 'foto' para o usuário informado."""
    imagem, erro = abrir_imagem_enviada(request.files.get("foto"))
    if erro:
        return jsonify({"erro": erro}), 400

    conexao = get_connection()
    try:
        with conexao.cursor() as cursor:
            cursor.execute(
                "SELECT foto FROM usuarios WHERE id_usuario = %s",
                (id_usuario,),
            )
            usuario = cursor.fetchone()
            if not usuario:
                return jsonify({"erro": "usuário não encontrado"}), 404

            foto_antiga = usuario["foto"]
            nome_arquivo = salvar_foto_usuario(imagem, id_usuario)
            try:
                cursor.execute(
                    "UPDATE usuarios SET foto = %s WHERE id_usuario = %s",
                    (nome_arquivo, id_usuario),
                )
            except Exception:
                apagar_foto(nome_arquivo)
                raise
    finally:
        conexao.close()

    apagar_foto(foto_antiga)
    return jsonify({
        "mensagem": "foto salva com sucesso",
        "foto_url": url_da_foto(nome_arquivo),
    }), 200


@app.route("/perfil/foto", methods=["POST"])
@token_obrigatorio
def atualizar_foto(dados_token):
    # O próprio usuário troca a sua foto: o id vem do token
    return trocar_foto_do_usuario(dados_token["id_usuario"])


@app.route("/usuarios/<int:id_usuario>/foto", methods=["POST"])
@token_obrigatorio
def atualizar_foto_usuario(dados_token, id_usuario):
    # Admin ou root troca a foto de outro usuário: o id vem da URL
    if dados_token.get("tipo") not in {"root", "admin"}:
        return jsonify({"erro": "sem permissão para alterar a foto de outro usuário"}), 403

    return trocar_foto_do_usuario(id_usuario)


@app.route("/uploads/fotos/<nome_arquivo>", methods=["GET"])
def servir_foto(nome_arquivo):
    return send_from_directory(PASTA_FOTOS, nome_arquivo, max_age=31536000)


@app.route("/usuarios", methods=["GET"])
def listar_usuarios():
    conexao = get_connection()

    try:
        with conexao.cursor() as cursor:
            cursor.execute(
                """
                SELECT
                    id_usuario,
                    nome,
                    email,
                    tipo_usuario,
                    COALESCE(ativo, TRUE) AS ativo,
                    foto
                FROM usuarios
                ORDER BY criado_em ASC, id_usuario ASC
                """
            )

            usuarios = cursor.fetchall()

    finally:
        conexao.close()

    for usuario in usuarios:
        usuario["foto_url"] = url_da_foto(usuario.get("foto"))
        usuario.pop("foto", None)

    return jsonify(usuarios), 200


@app.route("/alunos", methods=["GET"])
def listar_alunos():
    conexao = get_connection()
    try:
        with conexao.cursor() as cursor:
            cursor.execute(
                "SELECT id_usuario AS id_aluno, nome AS nome_completo, email "
                "FROM usuarios WHERE tipo_usuario = 'aluno'"
            )
            alunos = cursor.fetchall()
    finally:
        conexao.close()

    return jsonify(alunos), 200


@app.route("/admin", methods=["GET"])
def listar_admins():
    conexao = get_connection()
    try:
        with conexao.cursor() as cursor:
            cursor.execute(
                "SELECT id_usuario AS id_admin, nome, email "
                "FROM usuarios WHERE tipo_usuario = 'admin'"
            )
            admins = cursor.fetchall()
    finally:
        conexao.close()

    return jsonify(admins), 200


@app.errorhandler(404)
def erro_404(_error):
    return jsonify({"erro": "rota não encontrada"}), 404


@app.errorhandler(RuntimeError)
def erro_conexao_banco(erro):
    app.logger.error(f"Erro de banco: {erro}")
    return jsonify({"erro": "Serviço temporariamente indisponível. Tente novamente em alguns instantes."}), 503


@app.errorhandler(413)
def erro_arquivo_grande(_erro):
    return jsonify({"erro": "a imagem deve ter no máximo 5 MB"}), 413


@app.errorhandler(Exception)
def erro_inesperado(erro):
    if isinstance(erro, HTTPException):
        return erro
    app.logger.exception(erro)
    resposta = {"erro": "Algo deu errado. Tente novamente em alguns instantes."}
    if app.debug:
        # Só em desenvolvimento: ajuda a achar o problema pelo console (F12)
        resposta["detalhe"] = f"{type(erro).__name__}: {erro}"
    return jsonify(resposta), 500


if __name__ == "__main__":
    if os.environ.get("WERKZEUG_RUN_MAIN") != "true":
        print("Preparando o banco de dados...")
        try:
            garantir_colunas_recuperacao()
            garantir_colunas_perfil()
        except Exception as erro:
            print(f"Aviso: falha na preparação do banco em startup: {erro}")
        print("Banco pronto. Iniciando o servidor...")

    # Mostra as rotas registradas, para conferir no terminal
    print(app.url_map)

    app.run(debug=True, port=5000, host='0.0.0.0', threaded=True)