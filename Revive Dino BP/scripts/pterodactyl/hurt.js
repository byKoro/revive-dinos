/**
 * pterodactyl/hurt.js
 * Efeitos visuais quando o pterodáctilo é atingido.
 */

import { world } from "@minecraft/server";

const PTERO_TYPE = "revive_dinos:pterodactyl";

export function registrarHurtPterodactyl() {
  world.afterEvents.entityHurt.subscribe((event) => {
    const entity = event.hurtEntity;
    if (entity.typeId !== PTERO_TYPE) return;

    try {
      const pos = entity.location;
      // Efeito visual de escamas/fragmentos ao ser atingido
      entity.dimension.spawnParticle("minecraft:basic_crit_particle", {
        x: pos.x,
        y: pos.y + 1.5,
        z: pos.z,
      });
    } catch (e) {
      // partícula pode falhar se entidade for removida
    }
  });
}
