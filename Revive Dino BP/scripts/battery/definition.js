/**
 * battery/definition.js
 * ---------------------------------------------------------------------------
 * Definição da Bateria de Energia.
 *
 * Persistência da carga: ao quebrar, a carga é gravada no ItemStack dropado
 * (dynamic property + lore visível). Ao recolocar, a carga é restaurada.
 * Itens com dynamic property diferente não empilham — o que aqui é desejável:
 * cada bateria carrega a própria energia.
 * ---------------------------------------------------------------------------
 */

import { ItemStack } from "@minecraft/server";
import { PLACEHOLDER_ITEM_ID } from "../core/constants";
import {
  BATTERY_BLOCK_ID,
  BATTERY_MAX_CHARGE,
  PROP_ENTITY_CHARGE,
  PROP_ITEM_CHARGE,
} from "../energy/constants";
import { tickBattery } from "./processing";
import { consumirCargaPendente } from "./transfer";

export const BATTERY_UI_ENTITY_ID = "revive_dinos:battery_ui";
export const COMPONENT_BATTERY = "revive_dinos:battery_machine";

const formatar = (n) => n.toLocaleString("en-US");

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

  /** Agachar + olhar: mostra a carga atual. */
  onSneakLook: (entity, player) => {
    const carga = entity.getDynamicProperty(PROP_ENTITY_CHARGE) ?? 0;
    const pct = Math.floor((carga / BATTERY_MAX_CHARGE) * 100);
    player.onScreenDisplay.setActionBar(
      `§eBateria§r  ${formatar(carga)} / ${formatar(BATTERY_MAX_CHARGE)}  §7(${pct}%)`,
    );
  },

  /** Ao colocar: restaura a carga que estava salva no item. */
  onPlaced: (entity, block) => {
    const carga = consumirCargaPendente(block.dimension, block.location);
    if (carga > 0) entity.setDynamicProperty(PROP_ENTITY_CHARGE, carga);
  },

  /**
   * Ao quebrar: dropa a bateria com a carga gravada (o bloco não tem loot
   * próprio, então este é o único drop — sem duplicar).
   */
  onBroken: (entity, block, player) => {
    const carga = entity?.isValid
      ? (entity.getDynamicProperty(PROP_ENTITY_CHARGE) ?? 0)
      : 0;

    const item = new ItemStack(BATTERY_BLOCK_ID, 1);
    if (carga > 0) {
      item.setDynamicProperty(PROP_ITEM_CHARGE, carga);
      const pct = Math.floor((carga / BATTERY_MAX_CHARGE) * 100);
      item.setLore([
        `§7Energia: §e${formatar(carga)}§7 / ${formatar(BATTERY_MAX_CHARGE)}`,
        `§7Carga: §a${pct}%`,
      ]);
    }

    const pos = player?.location ?? block.center();
    block.dimension.spawnItem(item, pos);
  },
};
