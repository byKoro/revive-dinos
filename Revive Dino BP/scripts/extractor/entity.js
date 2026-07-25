/**
 * extractor/entity.js
 * ---------------------------------------------------------------------------
 * Ciclo de vida da entidade-container invisível: criação, busca, ancoragem
 * e remoção (dropando o inventário antes).
 *
 * A entidade guarda a posição do seu bloco numa dynamic property
 * (`PROP_HOME`). Sem esse vínculo, dois Extratores próximos poderiam roubar
 * a entidade um do outro, já que o raio de busca é maior que 1 bloco.
 * ---------------------------------------------------------------------------
 */

import {
  ANCHOR_TOLERANCE,
  ENTITY_SEARCH_RADIUS,
  EXTRACTOR_UI_ENTITY_ID,
  PROP_HOME,
  STATE_FAKE_SELECTION,
} from "../core/constants";
import { inventarioDe } from "../core/items";
import { chaveDePosicao, distancia } from "../core/vectors";
import { ehItemDeUi, montarUi } from "./ui";

/** Cria a entidade-container deste bloco e monta a interface nela. */
export function criarEntidade(block, dimension) {
  const entity = dimension.spawnEntity(
    EXTRACTOR_UI_ENTITY_ID,
    block.bottomCenter(),
  );
  entity.nameTag = "\u00a7r";
  entity.setDynamicProperty(PROP_HOME, chaveDePosicao(block.location));
  montarUi(entity);
  return entity;
}

/**
 * Procura a entidade deste bloco. O raio é largo para reencontrá-la caso
 * tenha sido arrastada, mas o vínculo garante que é a certa.
 */
export function acharEntidade(block, dimension) {
  const chave = chaveDePosicao(block.location);
  const candidatos = dimension.getEntities({
    location: block.center(),
    type: EXTRACTOR_UI_ENTITY_ID,
    maxDistance: ENTITY_SEARCH_RADIUS,
  });

  for (const e of candidatos) {
    if (e.getDynamicProperty(PROP_HOME) === chave) return e;
  }
  // entidades antigas, criadas antes do vínculo existir
  return candidatos.find((e) => e.getDynamicProperty(PROP_HOME) === undefined);
}

/**
 * Devolve ao mundo tudo que é item de jogador (nunca as peças de UI).
 * Precisa rodar ANTES de remover a entidade, senão os itens somem junto.
 */
export function dropInventory(entity) {
  if (!entity?.isValid) return;
  const inv = inventarioDe(entity);
  if (!inv) return;

  for (let slot = 0; slot < inv.size; slot++) {
    const item = inv.getItem(slot);
    if (!item || ehItemDeUi(item)) continue;
    entity.dimension.spawnItem(item, entity.location);
  }
}

/** Dropa o inventário e remove a entidade, se ela ainda for válida. */
export function removerEntidade(entity) {
  if (!entity?.isValid) return;
  dropInventory(entity);
  entity.remove();
}

/**
 * Barco, minecart, pistão, explosão, /tp ou correnteza podem tirar a entidade
 * do lugar e quebrar a interface. Aqui ela é devolvida à força.
 */
export function garantirPosicao(entity, block) {
  desmontarDeVeiculo(entity);

  const alvo = block.permutation.getState(STATE_FAKE_SELECTION)
    ? block.bottomCenter()
    : block.center();

  if (distancia(entity.location, alvo) > ANCHOR_TOLERANCE) {
    entity.teleport(alvo);
    entity.clearVelocity();
  }
}

function desmontarDeVeiculo(entity) {
  const riding = entity.getComponent("minecraft:riding");
  if (!riding) return;
  try {
    riding.entityRidingOn
      ?.getComponent("minecraft:rideable")
      ?.ejectRider(entity);
  } catch {
    // se a API falhar, o teleporte do chamador ainda tira ela de lá
  }
}
