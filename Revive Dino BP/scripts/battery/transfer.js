/**
 * battery/transfer.js
 * ---------------------------------------------------------------------------
 * Ponte entre o item de bateria e o bloco colocado.
 *
 * Problema: o gancho `onPlace` do bloco não recebe o item usado, e quando ele
 * roda o item já saiu da mão. Precisamos saber a carga ANTES da colocação.
 *
 * Por que não usar um evento de colocação:
 *  - `playerInteractWithBlock` não dispara de forma confiável para colocação
 *    de bloco (é o que fazia a carga voltar sempre zerada).
 *  - `playerPlaceBlock` (before) ainda é experimental, então não serve para
 *    um addon estável.
 *
 * Solução: vigiar a mão do jogador por polling. Se ele está segurando uma
 * bateria com carga, guardamos esse valor; ao colocar, o `onPlaced` consome.
 * O registro tem validade curta, então não "vaza" para uma colocação futura.
 * ---------------------------------------------------------------------------
 */

import { system, world } from "@minecraft/server";
import { BATTERY_BLOCK_ID } from "../energy/constants";
import { cargaDaLore } from "./charge";

/** playerId -> { carga, tick } */
const pendentes = new Map();

/** De quantos em quantos ticks a mão é verificada. */
const INTERVALO = 5;

/** Por quantos ticks um registro continua válido depois de visto. */
const VALIDADE = 200;

/**
 * Registro direto, usado no momento em que o jogador quebra a bateria.
 * É o caminho principal do fluxo "quebrei e recoloquei": não depende da lore
 * nem de o polling ter passado enquanto o item estava na mão.
 */
export function registrarCargaDoJogador(player, carga) {
  if (!player || carga <= 0) return;
  pendentes.set(player.id, { carga, tick: system.currentTick });
}

function maoDoJogador(player) {
  return player.getComponent("minecraft:equippable")?.getEquipmentSlot("Mainhand")?.getItem();
}

export function registrarTransferenciaDeBateria() {
  system.runInterval(() => {
    const agora = system.currentTick;

    for (const player of world.getPlayers()) {
      const item = maoDoJogador(player);
      if (item?.typeId !== BATTERY_BLOCK_ID) continue;

      const carga = cargaDaLore(item);
      if (carga > 0) pendentes.set(player.id, { carga, tick: agora });
    }

    // Limpa registros velhos para a memória não crescer
    for (const [id, pend] of pendentes) {
      if (agora - pend.tick > VALIDADE) pendentes.delete(id);
    }
  }, INTERVALO);
}

/**
 * Consome a carga registrada do jogador mais próximo. Retorna 0 se não houver
 * nada pendente (bateria nova, ou colocada sem carga).
 */
export function consumirCargaPendente(dimension, location) {
  const player = dimension.getPlayers({
    location,
    maxDistance: 8,
    closest: 1,
  })[0];
  if (!player) return 0;

  const pend = pendentes.get(player.id);
  if (!pend) return 0;

  pendentes.delete(player.id);

  // Registro velho demais: não era desta colocação
  if (system.currentTick - pend.tick > VALIDADE) return 0;

  return pend.carga;
}
