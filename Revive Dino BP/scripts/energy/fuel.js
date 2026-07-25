/**
 * energy/fuel.js
 * ---------------------------------------------------------------------------
 * Tabela de combustíveis do Gerador a Combustão.
 *
 * Cada combustível define:
 *   ticks -> quanto tempo (em ticks de queima) ele dura
 *   rate  -> energia gerada por tick enquanto queima
 *
 * O Bedrock não expõe API para "isto é combustível de fornalha e dura X", então
 * mantemos uma tabela. Cobre os combustíveis comuns + família da madeira via
 * sufixo; o Carvite (sintético) é o mais eficiente.
 * ---------------------------------------------------------------------------
 */

import { CARVITE_ITEM_ID } from "./constants";

const TABELA = {
  "minecraft:coal": { ticks: 1600, rate: 5 },
  "minecraft:charcoal": { ticks: 1600, rate: 5 },
  "minecraft:coal_block": { ticks: 16000, rate: 5 },
  "minecraft:blaze_rod": { ticks: 2400, rate: 8 },
  "minecraft:lava_bucket": { ticks: 20000, rate: 6 },
  "minecraft:dried_kelp_block": { ticks: 4000, rate: 5 },
  "minecraft:stick": { ticks: 100, rate: 3 },
  "minecraft:bamboo": { ticks: 50, rate: 3 },
  "minecraft:blaze_powder": { ticks: 1200, rate: 6 },
  [CARVITE_ITEM_ID]: { ticks: 3200, rate: 10 },
};

/** Sufixos da família da madeira (queimam como planks). */
const MADEIRA = [
  "_planks", "_log", "_wood", "_stem", "_hyphae",
  "_fence", "_slab", "_stairs", "_door", "_trapdoor",
];

/**
 * Info de combustível de um item, ou undefined se ele não queima.
 */
export function infoCombustivel(typeId) {
  if (!typeId) return undefined;
  if (TABELA[typeId]) return TABELA[typeId];

  // madeira genérica (evita listar cada tipo de árvore)
  if (MADEIRA.some((sufixo) => typeId.endsWith(sufixo))) {
    return { ticks: 300, rate: 4 };
  }
  return undefined;
}
