/**
 * battery/transfer.js
 * ---------------------------------------------------------------------------
 * Ponte entre o item de bateria e o bloco colocado.
 *
 * Problema: o gancho onPlace do bloco não recebe o item que foi usado, e no
 * momento em que ele roda o item já saiu da mão. Solução: capturar a carga
 * ANTES da colocação (no interact) e guardá-la por jogador; o onPlaced então
 * consome essa carga pendente.
 * ---------------------------------------------------------------------------
 */

import { world } from "@minecraft/server";
import { BATTERY_BLOCK_ID } from "../energy/constants";
import { cargaDaLore } from "./charge";

/** playerId -> { carga, tick } */
const pendentes = new Map();

/** Descarta captura antiga (o jogador desistiu de colocar). */
const VALIDADE_TICKS = 40;

export function registrarTransferenciaDeBateria() {
  world.beforeEvents.playerInteractWithBlock.subscribe((ev) => {
    const item = ev.itemStack;
    if (item?.typeId !== BATTERY_BLOCK_ID) return;

    const carga = cargaDaLore(item);
    if (carga > 0) {
      pendentes.set(ev.player.id, {
        carga,
        tick: world.getAbsoluteTime(),
      });
    }
  });
}

/**
 * Consome a carga que o jogador mais próximo tinha capturada. Retorna 0 se
 * não houver nada pendente (bateria nova, ou colocada sem carga).
 */
export function consumirCargaPendente(dimension, location) {
  const player = dimension.getPlayers({
    location,
    maxDistance: 8,
    closest: 1,
  })[0];
  if (!player) return 0;

  const pend = pendentes.get(player.id);
  if (!pend) return 0;

  pendentes.delete(player.id);

  // Captura velha demais: ignora (não era desta colocação)
  if (world.getAbsoluteTime() - pend.tick > VALIDADE_TICKS) return 0;

  return pend.carga;
}
