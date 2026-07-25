/**
 * extractor/events.js
 * ---------------------------------------------------------------------------
 * Assinaturas de evento de mundo que pertencem ao Extrator e não caberiam
 * num módulo mais específico.
 * ---------------------------------------------------------------------------
 */

import { system, world } from "@minecraft/server";
import { EVENT_DESTROYED_BLOCK } from "../core/constants";
import { removerEntidade } from "./entity";
import { limparInventarioDoJogador } from "./ui";

/**
 * Segunda camada de remoção da entidade: o `inside_block_notifier` do JSON
 * dispara quando ela fica dentro de ar, cobrindo explosão, pistão e
 * /setblock — casos em que `onPlayerBreak` nunca roda.
 */
export function registrarRemocaoPorDestruicao() {
  world.afterEvents.dataDrivenEntityTrigger.subscribe(
    ({ entity }) => removerEntidade(entity),
    { eventTypes: [EVENT_DESTROYED_BLOCK] },
  );
}

/**
 * Rede de segurança: limpa quem entrar no mundo carregando peças de sessões
 * anteriores, já que a varredura por tick só acontece perto do bloco.
 */
export function registrarLimpezaAoEntrar() {
  world.afterEvents.playerSpawn.subscribe(({ player }) => {
    system.run(() => limparInventarioDoJogador(player));
  });
}
