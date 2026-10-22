import { lazy, Suspense, useEffect, useRef, useState } from "react";
import { salvarCadastroPendente } from "../../services/bancoLocal.js";

import CadastrosPendentes from "../../componentes/CadastrosPendentes.jsx";


import Navbar from "../../componentes/templates/navbar";
import Sidebar from "../../componentes/templates/sidebar";

import CIcon from "@coreui/icons-react";
import { cilPlus, cilTrash, cilX, cilSearch, cilFilter } from "@coreui/icons";
import {
  RiCheckboxMultipleLine,
  RiCloseLine,
  RiDownload2Line,
  RiFileExcel2Line,
  RiFilePdf2Line,
} from "react-icons/ri";

import "./cadastroUsuarios.css";

import { requisicaoApi, urlDaApi } from "../../services/api";
import ModalFiltroUsuarios, { CATEGORIAS } from "./ModalFiltroUsuarios";
import CampoSenha from "../../componentes/CampoSenha";
import CampoFoto from "../../componentes/CampoFoto";
import FiltroColuna, {
  criarFiltroColuna,
  colunasVisiveis,
} from "../../componentes/FiltroColunas";

const USUARIO_VAZIO = {
  nome_completo: "",
  email: "",
  senha: "",
  confirmar_senha: "",
  tipo_usuario: "aluno",
  ativo: true,
};

const FILTROS_VAZIOS = {
  nome: [],
  email: [],
  ativo: [],
  tipo_usuario: [],
  foto: [],
};

// Colunas da tabela. A "chave" é a mesma usada na ordenação e nos filtros.
const COLUNAS_TABELA = [
  { chave: "foto", rotulo: "Foto" },
  { chave: "nome", rotulo: "Nome do aluno" },
  { chave: "email", rotulo: "Email" },
  { chave: "ativo", rotulo: "Status" },
  { chave: "tipo_usuario", rotulo: "Perfil" },
];

const ListaUsuarios = lazy(() => import("./ListaUsuarios"));

// Cabeçalho do PDF exportado
const NOME_PRODUTO = "Fullacademy";
const LOGO_PRODUTO = "/img/LOGOTIPO FULL ACADEMY.png"; // pasta public/img

function obterToken() {
  return localStorage.getItem("token") || sessionStorage.getItem("token");
}

const valorDaColuna = (usuario, coluna) => {
  if (coluna === "nome") {
    return usuario.nome || usuario.nome_completo || "";
  }

  if (coluna === "email") {
    return usuario.email || "";
  }

  if (coluna === "ativo") {
    return (usuario.ativo ?? true) ? "Ativo" : "Inativo";
  }

  if (coluna === "tipo_usuario") {
    return usuario.tipo_usuario || "aluno";
  }

  if (coluna === "foto") {
    const foto = (usuario.foto || usuario.foto_url || "").trim();
    return foto ? "Com foto" : "Sem foto";
  }

  return "";
};

const escaparCsv = (valor) => `"${String(valor ?? "").replace(/"/g, '""')}"`;

