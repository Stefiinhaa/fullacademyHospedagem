import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useTheme } from "../../context/ThemeContext";
import "./redefinirSenha.css";
import { requisicaoApi } from "../../services/api";

const TEMPO_REENVIO = 30;

function RedefinirSenha() {
  const [email, setEmail] = useState("");
  const [contador, setContador] = useState(0);
  const [enviando, setEnviando] = useState(false);
  const [mensagem, setMensagem] = useState("");
  const [erro, setErro] = useState("");
  const intervaloRef = useRef(null);
  const { theme, toggleTheme } = useTheme();

  const logo =
    theme === "dark"
      ? "/img/LOGOTIPO FULLACADEMY - BRANCO.png"
      : "/img/LOGOTIPO FULL ACADEMY.png";

  useEffect(() => {
    return () => clearInterval(intervaloRef.current);
  }, []);

  const iniciarContador = () => {
    setContador(TEMPO_REENVIO);
    clearInterval(intervaloRef.current);
    intervaloRef.current = setInterval(() => {
      setContador((atual) => {
        if (atual <= 1) {
          clearInterval(intervaloRef.current);
          return 0;
        }
        return atual - 1;
      });
    }, 1000);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    // TODO: chamar a API de redefinição de senha aqui
  };

  const handleEnviar = async () => {
    if (contador > 0 || enviando || !email) return;

    setEnviando(true);
    setMensagem("");
    setErro("");

    try {
      const dados = await requisicaoApi("/esqueci-senha", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email,
        }),
      });

      localStorage.setItem("recuperacao_email", email);
      setMensagem(dados.mensagem);
      iniciarContador();
    } catch (erroApi) {
      setErro(erroApi.message);
    } finally {
      setEnviando(false);
    }
  };

  return (
    <main className="login pagina-redefinir">
      <button
        type="button"
        className="theme-toggle"
        onClick={toggleTheme}
        aria-label="Alternar tema"
      >
        {theme === "light" ? "🌙 Escuro" : "☀️ Claro"}
      </button>

      <section className="login__container">
        <div className="login__logo">
          <img src={logo} alt="Logo FullAcademy" />
        </div>
        <div className="login__text">
          <h1 className="login__text_title">Redefinir Senha</h1>
          <div className="login__text_sub">
            <p>Portal de Gestão de Aprendizagem</p>
          </div>
        </div>

        <form className="login__form" onSubmit={handleSubmit}>
          <label htmlFor="email">E-mail</label>
          <div className="login__form__email-row">
            <input
              id="email"
              type="email"
              placeholder="Digite seu e-mail"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />

            <button
              type="button"
              className={`btn btn--send${contador > 0 ? " is-counting" : ""}`}
              onClick={handleEnviar}
              disabled={contador > 0 || enviando || !email}
            >
              {contador > 0 ? `${contador}s` : "Enviar"}
            </button>
          </div>

          {mensagem && (
            <p className="form-message form-message--success">{mensagem}</p>
          )}
          {erro && <p className="form-message form-message--error">{erro}</p>}

          <div className="login__form__buttons">
            <Link to="/" className="btn btn--outline">
              Voltar ao Login
            </Link>
            <Link to="/codigo-email" className="btn btn--solid">
              Continuar
            </Link>
          </div>
        </form>
      </section>
    </main>
  );
}

export default RedefinirSenha;
