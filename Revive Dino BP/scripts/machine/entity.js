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

/** Distância máxima para adotar uma entidade órfã (sem vínculo). */
const RAIO_ADOCAO = 1.5;

/**
 * Acha a entidade deste bloco e, no caminho, ELIMINA DUPLICATAS.
 *
 * Por que duplicatas existem: ao entrar no mundo o bloco às vezes tica antes da
 * entidade carregar, então uma nova é criada com o mesmo vínculo. A partir daí
 * só UMA recebe tick — a outra fica "fantasma", sem a varredura que protege as
 * peças de UI. Era assim que, depois de sair e voltar, dava para retirar os
 * blocos da interface na mão.
 *
 * O conteúdo da duplicata é dropado antes de removê-la, então nada do jogador
 * se perde.
 */
export function acharEntidade(def, block, dimension) {
  const chave = chaveDePosicao(block.location);
  const candidatos = dimension.getEntities({
    location: block.center(),
    type: def.entityId,
    maxDistance: RAIO_BUSCA,
  });

  const minhas = [];
  const orfas = [];
  for (const e of candidatos) {
    if (e?.isValid !== true) continue;
    const home = e.getDynamicProperty(PROP_HOME);
    if (home === chave) minhas.push(e);
    else if (home === undefined) orfas.push(e);
  }

  let escolhida = minhas[0];

  // Entidade antiga (criada antes do vínculo existir): adota se estiver aqui
  if (!escolhida) {
    escolhida = orfas.find(
      (e) => distancia(e.location, block.center()) <= RAIO_ADOCAO,
    );
    if (escolhida) escolhida.setDynamicProperty(PROP_HOME, chave);
  }

  // Sobrou mais de uma para este bloco: mantém a primeira e remove o resto
  for (const dup of minhas.slice(1)) removerEntidade(dup);

  return escolhida;
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
