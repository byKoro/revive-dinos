/**
 * machine/selection.js
 * ---------------------------------------------------------------------------
 * Seleção falsa genérica: outline ao mirar, libera mineração ao agachar.
 * Um único handler atende todas as máquinas — despacha pela definição achada
 * a partir do tipo da entidade.
 * ---------------------------------------------------------------------------
 */

import { world } from "@minecraft/server";
import {
  EVENT_ADD_COLLISION,
  EVENT_PLAYER_NEARBY,
  EVENT_REMOVE_COLLISION,
  OUTLINE_ENTITY_ID,
  SELECTION_RANGE,
  STATE_FAKE_SELECTION,
} from "../core/constants";
import { distancia, mesmaPosicaoDeBloco } from "../core/vectors";
import { defPorEntidade } from "./registry";
import { limparInventarioDoJogador } from "./ui";

export function registrarSelecaoFalsa() {
  world.afterEvents.dataDrivenEntityTrigger.subscribe(
    ({ entity }) => {
      if (!entity?.isValid) return;
      const def = defPorEntidade(entity.typeId);
      if (!def) return;

      const block = entity.dimension.getBlock(entity.location);
      if (!block || block.isAir || block.typeId !== def.blockId) return;

      const center = block.center();
      const fakeSelection = block.permutation.getState(STATE_FAKE_SELECTION);

      const player = entity.dimension.getPlayers({
        location: center,
        maxDistance: SELECTION_RANGE + 2,
        closest: 1,
      })[0];

      if (!player) {
        if (!fakeSelection) ativar(entity, block);
        return;
      }

      if (distancia(player.getHeadLocation(), center) > SELECTION_RANGE) return;
      if (!estaOlhando(player, entity, block, fakeSelection, def)) return;

      limparInventarioDoJogador(player);

      const agachado = player.isSneaking;
      if (!agachado && !fakeSelection) ativar(entity, block);
      if (agachado && fakeSelection) desativar(entity, block);
      if (!agachado) entity.dimension.spawnEntity(OUTLINE_ENTITY_ID, center);

      // Agachado + olhando: a máquina pode exibir seu status na action bar
      if (agachado) def.onSneakLook?.(entity, player, block, def);
    },
    { eventTypes: [EVENT_PLAYER_NEARBY] },
  );
}

function estaOlhando(player, entity, block, fakeSelection, def) {
  if (fakeSelection) {
    const alvo = player.getEntitiesFromViewDirection({
      maxDistance: SELECTION_RANGE,
      type: def.entityId,
    })[0]?.entity;
    return alvo?.id === entity.id;
  }
  const alvo = player.getBlockFromViewDirection({ maxDistance: SELECTION_RANGE })?.block;
  return alvo !== undefined && mesmaPosicaoDeBloco(alvo.location, block.location);
}

function ativar(entity, block) {
  entity.triggerEvent(EVENT_ADD_COLLISION);
  block.setPermutation(block.permutation.withState(STATE_FAKE_SELECTION, true));
  entity.teleport(block.bottomCenter());
}

function desativar(entity, block) {
  entity.triggerEvent(EVENT_REMOVE_COLLISION);
  block.setPermutation(block.permutation.withState(STATE_FAKE_SELECTION, false));
  entity.teleport(block.center());
}
