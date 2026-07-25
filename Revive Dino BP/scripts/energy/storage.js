/**
 * energy/storage.js
 * ---------------------------------------------------------------------------
 * Armazenamento de energia por posição de bloco.
 *
 * Blocos no Bedrock NÃO têm dynamic properties — então a carga (e o estado de
 * combustível do gerador) vive em dynamic properties do MUNDO, indexadas pela
 * posição do bloco. Persiste entre reloads e não exige uma entidade por bloco.
 *
 * Limpeza: chamar `limparEnergia` quando o bloco é removido, senão a
 * propriedade fica órfã (vazamento pequeno, mas evitável).
 * ---------------------------------------------------------------------------
 */

import { world } from "@minecraft/server";

const chaveCarga = (l) => `rd_energy:${l.x},${l.y},${l.z}`;
const chaveFuel = (l) => `rd_fuel:${l.x},${l.y},${l.z}`;
const chaveRate = (l) => `rd_rate:${l.x},${l.y},${l.z}`;

// ---------------------------------------------------------------------------
// CARGA
// ---------------------------------------------------------------------------
export function getCarga(location) {
  return world.getDynamicProperty(chaveCarga(location)) ?? 0;
}

export function setCarga(location, valor) {
  world.setDynamicProperty(chaveCarga(location), Math.max(0, valor));
}

/** Soma carga respeitando o teto. Retorna a carga final. */
export function addCarga(location, quantidade, teto) {
  const nova = Math.min(getCarga(location) + quantidade, teto);
  setCarga(location, nova);
  return nova;
}

/** Consome se houver o suficiente. Retorna true se consumiu. */
export function consumirCarga(location, quantidade) {
  const atual = getCarga(location);
  if (atual < quantidade) return false;
  setCarga(location, atual - quantidade);
  return true;
}

// ---------------------------------------------------------------------------
// COMBUSTÍVEL (só o gerador usa)
// ---------------------------------------------------------------------------
export function getFuel(location) {
  return world.getDynamicProperty(chaveFuel(location)) ?? 0;
}

export function setFuel(location, valor) {
  world.setDynamicProperty(chaveFuel(location), Math.max(0, valor));
}

/** Taxa de geração (energia/tick) do combustível que está queimando. */
export function getRate(location) {
  return world.getDynamicProperty(chaveRate(location)) ?? 0;
}

export function setRate(location, valor) {
  world.setDynamicProperty(chaveRate(location), valor);
}

// ---------------------------------------------------------------------------
// LIMPEZA
// ---------------------------------------------------------------------------
export function limparEnergia(location) {
  world.setDynamicProperty(chaveCarga(location), undefined);
  world.setDynamicProperty(chaveFuel(location), undefined);
  world.setDynamicProperty(chaveRate(location), undefined);
}
