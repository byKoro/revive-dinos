/**
 * extractor/definition.js
 * ---------------------------------------------------------------------------
 * Definição do Extrator Genético para o framework de máquina.
 * ---------------------------------------------------------------------------
 */

import {
  COMPONENT_EXTRACTOR,
  EXTRACTOR_BLOCK_ID,
  EXTRACTOR_UI_ENTITY_ID,
} from "../core/constants";
import { layout as cfg, slotParaIngrediente } from "./config";
import { tickExtractor } from "./processing";

export const extractorDef = {
  id: "extractor",
  blockId: EXTRACTOR_BLOCK_ID,
  entityId: EXTRACTOR_UI_ENTITY_ID,
  componentId: COMPONENT_EXTRACTOR,
  layout: {
    inputs: [cfg.inputA, cfg.inputB],
    outputs: [cfg.output],
    outputSlot: cfg.output,
    backgroundSlots: cfg.backgroundSlots,
    progressSlot: cfg.progressSlot,
    uiBackgroundId: cfg.uiBackgroundId,
    uiProgressId: cfg.uiProgressId,
    progressFrames: cfg.progressFrames,
    placeholderItem: cfg.placeholderItem,
  },
  processTick: tickExtractor,
  routeIngredient: (item) => slotParaIngrediente(item),
  // Roteamento por direcao: top=fossil(inputA), sides=tube(inputB)
  hopperRouting: {
    top: cfg.inputA,
    side: cfg.inputB,
  },
};
