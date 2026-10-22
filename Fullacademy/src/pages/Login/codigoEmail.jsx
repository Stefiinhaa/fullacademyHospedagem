import { useState, useRef } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useTheme } from "../../context/ThemeContext";
import "./codigoEmail.css";
import { requisicaoApi } from "../../services/api";

const TAMANHO_CODIGO = 6;

function CodigoEmail() {
  const [codigo, setCodigo] = useState("");
  const [erro, setErro] = useState("");
  const [verificando, setVerificando] = useState(false);
  const { theme, toggleTheme } = useTheme();
  const inputsRef = useRef([]);
  const navigate = useNavigate();

  const logo =
    theme === "dark"
      ? "/img/LOGOTIPO FULLACADEMY - BRANCO.png"
      : "/img/LOGOTIPO FULL ACADEMY.png";

  const handleChangeDigito = (index, e) => {
    const digito = e.target.value.replace(/[^0-9]/g, "").slice(-1);

    const novoCodigo = codigo.split("");
    novoCodigo[index] = digito;
    setCodigo(novoCodigo.join(""));

    if (digito && index < TAMANHO_CODIGO - 1) {
      inputsRef.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index, e) => {
    if (e.key === "Backspace" && !codigo[index] && index > 0) {
      inputsRef.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const colado = e.clipboardData
      .getData("text")
      .replace(/[^0-9]/g, "")
      .slice(0, TAMANHO_CODIGO);
    setCodigo(colado.padEnd(TAMANHO_CODIGO, ""));
    inputsRef.current[Math.min(colado.length, TAMANHO_CODIGO - 1)]?.focus();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (codigo.length !== TAMANHO_CODIGO) {
      setErro("Digite o código completo de 6 números.");
      return;
    }

    const email = localStorage.getItem("recuperacao_email");
    if (!email) {
      setErro("Volte e solicite um novo código pelo seu e-mail.");
      return;
    }

    setVerificando(true);
    setErro("");

    try {
      const dados = await requisicaoApi("/verificar-codigo", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email,
          codigo,
        }),
      });

      localStorage.setItem("recuperacao_codigo", codigo);
      navigate("/escolha-senha");
    } catch (erroApi) {
      setErro(erroApi.message);
    } finally {
      setVerificando(false);
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
          <h1 className="login__text_title">Redefinir senha</h1>
          <div className="login__text_sub">
            <p>Portal de Gestão de Aprendizagem</p>
          </div>
        </div>

        <form className="login__form" onSubmit={handleSubmit}>
          <p className="login__form__intro">
            Insira o código que será enviado no seu e-mail
          </p>

          <label className="login__form__label-center">Código</label>

          <div className="codigo-input">
            {Array.from({ length: TAMANHO_CODIGO }).map((_, index) => (
              <input
                key={index}
                ref={(el) => (inputsRef.current[index] = el)}
                type="text"
                inputMode="numeric"
                maxLength={1}
                value={codigo[index] || ""}
                onChange={(e) => handleChangeDigito(index, e)}
                onKeyDown={(e) => handleKeyDown(index, e)}
                onPaste={handlePaste}
              />
            ))}
          </div>

          {erro && <p className="form-message form-message--error">{erro}</p>}

          <div className="login__form__buttons">
            <Link to="/redefinir-senha" className="btn btn--outline">
              Voltar
            </Link>
            <button
              type="submit"
              className="btn btn--solid"
              disabled={verificando}
            >
              {verificando ? "Verificando..." : "Continuar"}
            </button>
          </div>
        </form>
      </section>
    </main>
  );
}

export default CodigoEmail;
