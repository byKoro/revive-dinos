/**
 * incubator/processing.js
 * ---------------------------------------------------------------------------
 * Processamento da Incubadora.
 *
 * Só começa se houver DNA completo + biomassa suficiente para AQUELA espécie
 * e espaço na saída. A biomassa só é consumida no fim, junto com o DNA —
 * mesma regra das outras máquinas: nada é consumido antes de o resultado ser
 * garantido.
 * ---------------------------------------------------------------------------
 */

import { PROP_FRAME, PROP_PROGRESS } from "../core/constants";
import { cabeNaPilha, consumirUm, consumirVarios, criarItem, inventarioDe } from "../core/items";
import { consumirEnergia } from "../energy/consumer";
import { ENERGY_COST } from "../energy/constants";
import { aplicarFrame, limparItensDropados, restaurarSlotsDeUi } from "../machine/ui";
import { marcarProgressoVisual } from "../machine/visual";
import {
  BIOMASSA_POR_ESPECIE,
  BIOMASS_ITEM_ID,
  TEMPO,
  especieDoDnaCompleto,
  layout,
  ovoDe,
  saidasPossiveis,
} from "./config";

const SAIDAS = saidasPossiveis();

/**
 * Espécie que pode ser incubada agora, ou undefined.
 * Exige DNA completo no slot de cima e biomassa suficiente no de baixo.
 */
export function especiePronta(inv) {
  const especie = especieDoDnaCompleto(inv.getItem(layout.inputA)?.typeId);
  if (!especie) return undefined;

  const biomassa = inv.getItem(layout.inputB);
  if (biomassa?.typeId !== BIOMASS_ITEM_ID) return undefined;
  if (biomassa.amount < BIOMASSA_POR_ESPECIE[especie]) return undefined;

  return especie;
}

export function tickIncubator(entity, def) {
  const inv = inventarioDe(entity);
  if (!inv) return;

  restaurarSlotsDeUi(def, entity, inv, PROP_FRAME);
  protegerSlotDeSaida(entity, inv);
  limparItensDropados(entity);

  const especie = especiePronta(inv);
  if (!especie) return zerar(def, entity, inv);
  if (!cabeNaSaida(inv, ovoDe(especie))) return zerar(def, entity, inv);

  if (!consumirEnergia(entity, ENERGY_COST.incubator)) return;

  const progresso = (entity.getDynamicProperty(PROP_PROGRESS) ?? 0) + 1;

  if (progresso >= TEMPO) {
    concluir(inv, especie);
    return zerar(def, entity, inv);
  }

  entity.setDynamicProperty(PROP_PROGRESS, progresso);
  desenhar(def, entity, inv, progresso / TEMPO);
}

function concluir(inv, especie) {
  const custo = BIOMASSA_POR_ESPECIE[especie];

  // Confere de novo antes de consumir: o conteúdo pode ter mudado no caminho
  if (!consumirVarios(inv, layout.inputB, custo)) return;
  consumirUm(inv, layout.inputA);

  const ovo = ovoDe(especie);
  const atual = inv.getItem(layout.output);
  const vazia = saidaVazia(inv);

  inv.setItem(
    layout.output,
    vazia ? criarItem(ovo, 1) : criarItem(atual.typeId, atual.amount + 1),
  );
}

function saidaVazia(inv) {
  const atual = inv.getItem(layout.output);
  return !atual || atual.typeId === layout.placeholderItem;
}

/** O ovo é determinístico, então empilha — desde que seja o mesmo ovo. */
function cabeNaSaida(inv, ovo) {
  if (saidaVazia(inv)) return true;
  const atual = inv.getItem(layout.output);
  return atual.typeId === ovo && cabeNaPilha(atual, 1);
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
  // Frente do bloco + som: só é chamado quando o progresso avança de verdade
  marcarProgressoVisual(entity, fracao);
  const frames = layout.progressFrames;
  aplicarFrame(def, entity, inv, Math.min(frames, Math.ceil(fracao * frames)), PROP_FRAME);
}

function zerar(def, entity, inv) {
  entity.setDynamicProperty(PROP_PROGRESS, 0);
  aplicarFrame(def, entity, inv, 0, PROP_FRAME);
}
