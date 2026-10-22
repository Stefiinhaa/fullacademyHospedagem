import { useEffect, useRef, useState } from "react";
import CIcon from "@coreui/icons-react";
import {
  cilPencil,
  cilTrash,
  cilArrowTop,
  cilArrowBottom,
  cilSwapVertical,
  cilX,
} from "@coreui/icons";

import { urlDaApi } from "../../services/api";

// [ALTERADO] 20 por vez para preencher a tela
const USUARIOS_POR_VEZ = 10;
// Tempo com o mouse parado na foto até abrir a tela cheia (ms)
const ATRASO_TELA_CHEIA = 300;

// Usada só se a página não mandar a prop "colunas"
const COLUNAS_PADRAO = [
  { chave: "foto", rotulo: "Foto" },
  { chave: "nome", rotulo: "Nome do aluno" },
  { chave: "email", rotulo: "Email" },
  { chave: "ativo", rotulo: "Status" },
  { chave: "tipo_usuario", rotulo: "Perfil" },
];

function obterIniciais(nome) {
  const partes = String(nome || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  if (partes.length === 0) {
    return "?";
  }

  const primeira = partes[0][0];
  const ultima = partes.length > 1 ? partes[partes.length - 1][0] : "";

  return (primeira + ultima).toUpperCase();
}

function obterFoto(usuario) {
  const caminhoFoto = usuario.foto_url || usuario.foto || "";

  if (!caminhoFoto) {
    return "";
  }

  if (
    caminhoFoto.startsWith("http://") ||
    caminhoFoto.startsWith("https://") ||
    caminhoFoto.startsWith("data:")
  ) {
    return caminhoFoto;
  }

  return urlDaApi(caminhoFoto);
}

function ListaUsuarios({
  carregando,
  usuariosFiltrados,
  colunas = COLUNAS_PADRAO,
  colunaOrdenada,
  direcaoOrdenacao,
  handleOrdenar,
  filtrosSelecionados,
  nomeFiltro,
  handleEditar,
  handleExcluir,
  modoSelecao = false,
  usuariosSelecionados = [],
  onAlternarSelecaoUsuario,
}) {
  const [quantidadeVisivel, setQuantidadeVisivel] = useState(USUARIOS_POR_VEZ);
  // Foto em tela cheia: { url, nome, iniciais, temFoto, fixada }
  const [fotoTelaCheia, setFotoTelaCheia] = useState(null);
  // Espera do mouse antes de abrir a tela cheia
  const timerTelaCheiaRef = useRef(null);

  const sentinelaRef = useRef(null);
  // [NOVO] caixa da tabela, que agora é quem rola
  const wrapperRef = useRef(null);

  const usuariosVisiveis = usuariosFiltrados.slice(0, quantidadeVisivel);

  const temMais = quantidadeVisivel < usuariosFiltrados.length;

  useEffect(() => {
    setQuantidadeVisivel(USUARIOS_POR_VEZ);
  }, [nomeFiltro, colunaOrdenada, direcaoOrdenacao, filtrosSelecionados]);

  useEffect(() => {
    const sentinela = sentinelaRef.current;

    if (carregando || !temMais || !sentinela) {
      return;
    }

    const observer = new IntersectionObserver(
      ([entrada]) => {
        if (entrada.isIntersecting) {
          setQuantidadeVisivel((qtd) => qtd + USUARIOS_POR_VEZ);
        }
      },
      {
        // [ALTERADO] observa a rolagem da tabela, não da página
        root: wrapperRef.current,
        rootMargin: "200px",
      },
    );

    observer.observe(sentinela);

    return () => observer.disconnect();
  }, [carregando, temMais, quantidadeVisivel]);

  // Enter ou Esc fecham a tela cheia (fixada ou não)
  useEffect(() => {
    if (!fotoTelaCheia) return undefined;

    const handleTecla = (event) => {
      if (event.key !== "Escape" && event.key !== "Enter") return;

      // Impede o Enter de "clicar" de novo na foto da tabela
      event.preventDefault();
      setFotoTelaCheia(null);
    };

    window.addEventListener("keydown", handleTecla);
    return () => window.removeEventListener("keydown", handleTecla);
  }, [fotoTelaCheia]);

  // Se a tela sair (trocar de página), cancela a espera do mouse
  useEffect(() => {
    return () => clearTimeout(timerTelaCheiaRef.current);
  }, []);

  const iconeOrdenacao = (coluna) => {
    if (colunaOrdenada !== coluna) {
      return cilSwapVertical;
    }

    return direcaoOrdenacao === "asc" ? cilArrowTop : cilArrowBottom;
  };

  const ariaSort = (coluna) => {
    if (colunaOrdenada !== coluna) {
      return "none";
    }

    return direcaoOrdenacao === "asc" ? "ascending" : "descending";
  };

  // ============================================================
  // FOTO EM TELA CHEIA (abre no mouse, fixa no clique)
  // ============================================================

  const montarFotoTelaCheia = (usuario, fixada) => {
    const foto = obterFoto(usuario);
    const nome = usuario.nome_completo || usuario.nome || "Usuário";

    return {
      url: foto,
      nome,
      iniciais: obterIniciais(nome),
      temFoto: Boolean(foto),
      fixada,
    };
  };

  const cancelarEsperaTelaCheia = () => {
    clearTimeout(timerTelaCheiaRef.current);
    timerTelaCheiaRef.current = null;
  };

  // Mouse parou na bolinha: depois de um instante, abre a tela cheia
  const handleMouseEntrouFoto = (usuario) => {
    // Só em dispositivos com mouse
    if (!window.matchMedia("(hover: hover)").matches) return;

    cancelarEsperaTelaCheia();
    timerTelaCheiaRef.current = setTimeout(() => {
      setFotoTelaCheia((atual) => atual ?? montarFotoTelaCheia(usuario, false));
    }, ATRASO_TELA_CHEIA);
  };

  // Mouse saiu da bolinha antes do tempo: não abre
  const handleMouseSaiuFoto = () => {
    cancelarEsperaTelaCheia();
  };

  // Clique na bolinha (ou toque/Enter): abre já fixada
  const handleClicarFoto = (usuario) => {
    cancelarEsperaTelaCheia();
    setFotoTelaCheia(montarFotoTelaCheia(usuario, true));
  };

  // Clique na foto grande: fixa
  const handleFixarFotoTelaCheia = (event) => {
    event.stopPropagation(); // não deixa o clique chegar ao fundo (que fecha)
    setFotoTelaCheia((atual) => (atual ? { ...atual, fixada: true } : atual));
  };

  // Mouse saiu da foto grande: fecha, menos se estiver fixada
  const handleMouseSaiuFotoTelaCheia = () => {
    setFotoTelaCheia((atual) => (atual?.fixada ? atual : null));
  };

  const handleFecharFotoTelaCheia = () => {
    setFotoTelaCheia(null);
  };

  // ============================================================
  // CÉLULAS (uma por coluna visível)
  // ============================================================

  const renderizarCelula = (chave, usuario) => {
    const nome = usuario.nome_completo || usuario.nome || "Usuário";

    const ativo = usuario.ativo ?? true;

    if (chave === "foto") {
      const foto = obterFoto(usuario);
      const iniciais = obterIniciais(nome);

      return (
        <td key={chave} className="coluna-foto">
          <div className="foto-usuario-tabela">
            <button
              type="button"
              className={`foto-usuario-tabela-botao ${
                foto ? "" : "foto-usuario-tabela-botao-sem-foto"
              }`}
              onClick={() => handleClicarFoto(usuario)}
              onMouseEnter={() => handleMouseEntrouFoto(usuario)}
              onMouseLeave={handleMouseSaiuFoto}
              aria-label={
                foto
                  ? `Visualizar foto em tela cheia de ${nome}`
                  : `Visualizar perfil de ${nome}`
              }
            >
              {foto ? (
                <img
                  src={foto}
                  alt={`Foto de ${nome}`}
                  onError={(event) => {
                    event.currentTarget.style.display = "none";
                    const placeholder =
                      event.currentTarget.parentElement?.querySelector(
                        ".foto-usuario-placeholder",
                      );
                    if (placeholder) {
                      placeholder.style.display = "flex";
                    }
                  }}
                />
              ) : null}

              <span
                className="foto-usuario-placeholder"
                style={{
                  display: foto ? "none" : "flex",
                }}
              >
                {iniciais}
              </span>
            </button>
          </div>
        </td>
      );
    }

    if (chave === "nome") {
      return <td key={chave}>{nome}</td>;
    }

    if (chave === "email") {
      return <td key={chave}>{usuario.email}</td>;
    }

    if (chave === "ativo") {
      return (
        <td key={chave}>
          <span
            className={`selo-status ${ativo ? "selo-ativo" : "selo-inativo"}`}
          >
            {ativo ? "Ativo" : "Inativo"}
          </span>
        </td>
      );
    }

    if (chave === "tipo_usuario") {
      return <td key={chave}>{usuario.tipo_usuario || "aluno"}</td>;
    }

    return <td key={chave}></td>;
  };

  if (carregando) {
    return <p className="mensagem-carregando">Carregando usuários...</p>;
  }

  // colunas de dados + coluna de ações/filtro (+ checkbox no modo seleção)
  const totalColunasTabela = colunas.length + 1 + (modoSelecao ? 1 : 0);

  return (
    <>
      {/* [ALTERADO] ref na caixa da tabela */}
      <div className="tabela-usuarios-wrapper" ref={wrapperRef}>
        <table className="tabela-usuarios">
          <thead>
            <tr>
              {/* ESPAÇADOR DE COLUNA PARA OS CHECKBOXES DAS LINHAS */}
              {modoSelecao && <th className="coluna-checkbox"></th>}

              {/* COLUNAS DE DADOS (ordem e visibilidade vêm do FiltroColuna) */}
              {colunas.map((coluna) => (
                <th
                  key={coluna.chave}
                  className={
                    coluna.chave === "foto" ? "coluna-foto" : undefined
                  }
                  aria-sort={ariaSort(coluna.chave)}
                >
                  <button
                    type="button"
                    className="botao-ordenar"
                    onClick={() => handleOrdenar(coluna.chave)}
                  >
                    {coluna.rotulo}
                    <CIcon
                      icon={iconeOrdenacao(coluna.chave)}
                      className="icone-ordenar"
                    />
                  </button>
                </th>
              ))}

              {/* FILTRO */}
              <th className="coluna-filtro">
                
              </th>
            </tr>
          </thead>

          <tbody>
            {usuariosVisiveis.length === 0 ? (
              <tr>
                <td colSpan={totalColunasTabela} className="tabela-vazia">
                  Nenhum usuário encontrado.
                </td>
              </tr>
            ) : (
              usuariosVisiveis.map((usuario) => {
                const idUsuario = usuario.id_usuario ?? usuario.id_aluno;
                const nome = usuario.nome_completo || usuario.nome || "Usuário";

                const estaSelecionado =
                  usuariosSelecionados.includes(idUsuario);

                return (
                  <tr
                    key={idUsuario}
                    className={`${modoSelecao ? "linha-selecionavel" : ""} ${
                      estaSelecionado ? "linha-selecionada" : ""
                    }`}
                    onClick={(event) => {
                      if (!modoSelecao) return;
                      // Não marca a linha ao clicar na foto, editar, excluir ou no próprio checkbox
                      if (event.target.closest("button, input, a")) return;
                      onAlternarSelecaoUsuario(idUsuario);
                    }}
                    aria-selected={modoSelecao ? estaSelecionado : undefined}
                  >
                    {/* CHECKBOX DA LINHA (EXIBIDO APENAS SE MODO DE SELEÇÃO ESTIVER ATIVO) */}
                    {modoSelecao && (
                      <td className="coluna-checkbox">
                        <input
                          type="checkbox"
                          checked={estaSelecionado}
                          onChange={() => onAlternarSelecaoUsuario(idUsuario)}
                          aria-label={`Selecionar ${nome}`}
                        />
                      </td>
                    )}

                    {/* CÉLULAS NA MESMA ORDEM DAS COLUNAS */}
                    {colunas.map((coluna) =>
                      renderizarCelula(coluna.chave, usuario),
                    )}

                    {/* AÇÕES */}
                    <td className="tabela-acoes">
                      <button
                        type="button"
                        onClick={() => handleEditar(usuario)}
                        aria-label="Editar usuário"
                        title="Editar usuário"
                      >
                        <CIcon icon={cilPencil} />
                      </button>

                      <button
                        type="button"
                        onClick={() => handleExcluir(idUsuario)}
                        aria-label="Excluir usuário"
                        title="Excluir usuário"
                      >
                        <CIcon icon={cilTrash} />
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>

        {/* [ALTERADO] sentinela agora fica DENTRO da caixa que rola */}
        {temMais && (
          <p
            ref={sentinelaRef}
            className="mensagem-carregando sentinela-tabela"
          >
            Carregando mais usuários...
          </p>
        )}
      </div>

      {/* FOTO EM TELA CHEIA (abre no mouse, fixa no clique) */}
      {fotoTelaCheia && (
        <div
          className="perfil-foto-fullscreen"
          role="dialog"
          aria-modal="true"
          aria-label={
            fotoTelaCheia.temFoto
              ? `Visualização da foto de ${fotoTelaCheia.nome}`
              : `Visualização do perfil de ${fotoTelaCheia.nome}`
          }
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

          {fotoTelaCheia.temFoto ? (
            <img
              src={fotoTelaCheia.url}
              alt={`Foto ampliada de ${fotoTelaCheia.nome}`}
              className={`perfil-foto-fullscreen-imagem ${
                fotoTelaCheia.fixada ? "fixada" : ""
              }`}
              onClick={handleFixarFotoTelaCheia}
              onMouseLeave={handleMouseSaiuFotoTelaCheia}
            />
          ) : (
            <div
              className={`perfil-foto-fullscreen-placeholder ${
                fotoTelaCheia.fixada ? "fixada" : ""
              }`}
              onClick={handleFixarFotoTelaCheia}
              onMouseLeave={handleMouseSaiuFotoTelaCheia}
            >
              <span>{fotoTelaCheia.iniciais}</span>
            </div>
          )}
        </div>
      )}
    </>
  );
}

export default ListaUsuarios;