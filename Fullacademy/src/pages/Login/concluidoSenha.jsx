import { useState } from "react";
import { Link } from "react-router-dom";
import { useTheme } from "../../context/ThemeContext";
import "./concluidoSenha.css";

function ConcluidoSenha() {
  const [email, setEmail] = useState("");
  const { theme, toggleTheme } = useTheme();

  const logo =
    theme === "dark"
      ? "/img/LOGOTIPO FULLACADEMY - BRANCO.png"
      : "/img/LOGOTIPO FULL ACADEMY.png";

  const handleSubmit = (e) => {
    e.preventDefault();
  };
  //VOCÊS FAZEM A PAGINA AQUI EM BAIXO, DENTRO DO RETURN, O RESTO A CIMA É DESNECESSÁRIO, SÓ COLOQUEI PRA NÃO DAR ERRO NO CÓDIGO
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

      <section className="concluidoSenha__container">
        <div className="login__logo">
          <img src={logo} alt="Logo FullAcademy" />
        </div>

        <form className="concluidoSenha__form" onSubmit={handleSubmit}>
          <label>Senha redefinida com sucesso!</label>

          <div className="concluidoSenha__form__buttons">
            <Link to="/" className="btn_concluidoSenha btn--solid">
              Login
            </Link>
          </div>
        </form>
      </section>
    </main>
  );
}

export default ConcluidoSenha;
