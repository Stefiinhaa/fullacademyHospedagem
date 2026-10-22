import { useEffect, useState } from "react";
import CIcon from "@coreui/icons-react";
import { cilX, cilArrowLeft, cilSearch } from "@coreui/icons";
import { GoChevronRight } from "react-icons/go";

// ============================================================
// 1) CATEGORIAS DO FILTRO
// coluna = nome da coluna no banco | rotulo = texto que aparece na tela
// ============================================================
export const CATEGORIAS = [
  { coluna: "nome", rotulo: "Nome do Usuário" },
  { coluna: "email", rotulo: "Email" },
  { coluna: "ativo", rotulo: "Status" },
  { coluna: "tipo_usuario", rotulo: "Perfil" },
  { coluna: "foto", rotulo: "Foto" },
];

function ModalFiltroUsuarios({
  obterValores,
  filtrosSelecionados,
  onAlternar,
  onFechar,
}) {
  // ============================================================
  // 2) ESTADOS DO MODAL
  // ============================================================

  // Qual categoria está aberta. null = tela 1 (lista de categorias)
  const [categoriaAberta, setCategoriaAberta] = useState(null);

  // Texto digitado no "Buscar" da tela 2
  const [buscaValores, setBuscaValores] = useState("");

  const abrirCategoria = (categoria) => {
    setCategoriaAberta(categoria);
    setBuscaValores("");
  };

  const voltar = () => {
    setCategoriaAberta(null);
    setBuscaValores("");
  };

  // Esc fecha o filtro
  useEffect(() => {
    const handleTecla = (event) => {
      if (event.key === "Escape") onFechar();
    };

    window.addEventListener("keydown", handleTecla);
    return () => window.removeEventListener("keydown", handleTecla);
  }, [onFechar]);

  // ============================================================
  // 3) VALORES DA CATEGORIA ABERTA (vindos do banco)
  // ============================================================

  const valores = categoriaAberta ? obterValores(categoriaAberta.coluna) : [];

  const termo = buscaValores.trim().toLowerCase();
  const valoresVisiveis = valores.filter((valor) =>
    valor.toLowerCase().includes(termo),
  );

  // ============================================================
  // 4) TELA
  // ============================================================

  return (
    <div className="modal-filtro-overlay" onClick={onFechar}>
      <div
        className="modal-filtro"
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-filtro-titulo"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Cabeçalho: voltar (só na tela 2), título e fechar */}
        <div className="modal-filtro-cabecalho">
          {categoriaAberta && (
            <button
              type="button"
              className="modal-filtro-icone"
              onClick={voltar}
              aria-label="Voltar"
            >
              <CIcon icon={cilArrowLeft} />
            </button>
          )}

          <div className="modal-filtro-titulos">
            <h2 id="modal-filtro-titulo">Filtro</h2>

            {categoriaAberta && (
              <p className="modal-filtro-subtitulo">
                <strong>{categoriaAberta.rotulo}</strong>
                <span>{valores.length} valores</span>
              </p>
            )}
          </div>

          <button
            type="button"
            className="modal-filtro-icone"
            onClick={onFechar}
            aria-label="Fechar filtro"
            autoFocus
          >
            <CIcon icon={cilX} />
          </button>
        </div>

        {categoriaAberta === null ? (
          /* TELA 1: lista de categorias */
          <ul className="modal-filtro-lista">
            {CATEGORIAS.map((categoria) => {
              const qtdMarcados = filtrosSelecionados[categoria.coluna].length;

              return (
                <li key={categoria.coluna}>
                  <button
                    type="button"
                    className="modal-filtro-categoria"
                    onClick={() => abrirCategoria(categoria)}
                  >
                    <span>
                      {categoria.rotulo}
                      {qtdMarcados > 0 && (
                        <span className="modal-filtro-contador">
                          {qtdMarcados}
                        </span>
                      )}
                    </span>

                    <GoChevronRight />
                  </button>
                </li>
              );
            })}
          </ul>
        ) : (
          /* TELA 2: valores da categoria com checkbox */
          <>
            <div className="modal-filtro-busca">
              <CIcon icon={cilSearch} />

              <input
                type="search"
                placeholder={`Buscar ${categoriaAberta.rotulo.toLowerCase()}`}
                value={buscaValores}
                onChange={(e) => setBuscaValores(e.target.value)}
                aria-label={`Buscar ${categoriaAberta.rotulo}`}
                autoFocus
              />
            </div>

            <ul className="modal-filtro-lista">
              {valoresVisiveis.map((valor) => (
                <li key={valor}>
                  <label className="modal-filtro-opcao">
                    <input
                      type="checkbox"
                      checked={filtrosSelecionados[
                        categoriaAberta.coluna
                      ].includes(valor)}
                      onChange={() => onAlternar(categoriaAberta.coluna, valor)}
                    />
                    {valor}
                  </label>
                </li>
              ))}

              {valoresVisiveis.length === 0 && (
                <li className="modal-filtro-vazio">Nenhum valor encontrado</li>
              )}
            </ul>
          </>
        )}
      </div>
    </div>
  );
}

export default ModalFiltroUsuarios;