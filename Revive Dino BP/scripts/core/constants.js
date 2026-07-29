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
export const PLACEHOLDER_ITEM_ID = "revive_dinos:placeholder_invisible";

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

/**
 * Estágio do processo desenhado na frente da máquina (0 = parada).
 * Os blocos das máquinas declaram [0, 1, 2, 3] e trocam só a textura da face
 * frontal por permutação — ver machine/visual.js.
 */
export const STATE_MACHINE_STAGE = "revive_dinos:machine_stage";

/** State booleano que marca uma face já escavada (`used_0` … `used_5`). */
export const stateUsedFace = (face) => `revive_dinos:used_${face}`;

// ---------------------------------------------------------------------------
// DYNAMIC PROPERTIES (na entidade-container)
// ---------------------------------------------------------------------------
export const PROP_HOME = "revive_dinos:home";
export const PROP_PROGRESS = "revive_dinos:progress";
export const PROP_FRAME = "revive_dinos:frame";

/** Estágio visual reportado pelo processamento e o tick em que foi reportado. */
export const PROP_STAGE = "revive_dinos:stage_visual";
export const PROP_STAGE_TICK = "revive_dinos:stage_tick";

/** Contador de ticks até o próximo som de processamento. */
export const PROP_SOUND_TICK = "revive_dinos:sound_tick";

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

// ---------------------------------------------------------------------------
// ANIMAÇÃO DA FRENTE DAS MÁQUINAS (machine/visual.js)
// ---------------------------------------------------------------------------

/**
 * Quantos estágios ACESOS a frente tem, além do 0 (parada). Precisa bater com
 * o state `machine_stage` do bloco e com as texturas `<maquina>_front_N.png`:
 * 3 estágios => front_1, front_2, front_3.
 */
export const MACHINE_STAGES = 3;

/**
 * Ticks de tolerância antes de considerar a máquina parada.
 *
 * O processamento marca o estágio a cada tick em que avança. Qualquer pausa
 * (sem receita, sem energia, saída cheia) simplesmente para de marcar, e a
 * frente apaga sozinha — assim nenhum `return` do processamento precisa saber
 * que existe animação. A folga cobre o tick de conclusão, em que o progresso
 * zera antes do próximo ciclo começar.
 */
export const MACHINE_STAGE_STALE_TICKS = 3;

/**
 * Som baixo de processamento.
 *
 * É um som do vanilla para o addon não depender de asset de áudio. Para trocar
 * por um som próprio: coloque o .ogg em `Revive Dino RP/sounds/`, declare o id
 * em `Revive Dino RP/sounds/sound_definitions.json` e mude só esta constante.
 */
export const MACHINE_SOUND_ID = "beacon.ambient";
export const MACHINE_SOUND_VOLUME = 0.2;
export const MACHINE_SOUND_PITCH = 1.4;

/** Intervalo entre repetições do som enquanto a máquina processa (~4s). */
export const MACHINE_SOUND_INTERVAL = 80;

// ---------------------------------------------------------------------------
// GERADOR A COMBUSTÃO — animação em loop + partículas
// ---------------------------------------------------------------------------

/**
 * Duração de um ciclo completo de animação da frente do gerador (ticks).
 * A cada GENERATOR_LOOP_TICKS a frente percorre 1→2→3→1→2→3... dando a
 * impressão de uma máquina rápida e fluida em vez de uma barra lenta.
 * 60 ticks = 3 segundos por loop (20 ticks por estágio).
 */
export const GENERATOR_LOOP_TICKS = 60;

/**
 * Partículas de fogo na frente do gerador quando ativo.
 * Usa o mesmo id da fornalha vanilla (minecraft:basic_flame_particle).
 */
export const GENERATOR_PARTICLE_ID = "minecraft:basic_flame_particle";

/** Intervalo médio entre spawns de partícula (ticks). Varia ±30%. */
export const GENERATOR_PARTICLE_INTERVAL = 50;

/**
 * Dynamic property para o contador de ticks até a próxima partícula.
 * Guardamos na entidade para sobreviver entre ticks sem custo de mapa externo.
 */
export const PROP_GEN_PARTICLE_TICK = "revive_dinos:gen_particle_tick";
