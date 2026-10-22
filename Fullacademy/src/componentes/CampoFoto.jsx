import { useEffect, useRef, useState } from "react";
import CIcon from "@coreui/icons-react";
import { cilCamera, cilCheckAlt, cilFolderOpen } from "@coreui/icons";

// ============================================================
// REGRAS DA FOTO (as mesmas que o backend confere)
// ============================================================

const TIPOS_FOTO = ["image/jpeg", "image/png", "image/webp"];
const TAMANHO_MAXIMO_FOTO = 5 * 1024 * 1024;

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

// Pega a primeira letra do primeiro e do último nome.
// Exemplo: "Rodrigo Silva" -> "RS"
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

// ============================================================
// COMPONENTE
//
// Props:
// - fotoUrl: endereço completo da foto atual ("" = sem foto)
// - nome: usado para as iniciais quando não há foto
// - onConfirmar(arquivo): o que fazer com a foto escolhida.
//   Pode ser async. Se der erro (throw), a mensagem aparece aqui.
// - textoBotao: texto do botão que abre as opções
// - mensagemSucesso: mensagem mostrada depois de confirmar
// ============================================================

function CampoFoto({
  fotoUrl = "",
  nome = "",
  onConfirmar,
  textoBotao = "Alterar foto",
  mensagemSucesso = "",
}) {
  // "" | "opcoes" | "camera" | "previa"
  const [modoFoto, setModoFoto] = useState("");

  const [arquivoFoto, setArquivoFoto] = useState(null);
  const [previaFoto, setPreviaFoto] = useState("");
  const [origemFoto, setOrigemFoto] = useState("");

  const [erroFoto, setErroFoto] = useState("");
  const [mensagemFoto, setMensagemFoto] = useState("");

  const [cameraPronta, setCameraPronta] = useState(false);
  const [enviandoFoto, setEnviandoFoto] = useState(false);

  // A imagem atual falhou ao carregar (arquivo apagado, endereço errado...)
  const [imagemQuebrada, setImagemQuebrada] = useState(false);

  const inputFotoRef = useRef(null);
  const videoRef = useRef(null);

  // ============================================================
  // AÇÕES
  // ============================================================

  const handleFecharFoto = () => {
    setArquivoFoto(null);
    setPreviaFoto("");
    setErroFoto("");
    setModoFoto("");
  };

  const handleAbrirOpcoesFoto = () => {
    setErroFoto("");
    setMensagemFoto("");
    setModoFoto("opcoes");
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

    // Permite escolher o mesmo arquivo de novo depois
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

    // Recorta um quadrado do centro do vídeo
    const lado = Math.min(video.videoWidth, video.videoHeight);

    const canvas = document.createElement("canvas");
    canvas.width = lado;
    canvas.height = lado;

    canvas
      .getContext("2d")
      .drawImage(
        video,
        (video.videoWidth - lado) / 2,
        (video.videoHeight - lado) / 2,
        lado,
        lado,
        0,
        0,
        lado,
        lado,
      );

    canvas.toBlob(
      (blob) => {
        if (!blob) {
          setErroFoto("Não foi possível capturar a foto. Tente novamente.");
          return;
        }

        usarArquivoFoto(
          new File([blob], "foto-camera.jpg", { type: "image/jpeg" }),
          "camera",
        );
      },
      "image/jpeg",
      0.9,
    );
  };

  // Entrega o arquivo para quem usa o componente
  const handleConfirmarFoto = async () => {
    if (!arquivoFoto || !onConfirmar) return;

    setEnviandoFoto(true);
    setErroFoto("");

    try {
      await onConfirmar(arquivoFoto);

      handleFecharFoto();
      setMensagemFoto(mensagemSucesso);
    } catch (erro) {
      setErroFoto(erro?.message || "Não foi possível salvar a foto.");
    } finally {
      setEnviandoFoto(false);
    }
  };

  // ============================================================
  // EFEITOS
  // ============================================================

  // Foto nova vinda de fora: tenta exibir de novo
  useEffect(() => {
    setImagemQuebrada(false);
  }, [fotoUrl]);

  // Libera da memória a URL criada para a prévia
  useEffect(() => {
    if (!previaFoto) return undefined;

    return () => URL.revokeObjectURL(previaFoto);
  }, [previaFoto]);

  // Liga a câmera quando modoFoto === "camera" e desliga ao sair
  useEffect(() => {
    if (modoFoto !== "camera") return undefined;

    let ativo = true;
    let stream = null;

    navigator.mediaDevices
      .getUserMedia({ video: { facingMode: "user" }, audio: false })
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

  // Fecha o painel com ESC
  useEffect(() => {
    if (modoFoto === "" || enviandoFoto) return undefined;

    const handleTecla = (event) => {
      if (event.key === "Escape") {
        // Para aqui: o Esc não chega ao modal de cadastrar/editar
        event.stopPropagation();
        handleFecharFoto();
      }
    };

    // "true" = escuta na fase de captura, antes dos outros ouvintes
    window.addEventListener("keydown", handleTecla, true);

    return () => window.removeEventListener("keydown", handleTecla, true);
  }, [modoFoto, enviandoFoto]);

  // ============================================================
  // TELA
  // ============================================================

  const fotoExibida = previaFoto || (imagemQuebrada ? "" : fotoUrl);

  return (
    <div
      className={`perfil-foto-area ${modoFoto === "camera" ? "camera" : ""}`}
    >
      {modoFoto !== "camera" && (
        <div className={`perfil-avatar ${previaFoto ? "previa" : ""}`}>
          {fotoExibida ? (
            <img
              src={fotoExibida}
              alt={previaFoto ? "Prévia da nova foto" : `Foto de ${nome || "perfil"}`}
              onError={previaFoto ? undefined : () => setImagemQuebrada(true)}
            />
          ) : (
            <span aria-hidden="true">{obterIniciais(nome)}</span>
          )}
        </div>
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
          {textoBotao}
        </button>
      )}

      {modoFoto === "opcoes" && (
        <div className="perfil-foto-painel" role="group" aria-label="Alterar foto">
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
        <div className="perfil-foto-painel" role="group" aria-label="Câmera">
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
  );
}

export default CampoFoto;