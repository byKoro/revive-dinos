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
import { limparCampos, restaurarNaEntidade } from "../machine/state";
import { CAMPOS_GERADOR, tickGenerator } from "./processing";

export const generatorDef = {
  id: "generator",
  blockId: GENERATOR_BLOCK_ID,
  entityId: GENERATOR_UI_ENTITY_ID,
  componentId: COMPONENT_GENERATOR,
  layout: {
    inputs: [GENERATOR_FUEL_SLOT],
    outputs: [],
    outputSlot: undefined,

    backgroundSlots: [9, 17],
    uiBackgroundId: "revive_dinos:combustion_generator_ui",

    // Chama logo abaixo do slot de combustível, enchendo de baixo para cima
    progressSlot: null,
    uiProgressId: null,
    overlaySlots: [
      { slot: 22, idPrefix: "revive_dinos:combustion_generator_ui_flame" },
    ],
    progressFrames: 16,

    placeholderItem: PLACEHOLDER_ITEM_ID,
  },
  processTick: tickGenerator,
  // Funil só insere combustível, e só no slot de combustível
  routeIngredient: (item) =>
    infoCombustivel(item?.typeId) ? GENERATOR_FUEL_SLOT : undefined,

  /**
   * O estado do gerador pertence ao BLOCO (ver machine/state.js): ao recolocar
   * ou quando a entidade é recriada, a carga e o combustível voltam.
   */
  onPlaced: (entity, block) => {
    restaurarNaEntidade(entity, block.location, CAMPOS_GERADOR);
  },

  onRestored: (entity, block) => {
    restaurarNaEntidade(entity, block.location, CAMPOS_GERADOR);
  },

  onBroken: (entity, block) => {
    const pos = block?.location ?? (entity?.isValid === true ? entity.location : undefined);
    if (pos) limparCampos(pos, CAMPOS_GERADOR);
  },

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