const escaparHtml = (valor) =>
  String(valor ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

function CadastroUsuarios() {
  const [isSidebarNarrow, setIsSidebarNarrow] = useState(true);

  const tipoUsuario =
    localStorage.getItem("tipo_usuario") ||
    sessionStorage.getItem("tipo_usuario");

  const handleToggleSidebar = () => {
    setIsSidebarNarrow((prev) => !prev);
  };

  const handleCloseSidebar = () => {
    setIsSidebarNarrow(true);
  };

  // ============================================================
  // ESTADO DA LISTAGEM
  // ============================================================

  const [usuarios, setUsuarios] = useState([]);
  const [carregandoLista, setCarregandoLista] = useState(true);
  const [erroLista, setErroLista] = useState("");
  const [totalUsuarios, setTotalUsuarios] = useState(0);
  const [nomeFiltro, setNomeFiltro] = useState("");
  const [colunaOrdenada, setColunaOrdenada] = useState(null);
  const [direcaoOrdenacao, setDirecaoOrdenacao] = useState("asc");
  const [filtrosSelecionados, setFiltrosSelecionados] =
    useState(FILTROS_VAZIOS);
  const [mostrarModalFiltro, setMostrarModalFiltro] = useState(false);
  const [mostrarModalExportacao, setMostrarModalExportacao] = useState(false);
  const [erroExportacao, setErroExportacao] = useState("");
  const [listagemVisivel, setListagemVisivel] = useState(false);
  const [modalCadastroOffline, setModalCadastroOffline] = useState(false);

  // Ordem e visibilidade das colunas (controlado pelo FiltroColuna)
  const [colunasTabela, setColunasTabela] = useState(() =>
    criarFiltroColuna(COLUNAS_TABELA),
  );

  const listagemRef = useRef(null);

  // ============================================================
  // ESTADO DE SELEÇÃO EM MASSA
  // ============================================================

  const [modoSelecao, setModoSelecao] = useState(false);
  const [usuariosSelecionados, setUsuariosSelecionados] = useState([]);

  // ============================================================
  // BUSCAR USUÁRIOS
  // ============================================================

  const buscarUsuarios = async (mostrarCarregamento = true) => {
    if (mostrarCarregamento) {
      setCarregandoLista(true);
    }

    setErroLista("");

    try {
      const dados = await requisicaoApi("/usuarios");
      const lista = Array.isArray(dados) ? dados : [];

      setUsuarios(lista);
      setTotalUsuarios(lista.length);
    } catch (erro) {
      setErroLista(erro?.message || "Não foi possível carregar os usuários.");
    } finally {
      if (mostrarCarregamento) {
        setCarregandoLista(false);
      }
    }
  };

  useEffect(() => {
    const elemento = listagemRef.current;
    if (!elemento) return;

    const observer = new IntersectionObserver(
      ([entrada]) => {
        if (entrada.isIntersecting) {
          setListagemVisivel(true);
          observer.disconnect();
        }
      },
      { rootMargin: "200px" },
    );

    observer.observe(elemento);

    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (listagemVisivel) {
      buscarUsuarios();
    }
  }, [listagemVisivel]);

  useEffect(() => {
    const handleFotoAtualizada = () => {
      if (!listagemVisivel) return;
      buscarUsuarios(false);
    };

    window.addEventListener("foto-perfil-atualizada", handleFotoAtualizada);

    return () => {
      window.removeEventListener(
        "foto-perfil-atualizada",
        handleFotoAtualizada,
      );
    };
  }, [listagemVisivel]);

  // ============================================================
  // COLUNAS DA TABELA (FiltroColuna)
  // ============================================================

  const handleMudarColunas = (novasColunas) => {
    setColunasTabela(novasColunas);

    // Se a coluna usada na ordenação foi ocultada, volta à ordem original
    const colunaOrdenadaOculta = novasColunas.some(
      (coluna) => coluna.chave === colunaOrdenada && !coluna.visivel,
    );

    if (colunaOrdenadaOculta) {
      setColunaOrdenada(null);
      setDirecaoOrdenacao("asc");
    }
  };

  // ============================================================
  // FILTRO E ORDENAÇÃO
  // ============================================================

  const usuariosFiltrados = usuarios.filter((usuario) => {
    const nome = (usuario.nome_completo || usuario.nome || "").toLowerCase();
    const email = (usuario.email || "").toLowerCase();
    const ativo = Boolean(usuario.ativo ?? true);
    const textoStatus = ativo ? "ativo" : "inativo";
    const perfil = (usuario.tipo_usuario || "aluno").toLowerCase();
    const termo = nomeFiltro.trim().toLowerCase();

    const passaBusca =
      nome.includes(termo) ||
      email.includes(termo) ||
      textoStatus.startsWith(termo) ||
      perfil.includes(termo);

    const passaColuna = (coluna) => {
      const marcados = filtrosSelecionados[coluna];
      return (
        marcados.length === 0 ||
        marcados.includes(valorDaColuna(usuario, coluna))
      );
    };

    return (
      passaBusca &&
      passaColuna("nome") &&
      passaColuna("email") &&
      passaColuna("ativo") &&
      passaColuna("tipo_usuario") &&
      passaColuna("foto")
    );
  });

  const usuariosOrdenados =
    colunaOrdenada === null
      ? usuariosFiltrados
      : [...usuariosFiltrados].sort((a, b) => {
        const resultado = valorDaColuna(a, colunaOrdenada).localeCompare(
          valorDaColuna(b, colunaOrdenada),
          "pt-BR",
          { sensitivity: "base" },
        );

        return direcaoOrdenacao === "asc" ? resultado : -resultado;
      });

  const handleOrdenar = (coluna) => {
    if (coluna !== colunaOrdenada) {
      setColunaOrdenada(coluna);
      setDirecaoOrdenacao("asc");
      return;
    }

    if (direcaoOrdenacao === "asc") {
      setDirecaoOrdenacao("desc");
      return;
    }

    setColunaOrdenada(null);
    setDirecaoOrdenacao("asc");
  };

  // ============================================================
  // LÓGICA DE SELEÇÃO EM MASSA (DISPARADA PELO BOTÃO)
  // ============================================================

  const idsVisiveis = usuariosOrdenados.map((u) => u.id_usuario ?? u.id_aluno);

  const todosVisiveisSelecionados =
    idsVisiveis.length > 0 &&
    idsVisiveis.every((id) => usuariosSelecionados.includes(id));

  const algunsVisiveisSelecionados =
    !todosVisiveisSelecionados &&
    idsVisiveis.some((id) => usuariosSelecionados.includes(id));

  // Deixa o checkbox "Selecionar todos" com o traço quando só alguns estão marcados
  const checkboxTodosRef = useRef(null);

  useEffect(() => {
    if (checkboxTodosRef.current) {
      checkboxTodosRef.current.indeterminate = algunsVisiveisSelecionados;
    }
  }, [algunsVisiveisSelecionados, modoSelecao]);

  // Clicar no ícone: só liga/desliga o modo de seleção
  const handleAlternarModoSelecao = () => {
    setModoSelecao((ativo) => !ativo);
    setUsuariosSelecionados([]);
  };

  // Checkbox "Selecionar todos"
  const handleSelecionarTodos = (marcar) => {
    setUsuariosSelecionados((anteriores) =>
      marcar
        ? [...new Set([...anteriores, ...idsVisiveis])]
        : anteriores.filter((id) => !idsVisiveis.includes(id)),
    );
  };
  const handleAlternarSelecaoUsuario = (idUsuario) => {
    setUsuariosSelecionados((anteriores) =>
      anteriores.includes(idUsuario)
        ? anteriores.filter((id) => id !== idUsuario)
        : [...anteriores, idUsuario],
    );
  };

  // ============================================================
  // FILTROS
  // ============================================================

  const handleAlternarFiltro = (coluna, valor) => {
    setFiltrosSelecionados((anterior) => {
      const marcados = anterior[coluna];
      const novos = marcados.includes(valor)
        ? marcados.filter((v) => v !== valor)
        : [...marcados, valor];

      return { ...anterior, [coluna]: novos };
    });
  };

  const valoresUnicos = (coluna) => {
    return [
      ...new Set(usuarios.map((usuario) => valorDaColuna(usuario, coluna))),
    ]
      .filter(Boolean)
      .sort((a, b) => a.localeCompare(b, "pt-BR", { sensitivity: "base" }));
  };

  const temFiltroAtivo = Object.values(filtrosSelecionados).some(
    (marcados) => marcados.length > 0,
  );

  const limparFiltros = () => {
    setFiltrosSelecionados(FILTROS_VAZIOS);
  };

  // ============================================================
  // EXPORTAÇÃO
  // ============================================================

  // Com usuários marcados: exporta só eles. Sem nenhum marcado: exporta todos da lista.
  const exportandoSelecionados = usuariosSelecionados.length > 0;

  const usuariosParaExportar = exportandoSelecionados
    ? usuariosOrdenados.filter((usuario) =>
      usuariosSelecionados.includes(usuario.id_usuario ?? usuario.id_aluno),
    )
    : usuariosOrdenados;

  const linhasExportacao = usuariosParaExportar.map((usuario) => ({
    nome: valorDaColuna(usuario, "nome"),
    email: valorDaColuna(usuario, "email"),
    status: valorDaColuna(usuario, "ativo"),
    perfil: valorDaColuna(usuario, "tipo_usuario"),
  }));

  const gerarNomeArquivo = (sufixo) => {
    const timestamp = new Date()
      .toISOString()
      .slice(0, 19)
      .replace(/[:T]/g, "-");
    return `usuarios-${timestamp}.${sufixo}`;
  };

  const handleAbrirModalExportacao = () => {
    setErroExportacao("");
    setMostrarModalExportacao(true);
  };

  const handleFecharModalExportacao = () => {
    setMostrarModalExportacao(false);
    setErroExportacao("");
  };

  const handleExportarPlanilha = () => {
    try {
      const cabecalho = ["Nome", "Email", "Status", "Perfil"];
      const linhas = linhasExportacao.map((linha) =>
        [
          escaparCsv(linha.nome),
          escaparCsv(linha.email),
          escaparCsv(linha.status),
          escaparCsv(linha.perfil),
        ].join(";"),
      );

      const conteudo = ["\uFEFF", cabecalho.join(";"), ...linhas].join("\n");
      const blob = new Blob([conteudo], {
        type: "text/csv;charset=utf-8;",
      });

      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = gerarNomeArquivo("csv");
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      handleFecharModalExportacao();
    } catch (erro) {
      setErroExportacao(
        erro?.message || "Não foi possível exportar a planilha no momento.",
      );
    }
  };

  const handleExportarPdf = () => {
    // Sem "noopener": com ele o navegador devolve null e o PDF nunca abre
    const janela = window.open("", "_blank");

    if (!janela) {
      setErroExportacao(
        "Não foi possível abrir o PDF. Verifique se o navegador bloqueou pop-ups.",
      );
      return;
    }

    const titulo = exportandoSelecionados
      ? "Usuários selecionados"
      : "Usuários cadastrados";

    // Endereço completo da logo (a janela nova não sabe o endereço do site)
    const urlLogo = new URL(LOGO_PRODUTO, window.location.origin).href;

    const linhasTabela = linhasExportacao
      .map(
        (linha) => `
          <tr>
            <td>${escaparHtml(linha.nome)}</td>
            <td>${escaparHtml(linha.email)}</td>
            <td>${escaparHtml(linha.status)}</td>
            <td>${escaparHtml(linha.perfil)}</td>
          </tr>
        `,
      )
      .join("");

    janela.document.write(`
      <!doctype html>
      <html lang="pt-BR">
        <head>
          <meta charset="UTF-8" />
          <title>${escaparHtml(titulo)}</title>
          <style>
            @page {
              size: A4;
              margin: 14mm 12mm 16mm;

              /* Numeração no rodapé de cada página */
              @bottom-right {
                content: "Página " counter(page) " de " counter(pages);
                font: 10px Arial, sans-serif;
                color: #666;
              }
            }

            body { font-family: Arial, sans-serif; margin: 0; color: #222; }

            table { width: 100%; border-collapse: collapse; font-size: 12px; }

            /* O thead (cabeçalho + títulos das colunas) repete em toda página */
            thead { display: table-header-group; }
            tr { break-inside: avoid; }

            th, td { border: 1px solid #ccc; padding: 6px 8px; text-align: left; }
            thead .colunas th { background: #f5f5f5; }

            .cabecalho-pdf th {
              border: none;
              padding: 0 0 12px;
              background: none;
              font-weight: normal;
            }

            .cabecalho-pdf-conteudo {
              display: flex;
              align-items: center;
              gap: 12px;
              padding-bottom: 10px;
              border-bottom: 2px solid #ed1c26;
            }

            .cabecalho-pdf-conteudo img { height: 40px; width: auto; }

            .cabecalho-pdf-produto { font-size: 16px; font-weight: 700; }

            .cabecalho-pdf-titulo {
              margin: 2px 0 0;
              font-size: 13px;
              font-weight: 400;
              color: #555;
            }
          </style>
        </head>
        <body>
          <table>
            <thead>
              <tr class="cabecalho-pdf">
                <th colspan="4">
                  <div class="cabecalho-pdf-conteudo">
                    <img src="${urlLogo}" alt="" onerror="this.remove()" />
                    <div>
                      <div class="cabecalho-pdf-produto">${escaparHtml(NOME_PRODUTO)}</div>
                      <h1 class="cabecalho-pdf-titulo">${escaparHtml(titulo)}</h1>
                    </div>
                  </div>
                </th>
              </tr>
              <tr class="colunas">
                <th>Nome</th>
                <th>Email</th>
                <th>Status</th>
                <th>Perfil</th>
              </tr>
            </thead>
            <tbody>${linhasTabela}</tbody>
          </table>

          <script>
            // Só imprime depois que a logo carregar
            window.addEventListener("load", function () {
              window.focus();
              window.print();
            });
            window.addEventListener("afterprint", function () {
              window.close();
            });
          </script>
        </body>
      </html>
    `);

    janela.document.close();
    handleFecharModalExportacao();
  };

  // ============================================================
  // CADASTRO / EDIÇÃO
  // ============================================================

  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  const [usuarioEditando, setUsuarioEditando] = useState(null);
  const [novoUsuario, setNovoUsuario] = useState(USUARIO_VAZIO);
  const [enviando, setEnviando] = useState(false);
  const [erroForm, setErroForm] = useState("");

  // [NOVO] botão Cancelar do formulário (para receber o foco ao abrir)
  const cancelarFormularioRef = useRef(null);

  // [NOVO] ao abrir cadastrar/editar, foca o Cancelar sem rolar o modal
  useEffect(() => {
    if (!mostrarFormulario) return undefined;

    const idFrame = requestAnimationFrame(() => {
      cancelarFormularioRef.current?.focus({ preventScroll: true });
    });

    return () => cancelAnimationFrame(idFrame);
  }, [mostrarFormulario]);

  const [fotoAtualUrl, setFotoAtualUrl] = useState("");
  const [fotoNova, setFotoNova] = useState(null);
  const [previaFotoNova, setPreviaFotoNova] = useState("");

  useEffect(() => {
    if (!previaFotoNova) return undefined;
    return () => URL.revokeObjectURL(previaFotoNova);
  }, [previaFotoNova]);

  const limparFotoFormulario = () => {
    setFotoAtualUrl("");
    setFotoNova(null);
    setPreviaFotoNova("");
  };

  const handleEscolherFoto = (arquivo) => {
    setFotoNova(arquivo);
    setPreviaFotoNova(URL.createObjectURL(arquivo));
  };

  const handleAbrirCadastro = () => {
    setUsuarioEditando(null);
    limparFotoFormulario();
    setNovoUsuario({ ...USUARIO_VAZIO, ativo: true });
    setErroForm("");
    setMostrarFormulario(true);
  };

  const handleEditar = (usuario) => {
    setUsuarioEditando(usuario.id_usuario ?? usuario.id_aluno);
    setNovoUsuario({
      nome_completo: usuario.nome_completo || usuario.nome || "",
      email: usuario.email || "",
      senha: "",
      confirmar_senha: "",
      tipo_usuario: usuario.tipo_usuario || "aluno",
      ativo: usuario.ativo ?? true,
    });
    limparFotoFormulario();
    setFotoAtualUrl(usuario.foto_url ? urlDaApi(usuario.foto_url) : "");
    setErroForm("");
    setMostrarFormulario(true);
  };

  const handleCancelarFormulario = () => {
    if (enviando) return;
    setMostrarFormulario(false);
    setUsuarioEditando(null);
    setErroForm("");
    setNovoUsuario({ ...USUARIO_VAZIO });
    limparFotoFormulario();
  };

  const handleChangeCampo = (e) => {
    const { name, value } = e.target;
    setNovoUsuario((prev) => ({ ...prev, [name]: value }));
    if (erroForm) setErroForm("");
  };

  const handleSelecionarStatus = (valorAtivo) => {
    setNovoUsuario((prev) => ({ ...prev, ativo: valorAtivo }));
  };


  const handleSubmitFormulario = async (e) => {
    e.preventDefault();
    setErroForm("");

    if (
      !novoUsuario.nome_completo.trim() ||
      !novoUsuario.email.trim() ||
      !novoUsuario.tipo_usuario
    ) {
      setErroForm("Preencha nome, email e perfil.");
      return;
    }

    if (!usuarioEditando && !novoUsuario.senha) {
      setErroForm("A senha é obrigatória para novos usuários.");
      return;
    }

    if (novoUsuario.senha) {
      const senhaValida =
        novoUsuario.senha.length >= 8 &&
        /[A-Z]/.test(novoUsuario.senha) &&
        /[a-z]/.test(novoUsuario.senha) &&
        /[^A-Za-z0-9\s]/.test(novoUsuario.senha);

      if (!senhaValida) {
        setErroForm("A senha não atende a todos os requisitos.");
        return;
      }
    }

    if (
      novoUsuario.senha &&
      novoUsuario.senha !== novoUsuario.confirmar_senha
    ) {
      setErroForm("As senhas não coincidem.");
      return;
    }

    setEnviando(true);

    try {
      // Sem conexão: guardar apenas os dados não sensíveis.
      if (!navigator.onLine) {
        if (usuarioEditando) {
          throw new Error(
            "A edição offline ainda não está disponível."
          );
        }

        await salvarCadastroPendente({
          nome_completo: novoUsuario.nome_completo,
          email: novoUsuario.email,
          tipo_usuario: novoUsuario.tipo_usuario,
          ativo: novoUsuario.ativo,
        });

        handleCancelarFormulario();
        setModalCadastroOffline(true);

        return;
      }

      const caminho = usuarioEditando
        ? `/usuarios/${usuarioEditando}`
        : "/cadastro";

      const metodo = usuarioEditando ? "PUT" : "POST";

      const corpo = {
        ...novoUsuario,
        nome_completo: novoUsuario.nome_completo.trim(),
        email: novoUsuario.email.trim(),
      };

      delete corpo.confirmar_senha;

      if (usuarioEditando && !corpo.senha) {
        delete corpo.senha;
      }

      const resposta = await requisicaoApi(caminho, {
        method: metodo,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(corpo),
      });

      const idUsuario = usuarioEditando || resposta?.id_usuario;
      let erroFoto = "";

      if (fotoNova && idUsuario) {
        try {
          const formData = new FormData();
          formData.append("foto", fotoNova);

          await requisicaoApi(`/usuarios/${idUsuario}/foto`, {
            method: "POST",
            headers: {
              Authorization: `Bearer ${obterToken()}`,
            },
            body: formData,
          });
        } catch (erro) {
          erroFoto = erro?.message || "erro desconhecido";
        }
      }

      handleCancelarFormulario();
      await buscarUsuarios();

      if (erroFoto) {
        setErroLista(
          `Usuário salvo, mas a foto não foi enviada: ${erroFoto}`
        );
      }
    } catch (erro) {
      setErroForm(
        erro?.message || "Não foi possível salvar o usuário."
      );
    } finally {
      setEnviando(false);
    }
  };

  // ============================================================
  // EXCLUSÃO
  // ============================================================

  const [mostrarModalExclusao, setMostrarModalExclusao] = useState(false);
  const [usuarioParaExcluir, setUsuarioParaExcluir] = useState(null);
  const [excluindo, setExcluindo] = useState(false);
  const [erroExclusao, setErroExclusao] = useState("");

  const handleExcluir = (idUsuario) => {
    setUsuarioParaExcluir([idUsuario]);
    setErroExclusao("");
    setMostrarModalExclusao(true);
  };

  const handleExcluirSelecionados = () => {
    if (usuariosSelecionados.length === 0) return;
    setUsuarioParaExcluir(usuariosSelecionados);
    setErroExclusao("");
    setMostrarModalExclusao(true);
  };

  const handleCancelarExclusao = () => {
    if (excluindo) return;
    setMostrarModalExclusao(false);
    setUsuarioParaExcluir(null);
    setErroExclusao("");
  };

  const confirmarExclusao = async () => {
    if (!usuarioParaExcluir || usuarioParaExcluir.length === 0) return;

    setExcluindo(true);
    setErroExclusao("");

    try {
      await Promise.all(
        usuarioParaExcluir.map((id) =>
          requisicaoApi("/deletarusuario", {
            method: "DELETE",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id_usuario: id }),
          }),
        ),
      );

      setMostrarModalExclusao(false);
      setUsuariosSelecionados((prev) =>
        prev.filter((id) => !usuarioParaExcluir.includes(id)),
      );
      setUsuarioParaExcluir(null);

      if (usuariosSelecionados.length <= usuarioParaExcluir.length) {
        setModoSelecao(false);
      }

      await buscarUsuarios();
    } catch (erro) {
      setErroExclusao(
        erro?.message || "Não foi possível excluir o(s) usuário(s).",
      );
    } finally {
      setExcluindo(false);
    }
  };

  // [NOVO] Esc fecha o modal que estiver aberto (o de cima primeiro)
  useEffect(() => {
    if (!mostrarModalExclusao && !mostrarFormulario && !mostrarModalExportacao) {
      return undefined;
    }

    const handleTecla = (event) => {
      if (event.key !== "Escape") return;

      if (mostrarModalExclusao) {
        handleCancelarExclusao();
      } else if (mostrarFormulario) {
        handleCancelarFormulario();
      } else if (mostrarModalExportacao) {
        handleFecharModalExportacao();
      }
    };

    window.addEventListener("keydown", handleTecla);
    return () => window.removeEventListener("keydown", handleTecla);
  }, [
    mostrarModalExclusao,
    mostrarFormulario,
    mostrarModalExportacao,
    excluindo,
    enviando,
  ]);


  useEffect(() => {
    const handleCadastrosSincronizados = () => {
      if (listagemVisivel) {
        buscarUsuarios(false);
      }
    };

    window.addEventListener(
      "cadastros-pendentes-sincronizados",
      handleCadastrosSincronizados
    );

    return () => {
      window.removeEventListener(
        "cadastros-pendentes-sincronizados",
        handleCadastrosSincronizados
      );
    };
  }, [listagemVisivel]);


  const totalSelecionados = usuariosSelecionados.length;
  const temUsuariosSelecionados = totalSelecionados > 0;

  return (
    <div
      className={`cadastro-usuarios ${!isSidebarNarrow ? "sidebar-expanded" : ""
        }`}
    >
      <Sidebar isNarrow={isSidebarNarrow} onRequestClose={handleCloseSidebar} />

      <Navbar
        profile={tipoUsuario === "root" ? "root" : "admin"}
        onToggleSidebar={handleToggleSidebar}
        mostrarBusca={false}
      />

      <main className="cadastro-usuarios-content">
        <CadastrosPendentes />
        {modalCadastroOffline && (
          <div className="modal-offline-overlay">
            <div
              className="modal-offline"
              role="dialog"
              aria-modal="true"
              aria-labelledby="titulo-modal-offline"
            >
              <button
                type="button"
                className="modal-offline-fechar"
                onClick={() => setModalCadastroOffline(false)}
                aria-label="Fechar mensagem"
              >
                ×
              </button>

              <div className="modal-offline-icone">✓</div>

              <h2 id="titulo-modal-offline">
                Cadastro guardado!
              </h2>

              <p>
                O cadastro foi salvo neste dispositivo. Quando a internet voltar,
                será necessário informar a senha para concluir o envio.
              </p>

              <button
                type="button"
                className="modal-offline-botao"
                onClick={() => setModalCadastroOffline(false)}
              >
                Entendi
              </button>
            </div>
          </div>
        )}

        <section className="painel-listagem" ref={listagemRef}>
          <div className="listagem-cabecalho">
            <h1>Usuários cadastrados</h1>

            <div className="acoes-cabecalho-listagem">
              <span className="contador-registros">
                {usuariosOrdenados.length} registro(s)
              </span>

              <div className="busca-listagem">
                <CIcon icon={cilSearch} />
                <input
                  type="search"
                  placeholder="Buscar por nome, email, status ou perfil"
                  value={nomeFiltro}
                  onChange={(e) => setNomeFiltro(e.target.value)}
                  aria-label="Buscar usuários"
                />
              </div>

              <button
                type="button"
                className={`botao-ativar-selecao ${modoSelecao ? "selecao-ativa" : ""
                  }`}
                onClick={handleAlternarModoSelecao}
                title={
                  modoSelecao ? "Cancelar seleção" : "Selecionar para excluir"
                }
                aria-pressed={modoSelecao}
              >
                {modoSelecao ? (
                  <RiCloseLine className="icone-botao-selecao" size={22} />
                ) : (
                  <RiCheckboxMultipleLine
                    className="icone-botao-selecao"
                    size={22}
                  />
                )}
              </button>

              {modoSelecao && (
                <label className="opcao-selecionar-todos">
                  <input
                    type="checkbox"
                    ref={checkboxTodosRef}
                    checked={todosVisiveisSelecionados}
                    onChange={(e) => handleSelecionarTodos(e.target.checked)}
                    disabled={idsVisiveis.length === 0}
                  />
                  Selecionar todos
                </label>
              )}

              <button
                type="button"
                className="botao-exportar"
                onClick={handleAbrirModalExportacao}
                disabled={usuariosOrdenados.length === 0}
                title={
                  temUsuariosSelecionados
                    ? "Exportar usuários selecionados"
                    : "Exportar usuários da lista"
                }
              >
                <RiDownload2Line />
                {temUsuariosSelecionados
                  ? `Exportar (${totalSelecionados})`
                  : "Exportar"}
              </button>

              {temUsuariosSelecionados && (
                <button
                  type="button"
                  className="botao-excluir-massa"
                  onClick={handleExcluirSelecionados}
                  title="Excluir usuários selecionados"
                >
                  <CIcon icon={cilTrash} />
                  Excluir ({totalSelecionados})
                </button>
              )}

              <div className="coluna-filtro-controles">
                <button
                  type="button"
                  className={`botao-filtro ${temFiltroAtivo ? "ativo" : ""}`}
                  onClick={() => setMostrarModalFiltro(true)}
                  title="Filtrar usuários"
                  aria-label="Filtrar usuários"
                >
                  <CIcon icon={cilFilter} />
                </button>

                <FiltroColuna
                  colunas={colunasTabela}
                  onChange={handleMudarColunas}
                  padrao={criarFiltroColuna(COLUNAS_TABELA)}
                  titulo="Colunas da lista de usuários"
                  descricao="Arraste ou use as setas para mudar a ordem"
                  rotuloBotao="Configurar colunas visíveis"
                />
              </div>

              <button
                type="button"
                className="botao-principal botao-cadastrar-listagem"
                onClick={handleAbrirCadastro}
              >
                <CIcon icon={cilPlus} />
              </button>
            </div>
          </div>

          {/* FILTROS ATIVOS */}
          {temFiltroAtivo && (
            <div className="filtros-ativos" aria-label="Filtros ativos">
              <span className="filtros-ativos-titulo">Filtrando por:</span>

              {/* Só esta parte rola para o lado */}
              <div className="filtros-ativos-lista">
                {CATEGORIAS.flatMap(({ coluna, rotulo }) =>
                  (filtrosSelecionados[coluna] || []).map((valor) => (
                    <span className="chip-filtro" key={`${coluna}-${valor}`}>
                      {rotulo}: <strong>{valor}</strong>
                      <button
                        type="button"
                        onClick={() => handleAlternarFiltro(coluna, valor)}
                        aria-label={`Remover filtro ${rotulo}: ${valor}`}
                      >
                        <CIcon icon={cilX} />
                      </button>
                    </span>
                  )),
                )}
              </div>

              <button
                type="button"
                className="limpar-filtros"
                onClick={limparFiltros}
              >
                Limpar tudo
              </button>
            </div>
          )}

          {erroLista && <p className="mensagem-erro">{erroLista}</p>}

          {listagemVisivel ? (
            <Suspense
              fallback={
                <p className="mensagem-carregando">Carregando usuários...</p>
              }
            >
              <ListaUsuarios
                carregando={carregandoLista}
                usuariosFiltrados={usuariosOrdenados}
                colunas={colunasVisiveis(colunasTabela)}
                colunaOrdenada={colunaOrdenada}
                direcaoOrdenacao={direcaoOrdenacao}
                handleOrdenar={handleOrdenar}
                filtrosSelecionados={filtrosSelecionados}
                nomeFiltro={nomeFiltro}
                handleEditar={handleEditar}
                handleExcluir={handleExcluir}
                modoSelecao={modoSelecao}
                usuariosSelecionados={usuariosSelecionados}
                onAlternarSelecaoUsuario={handleAlternarSelecaoUsuario}
              />
            </Suspense>
          ) : (
            <p className="mensagem-carregando">Carregando usuários...</p>
          )}
        </section>
      </main>

      {/* MODAL DE FILTRO */}
      {mostrarModalFiltro && (
        <ModalFiltroUsuarios
          obterValores={valoresUnicos}
          filtrosSelecionados={filtrosSelecionados}
          onAlternar={handleAlternarFiltro}
          onFechar={() => setMostrarModalFiltro(false)}
        />
      )}

      {mostrarModalExportacao && (
        <div
          className="modal-exportacao-overlay"
          onClick={handleFecharModalExportacao}
        >
          <div
            className="modal-exportacao"
            onClick={(evento) => evento.stopPropagation()}
          >
            <div className="modal-exportacao-cabecalho">
              <h2>Exportar usuários</h2>

              <button
                type="button"
                className="modal-exportacao-fechar"
                onClick={handleFecharModalExportacao}
                aria-label="Fechar modal de exportação"
                autoFocus
              >
                <CIcon icon={cilX} />
              </button>
            </div>

            <p className="modal-exportacao-texto">
              Escolha o formato para exportar{" "}
              <strong>
                {usuariosParaExportar.length}{" "}
                {exportandoSelecionados
                  ? "usuário(s) selecionado(s)"
                  : "usuário(s) da lista"}
              </strong>
              .
            </p>

            {erroExportacao && (
              <p className="modal-exportacao-erro">{erroExportacao}</p>
            )}

            <div className="modal-exportacao-opcoes">
              <button
                type="button"
                className="modal-exportacao-opcao"
                onClick={handleExportarPlanilha}
              >
                <RiFileExcel2Line />
                Planilha
              </button>

              <button
                type="button"
                className="modal-exportacao-opcao"
                onClick={handleExportarPdf}
              >
                <RiFilePdf2Line />
                PDF
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE CADASTRO / EDIÇÃO */}
      {mostrarFormulario && (
        <div
          className="modal-formulario-overlay"
          onClick={handleCancelarFormulario}
        >
          <div
            className="modal-formulario"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-formulario-cabecalho">
              <h2>
                {usuarioEditando ? "Editar Usuário" : "Cadastrar Usuário"}
              </h2>

              <button
                type="button"
                className="modal-formulario-fechar"
                onClick={handleCancelarFormulario}
                disabled={enviando}
                aria-label="Fechar modal"
              >
                <CIcon icon={cilX} />
              </button>
            </div>

            <form
              className="formulario-usuario"
              onSubmit={handleSubmitFormulario}
              autoComplete="off"
            >
              <div className="campo-foto-formulario">
                <label>Foto</label>

                <CampoFoto
                  fotoUrl={previaFotoNova || fotoAtualUrl}
                  nome={novoUsuario.nome_completo}
                  onConfirmar={handleEscolherFoto}
                  textoBotao={
                    previaFotoNova || fotoAtualUrl
                      ? "Alterar foto"
                      : "Adicionar foto"
                  }
                  mensagemSucesso="A foto será salva junto com o usuário."
                />
              </div>

              <div className="campo-formulario">
                <label htmlFor="nome">Nome</label>
                <input
                  id="nome"
                  type="text"
                  placeholder="Nome do usuário"
                  value={novoUsuario.nome_completo}
                  onChange={handleChangeCampo}
                  name="nome_completo"
                  autoComplete="off"
                />
              </div>

              <div className="campo-formulario">
                <label htmlFor="email">Email</label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="Email do usuário"
                  value={novoUsuario.email}
                  onChange={handleChangeCampo}
                  autoComplete="off"
                />
              </div>

              <div className="campo-formulario campo-senha-formulario">
                <label htmlFor="senha">Senha</label>
                <CampoSenha
                  id="senha"
                  name="senha"
                  placeholder={
                    usuarioEditando
                      ? "Deixe em branco para manter a senha atual"
                      : "Senha do usuário"
                  }
                  value={novoUsuario.senha}
                  onChange={handleChangeCampo}
                  autoComplete="new-password"
                  mostrarRequisitos
                />
              </div>

              <div className="campo-formulario">
                <label htmlFor="confirmar_senha">Confirmar senha</label>
                <CampoSenha
                  id="confirmar_senha"
                  name="confirmar_senha"
                  placeholder="Digite a senha novamente"
                  value={novoUsuario.confirmar_senha}
                  onChange={handleChangeCampo}
                  autoComplete="new-password"
                  mostrarRequisitos
                />

                {novoUsuario.confirmar_senha && (
                  <ul className="password-requirements" aria-live="polite">
                    {novoUsuario.confirmar_senha === novoUsuario.senha ? (
                      <li className="is-valid">
                        <span aria-hidden="true">✓</span>
                        As senhas coincidem
                      </li>
                    ) : (
                      <li className="is-invalid">
                        <span aria-hidden="true">✕</span>
                        As senhas não coincidem
                      </li>
                    )}
                  </ul>
                )}
              </div>

              <div className="campo-formulario">
                <label htmlFor="tipo_usuario">Perfil</label>
                <select
                  id="tipo_usuario"
                  name="tipo_usuario"
                  value={novoUsuario.tipo_usuario}
                  onChange={handleChangeCampo}
                >
                  <option value="" disabled>
                    Escolha um perfil
                  </option>
                  <option value="aluno">Aluno</option>
                  <option value="admin">Admin</option>
                  <option value="root">Root</option>
                </select>
              </div>

              {usuarioEditando && (
                <div className="campo-status">
                  <label>Status</label>
                  <div className="grupo-status">
                    <button
                      type="button"
                      className={`botao-status botao-status-ativo ${novoUsuario.ativo ? "selecionado" : ""
                        }`}
                      onClick={() => handleSelecionarStatus(true)}
                    >
                      <span className="bolinha-status" />
                      Ativo
                    </button>

                    <button
                      type="button"
                      className={`botao-status botao-status-inativo ${!novoUsuario.ativo ? "selecionado" : ""
                        }`}
                      onClick={() => handleSelecionarStatus(false)}
                    >
                      <span className="bolinha-status" />
                      Inativo
                    </button>
                  </div>
                </div>
              )}

              {erroForm && <p className="mensagem-erro">{erroForm}</p>}

              {/* Cancelar à esquerda, Salvar à direita */}
              <div className="acoes-formulario">
                <button
                  ref={cancelarFormularioRef}
                  type="button"
                  className="botao-cancelar"
                  onClick={handleCancelarFormulario}
                  disabled={enviando}
                >
                  Cancelar
                </button>

                <button
                  type="submit"
                  className="botao-principal"
                  disabled={enviando}
                >
                  <CIcon icon={cilPlus} />
                  {enviando
                    ? "Salvando..."
                    : usuarioEditando
                      ? "Salvar"
                      : "Salvar"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL DE EXCLUSÃO */}
      {mostrarModalExclusao && (
        <div className="modal-overlay" onClick={handleCancelarExclusao}>
          <div className="modal-exclusao" onClick={(e) => e.stopPropagation()}>
            <div className="modal-exclusao-conteudo">
              <div className="modal-exclusao-icone">
                <CIcon icon={cilTrash} />
              </div>

              <h2>
                {usuarioParaExcluir?.length > 1
                  ? `Excluir ${usuarioParaExcluir.length} usuários`
                  : "Excluir usuário"}
              </h2>

              <p>
                {usuarioParaExcluir?.length > 1
                  ? `Tem certeza que deseja excluir os ${usuarioParaExcluir.length} usuários selecionados?`
                  : "Tem certeza que deseja excluir este usuário?"}
              </p>

              <span className="modal-exclusao-aviso">
                Essa ação não poderá ser desfeita.
              </span>

              {erroExclusao && (
                <p className="modal-exclusao-erro">{erroExclusao}</p>
              )}

              <div className="modal-exclusao-acoes">
                <button
                  type="button"
                  className="modal-botao-cancelar"
                  onClick={handleCancelarExclusao}
                  disabled={excluindo}
                  autoFocus
                >
                  Cancelar
                </button>

                <button
                  type="button"
                  className="modal-botao-excluir"
                  onClick={confirmarExclusao}
                  disabled={excluindo}
                >
                  {excluindo ? "Excluindo..." : "Sim, excluir"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default CadastroUsuarios;