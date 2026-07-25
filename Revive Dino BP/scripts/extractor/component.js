/**
 * extractor/component.js
 * ---------------------------------------------------------------------------
 * Os custom components (V2) do Extrator. Só amarram os ganchos do bloco aos
 * módulos que fazem o trabalho — nenhuma regra de negócio vive aqui.
 * ---------------------------------------------------------------------------
 */

import { AIR_BLOCK_ID } from "../core/constants";
import {
  acharEntidade,
  criarEntidade,
  garantirPosicao,
  removerEntidade,
} from "./entity";
import { tickExtractor } from "./processing";

/** Component do bloco real do Extrator. */
export const extractorMachineComponent = {
  onPlace: ({ block, dimension }) => {
    if (acharEntidade(block, dimension)) return;
    criarEntidade(block, dimension);
  },

  onPlayerBreak: ({ block, dimension }) => {
    removerEntidade(acharEntidade(block, dimension));
  },

  /**
   * Dirige o processamento. Vem do `minecraft:tick` do bloco, igual ao
   * Furnaces, deixando o timer da entidade livre para o funil.
   */
  onTick: ({ block, dimension }) => {
    const entity = acharEntidade(block, dimension);

    // Sumiu (/kill, chunk corrompido): recria para a UI não morrer de vez
    if (!entity?.isValid) {
      criarEntidade(block, dimension);
      return;
    }

    garantirPosicao(entity, block);
    tickExtractor(entity);
  },
};

/** Blocos de UI nunca devem existir no mundo: viram ar se forem colocados. */
export const uiPlaceholderComponent = {
  onPlace: ({ block }) => block.setType(AIR_BLOCK_ID),
};
