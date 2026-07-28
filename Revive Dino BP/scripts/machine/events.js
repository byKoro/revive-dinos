/**
 * machine/events.js
 * ---------------------------------------------------------------------------
 * Eventos de mundo compartilhados por todas as máquinas.
 * ---------------------------------------------------------------------------
 */

import { system, world } from "@minecraft/server";
import { EVENT_DESTROYED_BLOCK } from "../core/constants";
import { removerEntidade } from "./entity";
import { defPorEntidade, todasAsMaquinas } from "./registry";
import { liberarSelecaoFalsa } from "./selection";
import { limparInventarioDoJogador } from "./ui";

/**
 * Segunda camada de remoção: o inside_block_notifier dispara quando a
 * entidade fica dentro de ar (explosão, pistão, /setblock). Vale para
 * qualquer máquina registrada.
 */
export function registrarRemocaoPorDestruicao() {
  world.afterEvents.dataDrivenEntityTrigger.subscribe(
    ({ entity }) => {
      // A outra rota de remoção (onPlayerBreak) pode ter chegado primeiro:
      // sem este guard, mexer na entidade já removida lança InvalidEntityError.
      if (entity?.isValid !== true) return;

      const def = defPorEntidade(entity.typeId);
      if (!def) return;
      // Máquinas que guardam estado no item (ex.: bateria) precisam dropar
      // também nesta rota, senão o bloco some sem devolver nada.
      def.onBroken?.(entity, undefined, undefined, def);
      removerEntidade(entity);
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

/** Raio de busca por máquinas ao redor de quem acabou de entrar. */
const RAIO_RESET = 48;

/**
 * Ao entrar no mundo, solta a seleção falsa das máquinas próximas.
 *
 * O state `fake_selection` e a colisão da entidade sobrevivem ao logout. Com
 * eles ativos, o clique acerta a entidade e não o bloco, então o jogador não
 * conseguia quebrar nada (nem agachando) até o `entity_sensor` disparar alguns
 * segundos depois. Aqui o estado é normalizado na hora; o fluxo normal volta a
 * ligar a seleção assim que o jogador olhar para a máquina.
 */
export function registrarResetDeSelecaoAoEntrar() {
  world.afterEvents.playerSpawn.subscribe(({ player }) => {
    const soltar = () => {
      if (player?.isValid !== true) return;

      for (const def of todasAsMaquinas()) {
        const entidades = player.dimension.getEntities({
          type: def.entityId,
          location: player.location,
          maxDistance: RAIO_RESET,
        });

        for (const entity of entidades) {
          if (entity?.isValid !== true) continue;
          const block = entity.dimension.getBlock(entity.location);
          if (block?.typeId !== def.blockId) continue;
          liberarSelecaoFalsa(entity, block);
        }
      }
    };

    // Agora e de novo depois, para pegar chunks que ainda estavam carregando
    system.run(soltar);
    system.runTimeout(soltar, 40);
  });
}
