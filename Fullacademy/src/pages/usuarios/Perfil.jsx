import { useEffect, useRef, useState } from "react";
import Navbar from "../../componentes/templates/navbar";
import Sidebar from "../../componentes/templates/sidebar";
import CampoSenha from "../../componentes/CampoSenha";
import CIcon from "@coreui/icons-react";
import { cilCamera, cilCheckAlt, cilFolderOpen, cilX } from "@coreui/icons";

import "./Perfil.css";
import { requisicaoApi, urlDaApi } from "../../services/api";

const PERFIS = {
  aluno: {
    titulo: "Perfil do Aluno",
    descricao:
      "Gerencie suas informações pessoais e configurações de segurança.",
  },
  admin: {
    titulo: "Perfil do Admin",
    descricao:
      "Gerencie suas informações pessoais e configurações de segurança.",
  },
  root: {
    titulo: "Perfil do Root",
    descricao:
      "Gerencie suas informações pessoais e configurações de segurança.",
  },
};

const DADOS_INICIAIS = {
  nome: "",
  email: "",
  cargo: "",
  tipo_usuario: "",
  criado_em: "",
  status: "",
  foto_url: "",
};

const SENHA_VAZIA = {
  atual: "",
  nova: "",
  confirmacao: "",
};

const TIPOS_FOTO = ["image/jpeg", "image/png", "image/webp"];
const TAMANHO_MAXIMO_FOTO = 5 * 1024 * 1024;
const CHAVE_CACHE_PERFIL = "perfil_cache";
// Tempo com o mouse parado na foto até abrir a tela cheia (ms)
const ATRASO_TELA_CHEIA = 300;

function validarArquivoFoto(arquivo) {
  if (!TIPOS_FOTO.includes(arquivo.type)) {
    return "Escolha uma imagem JPG, PNG ou WEBP.";
  }

  if (arquivo.size > TAMANHO_MAXIMO_FOTO) {
    return "A imagem deve ter no máximo 5 MB.";
  }

  return "";
}

function mensagemErroCamera(erro) {
  if (erro.name === "NotAllowedError") {
    return "Permissão da câmera negada. Libere o acesso nas configurações do navegador.";
  }

  if (erro.name === "NotFoundError") {
    return "Nenhuma câmera foi encontrada neste dispositivo.";
  }

  if (erro.name === "NotReadableError") {
    return "A câmera está sendo usada por outro programa.";
  }

  return "Não foi possível abrir a câmera.";
}

function obterToken() {
  return localStorage.getItem("token") || sessionStorage.getItem("token");
}

function obterStorageComToken() {
  if (localStorage.getItem("token")) return localStorage;
  if (sessionStorage.getItem("token")) return sessionStorage;
  return null;
}

function lerJsonStorage(storage, chave) {
  if (!storage) return null;

  try {
    const valor = storage.getItem(chave);
    return valor ? JSON.parse(valor) : null;
  } catch {
    return null;
  }
}

function normalizarPerfil(origem = {}) {
  return {
    nome: origem.nome || origem.nome_completo || "",
    email: origem.email || "",
    cargo: origem.cargo || "",
    tipo_usuario: origem.tipo_usuario || "",
    criado_em: origem.criado_em || "",
    status: origem.status || "",
    foto_url: origem.foto_url || "",
  };
}

function obterPerfilInicial() {
  const storage = obterStorageComToken();
  const usuarioSalvo = normalizarPerfil(
    lerJsonStorage(storage, "usuario") || {},
  );
  const cachePerfil = normalizarPerfil(
    lerJsonStorage(storage, CHAVE_CACHE_PERFIL) || {},
  );

  return {
    ...DADOS_INICIAIS,
    ...usuarioSalvo,
    ...cachePerfil,
  };
}

function salvarPerfilNoCache(perfil) {
  const storage = obterStorageComToken();
  if (!storage) return;

  storage.setItem(CHAVE_CACHE_PERFIL, JSON.stringify(perfil));
}

