/**
 * sequencer/processing.js
 * ---------------------------------------------------------------------------
 * Processamento do Sequenciador Genético.
 *
 * Só processa se os TRÊS slots de DNA tiverem a mesma espécie e houver enzima.
 * A saída (DNA completo) é não-empilhável, então exige saída livre — mesma
 * regra do Extrator.
 * ---------------------------------------------------------------------------
 */

import { PROP_FRAME, PROP_PROGRESS } from "../core/constants";
import { consumirUm, criarItem, inventarioDe } from "../core/items";
import { consumirEnergia } from "../energy/consumer";
import { ENERGY_COST } from "../energy/constants";
import { aplicarFrame, limparItensDropados, restaurarSlotsDeUi } from "../machine/ui";
import { marcarProgressoVisualLoop } from "../machine/visual";
import {
  ENZYME_ITEM_ID,
  SEQUENCER_LOOP_TICKS,
  TEMPO,
  dnaCompletoDe,
  especieDoDna,
  layout,
  saidasPossiveis,
} from "./config";

const SAIDAS = saidasPossiveis();

/**
 * Espécie pronta para sequenciar, ou undefined.
 * Exige as 3 amostras da MESMA espécie + enzima presente.
 */
export function especiePronta(inv) {
  const especies = layout.dnaSlots.map((slot) =>
    especieDoDna(inv.getItem(slot)?.typeId),
  );

  if (especies.some((e) => e === undefined)) return undefined;
  if (!especies.every((e) => e === especies[0])) return undefined;

  if (inv.getItem(layout.enzyme)?.typeId !== ENZYME_ITEM_ID) return undefined;

  return especies[0];
}

export function tickSequencer(entity, def) {
  const inv = inventarioDe(entity);
  if (!inv) return;

  restaurarSlotsDeUi(def, entity, inv, PROP_FRAME);
  protegerSlotDeSaida(entity, inv);
  limparItensDropados(entity);

  const especie = especiePronta(inv);
  if (!especie) return zerar(def, entity, inv);

  // DNA completo não empilha: a saída precisa estar livre
  if (!saidaVazia(inv)) return;

  if (!consumirEnergia(entity, ENERGY_COST.sequencer)) return;

  const progresso = (entity.getDynamicProperty(PROP_PROGRESS) ?? 0) + 1;

  if (progresso >= TEMPO) {
    concluir(inv, especie);
    return zerar(def, entity, inv);
  }

  entity.setDynamicProperty(PROP_PROGRESS, progresso);
  desenhar(def, entity, inv, progresso / TEMPO);
}

function concluir(inv, especie) {
  for (const slot of layout.dnaSlots) consumirUm(inv, slot);
  consumirUm(inv, layout.enzyme);
  inv.setItem(layout.output, criarItem(dnaCompletoDe(especie), 1));
}

function saidaVazia(inv) {
  const atual = inv.getItem(layout.output);
  return !atual || atual.typeId === layout.placeholderItem;
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
  // Frente do bloco em loop: a animação cicla várias vezes durante o
  // processamento, dando um aspecto mais fluido em vez de um único passo lento.
  marcarProgressoVisualLoop(entity, SEQUENCER_LOOP_TICKS);

  const frames = def.layout.progressFrames;
  if (!frames) return;
  aplicarFrame(def, entity, inv, Math.min(frames, Math.ceil(fracao * frames)), PROP_FRAME);
}

function zerar(def, entity, inv) {
  entity.setDynamicProperty(PROP_PROGRESS, 0);
  aplicarFrame(def, entity, inv, 0, PROP_FRAME);
}
