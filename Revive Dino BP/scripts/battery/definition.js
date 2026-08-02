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
import { gravarEspelho, lerEspelho, limparEspelho } from "./mirror";
import { tickBattery } from "./processing";
import { consumirCargaPendente, registrarCargaDoJogador } from "./transfer";

export const BATTERY_UI_ENTITY_ID = "revive_dinos:battery_ui";
export const COMPONENT_BATTERY = "revive_dinos:battery_machine";

/**
 * Fatias da animação de preenchimento (por metade da UI).
 * Precisa bater com a quantidade de bones `fill_*` em
 * `models/blocks/ui/battery_ui.geo.json` — se mudar lá, mude aqui.
 */
export const BATTERY_UI_FRAMES = 15;

/** Guarda a carga do tick anterior para calcular a variação exibida. */
const PROP_ULTIMA_CARGA = "revive_dinos:last_charge";

const formatar = (n) => n.toLocaleString("en-US");

export const batteryDef = {
  id: "battery",
  blockId: BATTERY_BLOCK_ID,
  entityId: BATTERY_UI_ENTITY_ID,
  componentId: COMPONENT_BATTERY,
  frontAnimada: true,
  maxStages: 4,
  semSom: true,
  layout: {
    // A bateria não recebe nem produz itens: TODO slot é protegido.
    inputs: [],
    outputs: [],
    outputSlot: undefined,

    // Fundo (painel vazio) nas duas metades da interface
    backgroundSlots: [9, 17],
    uiBackgroundId: "revive_dinos:battery_ui",

    // Preenchimento: duas metades, para a animação cobrir a UI inteira
    progressSlot: null,
    uiProgressId: null,
    overlaySlots: [
      { slot: 18, idPrefix: "revive_dinos:battery_ui_fill_left" },
      { slot: 26, idPrefix: "revive_dinos:battery_ui_fill_right" },
    ],
    progressFrames: BATTERY_UI_FRAMES,

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

  /**
   * Ao colocar: restaura a carga registrada no jogador que está colocando.
   * O espelho por posição entra como segunda chance (bateria recolocada no
   * mesmo lugar após a entidade ter sido recriada, por exemplo).
   */
  onPlaced: (entity, block) => {
    const doJogador = consumirCargaPendente(block.dimension, block.location);

    // Um valor vindo da mão SEMPRE vence — inclusive 0. Só quando não há
    // registro nenhum é que o espelho da posição entra, senão uma bateria
    // vazia colocada onde havia uma carregada herdaria a energia antiga.
    const carga = doJogador !== undefined ? doJogador : lerEspelho(block.location);

    entity.setDynamicProperty(PROP_ENTITY_CHARGE, carga);
    gravarEspelho(block.location, carga);
  },

  /**
   * Entidade recriada (/kill, chunk, auto-recuperação): a carga pertence ao
   * bloco, então volta do espelho.
   */
  onRestored: (entity, block) => {
    entity.setDynamicProperty(PROP_ENTITY_CHARGE, lerEspelho(block.location));
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

    // Carga da entidade; se ela já morreu, o espelho por posição tem o valor
    const daEntidade = entidadeViva
      ? (entity.getDynamicProperty(PROP_ENTITY_CHARGE) ?? 0)
      : 0;
    const posicao = block?.location ?? (entidadeViva ? entity.location : undefined);
    const carga = daEntidade > 0 ? daEntidade : posicao ? lerEspelho(posicao) : 0;

    // O bloco deixou de existir: o espelho daquela posição não vale mais
    if (posicao) limparEspelho(posicao);

    const item = new ItemStack(BATTERY_BLOCK_ID, 1);
    if (carga > 0) {
      item.setLore(loreDaCarga(carga));
      // Caminho direto: quem quebrou já fica com a carga registrada, então
      // recolocar funciona mesmo que a leitura da lore falhe.
      registrarCargaDoJogador(player, carga);
    }

    const pos =
      player?.location ??
      block?.center?.() ??
      (entidadeViva ? entity.location : undefined);
    if (pos) dim.spawnItem(item, pos);
  },
};
