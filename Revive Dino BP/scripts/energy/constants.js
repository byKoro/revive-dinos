/**
 * energy/constants.js
 * ---------------------------------------------------------------------------
 * Identifiers and tuning values for the energy system.
 * ---------------------------------------------------------------------------
 */

export const CABLE_BLOCK_ID = "revive_dinos:energy_cable";
export const GENERATOR_BLOCK_ID = "revive_dinos:combustion_generator";
export const BATTERY_BLOCK_ID = "revive_dinos:battery";

export const CARVITE_ITEM_ID = "revive_dinos:carvite";

/** Custom component (V2) do gerador — difere do identifier do bloco. */
export const COMPONENT_GENERATOR = "revive_dinos:generator_machine";

/** Entidade-container do gerador (mesma arquitetura do extrator). */
export const GENERATOR_UI_ENTITY_ID = "revive_dinos:combustion_generator_ui";

/** Slot de combustível dentro do container do gerador. */
export const GENERATOR_FUEL_SLOT = 2;

/** Dynamic properties guardadas NA ENTIDADE da fonte de energia. */
export const PROP_ENTITY_CHARGE = "revive_dinos:e_charge";
export const PROP_ENTITY_FUEL = "revive_dinos:e_fuel";
export const PROP_ENTITY_RATE = "revive_dinos:e_rate";

// A carga persistida no ItemStack da bateria vive na LORE do item (ver
// battery/charge.js): o Bedrock não permite dynamic property em item
// empilhável, e o item de um bloco é sempre empilhável.

/** Bloco-fonte -> entidade que guarda a carga (para a rede achar a energia). */
export const SOURCE_ENTITY_BY_BLOCK = {
  [GENERATOR_BLOCK_ID]: GENERATOR_UI_ENTITY_ID,
  [BATTERY_BLOCK_ID]: "revive_dinos:battery_ui",
};

/** Tag que identifica blocos que participam da rede de energia. */
export const ENERGY_TAG = "revive_dinos:energy_connectable";

/** Alcance máximo em blocos de cabo entre fonte e máquina (BFS). */
export const MAX_CABLE_REACH = 16;

/** Capacidade máxima de carga que o gerador acumula no próprio buffer. */
export const GENERATOR_MAX_CHARGE = 10000;

/** Capacidade máxima da bateria. */
export const BATTERY_MAX_CHARGE = 100000;

/** Quantos ticks de queima o gerador processa por tick do bloco. */
export const GENERATOR_TICK_INTERVAL = 10;

/** Custo energético por tick de processamento de cada máquina. */
export const ENERGY_COST = {
  extractor: 30,
  synthesizer: 20,
  sequencer: 50,
  incubator: 100,
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
