/**
 * slowfall.js
 * Simula queda lenta para o dodo (como a galinha vanilla).
 * Aplica o efeito slow_falling continuamente quando o dodo está no ar.
 */

import { world, system } from "@minecraft/server";

const DODO_TYPE = "revive_dinos:dodo";

export function registrarSlowFallDodo() {
  system.runInterval(() => {
    const dodos = world.getDimension("overworld").getEntities({ type: DODO_TYPE });
    for (const dodo of dodos) {
      try {
        const vel = dodo.getVelocity();
        // Se está caindo (velocidade Y negativa), aplica slow_falling
        if (vel.y < -0.1) {
          dodo.addEffect("slow_falling", 20, { amplifier: 0, showParticles: false });
        }
      } catch (e) {
        // entidade pode ter sido removida entre ticks
      }
    }
  }, 3);
}
