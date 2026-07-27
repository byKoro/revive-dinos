/**
 * incubator/definition.js
 * ---------------------------------------------------------------------------
 * Definição da Incubadora para o framework de máquina.
 *
 * Usa o mesmo layout e a mesma arte de UI do Extrator Genético (fundo + barra
 * de progresso de 19 frames), conforme pedido.
 * ---------------------------------------------------------------------------
 */

import { PROP_PROGRESS } from "../core/constants";
import { ENERGY_COST } from "../energy/constants";
import {
  BIOMASSA_POR_ESPECIE,
  BIOMASS_ITEM_ID,
  TEMPO,
  especieDoDnaCompleto,
  layout as cfg,
} from "./config";
import { especiePronta, tickIncubator } from "./processing";

export const INCUBATOR_BLOCK_ID = "revive_dinos:incubator";
export const INCUBATOR_UI_ENTITY_ID = "revive_dinos:incubator_ui";
export const COMPONENT_INCUBATOR = "revive_dinos:incubator_machine";

export const incubatorDef = {
  id: "incubator",
  blockId: INCUBATOR_BLOCK_ID,
  entityId: INCUBATOR_UI_ENTITY_ID,
  componentId: COMPONENT_INCUBATOR,
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
  processTick: tickIncubator,

  /** Funil: DNA completo no slot de cima, biomassa no de baixo. */
  routeIngredient: (item) => {
    const id = item?.typeId;
    if (especieDoDnaCompleto(id)) return cfg.inputA;
    if (id === BIOMASS_ITEM_ID) return cfg.inputB;
    return undefined;
  },

  /** Status em tempo real (agachar + olhar). */
  statusTexto: (entity) => {
    const inv = entity.getComponent("minecraft:inventory")?.container;
    if (!inv) return "§6Incubadora";

    const progresso = entity.getDynamicProperty(PROP_PROGRESS) ?? 0;
    const especie = especieDoDnaCompleto(inv.getItem(cfg.inputA)?.typeId);

    if (!especie) {
      return `§6Incubadora§r  §7sem DNA completo§r  §7|§r ${ENERGY_COST.incubator}/tick`;
    }

    const necessario = BIOMASSA_POR_ESPECIE[especie];
    const biomassa = inv.getItem(cfg.inputB);
    const tem = biomassa?.typeId === BIOMASS_ITEM_ID ? biomassa.amount : 0;

    const estado =
      progresso > 0
        ? `§a${Math.floor((progresso / TEMPO) * 100)}%`
        : especiePronta(inv)
          ? "§apronto"
          : "§cbiomassa insuficiente";

    return (
      `§6Incubadora§r  ${estado}§r  §7|§r ${especie}` +
      `  §7|§r Biomassa: ${tem}/${necessario}` +
      `  §7|§r ${ENERGY_COST.incubator}/tick`
    );
  },
};
