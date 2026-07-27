/**
 * fossil/minigame.js
 * ---------------------------------------------------------------------------
 * O minigame de escavação da Rocha Fossilizada.
 *
 * Fluxo por batida de martelo:
 *  - face errada        -> quebra, dropa qualidade média (punição)
 *  - face certa         -> avança o estágio, troca a textura base e sorteia
 *                          uma face nova entre as que faltam
 *  - face certa no fim  -> quebra, dropa alta qualidade
 *
 * Minerar segurando o botão não passa por aqui: cai no `minecraft:loot` do
 * bloco, que aponta para a tabela de pior qualidade.
 * ---------------------------------------------------------------------------
 */

import { world } from "@minecraft/server";
import {
  FOSSIL_ROCK_BLOCK_ID,
  PLAYER_TYPE_ID,
  STATE_STAGE,
  STATE_TARGET_FACE,
  stateUsedFace,
} from "../core/constants";
import { ESTAGIO_FINAL, INDICE_DA_FACE, sortearProximaFace } from "./faces";
import { desgastarMartelo, ehMartelo } from "./hammer";
import { LOOT_ALTO, LOOT_MEDIO, quebrarComLoot } from "./loot";

export function registrarMinigameDaRocha() {
  world.afterEvents.entityHitBlock.subscribe((event) => {
    const player = event.damagingEntity;
    const block = event.hitBlock;

    if (player?.typeId !== PLAYER_TYPE_ID) return;
    if (block?.typeId !== FOSSIL_ROCK_BLOCK_ID) return;

    const slot = player
      .getComponent("minecraft:equippable")
      ?.getEquipmentSlot("Mainhand");
    const item = slot?.getItem();

    // Só o martelo aciona o minigame
    if (!ehMartelo(item)) return;

    // Gasta durabilidade em toda batida processada, inclusive nas do meio
    desgastarMartelo(player, slot, item);

    resolverBatida(player, block, INDICE_DA_FACE[event.blockFace]);
  });
}

function resolverBatida(player, block, faceAtingida) {
  const permutation = block.permutation;
  const estagio = permutation.getState(STATE_STAGE) ?? 0;
  const faceAlvo = permutation.getState(STATE_TARGET_FACE) ?? 0;

  // ERROU
  if (faceAtingida !== faceAlvo) {
    quebrarComLoot(block, LOOT_MEDIO);
    player.playSound("random.glass");
    return;
  }

  // ACERTOU
  player.playSound("dig.stone");

  if (estagio >= ESTAGIO_FINAL) {
    quebrarComLoot(block, LOOT_ALTO);
    return;
  }

  const proximaFace = sortearProximaFace(permutation, faceAlvo);

  // A textura base acompanha o estágio (permutations do bloco), simulando a
  // escavação; o highlight vai para a face nova e a atual fica marcada.
  block.setPermutation(
    permutation
      .withState(STATE_STAGE, estagio + 1)
      .withState(stateUsedFace(faceAlvo), true)
      .withState(STATE_TARGET_FACE, proximaFace),
  );
}
