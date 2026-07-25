/**
 * extractor/hopper.js
 * ---------------------------------------------------------------------------
 * Compatibilidade com funil. A entidade tem `can_be_siphoned_from: false`,
 * então o funil vanilla não a enxerga (senão sugaria as peças de UI) — a
 * troca é feita na mão, respeitando a direção do funil como o jogo faria.
 *
 * Diferente do Furnaces (que amarra face→papel), aqui o item é roteado pelo
 * slot que a receita aceitar, então um único funil alimenta fóssil e tubo.
 *
 * Dirigido pelo `minecraft:timer` da entidade (evento hopper_compatibility).
 * ---------------------------------------------------------------------------
 */

import { world } from "@minecraft/server";
import {
  EVENT_HOPPER_COMPATIBILITY,
  HOPPER_BLOCK_ID,
  STATE_HOPPER_FACING,
} from "../core/constants";
import { criarItem, inventarioDe } from "../core/items";
import { layout, slotParaIngrediente } from "./config";

/**
 * Face vizinha -> valor de `facing_direction` que o funil precisa ter para
 * estar APONTANDO para o Extrator.
 * (0=baixo 1=cima 2=norte 3=sul 4=oeste 5=leste)
 */
const FACES_DE_ENTRADA = {
  above: 0, // funil em cima precisa apontar para baixo
  north: 3, // funil ao norte precisa apontar para o sul
  south: 2,
  east: 4,
  west: 5,
};

export function registrarCompatibilidadeComFunil() {
  world.afterEvents.dataDrivenEntityTrigger.subscribe(
    ({ entity }) => {
      if (!entity?.isValid) return;

      const block = entity.dimension.getBlock(entity.location);
      if (!block || block.isAir) return;

      const inv = inventarioDe(entity);
      if (!inv) return;

      for (const [face, facing] of Object.entries(FACES_DE_ENTRADA)) {
        const funil = block[face]();
        if (funil?.typeId !== HOPPER_BLOCK_ID) continue;
        if (funil.permutation.getState(STATE_HOPPER_FACING) !== facing) continue;
        inserirDoFunil(funil, inv);
      }

      const abaixo = block.below();
      if (abaixo?.typeId === HOPPER_BLOCK_ID) extrairParaFunil(inv, abaixo);
    },
    { eventTypes: [EVENT_HOPPER_COMPATIBILITY] },
  );
}

/**
 * Move 1 item do funil para o slot de entrada que a receita aceitar.
 * Uma unidade por ciclo, como o funil do jogo.
 */
function inserirDoFunil(funil, inv) {
  const funilInv = inventarioDe(funil);
  if (!funilInv) return;

  for (let slot = 0; slot < funilInv.size; slot++) {
    const item = funilInv.getItem(slot);
    if (!item) continue;

    const destino = slotParaIngrediente(item);
    if (destino === undefined) continue;

    const atual = inv.getItem(destino);
    if (
      atual &&
      (atual.typeId !== item.typeId || atual.amount >= atual.maxAmount)
    )
      continue;

    inv.setItem(destino, criarItem(item.typeId, (atual?.amount ?? 0) + 1));
    funilInv.setItem(
      slot,
      item.amount > 1 ? criarItem(item.typeId, item.amount - 1) : undefined,
    );
    return;
  }
}

/**
 * Puxa 1 item da saída para o funil de baixo. O placeholder invisível nunca
 * é puxado — para o funil, saída com placeholder é saída vazia.
 */
function extrairParaFunil(inv, funil) {
  const funilInv = inventarioDe(funil);
  if (!funilInv) return;

  const saida = inv.getItem(layout.output);
  if (!saida || saida.typeId === layout.placeholderItem) return;

  for (let slot = 0; slot < funilInv.size; slot++) {
    const alvo = funilInv.getItem(slot);
    if (alvo && (alvo.typeId !== saida.typeId || alvo.amount >= alvo.maxAmount))
      continue;

    funilInv.setItem(slot, criarItem(saida.typeId, (alvo?.amount ?? 0) + 1));
    inv.setItem(
      layout.output,
      saida.amount > 1
        ? criarItem(saida.typeId, saida.amount - 1)
        : criarItem(layout.placeholderItem),
    );
    return;
  }
}
