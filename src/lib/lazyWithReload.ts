import { ComponentType, lazy } from "react";

const RELOAD_FLAG = "suaoab_chunk_reload_attempted";

/**
 * Substituto de `React.lazy` que se recupera sozinho de "Failed to fetch
 * dynamically imported module": quando um novo deploy troca os nomes
 * (hash) dos arquivos, uma aba que já estava aberta ainda referencia os
 * chunks antigos, que não existem mais no servidor. Em vez de mostrar a
 * tela de erro do React, recarregamos a página uma única vez (a nova
 * versão do HTML já aponta para os chunks corretos) — se o erro persistir
 * mesmo após o reload, deixamos a exceção seguir normalmente.
 */
export function lazyWithReload<T extends ComponentType<unknown>>(factory: () => Promise<{ default: T }>) {
  return lazy(async () => {
    try {
      const module = await factory();
      // Sucesso: libera o "direito" a um novo reload automático caso outro
      // chunk falhe futuramente (ex.: depois de um deploy seguinte na mesma sessão).
      sessionStorage.removeItem(RELOAD_FLAG);
      return module;
    } catch (error) {
      const jaTentouRecarregar = sessionStorage.getItem(RELOAD_FLAG);
      if (!jaTentouRecarregar) {
        sessionStorage.setItem(RELOAD_FLAG, "1");
        window.location.reload();
        // Mantém a promise pendente até o reload acontecer, evitando piscar a tela de erro.
        return new Promise<{ default: T }>(() => {});
      }
      throw error;
    }
  });
}
