/**
 * extractor/processing.js
 * ---------------------------------------------------------------------------
 * Processamento do Extrator. Roda no tick do bloco (via framework de máquina).
 * Casa a receita, avança o progresso e entrega o resultado.
 *
 * Regra que já causou bug: só consumir ingredientes DEPOIS de confirmar que o
 * resultado cabe na saída (importante com saída aleatória, como o DNA).
 * ---------------------------------------------------------------------------
 */

import { PROP_FRAME, PROP_PROGRESS } from "../core/constants";
import { cabeNaPilha, consumirUm, criarItem, inventarioDe } from "../core/items";
import { aplicarFrame, limparItensDropados, restaurarSlotsDeUi } from "../machine/ui";
import { findRecipe, layout, pickOutput, saidasPossiveis } from "./config";
import { ENERGY_COST } from "../energy/constants";
import { buscarFonte, consumirDaFonte } from "../energy/network";

const SAIDAS = saidasPossiveis();

export function tickExtractor(entity, def) {
  const inv = inventarioDe(entity);
  if (!inv) return;

  restaurarSlotsDeUi(def, entity, inv, PROP_FRAME);
  protegerSlotDeSaida(entity, inv);
  limparItensDropados(entity);

  const match = findRecipe(inv.getItem(layout.inputA), inv.getItem(layout.inputB));
  if (!match || !saidaTemEspaco(inv)) return zerar(def, entity, inv);

  // Verifica energia: sem fonte com carga → pausa (não perde progresso)
  const fonte = buscarFonte(entity.dimension, entity.location);
  if (!fonte || !consumirDaFonte(entity.dimension, fonte, ENERGY_COST.extractor)) return;

  const total = match.recipe.time;
  const progresso = (entity.getDynamicProperty(PROP_PROGRESS) ?? 0) + 1;

  if (progresso >= total) {
    if (concluir(entity, inv, match)) zerar(def, entity, inv);
    return;
  }

  entity.setDynamicProperty(PROP_PROGRESS, progresso);
  desenhar(def, entity, inv, progresso / total);
}

function concluir(entity, inv, match) {
  const resultado = pickOutput(match.recipe, inv.getItem(match.aSlot));
  if (!resultado) return false;

  const atual = inv.getItem(layout.output);
  const vazia = saidaVazia(inv);
  const empilha =
    !vazia && atual.typeId === resultado.item && cabeNaPilha(atual, resultado.amount);
  if (!vazia && !empilha) return false;

  consumirUm(inv, match.aSlot);
  consumirUm(inv, match.bSlot);
  inv.setItem(
    layout.output,
    vazia
      ? criarItem(resultado.item, resultado.amount)
      : criarItem(atual.typeId, atual.amount + resultado.amount),
  );
  return true;
}

function saidaVazia(inv) {
  const atual = inv.getItem(layout.output);
  return !atual || atual.typeId === layout.placeholderItem;
}

function saidaTemEspaco(inv) {
  if (saidaVazia(inv)) return true;
  return inv.getItem(layout.output).amount < inv.getItem(layout.output).maxAmount;
}

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
  const frame = Math.min(layout.progressFrames, Math.ceil(fracao * layout.progressFrames));
  aplicarFrame(def, entity, inv, frame, PROP_FRAME);
}

function zerar(def, entity, inv) {
  entity.setDynamicProperty(PROP_PROGRESS, 0);
  aplicarFrame(def, entity, inv, 0, PROP_FRAME);
}
