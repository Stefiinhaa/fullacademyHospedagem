import CampoSenha from "./CampoSenha";
import { useCallback, useEffect, useState } from "react";
import { IoIosAlert } from "react-icons/io";
import {

  listarCadastrosPendentes,
  removerCadastroPendente,
} from "../services/bancoLocal.js";
import { requisicaoApi } from "../services/api.js";
import "./CadastrosPendentes.css";
import { IconBase } from "react-icons/lib";

export default function CadastrosPendentes() {
  const [cadastros, setCadastros] = useState([]);
  const [senhas, setSenhas] = useState({});
  const [carregando, setCarregando] = useState(true);
  const [enviandoId, setEnviandoId] = useState(null);
  const [online, setOnline] = useState(navigator.onLine);
  const [mensagem, setMensagem] = useState("");
  const [aberto, setAberto] = useState(false);
  const [modalCancelamento, setModalCancelamento] = useState(null);
  const [cancelando, setCancelando] = useState(false);
  const [confirmacoes, setConfirmacoes] = useState({});

  const carregarCadastros = useCallback(async () => {
    try {
      const pendentes = await listarCadastrosPendentes();
      setCadastros(pendentes);

      if (pendentes.length === 0) {
        setAberto(false);
        setSenhas({});
        setConfirmacoes({});
      }
    } catch (erro) {
      console.error("Erro ao carregar cadastros pendentes:", erro);
      setMensagem("Não foi possível consultar os cadastros pendentes.");
    } finally {
      setCarregando(false);
    }
  }, []);

  useEffect(() => {
    carregarCadastros();

    const atualizarConexao = () => {
      setOnline(navigator.onLine);
      carregarCadastros();
    };

    const atualizarPendentes = () => carregarCadastros();

    window.addEventListener("online", atualizarConexao);
    window.addEventListener("offline", atualizarConexao);
    window.addEventListener(
      "cadastros-pendentes-sincronizados",
      atualizarPendentes
    );

    return () => {
      window.removeEventListener("online", atualizarConexao);
      window.removeEventListener("offline", atualizarConexao);
      window.removeEventListener(
        "cadastros-pendentes-sincronizados",
        atualizarPendentes
      );
    };
  }, [carregarCadastros]);

  const atualizarSenha = (id, valor) => {
    setSenhas((anteriores) => ({
      ...anteriores,
      [id]: valor,
    }));
  };

  const sincronizarCadastro = async (cadastro) => {
    const senha = senhas[cadastro.id_local] || "";
    const confirmarSenha = confirmacoes[cadastro.id_local] || "";

    setMensagem("");

    if (!navigator.onLine) {
      setOnline(false);
      setMensagem(
        "Você está sem internet. Os cadastros continuam salvos neste dispositivo."
      );
      return;
    }

    if (!senha || !confirmarSenha) {
      setMensagem("Preencha os campos de senha e confirmação.");
      return;
    }

    const senhaValida =
      senha.length >= 8 &&
      /[A-Z]/.test(senha) &&
      /[a-z]/.test(senha) &&
      /[^A-Za-z0-9\s]/.test(senha);

    if (!senhaValida) {
      setMensagem(
        "A senha deve ter pelo menos 8 caracteres, uma letra maiúscula, uma minúscula e um caractere especial."
      );
      return;
    }

    if (senha !== confirmarSenha) {
      setMensagem("As senhas não coincidem.");
      return;
    }

    setEnviandoId(cadastro.id_local);

    try {
      await requisicaoApi("/cadastro", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          nome_completo: cadastro.nome_completo,
          email: cadastro.email,
          tipo_usuario: cadastro.tipo_usuario,
          senha,
        }),
      });

      await removerCadastroPendente(cadastro.id_local);

      setSenhas((anteriores) => {
        const novas = { ...anteriores };
        delete novas[cadastro.id_local];
        return novas;
      });

      setConfirmacoes((anteriores) => {
        const novas = { ...anteriores };
        delete novas[cadastro.id_local];
        return novas;
      });

      await carregarCadastros();
      window.dispatchEvent(
        new CustomEvent("cadastros-pendentes-sincronizados")
      );

      setMensagem(
        `Cadastro de ${cadastro.nome_completo} finalizado com sucesso.`
      );
    } catch (erro) {
      setMensagem(
        erro?.message ||
        "Não foi possível concluir o cadastro. Verifique a conexão e tente novamente."
      );
    } finally {
      setEnviandoId(null);
    }
  };

  const cancelarCadastro = async () => {
    if (!modalCancelamento || cancelando) return;

    if (!navigator.onLine) {
      setMensagem("Conecte-se à internet para cancelar o cadastro.");
      return;
    }

    const idLocal = modalCancelamento.id_local;

    if (idLocal == null) {
      setMensagem(
        "Não foi possível identificar o cadastro que será cancelado."
      );
      return;
    }

    try {
      setCancelando(true);
      setMensagem("");

      await removerCadastroPendente(idLocal);

      setSenhas((anterior) => {
        const novas = { ...anterior };
        delete novas[idLocal];
        return novas;
      });

      setConfirmacoes((anterior) => {
        const novas = { ...anterior };
        delete novas[idLocal];
        return novas;
      });

      setModalCancelamento(null);
      await carregarCadastros();
    } catch (erro) {
      console.error("Erro ao cancelar cadastro:", erro);
      setMensagem("Não foi possível cancelar o cadastro. Tente novamente.");
    } finally {
      setCancelando(false);
    }
  };

  if (carregando || cadastros.length === 0) {
    return null;
  }

  return (
    <>
      {!aberto && (
        <button
          type="button"
          onClick={() => setAberto(true)}
          className="cadastros-pendentes-fab"
        >
          <IoIosAlert size={24} />
          ({cadastros.length})
        </button>
      )}

      {aberto && (
        <div className="cadastros-pendentes-overlay">
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="titulo-cadastros-pendentes"
            className="cadastros-pendentes-modal"
          >
            <header className="cadastros-pendentes-cabecalho">
              <div>
                <h2
                  id="titulo-cadastros-pendentes"
                  className="cadastros-pendentes-titulo"
                >
                  Finalizar cadastros
                </h2>
                <p className="cadastros-pendentes-subtitulo">
                  {cadastros.length} cadastro(s) aguardando conclusão
                </p>
              </div>

              <button
                type="button"
                onClick={() => setAberto(false)}
                aria-label="Fechar modal"
                className="cadastros-pendentes-botao-fechar"
              >
                ×
              </button>
            </header>

            {!online && (
              <p className="cadastros-pendentes-aviso">
                Você está offline. Os cadastros estão salvos neste dispositivo.
                Conecte-se à internet para finalizá-los.
              </p>
            )}

            {mensagem && (
              <p role="status" className="cadastros-pendentes-mensagem">
                {mensagem}
              </p>
            )}

            <div className="cadastros-pendentes-lista">
              {cadastros.map((cadastro) => {
                const senhaAtual = senhas[cadastro.id_local] || "";
                const confirmacaoAtual =
                  confirmacoes[cadastro.id_local] || "";

                const senhasCoincidem =
                  senhaAtual.length > 0 &&
                  confirmacaoAtual.length > 0 &&
                  senhaAtual === confirmacaoAtual;

                const senhaValida =
                  senhaAtual.length >= 8 &&
                  /[A-Z]/.test(senhaAtual) &&
                  /[a-z]/.test(senhaAtual) &&
                  /[^A-Za-z0-9\s]/.test(senhaAtual);

                const enviando = enviandoId === cadastro.id_local;

                return (
                  <article
                    key={cadastro.id_local}
                    className="cadastros-pendentes-cartao"
                  >
                    <h3 className="cadastros-pendentes-nome">
                      {cadastro.nome_completo}
                    </h3>
                    <p className="cadastros-pendentes-detalhe">
                      {cadastro.email}
                    </p>
                    <p className="cadastros-pendentes-detalhe">
                      Perfil: {cadastro.tipo_usuario}
                    </p>

                    <div className="campo-senha-pendente">
                      <label htmlFor={`senha-pendente-${cadastro.id_local}`}>
                        Senha
                      </label>

                      <CampoSenha
                        id={`senha-pendente-${cadastro.id_local}`}
                        name={`senha-pendente-${cadastro.id_local}`}
                        placeholder="Digite a senha"
                        value={senhaAtual}
                        onChange={(e) =>
                          atualizarSenha(cadastro.id_local, e.target.value)
                        }
                        autoComplete="new-password"
                        mostrarRequisitos
                      />
                    </div>

                    <div className="campo-senha-pendente">
                      <label
                        htmlFor={`confirmar-senha-pendente-${cadastro.id_local}`}
                      >
                        Confirmar senha
                      </label>

                      <CampoSenha
                        id={`confirmar-senha-pendente-${cadastro.id_local}`}
                        name={`confirmar-senha-pendente-${cadastro.id_local}`}
                        placeholder="Digite a senha novamente"
                        value={confirmacaoAtual}
                        onChange={(e) =>
                          setConfirmacoes((anteriores) => ({
                            ...anteriores,
                            [cadastro.id_local]: e.target.value,
                          }))
                        }
                        autoComplete="new-password"
                        mostrarRequisitos
                      />

                      {confirmacaoAtual.length > 0 && (
                        <ul className="password-requirements" aria-live="polite">
                          <li className={senhasCoincidem ? "is-valid" : "is-invalid"}>
                            {senhasCoincidem
                              ? "✓ As senhas coincidem"
                              : "✕ As senhas não coincidem"}
                          </li>
                        </ul>
                      )}
                    </div>

                    <div className="botoes-cadastro-pendente">
                      <button
                        type="button"
                        onClick={() => {
                          if (!online) return;
                          setModalCancelamento(cadastro);
                        }}
                        disabled={!online || enviandoId !== null || cancelando}
                        className="botao-cancelar-cadastro"
                        title={
                          !online ? "Conecte-se à internet para cancelar" : ""
                        }
                      >
                        Cancelar
                      </button>

                      <button
                        type="button"
                        onClick={() => sincronizarCadastro(cadastro)}
                        disabled={
                          !online ||
                          enviandoId !== null ||
                          !senhaValida ||
                          !senhasCoincidem
                        }
                        className={`botao-finalizar-cadastro botao-finalizar-cadastro--lista ${
                          online ? "is-online" : "is-offline"
                        }`}
                      >
                        {enviando ? "Enviando..." : "Finalizar"}
                      </button>
                    </div>
                  </article>
                );
              })}

              {modalCancelamento && (
                <div className="cadastros-pendentes-overlay" role="presentation">
                  <div
                    className="cadastros-pendentes-modal cadastros-pendentes-modal-cancelamento"
                    role="alertdialog"
                    aria-modal="true"
                    aria-labelledby="titulo-cancelamento"
                    aria-describedby="descricao-cancelamento"
                  >
                    <div className="cadastros-pendentes-cancelamento-icone">
                      ⚠️
                    </div>

                    <h2 id="titulo-cancelamento" className="cadastros-pendentes-titulo">
                      Cancelar cadastro?
                    </h2>

                    <p
                      id="descricao-cancelamento"
                      className="cadastros-pendentes-cancelamento-descricao"
                    >
                      Tem certeza de que deseja cancelar o cadastro de{" "}
                      <strong>
                        {modalCancelamento.nome_completo ||
                          modalCancelamento.nome ||
                          "este usuário"}
                      </strong>
                      ? Os dados pendentes serão removidos deste dispositivo.
                    </p>

                    <div className="cadastros-pendentes-cancelamento-acoes">
                      <button
                        type="button"
                        onClick={() => setModalCancelamento(null)}
                        disabled={cancelando}
                        className="botao-secundario-cadastro"
                      >
                        Voltar
                      </button>

                      <button
                        type="button"
                        onClick={cancelarCadastro}
                        disabled={!online || cancelando}
                        className={`botao-finalizar-cadastro ${
                          online ? "is-online" : "is-offline"
                        }`}
                      >
                        {!online
                          ? "Sem conexão"
                          : cancelando
                            ? "Cancelando..."
                            : "Sim, cancelar"}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <footer className="cadastros-pendentes-rodape">
              <button
                type="button"
                onClick={() => setAberto(false)}
                className="botao-secundario-cadastro"
              >
                Fechar por enquanto
              </button>
            </footer>
          </section>
        </div>
      )}
    </>
  );
}
