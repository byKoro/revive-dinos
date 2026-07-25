/**
 * generator/definition.js
 * ---------------------------------------------------------------------------
 * Definição do Gerador a Combustão para o framework de máquina.
 *
 * UI provisória: sem arte de fundo/barra por enquanto (o usuário fornecerá).
 * O container tem 1 slot de combustível; o resto vira placeholder invisível.
 * Quando a UI real chegar, é só preencher backgroundSlots/progressSlot e a
 * textura.
 * ---------------------------------------------------------------------------
 */

import { PLACEHOLDER_ITEM_ID } from "../core/constants";
import {
  COMPONENT_GENERATOR,
  GENERATOR_BLOCK_ID,
  GENERATOR_FUEL_SLOT,
  GENERATOR_MAX_CHARGE,
  GENERATOR_UI_ENTITY_ID,
  PROP_ENTITY_CHARGE,
  PROP_ENTITY_FUEL,
  PROP_ENTITY_RATE,
} from "../energy/constants";
import { infoCombustivel } from "../energy/fuel";
import { tickGenerator } from "./processing";

export const generatorDef = {
  id: "generator",
  blockId: GENERATOR_BLOCK_ID,
  entityId: GENERATOR_UI_ENTITY_ID,
  componentId: COMPONENT_GENERATOR,
  layout: {
    inputs: [GENERATOR_FUEL_SLOT],
    outputs: [],
    outputSlot: undefined,
    backgroundSlots: [],
    progressSlot: null,
    uiBackgroundId: null,
    uiProgressId: null,
    progressFrames: 0,
    placeholderItem: PLACEHOLDER_ITEM_ID,
  },
  processTick: tickGenerator,
  // Funil só insere combustível, e só no slot de combustível
  routeIngredient: (item) =>
    infoCombustivel(item?.typeId) ? GENERATOR_FUEL_SLOT : undefined,

  /** Status em tempo real: geração por tick, buffer e combustível restante. */
  statusTexto: (entity) => {
    const carga = entity.getDynamicProperty(PROP_ENTITY_CHARGE) ?? 0;
    const fuel = entity.getDynamicProperty(PROP_ENTITY_FUEL) ?? 0;
    const rate = entity.getDynamicProperty(PROP_ENTITY_RATE) ?? 0;
    const fmt = (n) => n.toLocaleString("en-US");

    const status = fuel > 0 ? `§a+${rate}/tick` : "§cparado";
    const segundos = (fuel / 20).toFixed(1);

    return `§6Gerador§r  ${status}§r  §7|§r Buffer: ${fmt(carga)}/${fmt(GENERATOR_MAX_CHARGE)}  §7|§r Combustível: ${segundos}s`;
  },
};
