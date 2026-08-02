/**
 * dodo/hurt.js
 * Spawna partículas de pena quando o dodo é atingido.
 */

import { world } from "@minecraft/server";

const DODO_TYPE = "revive_dinos:dodo";
const PARTICLE_ID = "revive_dinos:dodo_feathers";

export function registrarHurtDodo() {
  world.afterEvents.entityHurt.subscribe((event) => {
    const entity = event.hurtEntity;
    if (entity.typeId !== DODO_TYPE) return;

    try {
      const pos = entity.location;
      entity.dimension.spawnParticle(PARTICLE_ID, {
        x: pos.x,
        y: pos.y + 0.6,
        z: pos.z,
      });
    } catch (e) {
      // partícula pode falhar se entidade for removida
    }
  });
}
