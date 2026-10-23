// Login.jsx
import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useTheme } from "../../context/ThemeContext";
import { requisicaoApi } from "../../services/api";
import "./Login.css";

const LEMBRAR_ME_KEY = "lembrar_me";
const LEMBRAR_EMAIL_KEY = "lembrar_email";
const LEMBRAR_SENHA_KEY = "lembrar_senha";

function Login() {
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const lembrarMeInicial = localStorage.getItem(LEMBRAR_ME_KEY) === "true";

  useEffect(() => {
    const token =
      localStorage.getItem("token") || sessionStorage.getItem("token");
    const tipoUsuario = String(
      localStorage.getItem("tipo_usuario") ||
        sessionStorage.getItem("tipo_usuario") ||
        "",
    )
      .trim()
      .toLowerCase();

    if (!token) return;

    if (tipoUsuario === "root") {
      navigate("/home-root", { replace: true });
    } else if (tipoUsuario === "admin") {
      navigate("/home-admin", { replace: true });
    } else {
      navigate("/home-alunos", { replace: true });
    }
  }, [navigate]);

  const [formData, setFormData] = useState(() => ({
    email: lembrarMeInicial ? localStorage.getItem(LEMBRAR_EMAIL_KEY) || "" : "",
    senha: lembrarMeInicial ? localStorage.getItem(LEMBRAR_SENHA_KEY) || "" : "",
  }));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [lembrarMe, setLembrarMe] = useState(
    () => lembrarMeInicial,
  );
  const [mostrarSenha, setMostrarSenha] = useState(false);

  useEffect(() => {
    localStorage.setItem(LEMBRAR_ME_KEY, String(lembrarMe));

    if (!lembrarMe) {
      localStorage.removeItem(LEMBRAR_EMAIL_KEY);
      localStorage.removeItem(LEMBRAR_SENHA_KEY);
    }
  }, [lembrarMe]);

  const logo =
    theme === "dark"
      ? "/img/LOGOTIPO FULLACADEMY - BRANCO.png"
      : "/img/LOGOTIPO FULL ACADEMY.png";

  const imagemLateral =
    theme === "dark" ? "/img/login_preto.png" : "/img/login_branco.png";

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
    // Limpa erro quando usuário digita
    if (error) setError("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const data = await requisicaoApi("/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      const tipoUsuario = String(data.tipo_usuario || "")
        .trim()
        .toLowerCase();
      const storage = lembrarMe ? localStorage : sessionStorage;
      const outroStorage = lembrarMe ? sessionStorage : localStorage;

      outroStorage.removeItem("token");
      outroStorage.removeItem("tipo_usuario");
      outroStorage.removeItem("usuario");
      outroStorage.removeItem("perfil_cache");
      storage.setItem("token", data.token);
      storage.setItem("tipo_usuario", tipoUsuario);
      storage.setItem("usuario", JSON.stringify(data.usuario));
      storage.setItem("perfil_cache", JSON.stringify(data.usuario || {}));

      if (lembrarMe) {
        localStorage.setItem(LEMBRAR_EMAIL_KEY, formData.email);
        localStorage.setItem(LEMBRAR_SENHA_KEY, formData.senha);
      } else {
        localStorage.removeItem(LEMBRAR_EMAIL_KEY);
        localStorage.removeItem(LEMBRAR_SENHA_KEY);
      }

      if (tipoUsuario === "root") {
        navigate("/home-root");
      } else if (tipoUsuario === "admin") {
        navigate("/home-admin");
      } else {
        navigate("/home-alunos");
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="login pagina-login">
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
          <h1 className="login__text_title">Acesse sua conta</h1>
          <div className="login__text_sub">
            <p>Portal de Gestão de Aprendizagem Stefani!</p>
          </div>
        </div>

        {error && <div className="login__error">{error}</div>}

        <form className="login__form" onSubmit={handleSubmit}>
          <label htmlFor="email">E-mail</label>
          <input
            id="email"
            name="email"
            type="email"
            placeholder="Digite seu e-mail"
            value={formData.email}
            onChange={handleChange}
            required
          />

          <label htmlFor="senha">Senha</label>
          <div className="login__password-field">
            <input
              id="senha"
              name="senha"
              type={mostrarSenha ? "text" : "password"}
              placeholder="Digite sua senha"
              value={formData.senha}
              onChange={handleChange}
              onCopy={(e) => e.preventDefault()}
              onPaste={(e) => e.preventDefault()}
              onCut={(e) => e.preventDefault()}
              required
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

          <div className="login__form__options">
            <div className="lembre-me">
              <input
                className="lembre-me__checkbox"
                type="checkbox"
                id="remember"
                checked={lembrarMe}
                onChange={(e) => setLembrarMe(e.target.checked)}
              />
              <label htmlFor="remember">Lembre-me</label>
            </div>
            <Link to="/redefinir-senha" className="lembre-me__link">
              Esqueci a senha
            </Link>
          </div>

          <button type="submit" className="login__submit" disabled={loading}>
            {loading ? "Entrando..." : "Entrar"}
          </button>
        </form>
      </section>

      <div className="login__image">
        <img src={imagemLateral} alt="Exemplo de Login" />
      </div>
    </main>
  );
}

export default Login;
