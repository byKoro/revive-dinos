/**
 * incubator/config.js
 * ---------------------------------------------------------------------------
 * Configuração da Incubadora.
 *
 * Receita: 1× DNA completo + N× Biomassa -> 1× Ovo daquela espécie.
 * N varia pela raridade: quanto mais raro o dinossauro, mais biomassa.
 *
 * Layout igual ao do Extrator Genético (mesmos slots e mesma arte de UI),
 * conforme pedido.
 * ---------------------------------------------------------------------------
 */

export const BIOMASS_ITEM_ID = "revive_dinos:biomass";

/** Layout idêntico ao do Extrator. */
export const layout = {
  inputA: 2, // DNA completo (slot de cima)
  inputB: 20, // biomassa (slot de baixo)
  output: 15, // ovo

  backgroundSlots: [9, 17],
  progressSlot: 26,

  uiBackgroundId: "revive_dinos:genetic_extractor_ui",
  uiProgressId: "revive_dinos:genetic_extractor_ui_progress",
  progressFrames: 19,

  placeholderItem: "revive_dinos:placeholder_invisible",
};

/** Ticks para incubar um ovo (o processo mais longo do addon). */
export const TEMPO = 1200; // 60 segundos

/** Biomassa necessária por espécie (mais raro = mais caro). */
export const BIOMASSA_POR_ESPECIE = {
  dodo: 8,
  triceratops: 12,
  pterodactyl: 16,
  velociraptor: 20,
  trex: 32,
};

export const ESPECIES = Object.keys(BIOMASSA_POR_ESPECIE);

const PREFIXO_COMPLETO = "revive_dinos:complete_dna_";

/** Espécie de um DNA completo, ou undefined se não for um DNA completo. */
export function especieDoDnaCompleto(typeId) {
  if (!typeId?.startsWith(PREFIXO_COMPLETO)) return undefined;
  const especie = typeId.slice(PREFIXO_COMPLETO.length);
  return ESPECIES.includes(especie) ? especie : undefined;
}

/** Id do ovo de uma espécie. */
export const ovoDe = (especie) => `revive_dinos:egg_${especie}`;

/** Itens que a máquina pode produzir (proteção do slot de saída). */
export function saidasPossiveis() {
  return new Set(ESPECIES.map(ovoDe));
}
