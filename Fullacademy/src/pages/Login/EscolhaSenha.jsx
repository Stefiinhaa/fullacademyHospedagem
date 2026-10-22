import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useTheme } from "../../context/ThemeContext";
import "./escolhaSenha.css";
import { requisicaoApi } from "../../services/api";

function EscolhaSenha() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [mostrarSenha, setMostrarSenha] = useState(false);
  const [mostrarConfirmacao, setMostrarConfirmacao] = useState(false);
  const [mostrarRequisitos, setMostrarRequisitos] = useState(false);
  const [erro, setErro] = useState("");
  const [enviando, setEnviando] = useState(false);
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();

  const logo =
    theme === "dark"
      ? "/img/LOGOTIPO FULLACADEMY - BRANCO.png"
      : "/img/LOGOTIPO FULL ACADEMY.png";

  const requisitosSenha = [
    {
      texto: "Pelo menos 8 caracteres",
      valido: password.length >= 8,
    },
    {
      texto: "Uma letra maiúscula",
      valido: /[A-Z]/.test(password),
    },
    {
      texto: "Uma letra minúscula",
      valido: /[a-z]/.test(password),
    },
    {
      texto: "Um caractere especial",
      valido: /[^A-Za-z0-9\s]/.test(password),
    },
  ];

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (password.length < 8) {
      setErro("A senha deve ter no mínimo 8 caracteres.");
      return;
    }
    if (!/[A-Z]/.test(password)) {
      setErro("A senha deve conter ao menos uma letra maiúscula.");
      return;
    }
    if (!/[a-z]/.test(password)) {
      setErro("A senha deve conter ao menos uma letra minúscula.");
      return;
    }
    if (!/[^A-Za-z0-9\s]/.test(password)) {
      setErro("A senha deve conter ao menos um caractere especial.");
      return;
    }
    if (password !== confirmPassword) {
      setErro("As senhas não coincidem.");
      return;
    }

    const email = localStorage.getItem("recuperacao_email");
    const codigo = localStorage.getItem("recuperacao_codigo");

    if (!email || !codigo) {
      setErro("Sua sessão de recuperação expirou. Solicite um novo código.");
      return;
    }

    setEnviando(true);
    setErro("");

    try {
      const dados = await requisicaoApi("/redefinir-senha", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email,
          codigo,
          nova_senha: password,
        }),
      });

      localStorage.removeItem("recuperacao_email");
      localStorage.removeItem("recuperacao_codigo");
      navigate("/concluido-senha");
    } catch (erroApi) {
      setErro(erroApi.message);
    } finally {
      setEnviando(false);
    }
  };

  return (
    <main className="login">
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
          <h1 className="login__text_title">Defina uma nova senha</h1>
          <div className="login__text_sub">
            <p>Portal de Gestão de Aprendizagem</p>
          </div>
        </div>

        <form className="login__form" onSubmit={handleSubmit}>
          <label htmlFor="password">Nova Senha</label>
          <div className="login__password-field">
            <input
              id="password"
              type={mostrarSenha ? "text" : "password"}
              placeholder="Digite sua nova senha"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onFocus={() => setMostrarRequisitos(true)}
              onBlur={() => setMostrarRequisitos(false)}
            />
            <button
              type="button"
              className="password-toggle"
              aria-label={mostrarSenha ? "Ocultar senha" : "Mostrar senha"}
              onClick={() => setMostrarSenha((prev) => !prev)}
            >
              {mostrarSenha ? (
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path
                    d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7S1 12 1 12z"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <circle
                    cx="12"
                    cy="12"
                    r="3"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  />
                </svg>
              ) : (
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path
                    d="M3 3l18 18M10.6 10.6a2 2 0 102.8 2.8M9.9 5.1A11.5 11.5 0 0112 5c5 0 9.3 3.1 11 7-1 2.2-2.7 4.1-4.8 5.4M6.2 6.2C4 7.6 2.3 9.6 1 12c1.7 3.9 6 7 11 7 1.7 0 3.4-.4 4.9-1.1"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              )}
            </button>
          </div>

          <label htmlFor="confirm-password">Confirmar nova senha</label>
          <div className="login__password-field">
            <input
              id="confirm-password"
              type={mostrarConfirmacao ? "text" : "password"}
              placeholder="Digite sua nova senha novamente"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              onCopy={(e) => e.preventDefault()}
              onPaste={(e) => e.preventDefault()}
              onCut={(e) => e.preventDefault()}
            />
            <button
              type="button"
              className="password-toggle"
              aria-label={
                mostrarConfirmacao ? "Ocultar senha" : "Mostrar senha"
              }
              onClick={() => setMostrarConfirmacao((prev) => !prev)}
            >
              {mostrarConfirmacao ? (
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path
                    d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7S1 12 1 12z"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <circle
                    cx="12"
                    cy="12"
                    r="3"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  />
                </svg>
              ) : (
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path
                    d="M3 3l18 18M10.6 10.6a2 2 0 102.8 2.8M9.9 5.1A11.5 11.5 0 0112 5c5 0 9.3 3.1 11 7-1 2.2-2.7 4.1-4.8 5.4M6.2 6.2C4 7.6 2.3 9.6 1 12c1.7 3.9 6 7 11 7 1.7 0 3.4-.4 4.9-1.1"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              )}
            </button>
          </div>

          {mostrarRequisitos && (
            <ul
              className="password-requirements"
              aria-label="Requisitos da senha"
            >
              {requisitosSenha.map((requisito) => (
                <li
                  key={requisito.texto}
                  className={requisito.valido ? "is-valid" : "is-invalid"}
                >
                  <span
                    aria-hidden="true"
                    style={{ color: requisito.valido ? "#16803c" : "#ed1c26" }}
                  >
                    {requisito.valido ? "✓" : "✕"}
                  </span>
                  {requisito.texto}
                </li>
              ))}
            </ul>
          )}

          {erro && <p className="form-message form-message--error">{erro}</p>}

          <div className="login__form__buttons">
            <Link to="/" className="btn btn--outline">
              Cancelar
            </Link>
            <button
              type="submit"
              className="btn btn--solid"
              disabled={enviando}
            >
              {enviando ? "Salvando..." : "Continuar"}
            </button>
          </div>
        </form>
      </section>
    </main>
  );
}

export default EscolhaSenha;
