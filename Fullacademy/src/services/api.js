
import {
  salvarUsuariosCache,
  obterUsuariosCache,
} from "./bancoLocal.js";

// Arquivo único para falar com o backend.
// "/api" passa pelo proxy do Vite.

export const API_URL = import.meta.env.VITE_API_URL || "/api";

const TEMPO_LIMITE = 15000;

const MENSAGEM_SEM_CONEXAO =
  "Não foi possível concluir agora. Verifique sua conexão com a internet e tente novamente.";

const MENSAGEM_DEMORA =
  "O sistema está demorando para responder. Tente novamente em alguns instantes.";

const MENSAGEM_ERRO_GERAL =
  "Algo deu errado. Tente novamente em alguns instantes.";

export function urlDaApi(caminho) {
  if (caminho.startsWith("/uploads/")) {
    return caminho;
  }

  return `${API_URL}${caminho}`;
}

function formatarMensagem(texto) {
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}

export async function requisicaoApi(caminho, opcoes = {}) {
  const metodo = (opcoes.method || "GET").toUpperCase();
  const consultarUsuarios =
    metodo === "GET" &&
    caminho.split("?")[0].replace(/\/$/, "") === "/usuarios";

  const controle = new AbortController();
  const temporizador = setTimeout(
    () => controle.abort(),
    TEMPO_LIMITE
  );

  let resposta;
  let dados = null;

  try {
    resposta = await fetch(urlDaApi(caminho), {
      ...opcoes,
      signal: controle.signal,
    });

    dados = await resposta.json().catch(() => null);
  } catch (erro) {
    console.error(`[API] Falha ao acessar ${caminho}:`, erro);

    // Se a lista não puder ser carregada, tenta usar a cópia local.
    if (consultarUsuarios) {
      try {
        const usuariosSalvos = await obterUsuariosCache();

        if (Array.isArray(usuariosSalvos)) {
          console.info(
            "[API] Exibindo usuários salvos para uso offline."
          );

          return usuariosSalvos;
        }
      } catch (erroCache) {
        console.error(
          "[API] Não foi possível ler o cache local:",
          erroCache
        );
      }
    }

    throw new Error(
      erro.name === "AbortError"
        ? MENSAGEM_DEMORA
        : MENSAGEM_SEM_CONEXAO
    );
  } finally {
    clearTimeout(temporizador);
  }

  if (!resposta.ok) {
    console.error(
      `[API] ${caminho} respondeu ${resposta.status}:`,
      dados
    );

    throw new Error(
      dados?.erro
        ? formatarMensagem(dados.erro)
        : MENSAGEM_ERRO_GERAL
    );
  }

  // Atualiza o cache somente com uma lista válida do servidor.
  if (consultarUsuarios && Array.isArray(dados)) {
    try {
      await salvarUsuariosCache(dados);
    } catch (erroCache) {
      // Uma falha no cache não deve impedir o uso normal da API.
      console.error(
        "[API] Não foi possível salvar os usuários localmente:",
        erroCache
      );
    }
  }

  return dados ?? {};
}
