/**
 * core/vectors.js
 * ---------------------------------------------------------------------------
 * Utilidades de posição. Pequeno de propósito — só o que o addon usa.
 * ---------------------------------------------------------------------------
 */

/** Distância euclidiana entre dois pontos {x,y,z}. */
export function distancia(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);
}

/** Compara posições de bloco (inteiras) sem depender de referência. */
export function mesmaPosicaoDeBloco(a, b) {
  return a.x === b.x && a.y === b.y && a.z === b.z;
}

/** Chave estável de um bloco, usada para vincular a entidade ao seu bloco. */
export function chaveDePosicao(location) {
  return `${location.x},${location.y},${location.z}`;
}
