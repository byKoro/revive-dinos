/**
 * fossil/hammer.js
 * ---------------------------------------------------------------------------
 * Desgaste do Martelo de Escavação.
 *
 * O dano é aplicado na mão porque o minigame usa `entityHitBlock` (bater sem
 * quebrar), evento em que o motor não consome durabilidade sozinho.
 * ---------------------------------------------------------------------------
 */

import { GameMode } from "@minecraft/server";
import { HAMMER_ITEM_ID } from "../core/constants";

/** O item na mão principal é o martelo? */
export function ehMartelo(item) {
  return item?.typeId === HAMMER_ITEM_ID;
}

/**
 * Gasta 1 ponto de durabilidade. Quebra o item (e toca o som) ao chegar no
 * limite. Criativo não gasta nada.
 */
export function desgastarMartelo(player, slot, item) {
  if (player.getGameMode() === GameMode.creative) return;

  const durability = item.getComponent("minecraft:durability");
  if (!durability) return;

  if (durability.damage + 1 >= durability.maxDurability) {
    slot.setItem(undefined);
    player.playSound("random.break");
    return;
  }

  durability.damage += 1;
  slot.setItem(item);
}
