/**
 * machine/state.js
 * ---------------------------------------------------------------------------
 * Estado persistente por POSIÇÃO de bloco, em dynamic properties do mundo.
 *
 * Por que existe: o estado das máquinas (carga, combustível, progresso) vive na
 * entidade-container. Só que a entidade pode ser recriada — `/kill`, chunk
 * recarregado, ou o próprio `onTick` recriando quando não a encontra. Ao entrar
 * no mundo, o bloco às vezes tica ANTES da entidade carregar: aí uma entidade
 * nova nasce zerada e a máquina "para de funcionar do nada".
 *
 * Espelhando por posição, o estado pertence ao bloco e sobrevive a qualquer
 * troca de entidade.
 * ---------------------------------------------------------------------------
 */

import { world } from "@minecraft/server";

const chave = (prefixo, l) =>
  `${prefixo}:${Math.floor(l.x)},${Math.floor(l.y)},${Math.floor(l.z)}`;

export function lerEstado(prefixo, location, padrao = 0) {
  return world.getDynamicProperty(chave(prefixo, location)) ?? padrao;
}

export function gravarEstado(prefixo, location, valor) {
  world.setDynamicProperty(chave(prefixo, location), valor);
}

export function limparEstado(prefixo, location) {
  world.setDynamicProperty(chave(prefixo, location), undefined);
}

/**
 * Espelha várias propriedades da entidade para a posição do bloco.
 * `campos` é um mapa { prefixoNoMundo: propNaEntidade }.
 */
export function espelharDaEntidade(entity, location, campos) {
  for (const [prefixo, prop] of Object.entries(campos)) {
    gravarEstado(prefixo, location, entity.getDynamicProperty(prop) ?? 0);
  }
}

/**
 * Restaura na entidade o que estiver espelhado na posição.
 * Retorna true se havia algo relevante guardado.
 */
export function restaurarNaEntidade(entity, location, campos) {
  let achou = false;
  for (const [prefixo, prop] of Object.entries(campos)) {
    const valor = lerEstado(prefixo, location, 0);
    if (valor) achou = true;
    entity.setDynamicProperty(prop, valor);
  }
  return achou;
}

export function limparCampos(location, campos) {
  for (const prefixo of Object.keys(campos)) limparEstado(prefixo, location);
}
