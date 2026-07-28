/**
 * synthesizer/config.js
 * ---------------------------------------------------------------------------
 * Configuração do Sintetizador de Biomassa.
 *
 * Converte matéria orgânica em Biomassa. O rendimento depende de quão "rico"
 * é o item: comida básica rende 1, carne 2, item cozido/raro 3, exótico 5.
 *
 * Para adicionar um insumo novo, basta uma linha em RENDIMENTO — a lógica em
 * processing.js não precisa mudar.
 * ---------------------------------------------------------------------------
 */

export const BIOMASS_ITEM_ID = "revive_dinos:biomass";

/** Layout do container (a arte da UI virá depois; por ora só os slots). */
export const layout = {
  input: 11, // matéria orgânica
  output: 15, // biomassa
  placeholderItem: "revive_dinos:placeholder_invisible",
};

/** Ticks para processar uma unidade. */
export const TEMPO = 100; // 5 segundos

/** Rendimento em biomassa por item de entrada. */
const RENDIMENTO = {
  // --- básicos (1) ---
  "minecraft:apple": 1,
  "minecraft:bread": 1,
  "minecraft:potato": 1,
  "minecraft:carrot": 1,
  "minecraft:beetroot": 1,
  "minecraft:wheat": 1,
  "minecraft:melon_slice": 1,
  "minecraft:sweet_berries": 1,
  "minecraft:glow_berries": 1,
  "minecraft:kelp": 1,
  "minecraft:dried_kelp": 1,
  "minecraft:brown_mushroom": 1,
  "minecraft:red_mushroom": 1,
  "minecraft:sugar_cane": 1,
  "minecraft:rotten_flesh": 1,
  "minecraft:spider_eye": 1,

  // --- carne crua e peixe (2) ---
  "minecraft:beef": 2,
  "minecraft:chicken": 2,
  "minecraft:porkchop": 2,
  "minecraft:mutton": 2,
  "minecraft:rabbit": 2,
  "minecraft:cod": 2,
  "minecraft:salmon": 2,
  "minecraft:tropical_fish": 2,
  "minecraft:pufferfish": 2,
  "minecraft:egg": 2,

  // --- cozido / mais nutritivo (3) ---
  "minecraft:cooked_beef": 3,
  "minecraft:cooked_chicken": 3,
  "minecraft:cooked_porkchop": 3,
  "minecraft:cooked_mutton": 3,
  "minecraft:cooked_rabbit": 3,
  "minecraft:cooked_cod": 3,
  "minecraft:cooked_salmon": 3,
  "minecraft:baked_potato": 3,
  "minecraft:golden_carrot": 3,
  "minecraft:pumpkin_pie": 3,
  "minecraft:mushroom_stew": 3,
  "minecraft:rabbit_stew": 3,
  "minecraft:beetroot_soup": 3,
  "minecraft:suspicious_stew": 3,
  "minecraft:honey_bottle": 3,

  // --- exóticos (5) ---
  "minecraft:turtle_egg": 5,
  "minecraft:golden_apple": 5,
  "minecraft:enchanted_golden_apple": 5,
  "minecraft:chorus_fruit": 5,
};

/** Sufixos que valem como muda/semente (rendimento baixo). */
const SEMENTES = ["_seeds", "_sapling"];

/**
 * Quanta biomassa um item rende, ou undefined se a máquina não aceita.
 */
export function rendimentoDe(typeId) {
  if (!typeId) return undefined;
  if (RENDIMENTO[typeId] !== undefined) return RENDIMENTO[typeId];
  if (SEMENTES.some((s) => typeId.endsWith(s))) return 1;
  return undefined;
}

/** Itens que a máquina pode produzir (proteção do slot de saída). */
export function saidasPossiveis() {
  return new Set([BIOMASS_ITEM_ID]);
}
