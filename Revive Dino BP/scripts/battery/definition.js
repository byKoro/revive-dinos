/**
 * battery/definition.js
 * ---------------------------------------------------------------------------
 * Definição da Bateria de Energia para o framework de máquina.
 *
 * A bateria não tem inputs/outputs de item (é puro armazenamento de energia).
 * A UI por enquanto é só placeholder — quando a arte chegar, liga fundo/barra.
 * ---------------------------------------------------------------------------
 */

import { PLACEHOLDER_ITEM_ID } from "../core/constants";
import { BATTERY_BLOCK_ID } from "../energy/constants";
import { tickBattery } from "./processing";

export const BATTERY_UI_ENTITY_ID = "revive_dinos:battery_ui";
export const COMPONENT_BATTERY = "revive_dinos:battery_machine";

export const batteryDef = {
  id: "battery",
  blockId: BATTERY_BLOCK_ID,
  entityId: BATTERY_UI_ENTITY_ID,
  componentId: COMPONENT_BATTERY,
  layout: {
    inputs: [],
    outputs: [],
    outputSlot: undefined,
    backgroundSlots: [],
    progressSlot: null,
    uiBackgroundId: null,
    uiProgressId: null,
    progressFrames: 0,
    placeholderItem: PLACEHOLDER_ITEM_ID,
  },
  processTick: tickBattery,
  routeIngredient: () => undefined,
};
