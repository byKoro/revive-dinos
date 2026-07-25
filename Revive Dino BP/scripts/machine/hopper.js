/**
 * machine/hopper.js
 * ---------------------------------------------------------------------------
 * Compatibilidade com funil, genérica. A entidade tem can_be_siphoned_from
 * false, entao a troca e feita na mao respeitando a direcao do funil.
 *
 * Roteamento por direcao (definido em `def.hopperRouting`):
 *   - top (facing 0)         -> inputA (primeiro input)
 *   - sides (facing 2,3,4,5) -> inputB (segundo input)
 *   - bottom                 -> puxa do output
 *
 * Se a definicao nao possuir `hopperRouting`, usa o fallback
 * `def.routeIngredient(item, def)` que roteia pelo tipo do item.
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

/**
 * Face vizinha -> facing_direction que o funil precisa ter para inserir.
 * (0=baixo 1=cima 2=norte 3=sul 4=oeste 5=leste)
 */
const FACES_DE_ENTRADA = {
  above: { facing: 0, direction: "top" },
  north: { facing: 3, direction: "side" },
  south: { facing: 2, direction: "side" },
  east:  { facing: 4, direction: "side" },
  west:  { facing: 5, direction: "side" },
};

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

      for (const [face, info] of Object.entries(FACES_DE_ENTRADA)) {
        const funil = block[face]();
        if (funil?.typeId !== HOPPER_BLOCK_ID) continue;
        if (funil.permutation.getState(STATE_HOPPER_FACING) !== info.facing) continue;
        inserirDoFunil(funil, inv, def, info.direction);
      }

      const abaixo = block.below();
      if (abaixo?.typeId === HOPPER_BLOCK_ID) extrairParaFunil(inv, abaixo, def);
    },
    { eventTypes: [EVENT_HOPPER_COMPATIBILITY] },
  );
}

/**
 * Resolve o slot de destino para um item vindo de um funil numa dada direcao.
 * Se a definicao tem `hopperRouting`, usa o mapa de direcao->slot.
 * Senao, cai no routeIngredient generico (roteia pelo tipo do item).
 */
function resolverDestino(item, def, direction) {
  if (def.hopperRouting) {
    const slot = def.hopperRouting[direction];
    return slot !== undefined ? slot : undefined;
  }
  return def.routeIngredient?.(item, def);
}

function inserirDoFunil(funil, inv, def, direction) {
  const funilInv = inventarioDe(funil);
  if (!funilInv) return;

  for (let slot = 0; slot < funilInv.size; slot++) {
    const item = funilInv.getItem(slot);
    if (!item) continue;
    const destino = resolverDestino(item, def, direction);
    if (destino === undefined) continue;

    const atual = inv.getItem(destino);
    // Se o slot tem placeholder, substitui diretamente
    if (atual && atual.typeId === def.layout.placeholderItem) {
      inv.setItem(destino, criarItem(item.typeId, 1));
      funilInv.setItem(
        slot,
        item.amount > 1 ? criarItem(item.typeId, item.amount - 1) : undefined,
      );
      return;
    }
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
