/**
 * core/items.js
 * ---------------------------------------------------------------------------
 * Manipulação de ItemStack e de containers.
 * ---------------------------------------------------------------------------
 */

import { ItemStack } from "@minecraft/server";

/** Cria uma unidade de um item. */
export function criarItem(typeId, amount = 1) {
  return new ItemStack(typeId, amount);
}

/** Atalho para o container de inventário de uma entidade ou bloco. */
export function inventarioDe(alvo) {
  return alvo?.getComponent("minecraft:inventory")?.container;
}

/**
 * Remove uma unidade do slot. Se era a última, o slot fica vazio.
 */
export function consumirUm(container, slot) {
  const item = container.getItem(slot);
  if (!item) return;
  container.setItem(
    slot,
    item.amount > 1 ? criarItem(item.typeId, item.amount - 1) : undefined,
  );
}

/**
 * True se `item` pode receber mais `quantidade` unidades sem passar do
 * tamanho máximo da pilha.
 */
export function cabeNaPilha(item, quantidade = 1) {
  return item.amount + quantidade <= item.maxAmount;
}
