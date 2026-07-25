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
} from "../energy/constants";
import { loreDaCarga } from "./charge";
import { tickBattery } from "./processing";
import { consumirCargaPendente } from "./transfer";

export const BATTERY_UI_ENTITY_ID = "revive_dinos:battery_ui";
export const COMPONENT_BATTERY = "revive_dinos:battery_machine";

/** Guarda a carga do tick anterior para calcular a variação exibida. */
const PROP_ULTIMA_CARGA = "revive_dinos:last_charge";

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

  /** Status em tempo real (agachar + olhar): carga, %, e variação. */
  statusTexto: (entity) => {
    const carga = entity.getDynamicProperty(PROP_ENTITY_CHARGE) ?? 0;
    const anterior = entity.getDynamicProperty(PROP_ULTIMA_CARGA) ?? carga;
    entity.setDynamicProperty(PROP_ULTIMA_CARGA, carga);

    const delta = carga - anterior;
    const pct = Math.floor((carga / BATTERY_MAX_CHARGE) * 100);
    const tendencia =
      delta > 0 ? `§a+${formatar(delta)}/tick` : delta < 0 ? `§c${formatar(delta)}/tick` : "§7estável";

    return `§eBateria§r  ${formatar(carga)} / ${formatar(BATTERY_MAX_CHARGE)}  §7(${pct}%)§r  ${tendencia}`;
  },

  /** Ao colocar: restaura a carga que estava salva no item. */
  onPlaced: (entity, block) => {
    const carga = consumirCargaPendente(block.dimension, block.location);
    if (carga > 0) entity.setDynamicProperty(PROP_ENTITY_CHARGE, carga);
  },

  /**
   * Ao quebrar: dropa a bateria com a carga gravada na lore (o bloco usa loot
   * table vazia, então este é o único drop — sem duplicar).
   *
   * `block` pode não existir quando a remoção vem por explosão/pistão, por
   * isso tudo aqui tem fallback para a entidade.
   */
  onBroken: (entity, block, player) => {
    // `isValid` tem que ser checado ANTES de tocar em qualquer propriedade:
    // numa entidade já removida, até ler `.dimension` lança InvalidEntityError
    // (optional chaining não protege contra isso).
    const entidadeViva = entity?.isValid === true;

    const dim = block?.dimension ?? (entidadeViva ? entity.dimension : undefined);
    if (!dim) return;

    const carga = entidadeViva
      ? (entity.getDynamicProperty(PROP_ENTITY_CHARGE) ?? 0)
      : 0;

    const item = new ItemStack(BATTERY_BLOCK_ID, 1);
    if (carga > 0) item.setLore(loreDaCarga(carga));

    const pos =
      player?.location ??
      block?.center?.() ??
      (entidadeViva ? entity.location : undefined);
    if (pos) dim.spawnItem(item, pos);
  },
};
