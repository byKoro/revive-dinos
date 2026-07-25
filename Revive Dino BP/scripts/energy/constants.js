/**
 * energy/constants.js
 * ---------------------------------------------------------------------------
 * Identifiers and tuning values for the energy system.
 * ---------------------------------------------------------------------------
 */

export const CABLE_BLOCK_ID = "revive_dinos:energy_cable";
export const GENERATOR_BLOCK_ID = "revive_dinos:combustion_generator";
export const BATTERY_BLOCK_ID = "revive_dinos:battery";

/** Tag que identifica blocos que participam da rede de energia. */
export const ENERGY_TAG = "revive_dinos:energy_connectable";

/** Alcance máximo em blocos de cabo entre fonte e máquina (BFS). */
export const MAX_CABLE_REACH = 16;

/** Dynamic property: carga armazenada na bateria. */
export const PROP_CHARGE = "revive_dinos:charge";

/** Capacidade máxima da bateria. */
export const BATTERY_MAX_CHARGE = 10000;

/** Custo energético por tick de processamento de cada máquina. */
export const ENERGY_COST = {
  extractor: 30,
  synthesizer: 20,
  sequencer: 50,
  incubator: 100,
};

/** Geração de carga por tick por tipo de combustível. */
export const FUEL_GENERATION = {
  default: 5,   // carvão vanilla e similares
  carvite: 10,  // combustível sintético
};

/**
 * Blocos que fazem parte da rede de energia (usados na BFS).
 * Cabos conduzem; gerador e bateria são fontes.
 */
export const ENERGY_NETWORK_BLOCKS = new Set([
  CABLE_BLOCK_ID,
  GENERATOR_BLOCK_ID,
  BATTERY_BLOCK_ID,
]);

/** Direções cardinais + up/down usadas para conexão do cabo. */
export const DIRECTIONS = [
  { name: "north", offset: { x: 0, y: 0, z: -1 } },
  { name: "south", offset: { x: 0, y: 0, z: 1 } },
  { name: "east",  offset: { x: 1, y: 0, z: 0 } },
  { name: "west",  offset: { x: -1, y: 0, z: 0 } },
  { name: "up",    offset: { x: 0, y: 1, z: 0 } },
  { name: "down",  offset: { x: 0, y: -1, z: 0 } },
];
