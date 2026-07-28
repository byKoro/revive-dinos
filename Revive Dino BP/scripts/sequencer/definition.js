/**
 * sequencer/definition.js
 * ---------------------------------------------------------------------------
 * Definição do Sequenciador Genético para o framework de máquina.
 *
 * UI: só slots funcionais + placeholders por enquanto (arte virá depois).
 * ---------------------------------------------------------------------------
 */

import { PLACEHOLDER_ITEM_ID, PROP_PROGRESS } from "../core/constants";
import { ENERGY_COST } from "../energy/constants";
import {
  ENZYME_ITEM_ID,
  TEMPO,
  especieDoDna,
  layout as cfg,
} from "./config";
import { especiePronta, tickSequencer } from "./processing";

export const SEQUENCER_BLOCK_ID = "revive_dinos:gene_sequencer";
export const SEQUENCER_UI_ENTITY_ID = "revive_dinos:gene_sequencer_ui";
export const COMPONENT_SEQUENCER = "revive_dinos:sequencer_machine";

export const sequencerDef = {
  id: "sequencer",
  blockId: SEQUENCER_BLOCK_ID,
  entityId: SEQUENCER_UI_ENTITY_ID,
  componentId: COMPONENT_SEQUENCER,
  layout: {
    inputs: [...cfg.dnaSlots, cfg.enzyme],
    outputs: [cfg.output],
    outputSlot: cfg.output,
    backgroundSlots: [9, 17],
    uiBackgroundId: "revive_dinos:gene_sequencer_ui",
    progressSlot: 26,
    uiProgressId: "revive_dinos:gene_sequencer_ui_progress",
    progressFrames: 19,
    placeholderItem: PLACEHOLDER_ITEM_ID,
  },
  processTick: tickSequencer,

  /**
   * Funil: enzima vai para o slot dela; DNA vai para o primeiro slot de DNA
   * livre (o DNA não empilha, então cada slot recebe uma amostra).
   */
  routeIngredient: (item, def, inv) => {
    const id = item?.typeId;
    if (id === ENZYME_ITEM_ID) return cfg.enzyme;
    if (!especieDoDna(id)) return undefined;
    if (!inv) return cfg.dnaSlots[0];

    for (const slot of cfg.dnaSlots) {
      const atual = inv.getItem(slot);
      if (!atual || atual.typeId === PLACEHOLDER_ITEM_ID) return slot;
    }
    return undefined;
  },

  /** Status em tempo real (agachar + olhar). */
  statusTexto: (entity) => {
    const inv = entity.getComponent("minecraft:inventory")?.container;
    if (!inv) return "§9Sequenciador";

    const amostras = cfg.dnaSlots.filter((s) => especieDoDna(inv.getItem(s)?.typeId)).length;
    const temEnzima = inv.getItem(cfg.enzyme)?.typeId === ENZYME_ITEM_ID;
    const progresso = entity.getDynamicProperty(PROP_PROGRESS) ?? 0;

    let estado;
    if (progresso > 0) {
      estado = `§a${Math.floor((progresso / TEMPO) * 100)}%`;
    } else if (especiePronta(inv)) {
      estado = "§apronto";
    } else {
      estado = "§7aguardando";
    }

    return (
      `§9Sequenciador§r  ${estado}§r  §7|§r DNA: ${amostras}/3` +
      `  §7|§r Enzima: ${temEnzima ? "§asim" : "§cnão"}§r` +
      `  §7|§r ${ENERGY_COST.sequencer}/tick`
    );
  },
};
