from unittest.mock import patch

from app import app


class FakeCursor:
    def __enter__(self):
        return self

    def __exit__(self, exc_type, exc, tb):
        return False

    def execute(self, *args, **kwargs):
        return None

    def fetchone(self):
        return {
            "id_usuario": 1,
            "nome": "Usuário Teste",
            "email": "teste@teste.com",
            "senha": "hashed_password",
            "tipo_usuario": "aluno",
            "ativo": 0,
        }


class FakeConnection:
    def cursor(self):
        return FakeCursor()

    def close(self):
        return None


def test_login_conta_inativada_retorna_403():
    with patch("app.get_connection", return_value=FakeConnection()), patch(
        "app.check_password_hash", return_value=True
    ):
        client = app.test_client()
        response = client.post("/login", json={"email": "teste@teste.com", "senha": "Senha@123"})

    assert response.status_code == 403
    assert response.get_json()["erro"] == "conta inativada"
