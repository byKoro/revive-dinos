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
      if (acharEntidade(def, block, dimension)) return;
      const entity = criarEntidade(def, block, dimension);
      // Gancho opcional: permite restaurar estado salvo no item (ex.: carga)
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
        criarEntidade(def, block, dimension);
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
