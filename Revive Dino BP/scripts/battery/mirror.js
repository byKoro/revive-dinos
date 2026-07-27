/**
 * battery/mirror.js
 * ---------------------------------------------------------------------------
 * Espelho da carga por POSIÇÃO do bloco, em dynamic property do mundo.
 *
 * A carga "oficial" vive na entidade, mas a entidade pode ser recriada
 * (/kill, chunk recarregado, auto-recuperação do onTick) — e nesse caso a
 * carga voltaria a zero. O espelho garante que a energia pertence ao BLOCO,
 * não à instância da entidade.
 * ---------------------------------------------------------------------------
 */

import { world } from "@minecraft/server";

const chave = (l) => `rd_bat:${Math.floor(l.x)},${Math.floor(l.y)},${Math.floor(l.z)}`;

export function lerEspelho(location) {
  return world.getDynamicProperty(chave(location)) ?? 0;
}

export function gravarEspelho(location, carga) {
  world.setDynamicProperty(chave(location), carga);
}

export function limparEspelho(location) {
  world.setDynamicProperty(chave(location), undefined);
}
