/**
 * machine/ui.js
 * ---------------------------------------------------------------------------
 * Fake UI genérica. As peças de interface são blocos-item reais no container
 * da entidade. Este módulo monta a interface, protege as peças e desenha a
 * barra de progresso — tudo parametrizado pelo `layout` da definição.
 *
 * Uma máquina sem arte de UI ainda usa isto: basta `backgroundSlots: []` e
 * `progressSlot: null` — os slots não-funcionais recebem o placeholder.
 * ---------------------------------------------------------------------------
 */

import { NAMESPACE } from "../core/constants";
import { criarItem, inventarioDe } from "../core/items";

/** Reconhece qualquer peça de interface deste addon. */
export function ehItemDeUi(item) {
  if (!item) return false;
  const id = item.typeId;
  return (
    id.startsWith(`${NAMESPACE}:`) &&
    (id.includes("_ui_") || id.includes("placeholder"))
  );
}

const idFundo = (L, slot) => `${L.uiBackgroundId}_${slot}`;
const idProgresso = (L, frame) => `${L.uiProgressId}_${frame}`;

function reservados(L) {
  const r = [...L.inputs, ...L.outputs, ...L.backgroundSlots];
  if (L.progressSlot != null) r.push(L.progressSlot);
  return r;
}

/** Montagem inicial, uma vez no spawn da entidade. */
export function montarUi(def, entity) {
  const inv = inventarioDe(entity);
  if (!inv) return;
  const L = def.layout;
  const res = reservados(L);

  for (const slot of L.outputs) inv.setItem(slot, criarItem(L.placeholderItem));

  for (let slot = 0; slot < inv.size; slot++) {
    if (L.inputs.includes(slot) || L.outputs.includes(slot)) continue;
    if (L.backgroundSlots.includes(slot)) {
      inv.setItem(slot, criarItem(idFundo(L, slot)));
    } else if (slot === L.progressSlot) {
      inv.setItem(slot, criarItem(idProgresso(L, 0)));
    } else if (!res.includes(slot)) {
      inv.setItem(slot, criarItem(L.placeholderItem));
    }
  }
}

/**
 * Repõe uma peça retirada/trocada. Item legítimo do jogador num slot que não
 * é dele volta ao mundo (nunca some).
 */
function forcarPeca(entity, inv, slot, esperado) {
  const atual = inv.getItem(slot);
  if (atual?.typeId === esperado) return;
  if (atual && !ehItemDeUi(atual)) entity.dimension.spawnItem(atual, entity.location);
  inv.setItem(slot, criarItem(esperado));
}

/** Varredura por tick: garante que toda peça de UI está no lugar. */
export function restaurarSlotsDeUi(def, entity, inv, frameProp) {
  const L = def.layout;

  for (const slot of L.backgroundSlots) forcarPeca(entity, inv, slot, idFundo(L, slot));

  if (L.progressSlot != null) {
    const frame = entity.getDynamicProperty(frameProp) ?? 0;
    forcarPeca(entity, inv, L.progressSlot, idProgresso(L, frame));
  }

  const res = reservados(L);
  for (let slot = 0; slot < inv.size; slot++) {
    if (res.includes(slot)) continue;
    forcarPeca(entity, inv, slot, L.placeholderItem);
  }
}

/** Troca o item da barra só quando o frame muda de verdade. */
export function aplicarFrame(def, entity, inv, frame, frameProp) {
  const L = def.layout;
  if (L.progressSlot == null) return;
  if (entity.getDynamicProperty(frameProp) === frame) return;
  inv.setItem(L.progressSlot, criarItem(idProgresso(L, frame)));
  entity.setDynamicProperty(frameProp, frame);
}

/** Tira as peças do inventário e do cursor do jogador. */
export function limparInventarioDoJogador(player) {
  const inv = inventarioDe(player);
  if (inv) {
    for (let slot = 0; slot < inv.size; slot++) {
      if (ehItemDeUi(inv.getItem(slot))) inv.setItem(slot, undefined);
    }
  }
  const cursor = player.getComponent("minecraft:cursor_inventory");
  if (cursor && ehItemDeUi(cursor.item)) cursor.clear();
}

/** Apaga peças que viraram item no chão perto da máquina. */
export function limparItensDropados(entity) {
  const dropados = entity.dimension.getEntities({
    type: "minecraft:item",
    location: entity.location,
    maxDistance: 4,
  });
  for (const drop of dropados) {
    const item = drop.getComponent("minecraft:item")?.itemStack;
    if (ehItemDeUi(item)) drop.remove();
  }
}