function possuiDadosPerfil(perfil) {
  return Boolean(perfil?.nome || perfil?.email || perfil?.foto_url);
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

function Perfil() {
  const [isSidebarNarrow, setIsSidebarNarrow] = useState(true);

  const tipoUsuario = String(
    localStorage.getItem("tipo_usuario") ||
      sessionStorage.getItem("tipo_usuario") ||
      "",
  )
    .trim()
    .toLowerCase();

  const perfilConfig = PERFIS[tipoUsuario] || PERFIS.aluno;

  const [perfil, setPerfil] = useState(() => obterPerfilInicial());
  const [senha, setSenha] = useState(SENHA_VAZIA);

  const [carregando, setCarregando] = useState(
    () => !possuiDadosPerfil(obterPerfilInicial()),
  );
  const [salvando, setSalvando] = useState(false);

  const [mensagem, setMensagem] = useState("");
  const [erro, setErro] = useState("");

  const [modoFoto, setModoFoto] = useState("");
  const [arquivoFoto, setArquivoFoto] = useState(null);
  const [erroFoto, setErroFoto] = useState("");
  const [previaFoto, setPreviaFoto] = useState("");
  const [origemFoto, setOrigemFoto] = useState("");

  const [cameraPronta, setCameraPronta] = useState(false);
  const [enviandoFoto, setEnviandoFoto] = useState(false);
  const [mensagemFoto, setMensagemFoto] = useState("");

  const [fotoTelaCheia, setFotoTelaCheia] = useState(false);
    // true = foi clicada e não fecha ao tirar o mouse
  const [fotoFixada, setFotoFixada] = useState(false);
  // Espera do mouse antes de abrir a tela cheia
  const timerTelaCheiaRef = useRef(null);

  const inputFotoRef = useRef(null);
  const videoRef = useRef(null);
  const perfilRef = useRef(perfil);

  useEffect(() => {
    perfilRef.current = perfil;
  }, [perfil]);

  const handleToggleSidebar = () => {
    setIsSidebarNarrow((prev) => !prev);
  };

  const handleCloseSidebar = () => {
    setIsSidebarNarrow(true);
  };

  useEffect(() => {
    const carregarPerfil = async (primeiraCarga = false) => {
      try {
        const token = obterToken();

        if (!token) {
          setErro("Usuário não autenticado.");
          return;
        }

        const dados = await requisicaoApi("/perfil", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (dados?.usuario) {
          setPerfil((anterior) => {
            const atualizado = {
              ...anterior,
              ...dados.usuario,
            };

            salvarPerfilNoCache(atualizado);
            return atualizado;
          });
        }

        setErro("");
      } catch (error) {
        console.error("Erro ao carregar/atualizar perfil:", error);

        const mensagemErro =
          error?.message || "Não foi possível carregar o perfil.";
        const ehErroDeToken =
          /token.*inv[aá]lid|jwt|n[aã]o autorizado|unauthorized/i.test(
            mensagemErro,
          );

        if (!ehErroDeToken || !possuiDadosPerfil(perfilRef.current)) {
          setErro(mensagemErro);
        }
      } finally {
        if (primeiraCarga) {
          setCarregando(false);
        }
      }
    };

    carregarPerfil(true);

    const intervalo = setInterval(
      () => {
        carregarPerfil(false);
      },
      5 * 60 * 1000,
    );

    return () => clearInterval(intervalo);
  }, []);

  useEffect(() => {
    if (!previaFoto) return undefined;

    return () => URL.revokeObjectURL(previaFoto);
  }, [previaFoto]);

  useEffect(() => {
    if (modoFoto !== "camera") return undefined;

    let ativo = true;
    let stream = null;

    navigator.mediaDevices
      .getUserMedia({
        video: {
          facingMode: "user",
        },
        audio: false,
      })
      .then((novoStream) => {
        if (!ativo) {
          novoStream.getTracks().forEach((trilha) => trilha.stop());
          return;
        }

        stream = novoStream;

        if (videoRef.current) {
          videoRef.current.srcObject = novoStream;
        }
      })
      .catch((erroCamera) => {
        if (!ativo) return;

        setErroFoto(mensagemErroCamera(erroCamera));
        setModoFoto("opcoes");
      });

    return () => {
      ativo = false;

      stream?.getTracks().forEach((trilha) => trilha.stop());
    };
  }, [modoFoto]);

  useEffect(() => {
    if (!fotoTelaCheia && modoFoto === "" && !enviandoFoto) {
      return undefined;
    }

    const handleTecla = (event) => {
      // Foto em tela cheia: Enter ou Esc fecham
      if (fotoTelaCheia) {
        if (event.key === "Escape" || event.key === "Enter") {
          event.preventDefault();
          setFotoTelaCheia(false);
        }
        return;
      }

      if (event.key !== "Escape") return;

      if (!enviandoFoto && modoFoto !== "") {
        handleFecharFoto();
      }
    };

    window.addEventListener("keydown", handleTecla);

    return () => {
      window.removeEventListener("keydown", handleTecla);
    };
  }, [fotoTelaCheia, modoFoto, enviandoFoto]);

  // Se a página sair durante a espera, cancela o cronômetro
  useEffect(() => {
    return () => clearTimeout(timerTelaCheiaRef.current);
  }, []);

  const cancelarEsperaTelaCheia = () => {
    clearTimeout(timerTelaCheiaRef.current);
    timerTelaCheiaRef.current = null;
  };

  // Mouse parou na foto: depois de um instante, abre a tela cheia (não fixada)
  const handleMouseEntrouAvatar = () => {
    if (!fotoExibida) return;
    // Só em dispositivos com mouse
    if (!window.matchMedia("(hover: hover)").matches) return;

    cancelarEsperaTelaCheia();
    timerTelaCheiaRef.current = setTimeout(() => {
      setFotoFixada(false);
      setFotoTelaCheia(true);
    }, ATRASO_TELA_CHEIA);
  };

  // Clique na foto pequena (ou toque/Enter): abre já fixada
  const handleClicarAvatar = () => {
    if (!fotoExibida) return;
    cancelarEsperaTelaCheia();
    setFotoFixada(true);
    setFotoTelaCheia(true);
  };

  // Clique na foto grande: fixa
  const handleFixarFotoTelaCheia = (event) => {
    event.stopPropagation(); // não deixa o clique chegar ao fundo (que fecha)
    setFotoFixada(true);
  };

  // Mouse saiu da foto grande: fecha, menos se estiver fixada
  const handleMouseSaiuFotoTelaCheia = () => {
    if (!fotoFixada) setFotoTelaCheia(false);
  };

  const handleFecharFotoTelaCheia = () => {
    setFotoTelaCheia(false);
  };

  const handleChangeSenha = (event) => {
    const { name, value } = event.target;

    setSenha((anterior) => ({
      ...anterior,
      [name]: value,
    }));

    setMensagem("");
    setErro("");
  };

  const handleCancelar = () => {
    setSenha(SENHA_VAZIA);
    setMensagem("");
    setErro("");
  };

  const handleAbrirOpcoesFoto = () => {
    setErroFoto("");
    setMensagemFoto("");
    setModoFoto("opcoes");
  };

  const handleFecharFoto = () => {
    setArquivoFoto(null);
    setPreviaFoto("");
    setErroFoto("");
    setModoFoto("");
  };

  const handleConfirmarFoto = async () => {
    if (!arquivoFoto) return;

    const token = obterToken();

    if (!token) {
      setErroFoto("Usuário não autenticado.");
      return;
    }

    const formData = new FormData();
    formData.append("foto", arquivoFoto);

    setEnviandoFoto(true);
    setErroFoto("");

    try {
      const dados = await requisicaoApi("/perfil/foto", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      setPerfil((anterior) => {
        const atualizado = {
          ...anterior,
          foto_url: dados.foto_url,
        };

        salvarPerfilNoCache(atualizado);
        return atualizado;
      });

      window.dispatchEvent(
        new CustomEvent("foto-perfil-atualizada", {
          detail: dados.foto_url,
        }),
      );

      handleFecharFoto();
      setMensagemFoto("Foto atualizada.");
    } catch (error) {
      setErroFoto(error.message);
    } finally {
      setEnviandoFoto(false);
    }
  };

  const handleEscolherArquivo = () => {
    inputFotoRef.current?.click();
  };

  const usarArquivoFoto = (arquivo, origem) => {
    const mensagemErro = validarArquivoFoto(arquivo);

    if (mensagemErro) {
      setErroFoto(mensagemErro);
      return;
    }

    setErroFoto("");
    setArquivoFoto(arquivo);
    setPreviaFoto(URL.createObjectURL(arquivo));
    setOrigemFoto(origem);
    setModoFoto("previa");
  };

  const handleArquivoSelecionado = (event) => {
    const arquivo = event.target.files?.[0];
    event.target.value = "";

    if (!arquivo) return;

    usarArquivoFoto(arquivo, "arquivo");
  };

  const handleAbrirCamera = () => {
    if (!navigator.mediaDevices?.getUserMedia) {
      setErroFoto("Este navegador não permite usar a câmera.");
      return;
    }

    setErroFoto("");
    setCameraPronta(false);
    setModoFoto("camera");
  };

  const handleTirarFoto = () => {
    const video = videoRef.current;

    if (!video || !video.videoWidth || !video.videoHeight) {
      setErroFoto("A câmera ainda não está pronta. Tente novamente.");
      return;
    }

    const lado = Math.min(video.videoWidth, video.videoHeight);
    const canvas = document.createElement("canvas");

    canvas.width = lado;
    canvas.height = lado;

    const contexto = canvas.getContext("2d");
    if (!contexto) {
      setErroFoto("Não foi possível preparar a captura da câmera.");
      return;
    }

    const origemX = (video.videoWidth - lado) / 2;
    const origemY = (video.videoHeight - lado) / 2;

    contexto.translate(lado, 0);
    contexto.scale(-1, 1);

    contexto.drawImage(video, origemX, origemY, lado, lado, 0, 0, lado, lado);

    canvas.toBlob(
      (blob) => {
        if (!blob) {
          setErroFoto("Não foi possível capturar a foto. Tente novamente.");
          return;
        }

        usarArquivoFoto(
          new File([blob], "foto-camera.jpg", {
            type: "image/jpeg",
          }),
          "camera",
        );
      },
      "image/jpeg",
      0.9,
    );
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    setMensagem("");
    setErro("");

    if (!senha.atual || !senha.nova || !senha.confirmacao) {
      setErro("Preencha os três campos para alterar a senha.");
      return;
    }

    if (senha.nova !== senha.confirmacao) {
      setErro("A confirmação da nova senha não confere.");
      return;
    }

    const token = obterToken();

    if (!token) {
      setErro("Usuário não autenticado.");
      return;
    }

    setSalvando(true);

    try {
      await requisicaoApi("/perfil", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          senha_atual: senha.atual,
          nova_senha: senha.nova,
        }),
      });

      setSenha(SENHA_VAZIA);
      setMensagem("Senha alterada com sucesso.");
    } catch (error) {
      setErro(error.message);
    } finally {
      setSalvando(false);
    }
  };

  const statusAtivo = perfil.status === "Ativo";

  const fotoExibida =
    previaFoto || (perfil.foto_url ? urlDaApi(perfil.foto_url) : "");

  return (
    <div className={`perfil ${!isSidebarNarrow ? "sidebar-expanded" : ""}`}>
      <Sidebar isNarrow={isSidebarNarrow} onRequestClose={handleCloseSidebar} />

      <Navbar
        profile={tipoUsuario}
        onToggleSidebar={handleToggleSidebar}
        mostrarBusca={false}
      />

      <main className="perfil-content">
        <header className="perfil-cabecalho">
          <h1>{perfilConfig.titulo}</h1>
          <p>{perfilConfig.descricao}</p>
        </header>

        {carregando ? (
          <p className="perfil-feedback">Carregando seus dados...</p>
        ) : (
          <form className="perfil-formulario" onSubmit={handleSubmit}>
            <section className="perfil-card perfil-info">
              <div
                className={`perfil-foto-area-campo ${
                  modoFoto === "camera" ? "camera" : ""
                }`}
              >
                {modoFoto !== "camera" && (
                  <button
                    type="button"
                    className={`perfil-avatar ${previaFoto ? "previa" : ""} ${
                      fotoExibida ? "perfil-avatar-clicavel" : ""
                    }`}
                    onClick={fotoExibida ? handleClicarAvatar : undefined}
                    onMouseEnter={handleMouseEntrouAvatar}
                    onMouseLeave={cancelarEsperaTelaCheia}
                    disabled={!fotoExibida}
                    aria-label={
                      fotoExibida
                        ? "Visualizar foto em tela cheia"
                        : "Foto do perfil"
                    }
                  >
                    {fotoExibida ? (
                      <img
                        src={fotoExibida}
                        alt={
                          previaFoto
                            ? "Prévia da nova foto"
                            : `Foto de ${perfil.nome || "perfil"}`
                        }
                        onError={
                          previaFoto
                            ? undefined
                            : () =>
                                setPerfil((anterior) => {
                                  const atualizado = {
                                    ...anterior,
                                    foto_url: "",
                                  };

                                  salvarPerfilNoCache(atualizado);
                                  return atualizado;
                                })
                        }
                      />
                    ) : (
                      <span aria-hidden="true">
                        {obterIniciais(perfil.nome)}
                      </span>
                    )}
                  </button>
                )}

                <input
                  ref={inputFotoRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={handleArquivoSelecionado}
                  hidden
                />

                {modoFoto === "" && (
                  <button
                    type="button"
                    className="perfil-botao-foto"
                    onClick={handleAbrirOpcoesFoto}
                  >
                    Alterar foto
                  </button>
                )}

                {modoFoto === "opcoes" && (
                  <div
                    className="perfil-foto-painel"
                    role="group"
                    aria-label="Alterar foto"
                  >
                    <p>Escolha uma opção</p>

                    <button
                      type="button"
                      className="perfil-botao-foto"
                      onClick={handleEscolherArquivo}
                    >
                      <CIcon icon={cilFolderOpen} aria-hidden="true" />
                      Enviar foto
                    </button>

                    <button
                      type="button"
                      className="perfil-botao-foto"
                      onClick={handleAbrirCamera}
                    >
                      <CIcon icon={cilCamera} aria-hidden="true" />
                      Tirar foto
                    </button>

                    <button
                      type="button"
                      className="perfil-botao-foto secundario"
                      onClick={handleFecharFoto}
                      autoFocus
                    >
                      Cancelar
                    </button>
                  </div>
                )}

                {modoFoto === "camera" && (
                  <div
                    className="perfil-foto-painel"
                    role="group"
                    aria-label="Câmera"
                  >
                    <video
                      ref={videoRef}
                      className="perfil-camera"
                      autoPlay
                      playsInline
                      muted
                      onCanPlay={() => setCameraPronta(true)}
                    />

                    <button
                      type="button"
                      className="perfil-botao-foto"
                      onClick={handleTirarFoto}
                      disabled={!cameraPronta}
                    >
                      <CIcon icon={cilCamera} aria-hidden="true" />

                      {cameraPronta ? "Tirar foto" : "Abrindo câmera..."}
                    </button>

                    <button
                      type="button"
                      className="perfil-botao-foto secundario"
                      onClick={handleFecharFoto}
                      autoFocus
                    >
                      Cancelar
                    </button>
                  </div>
                )}

                {modoFoto === "previa" && (
                  <div
                    className="perfil-foto-painel"
                    role="group"
                    aria-label="Prévia da nova foto"
                  >
                    <p>Pré-visualização</p>

                    <button
                      type="button"
                      className="perfil-botao-foto principal"
                      onClick={handleConfirmarFoto}
                      disabled={enviandoFoto}
                    >
                      <CIcon icon={cilCheckAlt} aria-hidden="true" />

                      {enviandoFoto ? "Salvando..." : "Confirmar"}
                    </button>

                    {origemFoto === "camera" ? (
                      <button
                        type="button"
                        className="perfil-botao-foto"
                        onClick={handleAbrirCamera}
                        disabled={enviandoFoto}
                      >
                        <CIcon icon={cilCamera} aria-hidden="true" />
                        Tirar novamente
                      </button>
                    ) : (
                      <button
                        type="button"
                        className="perfil-botao-foto"
                        onClick={handleEscolherArquivo}
                        disabled={enviandoFoto}
                      >
                        <CIcon icon={cilFolderOpen} aria-hidden="true" />
                        Escolher outra
                      </button>
                    )}

                    <button
                      type="button"
                      className="perfil-botao-foto secundario"
                      onClick={handleFecharFoto}
                      disabled={enviandoFoto}
                      autoFocus
                    >
                      Cancelar
                    </button>
                  </div>
                )}

                {erroFoto && (
                  <p className="perfil-foto-info erro" role="alert">
                    {erroFoto}
                  </p>
                )}

                {mensagemFoto && (
                  <p className="perfil-foto-info sucesso" role="status">
                    {mensagemFoto}
                  </p>
                )}
              </div>

              <div className="perfil-dados">
                <h2 className="perfil-nome">{perfil.nome || "—"}</h2>

                <dl className="perfil-lista">
                  <div>
                    <dt>E-mail:</dt>
                    <dd>{perfil.email || "—"}</dd>
                  </div>

                  <div>
                    <dt>Cadastro:</dt>
                    <dd>{perfil.criado_em || "—"}</dd>
                  </div>

                  <div>
                    <dt>Cargo:</dt>
                    <dd>{perfil.cargo || "—"}</dd>
                  </div>
                </dl>
              </div>

              {perfil.status && (
                <span
                  className={`perfil-status ${
                    statusAtivo ? "ativo" : "inativo"
                  }`}
                >
                  {perfil.status}
                </span>
              )}
            </section>

            <h2 className="perfil-secao-titulo">Alterar senha</h2>

            <section className="perfil-card">
              <div className="perfil-grid senha-grid">
                <label>
                  Senha atual
                  <CampoSenha
                    name="atual"
                    placeholder="Senha"
                    value={senha.atual}
                    onChange={handleChangeSenha}
                    autoComplete="current-password"
                  />
                </label>

                <label>
                  Nova senha
                  <CampoSenha
                    name="nova"
                    placeholder="Senha"
                    value={senha.nova}
                    onChange={handleChangeSenha}
                    autoComplete="new-password"
                    mostrarRequisitos={true}
                    classNameRequisitos="requisitos-perfil"
                  />
                </label>

                <label>
                  Confirmar senha
                  <CampoSenha
                    name="confirmacao"
                    placeholder="Senha"
                    value={senha.confirmacao}
                    onChange={handleChangeSenha}
                    autoComplete="new-password"
                    mostrarRequisitos={true}
                    classNameRequisitos="requisitos-perfil"
                  />
                </label>
              </div>
            </section>

            {erro && (
              <p className="perfil-feedback erro" role="alert">
                {erro}
              </p>
            )}

            {mensagem && (
              <p className="perfil-feedback sucesso" role="status">
                {mensagem}
              </p>
            )}

            <div className="perfil-acoes">
              <button
                type="button"
                className="perfil-botao secundario"
                onClick={handleCancelar}
                disabled={salvando}
              >
                Cancelar
              </button>

              <button
                type="submit"
                className="perfil-botao"
                disabled={salvando}
              >
                {salvando ? "Salvando..." : "Salvar alterações"}
              </button>
            </div>
          </form>
        )}
      </main>

      {fotoTelaCheia && fotoExibida && (
        <div
          className="perfil-foto-fullscreen"
          role="dialog"
          aria-modal="true"
          aria-label="Visualização da foto do perfil"
          onClick={handleFecharFotoTelaCheia}
        >
          <button
            type="button"
            className="perfil-foto-fullscreen-fechar"
            onClick={handleFecharFotoTelaCheia}
            aria-label="Fechar visualização da foto"
            autoFocus
          >
            <CIcon icon={cilX} aria-hidden="true" />
          </button>

          <img
            src={fotoExibida}
            alt={`Foto ampliada de ${perfil.nome || "perfil"}`}
            className={`perfil-foto-fullscreen-imagem ${
              fotoFixada ? "fixada" : ""
            }`}
            onClick={handleFixarFotoTelaCheia}
            onMouseLeave={handleMouseSaiuFotoTelaCheia}
          />
        </div>
      )}
    </div>
  );
}

export default Perfil;