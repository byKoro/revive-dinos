/**
 * core/constants.js
 * ---------------------------------------------------------------------------
 * Ponto único de verdade para identifiers, block states, dynamic properties
 * e valores de ajuste. Nada de string solta espalhada pelo código: se um
 * identifier mudar, ele muda aqui e em nenhum outro lugar.
 *
 * ATENÇÃO ao renomear identifiers de bloco: o id do bloco e o id do seu
 * custom component NÃO podem ser iguais (ver .kiro/steering/identifiers.md).
 * ---------------------------------------------------------------------------
 */

export const NAMESPACE = "revive_dinos";

// ---------------------------------------------------------------------------
// BLOCOS
// ---------------------------------------------------------------------------
export const EXTRACTOR_BLOCK_ID = "revive_dinos:genetic_extractor";
export const FOSSIL_ROCK_BLOCK_ID = "revive_dinos:fossilized_rock";

// ---------------------------------------------------------------------------
// ENTIDADES
// ---------------------------------------------------------------------------
export const EXTRACTOR_UI_ENTITY_ID = "revive_dinos:genetic_extractor_ui";
export const OUTLINE_ENTITY_ID = "revive_dinos:outline_selection";

// ---------------------------------------------------------------------------
// ITENS
// ---------------------------------------------------------------------------
export const HAMMER_ITEM_ID = "revive_dinos:hammer";

// ---------------------------------------------------------------------------
// CUSTOM COMPONENTS (V2)
// Precisam ser diferentes do identifier do bloco que os usa.
// ---------------------------------------------------------------------------
export const COMPONENT_EXTRACTOR = "revive_dinos:extractor_machine";
export const COMPONENT_UI_PLACEHOLDER = "revive_dinos:ui_placeholder";
export const COMPONENT_FOSSIL_ROCK = "revive_dinos:fossil_rock";
export const COMPONENT_ENERGY_CABLE = "revive_dinos:cable_connector";

// ---------------------------------------------------------------------------
// BLOCK STATES
// ---------------------------------------------------------------------------
export const STATE_FAKE_SELECTION = "revive_dinos:fake_selection";
export const STATE_STAGE = "revive_dinos:stage";
export const STATE_TARGET_FACE = "revive_dinos:target_face";

/** State booleano que marca uma face já escavada (`used_0` … `used_5`). */
export const stateUsedFace = (face) => `revive_dinos:used_${face}`;

// ---------------------------------------------------------------------------
// DYNAMIC PROPERTIES (na entidade-container)
// ---------------------------------------------------------------------------
export const PROP_HOME = "revive_dinos:home";
export const PROP_PROGRESS = "revive_dinos:progress";
export const PROP_FRAME = "revive_dinos:frame";

// ---------------------------------------------------------------------------
// EVENTOS DATA-DRIVEN (disparados pelo JSON da entidade)
// ---------------------------------------------------------------------------
export const EVENT_DESTROYED_BLOCK = "revive_dinos:destroyed_block";
export const EVENT_HOPPER_COMPATIBILITY = "revive_dinos:hopper_compatibility";
export const EVENT_PLAYER_NEARBY = "revive_dinos:player_nearby";
export const EVENT_ADD_COLLISION = "revive_dinos:add_collision";
export const EVENT_REMOVE_COLLISION = "revive_dinos:remove_collision";

// ---------------------------------------------------------------------------
// VANILLA
// ---------------------------------------------------------------------------
export const AIR_BLOCK_ID = "minecraft:air";
export const HOPPER_BLOCK_ID = "minecraft:hopper";
export const PLAYER_TYPE_ID = "minecraft:player";
export const ITEM_ENTITY_TYPE_ID = "minecraft:item";
export const STATE_HOPPER_FACING = "facing_direction";

// ---------------------------------------------------------------------------
// AJUSTES
// ---------------------------------------------------------------------------

/** Alcance (em blocos) da seleção falsa, medido da cabeça do jogador. */
export const SELECTION_RANGE = 8;

/** Raio de busca da entidade-container a partir do bloco. */
export const ENTITY_SEARCH_RADIUS = 6;

/**
 * Desvio tolerado antes de reancorar a entidade.
 * NOTA: o DESIGN-DECISIONS.md defende 0.6 (0.05 causaria jitter e impediria
 * o clique). O valor abaixo reproduz o comportamento que estava em produção
 * antes da refatoração — não foi alterado de propósito.
 */
export const ANCHOR_TOLERANCE = 0.05;

/** Raio de varredura de itens de UI dropados perto da máquina. */
export const DROPPED_ITEM_SCAN_RADIUS = 4;
