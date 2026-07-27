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
 * Registro direto: usado no momento em que o jogador quebra a bateria, para o
 * fluxo "quebrei e recoloquei" não depender de nada além disso.
 */
export function registrarCargaDoJogador(player, carga) {
  if (!player || carga <= 0) return;
  try {
    player.setDynamicProperty(PROP_CARGA_NA_MAO, carga);
    player.setDynamicProperty(PROP_CARGA_TICK, system.currentTick);
  } catch {
    // jogador saiu; nada a fazer
  }
}

export function registrarTransferenciaDeBateria() {
  // Todo tick: se há bateria carregada na mão, guarda a carga dela no jogador.
  system.runInterval(() => {
    for (const player of world.getPlayers()) {
      const item = itemNaMao(player);
      if (item?.typeId !== BATTERY_BLOCK_ID) continue;

      const carga = cargaDaLore(item);
      if (carga > 0) registrarCargaDoJogador(player, carga);
    }
  }, 1);
}

/**
 * Carga registrada do jogador mais próximo do bloco colocado.
 * Retorna 0 se não houver registro válido (bateria nova ou descarregada).
 */
export function consumirCargaPendente(dimension, location) {
  const player = dimension.getPlayers({
    location,
    maxDistance: 8,
    closest: 1,
  })[0];
  if (!player) return 0;

  const carga = player.getDynamicProperty(PROP_CARGA_NA_MAO) ?? 0;
  const tick = player.getDynamicProperty(PROP_CARGA_TICK) ?? -Infinity;

  if (carga <= 0) return 0;
  if (system.currentTick - tick > VALIDADE) return 0;

  // Consome o registro para não reaproveitar numa colocação seguinte
  player.setDynamicProperty(PROP_CARGA_NA_MAO, undefined);
  player.setDynamicProperty(PROP_CARGA_TICK, undefined);

  return carga;
}
