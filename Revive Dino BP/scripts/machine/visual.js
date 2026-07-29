/**
 * machine/visual.js
 * ---------------------------------------------------------------------------
 * Feedback de que a máquina está trabalhando: animação da textura frontal e o
 * som baixo de processamento.
 *
 * COMO O ESTÁGIO CHEGA AQUI
 * O processamento de cada máquina chama `marcarProgressoVisual` no mesmo lugar
 * em que já desenha a barra de progresso da UI. Ele grava o estágio e o tick em
 * que gravou. Quem lê é `atualizarVisual`, chamado no tick do BLOCO (é lá que
 * existe uma referência ao bloco para trocar a permutação).
 *
 * Esse "carimbo de tick" é de propósito: pausar é simplesmente parar de marcar.
 * Nenhum dos vários `return` do processamento (sem receita, sem energia, saída
 * cheia) precisa saber que existe animação — a frente apaga sozinha.
 * ---------------------------------------------------------------------------
 */

import { system } from "@minecraft/server";
import {
  MACHINE_SOUND_ID,
  MACHINE_SOUND_INTERVAL,
  MACHINE_SOUND_PITCH,
  MACHINE_SOUND_VOLUME,
  MACHINE_STAGES,
  MACHINE_STAGE_STALE_TICKS,
  PROP_SOUND_TICK,
  PROP_STAGE,
  PROP_STAGE_TICK,
  STATE_MACHINE_STAGE,
} from "../core/constants";

/**
 * Marca o estágio da frente a partir da fração de progresso (0..1).
 *
 * A fração é dividida em MACHINE_STAGES faixas iguais, então a frente passa
 * por todos os estágios acesos e volta para o 0 quando o ciclo termina.
 */
export function marcarProgressoVisual(entity, fracao) {
  if (entity?.isValid !== true) return;

  const limitada = Math.min(1, Math.max(0, fracao || 0));
  const estagio = Math.min(MACHINE_STAGES, 1 + Math.floor(limitada * MACHINE_STAGES));

  // Só escreve o estágio quando ele muda; o carimbo de tick vai sempre, porque
  // é ele que diz "ainda estou trabalhando".
  if (entity.getDynamicProperty(PROP_STAGE) !== estagio) {
    entity.setDynamicProperty(PROP_STAGE, estagio);
  }
  entity.setDynamicProperty(PROP_STAGE_TICK, system.currentTick);
}

/**
 * Versão para máquinas que querem animar em LOOP (ex.: gerador). Em vez de
 * mapear a fração de 0→1 num único passo, ciclam repetidamente 1→2→3→1→2→3...
 * a cada `cycleTicks` ticks enquanto o chamador continuar invocando.
 *
 * @param {Entity} entity
 * @param {number} cycleTicks  Duração completa de um ciclo (1→2→3)
 */
export function marcarProgressoVisualLoop(entity, cycleTicks) {
  if (entity?.isValid !== true) return;

  // Fração dentro do ciclo atual, derivada do tick global
  const posicaoNoCiclo = system.currentTick % cycleTicks;
  const fracao = posicaoNoCiclo / cycleTicks;
  const estagio = Math.min(MACHINE_STAGES, 1 + Math.floor(fracao * MACHINE_STAGES));

  if (entity.getDynamicProperty(PROP_STAGE) !== estagio) {
    entity.setDynamicProperty(PROP_STAGE, estagio);
  }
  entity.setDynamicProperty(PROP_STAGE_TICK, system.currentTick);
}

/** Estágio que vale agora: 0 se o processamento não marcou nos últimos ticks. */
function estagioAtual(entity) {
  const marcado = entity.getDynamicProperty(PROP_STAGE_TICK);
  if (typeof marcado !== "number") return 0;
  if (system.currentTick - marcado > MACHINE_STAGE_STALE_TICKS) return 0;

  const estagio = entity.getDynamicProperty(PROP_STAGE) ?? 0;
  if (!Number.isFinite(estagio)) return 0;
  return Math.min(MACHINE_STAGES, Math.max(0, Math.floor(estagio)));
}

/**
 * Aplica o estágio no bloco e toca o som. Chamado no tick do bloco.
 *
 * Só age em máquinas marcadas com `frontAnimada` na definição: as outras (ex.:
 * a bateria) não declaram o state `machine_stage` e `withState` lançaria.
 */
export function atualizarVisual(entity, block, def) {
  if (def.frontAnimada !== true) return;
  if (entity?.isValid !== true) return;

  const estagio = estagioAtual(entity);

  // setPermutation por tick seria caro e piscaria o bloco: só quando muda.
  if (block.permutation.getState(STATE_MACHINE_STAGE) !== estagio) {
    // Encadeia a partir da permutação atual para preservar fake_selection e
    // cardinal_direction (ver machine/selection.js).
    block.setPermutation(block.permutation.withState(STATE_MACHINE_STAGE, estagio));
  }

  if (estagio > 0) {
    tocarSom(entity, block);
    return;
  }

  // Parada: deixa o contador "estourado" para o som sair no primeiro tick do
  // próximo processamento, em vez de esperar o intervalo inteiro.
  if (entity.getDynamicProperty(PROP_SOUND_TICK) !== MACHINE_SOUND_INTERVAL) {
    entity.setDynamicProperty(PROP_SOUND_TICK, MACHINE_SOUND_INTERVAL);
  }
}

/** Som baixo, repetido a cada MACHINE_SOUND_INTERVAL ticks. */
function tocarSom(entity, block) {
  const contador = (entity.getDynamicProperty(PROP_SOUND_TICK) ?? 0) + 1;
  if (contador < MACHINE_SOUND_INTERVAL) {
    entity.setDynamicProperty(PROP_SOUND_TICK, contador);
    return;
  }
  entity.setDynamicProperty(PROP_SOUND_TICK, 0);

  block.dimension.playSound(MACHINE_SOUND_ID, block.center(), {
    volume: MACHINE_SOUND_VOLUME,
    pitch: MACHINE_SOUND_PITCH,
  });
}
