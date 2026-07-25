/**
 * extractor/selection.js
 * ---------------------------------------------------------------------------
 * Seleção falsa: outline ao mirar o bloco, e liberação da mineração ao
 * agachar. Dirigido pelo `minecraft:entity_sensor` (evento player_nearby).
 *
 * - Olhando, não agachado -> entidade ganha colisão, o bloco encolhe a
 *   selection_box e uma outline de 1 tick é spawnada.
 * - Agachado perto        -> colisão sai e o bloco recupera a selection_box
 *                            cheia, liberando minerar o bloco real.
 *
 * O raycast muda conforme o state: com seleção ativa mira a entidade, sem
 * ela mira o bloco. Distância medida da cabeça, não dos pés.
 * ---------------------------------------------------------------------------
 */

import { world } from "@minecraft/server";
import {
  EVENT_ADD_COLLISION,
  EVENT_PLAYER_NEARBY,
  EVENT_REMOVE_COLLISION,
  EXTRACTOR_BLOCK_ID,
  EXTRACTOR_UI_ENTITY_ID,
  OUTLINE_ENTITY_ID,
  SELECTION_RANGE,
  STATE_FAKE_SELECTION,
} from "../core/constants";
import { distancia, mesmaPosicaoDeBloco } from "../core/vectors";
import { limparInventarioDoJogador } from "./ui";

export function registrarSelecaoFalsa() {
  world.afterEvents.dataDrivenEntityTrigger.subscribe(
    ({ entity }) => {
      if (!entity?.isValid) return;

      const block = entity.dimension.getBlock(entity.location);
      if (!block || block.isAir) return;
      // Blocos órfãos (ex.: instâncias antigas após renomear o identifier)
      // não têm os states deste bloco; mexer neles quebra o setPermutation.
      if (block.typeId !== EXTRACTOR_BLOCK_ID) return;

      const center = block.center();
      const fakeSelection = block.permutation.getState(STATE_FAKE_SELECTION);

      const player = entity.dimension.getPlayers({
        location: center,
        maxDistance: SELECTION_RANGE + 2,
        closest: 1,
      })[0];

      if (!player) {
        if (!fakeSelection) ativarSelecaoFalsa(entity, block);
        return;
      }

      if (distancia(player.getHeadLocation(), center) > SELECTION_RANGE) return;
      if (!estaOlhando(player, entity, block, fakeSelection)) return;

      limparInventarioDoJogador(player);

      const agachado = player.isSneaking;
      if (!agachado && !fakeSelection) ativarSelecaoFalsa(entity, block);
      if (agachado && fakeSelection) desativarSelecaoFalsa(entity, block);
      if (!agachado) entity.dimension.spawnEntity(OUTLINE_ENTITY_ID, center);
    },
    { eventTypes: [EVENT_PLAYER_NEARBY] },
  );
}

/** Com seleção ativa o alvo é a entidade; sem ela, o bloco. */
function estaOlhando(player, entity, block, fakeSelection) {
  if (fakeSelection) {
    const alvo = player.getEntitiesFromViewDirection({
      maxDistance: SELECTION_RANGE,
      type: EXTRACTOR_UI_ENTITY_ID,
    })[0]?.entity;
    return alvo?.id === entity.id;
  }

  const alvo = player.getBlockFromViewDirection({
    maxDistance: SELECTION_RANGE,
  })?.block;
  return alvo !== undefined && mesmaPosicaoDeBloco(alvo.location, block.location);
}

function ativarSelecaoFalsa(entity, block) {
  entity.triggerEvent(EVENT_ADD_COLLISION);
  block.setPermutation(block.permutation.withState(STATE_FAKE_SELECTION, true));
  entity.teleport(block.bottomCenter());
}

function desativarSelecaoFalsa(entity, block) {
  entity.triggerEvent(EVENT_REMOVE_COLLISION);
  block.setPermutation(block.permutation.withState(STATE_FAKE_SELECTION, false));
  entity.teleport(block.center());
}
