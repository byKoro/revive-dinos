/**
 * machine/events.js
 * ---------------------------------------------------------------------------
 * Eventos de mundo compartilhados por todas as máquinas.
 * ---------------------------------------------------------------------------
 */

import { system, world } from "@minecraft/server";
import { EVENT_DESTROYED_BLOCK } from "../core/constants";
import { removerEntidade } from "./entity";
import { defPorEntidade } from "./registry";
import { limparInventarioDoJogador } from "./ui";

/**
 * Segunda camada de remoção: o inside_block_notifier dispara quando a
 * entidade fica dentro de ar (explosão, pistão, /setblock). Vale para
 * qualquer máquina registrada.
 */
export function registrarRemocaoPorDestruicao() {
  world.afterEvents.dataDrivenEntityTrigger.subscribe(
    ({ entity }) => {
      if (defPorEntidade(entity?.typeId)) removerEntidade(entity);
    },
    { eventTypes: [EVENT_DESTROYED_BLOCK] },
  );
}

/** Limpa quem entrar no mundo carregando peças de sessões anteriores. */
export function registrarLimpezaAoEntrar() {
  world.afterEvents.playerSpawn.subscribe(({ player }) => {
    system.run(() => limparInventarioDoJogador(player));
  });
}
