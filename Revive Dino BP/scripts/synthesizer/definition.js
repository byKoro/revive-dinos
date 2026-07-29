/**
 * synthesizer/definition.js
 * ---------------------------------------------------------------------------
 * Definição do Sintetizador de Biomassa para o framework de máquina.
 *
 * UI: por enquanto só slots funcionais + placeholders (a arte virá depois;
 * quando chegar, é preencher backgroundSlots/progressSlot e as texturas).
 * ---------------------------------------------------------------------------
 */

import { PLACEHOLDER_ITEM_ID } from "../core/constants";
import { ENERGY_COST } from "../energy/constants";
import { layout as cfg, rendimentoDe } from "./config";
import { tickSynthesizer } from "./processing";

export const SYNTHESIZER_BLOCK_ID = "revive_dinos:biomass_synthesizer";
export const SYNTHESIZER_UI_ENTITY_ID = "revive_dinos:biomass_synthesizer_ui";
export const COMPONENT_SYNTHESIZER = "revive_dinos:synthesizer_machine";

export const synthesizerDef = {
  id: "synthesizer",
  blockId: SYNTHESIZER_BLOCK_ID,
  entityId: SYNTHESIZER_UI_ENTITY_ID,
  componentId: COMPONENT_SYNTHESIZER,
  /** A frente do bloco anima por estágio de processo (ver machine/visual.js). */
  frontAnimada: true,
  layout: {
    inputs: [cfg.input],
    outputs: [cfg.output],
    outputSlot: cfg.output,
    backgroundSlots: [9, 17],
    uiBackgroundId: "revive_dinos:biomass_synthesizer_ui",
    progressSlot: 26,
    uiProgressId: "revive_dinos:biomass_synthesizer_ui_progress",
    progressFrames: 19,
    placeholderItem: PLACEHOLDER_ITEM_ID,
  },
  processTick: tickSynthesizer,

  /** Funil: só entra matéria orgânica, e sempre no slot de entrada. */
  routeIngredient: (item) =>
    rendimentoDe(item?.typeId) !== undefined ? cfg.input : undefined,

  /** Status em tempo real (agachar + olhar). */
  statusTexto: (entity) => {
    const progresso = entity.getDynamicProperty("revive_dinos:progress") ?? 0;
    const pct = Math.floor((progresso / 100) * 100);
    const estado = progresso > 0 ? `§a${pct}%` : "§7parado";
    return `§2Sintetizador§r  ${estado}§r  §7|§r Consumo: ${ENERGY_COST.synthesizer}/tick`;
  },
};
