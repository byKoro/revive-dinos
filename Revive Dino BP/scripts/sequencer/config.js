/**
 * sequencer/config.js
 * ---------------------------------------------------------------------------
 * Configuração do Sequenciador Genético.
 *
 * Receita: 3× DNA incompleto DA MESMA ESPÉCIE + 1× Enzima de Replicação
 *          -> 1× DNA completo daquela espécie.
 *
 * São 3 slots separados de DNA (não uma pilha de 3) porque o DNA é
 * intencionalmente não-empilhável — cada extração é uma amostra única.
 * ---------------------------------------------------------------------------
 */

export const ENZYME_ITEM_ID = "revive_dinos:replication_enzyme";

/** Layout do container, definido pelo usuário. */
export const layout = {
  dnaSlots: [1, 10, 19], // as três amostras de DNA incompleto
  enzyme: 12, // enzima de replicação
  output: 16, // DNA completo
  placeholderItem: "revive_dinos:placeholder_invisible",
};

/** Ticks para completar uma sequência. */
export const TEMPO = 300; // 15 segundos

/** Espécies válidas (mesma ordem/nomes usados no resto do addon). */
export const ESPECIES = [
  "dodo",
  "triceratops",
  "pterodactyl",
  "velociraptor",
  "trex",
];

const PREFIXO_INCOMPLETO = "revive_dinos:dna_";
const PREFIXO_COMPLETO = "revive_dinos:complete_dna_";

/** Espécie de um DNA incompleto, ou undefined se não for um DNA válido. */
export function especieDoDna(typeId) {
  if (!typeId?.startsWith(PREFIXO_INCOMPLETO)) return undefined;
  const especie = typeId.slice(PREFIXO_INCOMPLETO.length);
  return ESPECIES.includes(especie) ? especie : undefined;
}

/** Id do DNA completo de uma espécie. */
export const dnaCompletoDe = (especie) => `${PREFIXO_COMPLETO}${especie}`;

/** Itens que a máquina pode produzir (proteção do slot de saída). */
export function saidasPossiveis() {
  return new Set(ESPECIES.map(dnaCompletoDe));
}
