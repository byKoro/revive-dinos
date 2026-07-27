/**
 * synthesizer/processing.js
 * ---------------------------------------------------------------------------
 * Processamento do Sintetizador de Biomassa.
 *
 * Diferente do Extrator, a saída aqui é DETERMINÍSTICA (sempre biomassa), então
 * ela pode empilhar: a máquina segue produzindo enquanto houver espaço na
 * pilha, sem exigir que o jogador esvazie o slot.
 *
 * Consome energia da rede unificada; sem carga suficiente, pausa sem perder
 * progresso (mesma regra das outras máquinas).
 * ---------------------------------------------------------------------------
 */

import { PROP_FRAME, PROP_PROGRESS } from "../core/constants";
import { consumirUm, criarItem, inventarioDe } from "../core/items";
import { consumirEnergia } from "../energy/consumer";
import { ENERGY_COST } from "../energy/constants";
import { aplicarFrame, limparItensDropados, restaurarSlotsDeUi } from "../machine/ui";
import { BIOMASS_ITEM_ID, TEMPO, layout, rendimentoDe, saidasPossiveis } from "./config";

const SAIDAS = saidasPossiveis();

export function tickSynthesizer(entity, def) {
  const inv = inventarioDe(entity);
  if (!inv) return;

  restaurarSlotsDeUi(def, entity, inv, PROP_FRAME);
  protegerSlotDeSaida(entity, inv);
  limparItensDropados(entity);

  const entrada = inv.getItem(layout.input);
  const rendimento = rendimentoDe(entrada?.typeId);
  if (rendimento === undefined) return zerar(def, entity, inv);

  // A saída precisa caber o rendimento inteiro antes de gastar energia
  if (!cabeNaSaida(inv, rendimento)) return zerar(def, entity, inv);

  if (!consumirEnergia(entity, ENERGY_COST.synthesizer)) return;

  const progresso = (entity.getDynamicProperty(PROP_PROGRESS) ?? 0) + 1;

  if (progresso >= TEMPO) {
    concluir(inv, rendimento);
    return zerar(def, entity, inv);
  }

  entity.setDynamicProperty(PROP_PROGRESS, progresso);
  desenhar(def, entity, inv, progresso / TEMPO);
}

function concluir(inv, rendimento) {
  consumirUm(inv, layout.input);

  const atual = inv.getItem(layout.output);
  const quantidadeAtual = saidaVazia(inv) ? 0 : atual.amount;
  inv.setItem(layout.output, criarItem(BIOMASS_ITEM_ID, quantidadeAtual + rendimento));
}

function saidaVazia(inv) {
  const atual = inv.getItem(layout.output);
  return !atual || atual.typeId === layout.placeholderItem;
}

/** Há espaço para `quantidade` unidades de biomassa na saída? */
function cabeNaSaida(inv, quantidade) {
  if (saidaVazia(inv)) return true;
  const atual = inv.getItem(layout.output);
  if (atual.typeId !== BIOMASS_ITEM_ID) return false;
  return atual.amount + quantidade <= atual.maxAmount;
}

/** Devolve ao jogador qualquer coisa que não seja produto da máquina. */
function protegerSlotDeSaida(entity, inv) {
  const atual = inv.getItem(layout.output);
  if (!atual) {
    inv.setItem(layout.output, criarItem(layout.placeholderItem));
    return;
  }
  if (atual.typeId === layout.placeholderItem) return;
  if (SAIDAS.has(atual.typeId)) return;

  const jogador = entity.dimension.getPlayers({
    location: entity.location,
    maxDistance: 10,
    closest: 1,
  })[0];
  entity.dimension.spawnItem(atual, jogador?.location ?? entity.location);
  inv.setItem(layout.output, criarItem(layout.placeholderItem));
}

function desenhar(def, entity, inv, fracao) {
  const frames = def.layout.progressFrames;
  if (!frames) return;
  aplicarFrame(def, entity, inv, Math.min(frames, Math.ceil(fracao * frames)), PROP_FRAME);
}

function zerar(def, entity, inv) {
  entity.setDynamicProperty(PROP_PROGRESS, 0);
  aplicarFrame(def, entity, inv, 0, PROP_FRAME);
}
