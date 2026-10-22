
const NOME_BANCO = "FullacademyOffline";
const VERSAO_BANCO = 1;

const STORE_CACHE = "cache";
const STORE_PENDENTES = "cadastrosPendentes";

function abrirBanco() {
  return new Promise((resolve, reject) => {
    if (!("indexedDB" in window)) {
      reject(new Error("Este navegador não oferece suporte ao armazenamento offline."));
      return;
    }

    const requisicao = indexedDB.open(NOME_BANCO, VERSAO_BANCO);

    requisicao.onupgradeneeded = () => {
      const banco = requisicao.result;

      if (!banco.objectStoreNames.contains(STORE_CACHE)) {
        banco.createObjectStore(STORE_CACHE, {
          keyPath: "chave",
        });
      }

      if (!banco.objectStoreNames.contains(STORE_PENDENTES)) {
        const store = banco.createObjectStore(STORE_PENDENTES, {
          keyPath: "id_local",
          autoIncrement: true,
        });

        store.createIndex("email", "email", {
          unique: false,
        });
      }
    };

    requisicao.onsuccess = () => resolve(requisicao.result);
    requisicao.onerror = () =>
      reject(requisicao.error || new Error("Não foi possível abrir o banco local."));
  });
}

async function executarTransacao(nomeStore, modo, operacao) {
  const banco = await abrirBanco();

  return new Promise((resolve, reject) => {
    const transacao = banco.transaction(nomeStore, modo);
    const store = transacao.objectStore(nomeStore);

    let resultado;

    try {
      resultado = operacao(store);
    } catch (erro) {
      banco.close();
      reject(erro);
      return;
    }

    transacao.oncomplete = () => {
      banco.close();
      resolve(resultado?.result);
    };

    transacao.onerror = () => {
      banco.close();
      reject(transacao.error || new Error("Falha no armazenamento local."));
    };

    transacao.onabort = () => {
      banco.close();
      reject(transacao.error || new Error("Operação local cancelada."));
    };
  });
}

// Cache da última lista de usuários recebida do servidor.
export async function salvarUsuariosCache(usuarios) {
  return executarTransacao(STORE_CACHE, "readwrite", (store) =>
    store.put({
      chave: "usuarios",
      dados: usuarios,
      atualizado_em: new Date().toISOString(),
    })
  );
}

export async function obterUsuariosCache() {
  const registro = await executarTransacao(
    STORE_CACHE,
    "readonly",
    (store) => store.get("usuarios")
  );

  return registro?.dados ?? null;
}

// Guarda apenas os dados que não são senhas.
export async function salvarCadastroPendente(dados) {
  const cadastro = {
    nome_completo: dados.nome_completo?.trim() ?? "",
    email: dados.email?.trim().toLowerCase() ?? "",
    tipo_usuario: dados.tipo_usuario ?? "aluno",
    ativo: dados.ativo ?? true,
    criado_em: new Date().toISOString(),
    status: "aguardando_senha",
  };

  if (!cadastro.nome_completo || !cadastro.email) {
    throw new Error("Nome e e-mail são obrigatórios.");
  }

  return executarTransacao(
    STORE_PENDENTES,
    "readwrite",
    (store) => store.add(cadastro)
  );
}

export async function listarCadastrosPendentes() {
  const registros = await executarTransacao(
    STORE_PENDENTES,
    "readonly",
    (store) => store.getAll()
  );

  return registros ?? [];
}

export async function removerCadastroPendente(idLocal) {
  return executarTransacao(
    STORE_PENDENTES,
    "readwrite",
    (store) => store.delete(idLocal)
  );
}
