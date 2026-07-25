/**
 * extractor/ui.js
 * ---------------------------------------------------------------------------
 * A "Fake UI": as peças de interface são blocos-item reais dentro do
 * container que o jogador abre. Este módulo monta a interface, desenha a
 * barra de progresso e protege as peças de serem retiradas.
 *
 * `ItemLockMode.slot` foi testado e revertido (poluía o tooltip e não
 * impedia mover de fato). A defesa real é a varredura por tick daqui.
 * ---------------------------------------------------------------------------
 */

import {
  DROPPED_ITEM_SCAN_RADIUS,
  ITEM_ENTITY_TYPE_ID,
  NAMESPACE,
  PROP_FRAME,
} from "../core/constants";
import { criarItem, inventarioDe } from "../core/items";
import { layout } from "./config";

/** Reconhece qualquer peça de interface deste addon. */
export function ehItemDeUi(item) {
  if (!item) return false;
  const id = item.typeId;
  return (
    id.startsWith(`${NAMESPACE}:`) &&
    (id.includes("_ui_") || id.includes("placeholder"))
  );
}

const idDeFundo = (slot) => `${layout.uiBackgroundId}_${slot}`;
const idDeProgresso = (frame) => `${layout.uiProgressId}_${frame}`;

/** Slots que têm dono: entradas, saída, fundo e barra de progresso. */
function slotsReservados() {
  return [
    layout.inputA,
    layout.inputB,
    layout.output,
    ...layout.backgroundSlots,
    layout.progressSlot,
  ];
}

/** Montagem inicial da interface, feita uma vez no spawn da entidade. */
export function montarUi(entity) {
  const inv = inventarioDe(entity);
  if (!inv) return;

  const funcionais = [layout.inputA, layout.inputB, layout.output];
  const reservados = slotsReservados();

  inv.setItem(layout.output, criarItem(layout.placeholderItem));

  for (let slot = 0; slot < inv.size; slot++) {
    if (funcionais.includes(slot)) continue;

    if (layout.backgroundSlots.includes(slot)) {
      inv.setItem(slot, criarItem(idDeFundo(slot)));
    } else if (slot === layout.progressSlot) {
      inv.setItem(slot, criarItem(idDeProgresso(0)));
    } else if (!reservados.includes(slot)) {
      inv.setItem(slot, criarItem(layout.placeholderItem));
    }
  }
}

/**
 * Repõe uma peça que tenha sido retirada ou trocada de lugar. Item legítimo
 * do jogador que apareça num slot que não é dele é devolvido ao mundo,
 * nunca apagado.
 */
function forcarPeca(entity, inv, slot, esperado) {
  const atual = inv.getItem(slot);
  if (atual?.typeId === esperado) return;

  if (atual && !ehItemDeUi(atual)) {
    entity.dimension.spawnItem(atual, entity.location);
  }
  inv.setItem(slot, criarItem(esperado));
}

/** Varredura por tick: garante que toda peça de UI está no lugar. */
export function restaurarSlotsDeUi(entity, inv) {
  for (const slot of layout.backgroundSlots) {
    forcarPeca(entity, inv, slot, idDeFundo(slot));
  }

  // barra de progresso: confere contra o frame atual, não só quando ele muda
  const frame = entity.getDynamicProperty(PROP_FRAME) ?? 0;
  forcarPeca(entity, inv, layout.progressSlot, idDeProgresso(frame));

  const reservados = slotsReservados();
  for (let slot = 0; slot < inv.size; slot++) {
    if (reservados.includes(slot)) continue;
    forcarPeca(entity, inv, slot, layout.placeholderItem);
  }
}

/** Troca o item da barra só quando o frame muda de verdade. */
export function aplicarFrame(entity, inv, frame) {
  if (entity.getDynamicProperty(PROP_FRAME) === frame) return;
  inv.setItem(layout.progressSlot, criarItem(idDeProgresso(frame)));
  entity.setDynamicProperty(PROP_FRAME, frame);
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

/** Apaga peças que tenham virado item no chão perto da máquina. */
export function limparItensDropados(entity) {
  const dropados = entity.dimension.getEntities({
    type: ITEM_ENTITY_TYPE_ID,
    location: entity.location,
    maxDistance: DROPPED_ITEM_SCAN_RADIUS,
  });

  for (const drop of dropados) {
    const item = drop.getComponent("minecraft:item")?.itemStack;
    if (ehItemDeUi(item)) drop.remove();
  }
}
