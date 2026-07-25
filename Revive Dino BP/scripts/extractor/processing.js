/**
 * extractor/processing.js
 * ---------------------------------------------------------------------------
 * O processamento da máquina: casa a receita, avança o progresso e entrega
 * o resultado. Roda no `minecraft:tick` do bloco (igual ao Furnaces), o que
 * deixa o timer da entidade livre para a compatibilidade com funil.
 *
 * Regra que já causou bug: só consumir os ingredientes DEPOIS de confirmar
 * que o resultado cabe na saída. Com saída aleatória (DNA), consumir antes
 * podia comer os dois inputs sem produzir nada.
 * ---------------------------------------------------------------------------
 */

import { PROP_PROGRESS } from "../core/constants";
import { cabeNaPilha, consumirUm, criarItem, inventarioDe } from "../core/items";
import { findRecipe, layout, pickOutput, saidasPossiveis } from "./config";
import {
  aplicarFrame,
  limparItensDropados,
  restaurarSlotsDeUi,
} from "./ui";

const SAIDAS = saidasPossiveis();

/** Um tick de máquina. Chamado pelo custom component do bloco. */
export function tickExtractor(entity) {
  const inv = inventarioDe(entity);
  if (!inv) return;

  restaurarSlotsDeUi(entity, inv);
  protegerSlotDeSaida(entity, inv);
  limparItensDropados(entity);

  const match = findRecipe(inv.getItem(layout.inputA), inv.getItem(layout.inputB));
  if (!match || !saidaTemEspaco(inv)) return zerarProgresso(entity, inv);

  const total = match.recipe.time;
  const progresso = (entity.getDynamicProperty(PROP_PROGRESS) ?? 0) + 1;

  if (progresso >= total) {
    // Se não couber na saída, segura o progresso no máximo e tenta de novo
    if (concluir(entity, inv, match)) zerarProgresso(entity, inv);
    return;
  }

  entity.setDynamicProperty(PROP_PROGRESS, progresso);
  desenharProgresso(entity, inv, progresso / total);
}

/**
 * Tenta finalizar a receita. Retorna true só se produziu de fato — assim o
 * chamador sabe se pode zerar o progresso.
 */
function concluir(entity, inv, match) {
  // O DNA depende do fóssil que está na entrada, então o item vai junto
  const resultado = pickOutput(match.recipe, inv.getItem(match.aSlot));
  if (!resultado) return false;

  const atual = inv.getItem(layout.output);
  const vazia = saidaVazia(inv);
  const empilha =
    !vazia &&
    atual.typeId === resultado.item &&
    cabeNaPilha(atual, resultado.amount);

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

/**
 * O slot de saída nunca fica vazio: ou tem o resultado, ou tem o placeholder
 * invisível ocupando o espaço — assim o jogador não deposita nada nele.
 * Para a lógica de produção, placeholder conta como "vazio".
 */
function saidaVazia(inv) {
  const atual = inv.getItem(layout.output);
  return !atual || atual.typeId === layout.placeholderItem;
}

function saidaTemEspaco(inv) {
  if (saidaVazia(inv)) return true;
  const atual = inv.getItem(layout.output);
  return atual.amount < atual.maxAmount;
}

/** Devolve ao mundo qualquer coisa que não seja produto da máquina. */
function protegerSlotDeSaida(entity, inv) {
  const atual = inv.getItem(layout.output);

  if (!atual) {
    inv.setItem(layout.output, criarItem(layout.placeholderItem));
    return;
  }
  if (atual.typeId === layout.placeholderItem) return;
  if (SAIDAS.has(atual.typeId)) return;

  entity.dimension.spawnItem(atual, entity.location);
  inv.setItem(layout.output, criarItem(layout.placeholderItem));
}

function desenharProgresso(entity, inv, fracao) {
  const frame = Math.min(
    layout.progressFrames,
    Math.ceil(fracao * layout.progressFrames),
  );
  aplicarFrame(entity, inv, frame);
}

function zerarProgresso(entity, inv) {
  entity.setDynamicProperty(PROP_PROGRESS, 0);
  aplicarFrame(entity, inv, 0);
}
