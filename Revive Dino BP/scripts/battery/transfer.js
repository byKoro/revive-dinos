/**
 * battery/transfer.js
 * ---------------------------------------------------------------------------
 * Ponte entre o item de bateria e o bloco colocado.
 *
 * O gancho `onPlace` do bloco não recebe o item usado, e quando ele roda o item
 * já saiu da mão. Também não há evento estável de colocação de bloco
 * (`playerInteractWithBlock` não dispara para colocação e `playerPlaceBlock`
 * ainda é experimental).
 *
 * Solução: a carga da bateria que o jogador está SEGURANDO é gravada numa
 * dynamic property DELE, atualizada a cada tick. Ao colocar, o `onPlaced` lê
 * esse valor.
 *
 * Por que isso funciona com várias baterias em qualquer ordem: o valor guardado
 * é sempre o da bateria que está na mão AGORA. Como o jogador precisa estar
 * segurando exatamente a bateria que vai colocar, o valor lido é o dela — não
 * importa quantas ele tenha quebrado nem em que ordem vá recolocar.
 * ---------------------------------------------------------------------------
 */

import { system, world } from "@minecraft/server";
import { BATTERY_BLOCK_ID } from "../energy/constants";
import { cargaDaLore } from "./charge";

const PROP_CARGA_NA_MAO = "revive_dinos:held_charge";
const PROP_CARGA_TICK = "revive_dinos:held_tick";

/** Por quantos ticks o registro continua válido. */
const VALIDADE = 200;

function itemNaMao(player) {
  try {
    return player
      .getComponent("minecraft:equippable")
      ?.getEquipmentSlot("Mainhand")
      ?.getItem();
  } catch {
    return undefined;
  }
}

/**
 * Registra a carga da bateria que o jogador tem em mão.
 *
 * Aceita 0 de propósito: uma bateria descarregada precisa SOBRESCREVER o
 * registro anterior. Ignorar o zero era um exploit — ao segurar uma bateria
 * vazia, o valor da última bateria carregada continuava lá e era aplicado na
 * colocação, criando energia do nada (bateria duplicada).
 */
export function registrarCargaDoJogador(player, carga) {
  if (!player) return;
  try {
    player.setDynamicProperty(PROP_CARGA_NA_MAO, Math.max(0, carga));
    player.setDynamicProperty(PROP_CARGA_TICK, system.currentTick);
  } catch {
    // jogador saiu; nada a fazer
  }
}

export function registrarTransferenciaDeBateria() {
  // Todo tick: o registro espelha EXATAMENTE a bateria que está na mão —
  // inclusive quando ela está vazia (carga 0).
  system.runInterval(() => {
    for (const player of world.getPlayers()) {
      const item = itemNaMao(player);
      if (item?.typeId !== BATTERY_BLOCK_ID) continue;
      registrarCargaDoJogador(player, cargaDaLore(item));
    }
  }, 1);
}

/**
 * Carga da bateria que o jogador mais próximo tinha em mão.
 *
 * Retorna `undefined` quando não há registro (aí o chamador pode tentar outra
 * fonte) e um número — possivelmente 0 — quando há. A diferença importa: um
 * 0 explícito significa "a bateria colocada estava vazia" e precisa vencer
 * qualquer valor antigo, senão vira duplicação de energia.
 */
export function consumirCargaPendente(dimension, location) {
  const player = dimension.getPlayers({
    location,
    maxDistance: 8,
    closest: 1,
  })[0];
  if (!player) return undefined;

  const carga = player.getDynamicProperty(PROP_CARGA_NA_MAO);
  const tick = player.getDynamicProperty(PROP_CARGA_TICK) ?? -Infinity;

  // Consome sempre que existir, para não reaproveitar numa colocação seguinte
  if (carga !== undefined) {
    player.setDynamicProperty(PROP_CARGA_NA_MAO, undefined);
    player.setDynamicProperty(PROP_CARGA_TICK, undefined);
  }

  if (carga === undefined) return undefined;
  if (system.currentTick - tick > VALIDADE) return undefined;

  return Math.max(0, carga);
}
