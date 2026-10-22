# Backend de Alunos (Flask + MySQL)

Backend simples com 3 rotas: cadastro, login e listagem de alunos, usando a
tabela `alunos` que voce ja tem no MySQL (`id_aluno`, `nome_completo`,
`email`, `senha`).

## 1. Instalar e configurar

```bash
cd backend_alunos
python -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate
pip install -r requirements.txt
```

Abra o arquivo `.env` e preencha com os dados do seu MySQL (host, usuario,
senha, nome do banco, porta). Se estiver usando XAMPP/WAMP local, geralmente
e `DB_HOST=localhost`, `DB_USER=root`, `DB_PASSWORD=` (vazio) e a porta
`3306`.

## 2. Rodar o servidor

```bash
python app.py
```

O servidor sobe em `http://localhost:5000`. Toda vez que voce salvar o
codigo, ele reinicia sozinho (igual o nodemon), porque esta com
`debug=True`.

## 3. Testar

### No Insomnia (ou Postman)

Funciona exatamente como voce ja usa com Node -- e so trocar a porta/URL. Crie
uma requisicao pra cada rota:

**Cadastro**
- Metodo: `POST`
- URL: `http://localhost:5000/cadastro`
- Body -> JSON:
```json
{
  "nome_completo": "Maria Silva",
  "email": "maria@email.com",
  "senha": "123456"
}
```

**Login**
- Metodo: `POST`
- URL: `http://localhost:5000/login`
- Body -> JSON:
```json
{
  "email": "maria@email.com",
  "senha": "123456"
}
```
- Retorna um `token` (JWT). Guarde esse token se depois voce quiser proteger
  outras rotas usando o header `Authorization: Bearer <token>`.

**Listar alunos**
- Metodo: `GET`
- URL: `http://localhost:5000/alunos`
- Sem body.

### No terminal (com curl)

```bash
# cadastro
curl -X POST http://localhost:5000/cadastro \
  -H "Content-Type: application/json" \
  -d '{"nome_completo":"Maria Silva","email":"maria@email.com","senha":"123456"}'

# login
curl -X POST http://localhost:5000/login \
  -H "Content-Type: application/json" \
  -d '{"email":"maria@email.com","senha":"123456"}'

# listar
curl http://localhost:5000/alunos
```

## Respostas esperadas

| Rota            | Sucesso                          | Erros possiveis                                  |
|-----------------|-----------------------------------|---------------------------------------------------|
| POST /cadastro  | 201 + `id_aluno` criado          | 400 (faltou campo), 409 (email ja cadastrado)     |
| POST /login     | 200 + `token` + dados do aluno   | 400 (faltou campo), 401 (email ou senha invalidos)|
| GET /alunos     | 200 + lista de alunos (sem senha)| -                                                   |

## Duvidas comuns

- **"Preciso reiniciar o servidor toda vez que mudo o codigo?"** Nao, com
  `debug=True` ele reinicia sozinho.
- **"Da pra testar sem Insomnia?"** Da, com `curl` no terminal (exemplos
  acima) ou instalando `httpie` (`pip install httpie`, sintaxe mais simples).
- **"Erro de conexao com o banco"**: confira se o MySQL esta rodando e se os
  dados no `.env` (host, usuario, senha, nome do banco) estao corretos.
- **Senha nunca fica em texto puro**: o cadastro salva um hash (gerado com
  `werkzeug.security.generate_password_hash`) e o login compara o hash, nunca
  o texto direto.
