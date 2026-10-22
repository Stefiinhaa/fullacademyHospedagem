import { CContainer, CForm, CFormInput, CButton } from "@coreui/react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import CIcon from "@coreui/icons-react";
import { cilBell, cilSearch, cilMenu } from "@coreui/icons";

import { requisicaoApi, urlDaApi } from "../../services/api";
import "./navbar.css";

let fotoEmCache = { token: "", fotoUrl: "" };

function obterToken() {
  return localStorage.getItem("token") || sessionStorage.getItem("token") || "";
}

function obterIniciais(nome) {
  const partes = String(nome || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (partes.length === 0) return "?";
  const primeira = partes[0][0];
  const ultima = partes.length > 1 ? partes[partes.length - 1][0] : "";
  return (primeira + ultima).toUpperCase();
}

// busca / onBuscar: opcionais. Só a tela que quer usar a busca passa essas props.
function Navbar({
  profile = "aluno",
  onToggleSidebar,
  busca,
  onBuscar,
  mostrarBusca = true,
}) {
  const navigate = useNavigate();
  const perfilNormalizado = String(profile || "aluno")
    .trim()
    .toLowerCase();
  const profileLabel =
    perfilNormalizado === "root"
      ? "Root"
      : perfilNormalizado === "admin"
        ? "Admin"
        : "Aluno";
  let usuarioSalvo = {};
  try {
    usuarioSalvo = JSON.parse(
      localStorage.getItem("usuario") ||
        sessionStorage.getItem("usuario") ||
        "{}",
    );
  } catch {
    usuarioSalvo = {};
  }
  const nomeUsuario =
    usuarioSalvo.nome ||
    usuarioSalvo.nome_completo ||
    `Usuário ${profileLabel}`;
  const [fotoUrl, setFotoUrl] = useState(() =>
    fotoEmCache.token === obterToken() ? fotoEmCache.fotoUrl : "",
  );

  useEffect(() => {
    fotoEmCache = { token: obterToken(), fotoUrl };
  }, [fotoUrl]);

  useEffect(() => {
    ["root", "admin", "aluno"].forEach((tipo) =>
      localStorage.removeItem(`user-avatar-${tipo}`),
    );

    const token = obterToken();
    if (!token) return undefined;

    let ativo = true;
    requisicaoApi("/perfil", { headers: { Authorization: `Bearer ${token}` } })
      .then((dados) => {
        if (ativo) setFotoUrl(dados.usuario?.foto_url || "");
      })
      .catch(() => {});

    return () => {
      ativo = false;
    };
  }, []);

  useEffect(() => {
    const handleFotoAtualizada = (event) => setFotoUrl(event.detail || "");

    window.addEventListener("foto-perfil-atualizada", handleFotoAtualizada);
    return () =>
      window.removeEventListener(
        "foto-perfil-atualizada",
        handleFotoAtualizada,
      );
  }, []);

  return (
    <header className="top-navbar">
      <CContainer fluid className="navbar-container">
        {/* Botão Hambúrguer para alternar a Sidebar */}
        <button
          className="navbar-hamburger"
          type="button"
          onClick={onToggleSidebar}
          aria-label="Alternar Menu Lateral"
        >
          <CIcon icon={cilMenu} size="xl" />
        </button>

        {/* Título */}
        <div className="navbar-title">Painel do {profileLabel}</div>

        {/* Pesquisa: some quando a página passa mostrarBusca={false} */}
        {mostrarBusca && (
          <CForm className="navbar-search" onSubmit={(e) => e.preventDefault()}>
            <CIcon icon={cilSearch} className="search-icon" />

            <CFormInput
              type="search"
              placeholder="Buscar..."
              aria-label="Buscar"
              value={busca}
              onChange={onBuscar ? (e) => onBuscar(e.target.value) : undefined}
            />
          </CForm>
        )}

        <div className="navbar-right">
          {/* Notificação */}
          <CButton className="notification-button">
            <CIcon icon={cilBell} />
          </CButton>

          {/* Usuário */}
          <div className="navbar-user">
            <button
              type="button"
              className="user-avatar"
              onClick={() => navigate("/perfil")}
              aria-label="Abrir meu perfil"
            >
              {fotoUrl ? (
                <img
                  src={urlDaApi(fotoUrl)}
                  alt=""
                  onError={() => setFotoUrl("")}
                />
              ) : (
                <span aria-hidden="true">{obterIniciais(nomeUsuario)}</span>
              )}
            </button>

            <div>
              <strong>{nomeUsuario}</strong>

              <span>{profileLabel}</span>
            </div>
          </div>
        </div>
      </CContainer>
    </header>
  );
}

export default Navbar;
