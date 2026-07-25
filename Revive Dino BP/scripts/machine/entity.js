/**
 * machine/entity.js
 * ---------------------------------------------------------------------------
 * Ciclo de vida genérico da entidade-container invisível: criação, busca,
 * ancoragem e remoção (dropando o inventário antes). Parametrizado pela
 * definição da máquina.
 * ---------------------------------------------------------------------------
 */

import { ANCHOR_TOLERANCE, PROP_HOME, STATE_FAKE_SELECTION } from "../core/constants";
import { inventarioDe } from "../core/items";
import { chaveDePosicao, distancia } from "../core/vectors";
import { ehItemDeUi, montarUi } from "./ui";

const RAIO_BUSCA = 6;

export function criarEntidade(def, block, dimension) {
  const entity = dimension.spawnEntity(def.entityId, block.bottomCenter());
  entity.nameTag = "\u00a7r";
  entity.setDynamicProperty(PROP_HOME, chaveDePosicao(block.location));
  montarUi(def, entity);
  return entity;
}

export function acharEntidade(def, block, dimension) {
  const chave = chaveDePosicao(block.location);
  const candidatos = dimension.getEntities({
    location: block.center(),
    type: def.entityId,
    maxDistance: RAIO_BUSCA,
  });
  for (const e of candidatos) {
    if (e.getDynamicProperty(PROP_HOME) === chave) return e;
  }
  return candidatos.find((e) => e.getDynamicProperty(PROP_HOME) === undefined);
}

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

export function removerEntidade(entity) {
  if (!entity?.isValid) return;
  dropInventory(entity);
  entity.remove();
}

export function garantirPosicao(entity, block) {
  const riding = entity.getComponent("minecraft:riding");
  if (riding) {
    try {
      riding.entityRidingOn?.getComponent("minecraft:rideable")?.ejectRider(entity);
    } catch {
      // se a API falhar, o teleporte abaixo ainda tira ela de lá
    }
  }
  const alvo = block.permutation.getState(STATE_FAKE_SELECTION)
    ? block.bottomCenter()
    : block.center();
  if (distancia(entity.location, alvo) > ANCHOR_TOLERANCE) {
    entity.teleport(alvo);
    entity.clearVelocity();
  }
}
