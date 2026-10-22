import React from "react";
import {
  CSidebar,
  CSidebarBrand,
  CSidebarHeader,
  CSidebarNav,
  CNavGroup,
  CNavItem,
} from "@coreui/react";

import "./sidebar.css";

import CIcon from "@coreui/icons-react";
import { useTheme } from "../../context/ThemeContext";
import { useNavigate } from "react-router-dom";

import {
  cilHome,
  cilPuzzle,
  cilLayers,
  cilUser,
  cilAccountLogout,
  cilContrast,
} from "@coreui/icons";

function Sidebar({ isNarrow = true, onRequestClose }) {
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const tipoUsuario = String(
    localStorage.getItem("tipo_usuario") ||
      sessionStorage.getItem("tipo_usuario") ||
      "",
  )
    .trim()
    .toLowerCase();
  const podeGerenciarUsuarios =
    tipoUsuario === "root" || tipoUsuario === "admin";

  const logo =
    theme === "dark"
      ? "/img/LOGOTIPO FULLACADEMY - BRANCO.png"
      : "/img/LOGOTIPO FULL ACADEMY.png";

  const handleLogout = (event) => {
    event.preventDefault();
    localStorage.removeItem("token");
    localStorage.removeItem("tipo_usuario");
    localStorage.removeItem("usuario");
    localStorage.removeItem("perfil_cache");
    sessionStorage.removeItem("token");
    sessionStorage.removeItem("tipo_usuario");
    sessionStorage.removeItem("usuario");
    sessionStorage.removeItem("perfil_cache");
    navigate("/");
  };

  const handleHomeNavigation = (event) => {
    event.preventDefault();
    const tipoUsuario = String(
      localStorage.getItem("tipo_usuario") ||
        sessionStorage.getItem("tipo_usuario") ||
        "",
    )
      .trim()
      .toLowerCase();

    const destino =
      tipoUsuario === "root"
        ? "/home-root"
        : tipoUsuario === "admin"
          ? "/home-admin"
          : "/home-alunos";

    navigate(destino);
  };

  const handleMouseLeave = () => {
    if (!isNarrow) {
      onRequestClose?.();
    }
  };

  return (
    <>
      <CSidebar
        className="app-sidebar border-0"
        position="fixed"
        narrow={isNarrow}
        onMouseLeave={handleMouseLeave}
      >
        <CSidebarHeader className="border-0 d-flex align-items-center justify-content-center">
          <CSidebarBrand className="text-decoration-none d-flex align-items-center">
            <img src={logo} alt="FullAcademy" className="sidebar-logo" />
            <span className="d-sidebar-narrow-none sidebar-brand-text">
              FullAcademy
            </span>
          </CSidebarBrand>
        </CSidebarHeader>

        <CSidebarNav>
          <CNavItem href="#" onClick={handleHomeNavigation}>
            <CIcon customClassName="nav-icon" icon={cilHome} />
            Início
          </CNavItem>

          <CNavItem href="#">
            <CIcon customClassName="nav-icon" icon={cilPuzzle} />
            Trilhas
          </CNavItem>

          {podeGerenciarUsuarios && (
            <CNavGroup
              toggler={
                <>
                  <CIcon customClassName="nav-icon" icon={cilLayers} />
                  Cadastros
                </>
              }
            >
              <CNavItem
                href="/cadastro-usuarios"
                onClick={(event) => {
                  event.preventDefault();
                  navigate("/cadastro-usuarios");
                }}
              >
                <span className="nav-icon">
                  <span className="nav-icon-bullet"></span>
                </span>
                Usuários
              </CNavItem>

              <CNavItem href="#">
                <span className="nav-icon">
                  <span className="nav-icon-bullet"></span>
                </span>
                Grupos Usuários
              </CNavItem>
            </CNavGroup>
          )}

          <CNavItem
            href="/perfil"
            onClick={(event) => {
              event.preventDefault();
              navigate("/perfil");
            }}
          >
            <CIcon customClassName="nav-icon" icon={cilUser} />
            Perfil
          </CNavItem>

          {/* Botão de Troca de Tema */}
          <CNavItem
            className="mt-auto"
            href="#"
            onClick={(e) => {
              e.preventDefault();
              toggleTheme();
            }}
          >
            <CIcon customClassName="nav-icon" icon={cilContrast} />
            {theme === "light" ? "Modo Escuro" : "Modo Claro"}
          </CNavItem>

          {/* Botão Sair */}
          <CNavItem href="#" onClick={handleLogout}>
            <CIcon customClassName="nav-icon" icon={cilAccountLogout} />
            Sair
          </CNavItem>
        </CSidebarNav>
      </CSidebar>

      {/* Fundo escuro: no celular, tocar fora fecha o menu */}
      {!isNarrow && (
        <div
          className="app-sidebar-backdrop"
          onClick={onRequestClose}
          aria-hidden="true"
        />
      )}
    </>
  );
}

export default Sidebar;
