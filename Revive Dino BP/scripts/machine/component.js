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
import { gravarEstado, lerEstado, limparEstado } from "./state";
import { atualizarStatus } from "./status";
import { atualizarVisual } from "./visual";

/** Contador de ticks sem achar a entidade, por posição de bloco. */
const PREFIXO_FALTAS = "rd_miss";

/** Quantos ticks esperar a entidade carregar antes de criar outra (~1s). */
const TICKS_DE_ESPERA = 20;

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
      limparEstado(PREFIXO_FALTAS, block.location);
    },

    onTick: ({ block, dimension }) => {
      const entity = acharEntidade(def, block, dimension);
      if (!entity?.isValid) {
        // Ao entrar no mundo o bloco pode ticar ANTES da entidade carregar.
        // Recriar na hora produzia uma duplicata (uma delas ficava sem tick e
        // sem proteção da UI), então esperamos um pouco antes de desistir dela.
        const faltas = lerEstado(PREFIXO_FALTAS, block.location, 0) + 1;
        if (faltas < TICKS_DE_ESPERA) {
          gravarEstado(PREFIXO_FALTAS, block.location, faltas);
          return;
        }
        limparEstado(PREFIXO_FALTAS, block.location);

        // Sumiu de verdade (/kill, chunk corrompido): recria e deixa a máquina
        // restaurar o estado que ela persiste por posição (ex.: carga).
        const nova = criarEntidade(def, block, dimension);
        def.onRestored?.(nova, block, def);
        return;
      }
      limparEstado(PREFIXO_FALTAS, block.location);
      garantirPosicao(entity, block);
      def.processTick(entity, def);
      // Animação da frente + som de processamento. Depois do processTick, que é
      // quem marca o estágio; este é o único gancho com acesso ao bloco.
      atualizarVisual(entity, block, def);
      // Status em tempo real (agachar + olhar), se a máquina expõe statusTexto
      atualizarStatus(entity, block, def);
    },
  };
}

/** Blocos de UI nunca devem existir no mundo: viram ar se forem colocados. */
export const uiPlaceholderComponent = {
  onPlace: ({ block }) => block.setType(AIR_BLOCK_ID),
};
