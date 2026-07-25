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

export function makeMachineComponent(def) {
  return {
    onPlace: ({ block, dimension }) => {
      if (acharEntidade(def, block, dimension)) return;
      criarEntidade(def, block, dimension);
    },

    onPlayerBreak: ({ block, dimension }) => {
      removerEntidade(acharEntidade(def, block, dimension));
    },

    onTick: ({ block, dimension }) => {
      const entity = acharEntidade(def, block, dimension);
      if (!entity?.isValid) {
        criarEntidade(def, block, dimension);
        return;
      }
      garantirPosicao(entity, block);
      def.processTick(entity, def);
    },
  };
}

/** Blocos de UI nunca devem existir no mundo: viram ar se forem colocados. */
export const uiPlaceholderComponent = {
  onPlace: ({ block }) => block.setType(AIR_BLOCK_ID),
};
