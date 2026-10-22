import { useEffect, useRef, useState } from "react";
import CIcon from "@coreui/icons-react";
import { MdOutlineTune } from "react-icons/md";
import { GoChevronDown } from "react-icons/go";
import { GoChevronUp } from "react-icons/go";


import {
  cilSettings,
  cilMenu,
  cilChevronTop,
  cilChevronBottom,
} from "@coreui/icons";

import "./FiltroColunas.css";

/**
 * Cria a configuração inicial de colunas a partir das definições.
 *
 *   const COLUNAS = [
 *     { chave: "nome", rotulo: "Nome do aluno" },
 *     { chave: "turma", rotulo: "Turma" },
 *   ];
 *   const [colunas, setColunas] = useState(() =>
 *     criarFiltroColuna(COLUNAS, ["turma"]),
 *   );
 *
 * @param definicoes   lista de { chave, rotulo }
 * @param ocultasPorPadrao  chaves que começam ocultas
 */
export function criarFiltroColuna(definicoes, ocultasPorPadrao = []) {
  return definicoes.map((coluna) => ({
    ...coluna,
    visivel: !ocultasPorPadrao.includes(coluna.chave),
  }));
}

/** Retorna só as colunas visíveis, já na ordem escolhida. */
export function colunasVisiveis(configuracao) {
  return configuracao.filter((coluna) => coluna.visivel);
}

function FiltroColuna({
  colunas,
  onChange,
  padrao,
  titulo = "Colunas da tabela",
  descricao = "Arraste ou use as setas para ordenar",
  rotuloBotao = "Configurar colunas",
  minimoVisiveis = 1,
  className = "",
}) {
  const [aberto, setAberto] = useState(false);
  const [indiceArrastado, setIndiceArrastado] = useState(null);
  const [indiceSobre, setIndiceSobre] = useState(null);

  const raizRef = useRef(null);

  // Guarda a configuração inicial para o botão "Restaurar"
  // (se a página não mandar uma `padrao`).
  const padraoInicialRef = useRef(colunas);
  const configuracaoPadrao = padrao ?? padraoInicialRef.current;

  // Fecha ao clicar fora ou apertar Esc
  useEffect(() => {
    if (!aberto) return undefined;

    const aoClicarFora = (evento) => {
      if (raizRef.current && !raizRef.current.contains(evento.target)) {
        setAberto(false);
      }
    };

    const aoApertarTecla = (evento) => {
      if (evento.key === "Escape") setAberto(false);
    };

    document.addEventListener("mousedown", aoClicarFora);
    document.addEventListener("keydown", aoApertarTecla);

    return () => {
      document.removeEventListener("mousedown", aoClicarFora);
      document.removeEventListener("keydown", aoApertarTecla);
    };
  }, [aberto]);

  const totalVisiveis = colunas.filter((coluna) => coluna.visivel).length;

  // ============================================================
  // AÇÕES
  // ============================================================

  const mover = (de, para) => {
    if (para < 0 || para >= colunas.length || de === para) return;

    const nova = [...colunas];
    const [movida] = nova.splice(de, 1);
    nova.splice(para, 0, movida);
    onChange(nova);
  };

  const alternarVisibilidade = (indice) => {
    const coluna = colunas[indice];

    // Impede ocultar todas as colunas
    if (coluna.visivel && totalVisiveis <= minimoVisiveis) return;

    onChange(
      colunas.map((item, i) =>
        i === indice ? { ...item, visivel: !item.visivel } : item,
      ),
    );
  };

  const restaurar = () => {
    onChange(configuracaoPadrao.map((coluna) => ({ ...coluna })));
  };

  // ============================================================
  // DRAG AND DROP
  // ============================================================

  const handleDragStart = (evento, indice) => {
    setIndiceArrastado(indice);
    evento.dataTransfer.effectAllowed = "move";
    // Firefox só inicia o arraste se houver dados no dataTransfer
    evento.dataTransfer.setData("text/plain", String(indice));
  };

  const handleDragOver = (evento, indice) => {
    evento.preventDefault();
    evento.dataTransfer.dropEffect = "move";
    if (indice !== indiceSobre) setIndiceSobre(indice);
  };

  const handleDrop = (evento, indice) => {
    evento.preventDefault();

    if (indiceArrastado !== null) {
      mover(indiceArrastado, indice);
    }

    setIndiceArrastado(null);
    setIndiceSobre(null);
  };

  const handleDragEnd = () => {
    setIndiceArrastado(null);
    setIndiceSobre(null);
  };

  return (
    <div className={`filtro-coluna ${className}`.trim()} ref={raizRef}>
      <button
        type="button"
        className={`filtro-coluna-botao ${aberto ? "ativo" : ""}`}
        onClick={() => setAberto((anterior) => !anterior)}
        aria-label={rotuloBotao}
        title={rotuloBotao}
        aria-haspopup="dialog"
        aria-expanded={aberto}
      >
        <MdOutlineTune />
      </button>

      {aberto && (
        <div className="filtro-coluna-painel" role="dialog" aria-label={titulo}>
          <div className="filtro-coluna-cabecalho">
            <h3>{titulo}</h3>

            <button
              type="button"
              className="filtro-coluna-restaurar"
              onClick={restaurar}
            >
              Restaurar
            </button>
          </div>

          <p className="filtro-coluna-descricao">{descricao}</p>

          <ul className="filtro-coluna-lista">
            {colunas.map((coluna, indice) => {
              const bloqueada =
                coluna.visivel && totalVisiveis <= minimoVisiveis;

              const classes = [
                "filtro-coluna-item",
                coluna.visivel ? "" : "oculta",
                indiceArrastado === indice ? "arrastando" : "",
                indiceSobre === indice && indiceArrastado !== indice
                  ? "sobre"
                  : "",
              ]
                .filter(Boolean)
                .join(" ");

              return (
                <li
                  key={coluna.chave}
                  className={classes}
                  draggable
                  onDragStart={(evento) => handleDragStart(evento, indice)}
                  onDragOver={(evento) => handleDragOver(evento, indice)}
                  onDragLeave={() => setIndiceSobre(null)}
                  onDrop={(evento) => handleDrop(evento, indice)}
                  onDragEnd={handleDragEnd}
                >
                  <CIcon
                    icon={cilMenu}
                    className="filtro-coluna-alca"
                    aria-hidden="true"
                  />

                  <input
                    type="checkbox"
                    checked={coluna.visivel}
                    disabled={bloqueada}
                    onChange={() => alternarVisibilidade(indice)}
                    aria-label={`Mostrar ${coluna.rotulo}`}
                    title={
                      bloqueada
                        ? "Pelo menos uma coluna precisa ficar visível"
                        : undefined
                    }
                  />

                  <span className="filtro-coluna-nome">{coluna.rotulo}</span>

                  <button
                    type="button"
                    className="filtro-coluna-seta"
                    onClick={() => mover(indice, indice - 1)}
                    disabled={indice === 0}
                    aria-label={`Subir ${coluna.rotulo}`}
                  >
                    <GoChevronUp />
                  </button>

                  <button
                    type="button"
                    className="filtro-coluna-seta"
                    onClick={() => mover(indice, indice + 1)}
                    disabled={indice === colunas.length - 1}
                    aria-label={`Descer ${coluna.rotulo}`}
                  >
                    <GoChevronDown />
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}

export default FiltroColuna;
