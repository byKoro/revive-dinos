/**
 * machine/hopper.js
 * ---------------------------------------------------------------------------
 * Compatibilidade com funil, genérica. A entidade tem can_be_siphoned_from
 * false, então a troca é feita na mão respeitando a direção do funil. O item
 * é roteado pelo slot que a definição aceitar (routeIngredient), e o funil de
 * baixo puxa do outputSlot (se a máquina tiver saída em item).
 * ---------------------------------------------------------------------------
 */

import { world } from "@minecraft/server";
import {
  EVENT_HOPPER_COMPATIBILITY,
  HOPPER_BLOCK_ID,
  STATE_HOPPER_FACING,
} from "../core/constants";
import { criarItem, inventarioDe } from "../core/items";
import { defPorEntidade } from "./registry";

/** Face vizinha -> facing_direction que o funil precisa ter para inserir. */
const FACES_DE_ENTRADA = { above: 0, north: 3, south: 2, east: 4, west: 5 };

export function registrarHopper() {
  world.afterEvents.dataDrivenEntityTrigger.subscribe(
    ({ entity }) => {
      if (!entity?.isValid) return;
      const def = defPorEntidade(entity.typeId);
      if (!def) return;

      const block = entity.dimension.getBlock(entity.location);
      if (!block || block.isAir) return;
      const inv = inventarioDe(entity);
      if (!inv) return;

      for (const [face, facing] of Object.entries(FACES_DE_ENTRADA)) {
        const funil = block[face]();
        if (funil?.typeId !== HOPPER_BLOCK_ID) continue;
        if (funil.permutation.getState(STATE_HOPPER_FACING) !== facing) continue;
        inserirDoFunil(funil, inv, def);
      }

      const abaixo = block.below();
      if (abaixo?.typeId === HOPPER_BLOCK_ID) extrairParaFunil(inv, abaixo, def);
    },
    { eventTypes: [EVENT_HOPPER_COMPATIBILITY] },
  );
}

function inserirDoFunil(funil, inv, def) {
  const funilInv = inventarioDe(funil);
  if (!funilInv) return;

  for (let slot = 0; slot < funilInv.size; slot++) {
    const item = funilInv.getItem(slot);
    if (!item) continue;
    const destino = def.routeIngredient?.(item, def);
    if (destino === undefined) continue;

    const atual = inv.getItem(destino);
    if (atual && (atual.typeId !== item.typeId || atual.amount >= atual.maxAmount)) continue;

    inv.setItem(destino, criarItem(item.typeId, (atual?.amount ?? 0) + 1));
    funilInv.setItem(
      slot,
      item.amount > 1 ? criarItem(item.typeId, item.amount - 1) : undefined,
    );
    return;
  }
}

function extrairParaFunil(inv, funil, def) {
  const saidaSlot = def.layout.outputSlot;
  if (saidaSlot === undefined) return;

  const funilInv = inventarioDe(funil);
  if (!funilInv) return;

  const saida = inv.getItem(saidaSlot);
  if (!saida || saida.typeId === def.layout.placeholderItem) return;

  for (let slot = 0; slot < funilInv.size; slot++) {
    const alvo = funilInv.getItem(slot);
    if (alvo && (alvo.typeId !== saida.typeId || alvo.amount >= alvo.maxAmount)) continue;

    funilInv.setItem(slot, criarItem(saida.typeId, (alvo?.amount ?? 0) + 1));
    inv.setItem(
      saidaSlot,
      saida.amount > 1
        ? criarItem(saida.typeId, saida.amount - 1)
        : criarItem(def.layout.placeholderItem),
    );
    return;
  }
}
