/**
 * machine/component.js
 * ---------------------------------------------------------------------------
 * Fábrica dos custom components (V2) de uma máquina. Só amarra os ganchos do
 * bloco aos módulos genéricos — a lógica de negócio vive no processTick da
 * definição.
 * ---------------------------------------------------------------------------
 */

import { AIR_BLOCK_ID } from "../core/constants";
import {
  acharEntidade,
  criarEntidade,
  garantirPosicao,
  removerEntidade,
} from "./entity";
import { atualizarStatus } from "./status";

export function makeMachineComponent(def) {
  return {
    onPlace: ({ block, dimension }) => {
      // Reaproveita a entidade se ela já existir, mas o gancho onPlaced roda
      // SEMPRE. Antes havia um `return` aqui que pulava o gancho — era o que
      // fazia a bateria voltar zerada quando uma entidade era reencontrada.
      let entity = acharEntidade(def, block, dimension);
      if (!entity?.isValid) entity = criarEntidade(def, block, dimension);
      def.onPlaced?.(entity, block, def);
    },

    onPlayerBreak: ({ block, dimension, player }) => {
      const entity = acharEntidade(def, block, dimension);
      // Gancho opcional ANTES de remover: permite salvar estado no item dropado
      def.onBroken?.(entity, block, player, def);
      removerEntidade(entity);
    },

    onTick: ({ block, dimension }) => {
      const entity = acharEntidade(def, block, dimension);
      if (!entity?.isValid) {
        // Entidade sumiu (/kill, chunk, etc.): recria e deixa a máquina
        // restaurar o estado que ela persiste por posição (ex.: carga).
        const nova = criarEntidade(def, block, dimension);
        def.onRestored?.(nova, block, def);
        return;
      }
      garantirPosicao(entity, block);
      def.processTick(entity, def);
      // Status em tempo real (agachar + olhar), se a máquina expõe statusTexto
      atualizarStatus(entity, block, def);
    },
  };
}

/** Blocos de UI nunca devem existir no mundo: viram ar se forem colocados. */
export const uiPlaceholderComponent = {
  onPlace: ({ block }) => block.setType(AIR_BLOCK_ID),
};
