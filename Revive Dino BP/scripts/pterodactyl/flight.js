/**
 * pterodactyl/flight.js
 * Segurança extra: verifica periodicamente se o pterodáctilo sem rider
 * ainda está no modo voo e força o retorno ao modo caminhada.
 * A transição principal é feita via on_rider_enter_event/on_rider_exit_event
 * no componente minecraft:rideable da entidade.
 */

import { world, system } from "@minecraft/server";

const PTERO_TYPE = "revive_dinos:pterodactyl";

export function registrarVooPterodactyl() {
  // Fallback: se por algum motivo o evento de saída não disparou,
  // garante que pterodáctilos sem rider voltem ao chão.
  system.runInterval(() => {
    const dim = world.getDimension("overworld");
    let pteros;
    try {
      pteros = dim.getEntities({ type: PTERO_TYPE });
    } catch (e) {
      return;
    }

    for (const ptero of pteros) {
      try {
        const riderCount = ptero.getRiders().length;

        if (riderCount === 0 && !ptero.isOnGround) {
          // Sem rider e no ar — aplicar gravidade como segurança
          ptero.triggerEvent("revive_dinos:stop_flying");
        }
      } catch (e) {
        // entidade pode ter sido removida entre ticks
      }
    }
  }, 20);
}
