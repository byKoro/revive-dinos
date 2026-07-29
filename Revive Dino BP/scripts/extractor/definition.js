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
  PROP_PROGRESS,
} from "../core/constants";
import { ENERGY_COST } from "../energy/constants";
import { findRecipe, layout as cfg, slotParaIngrediente } from "./config";
import { tickExtractor } from "./processing";

export const extractorDef = {
  id: "extractor",
  blockId: EXTRACTOR_BLOCK_ID,
  entityId: EXTRACTOR_UI_ENTITY_ID,
  componentId: COMPONENT_EXTRACTOR,
  /** A frente do bloco anima por estágio de processo (ver machine/visual.js). */
  frontAnimada: true,
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

  /** Status em tempo real (agachar + olhar). */
  statusTexto: (entity) => {
    const inv = entity.getComponent("minecraft:inventory")?.container;
    if (!inv) return "§bExtrator";

    const match = findRecipe(inv.getItem(cfg.inputA), inv.getItem(cfg.inputB));
    const saida = inv.getItem(cfg.output);
    const saidaLivre = !saida || saida.typeId === cfg.placeholderItem;
    const progresso = entity.getDynamicProperty(PROP_PROGRESS) ?? 0;

    let estado;
    if (!match) estado = "§7sem receita";
    else if (!saidaLivre) estado = "§eretire o DNA";
    else if (progresso > 0)
      estado = `§a${Math.floor((progresso / match.recipe.time) * 100)}%`;
    else estado = "§apronto";

    return `§bExtrator§r  ${estado}§r  §7|§r ${ENERGY_COST.extractor}/tick`;
  },
  // Roteamento por direcao: top=fossil(inputA), sides=tube(inputB)
  hopperRouting: {
    top: cfg.inputA,
    side: cfg.inputB,
  },
};
