/**
 * energy/network.js
 * ---------------------------------------------------------------------------
 * Busca de energia via BFS pela rede de cabos. As máquinas chamam
 * `buscarFonte()` para achar um gerador/bateria com carga, ligado por até
 * MAX_CABLE_REACH cabos (ou adjacente).
 *
 * A carga vive na ENTIDADE-container da fonte; aqui a gente localiza essa
 * entidade pela posição do bloco (SOURCE_ENTITY_BY_BLOCK) e lê/consome dela.
 * ---------------------------------------------------------------------------
 */

import {
  CABLE_BLOCK_ID,
  DIRECTIONS,
  MAX_CABLE_REACH,
  PROP_ENTITY_CHARGE,
  SOURCE_ENTITY_BY_BLOCK,
} from "./constants";

/** Entidade-container de uma fonte (gerador/bateria), ou undefined. */
function entidadeDaFonte(dimension, block) {
  const entType = SOURCE_ENTITY_BY_BLOCK[block.typeId];
  if (!entType) return undefined;
  return dimension.getEntities({
    location: block.center(),
    type: entType,
    maxDistance: 2,
  })[0];
}

export function cargaDaFonte(dimension, block) {
  return entidadeDaFonte(dimension, block)?.getDynamicProperty(PROP_ENTITY_CHARGE) ?? 0;
}

/**
 * Acha uma fonte com carga > 0 ligada ao bloco `origem` por até
 * MAX_CABLE_REACH cabos (ou adjacente). Retorna o bloco da fonte.
 */
export function buscarFonte(dimension, origem) {
  const chave = (l) => `${l.x},${l.y},${l.z}`;
  const visitados = new Set([chave(origem)]);
  const fila = [{ pos: origem, dist: 0 }];

  while (fila.length > 0) {
    const { pos, dist } = fila.shift();
    for (const dir of DIRECTIONS) {
      const prox = {
        x: pos.x + dir.offset.x,
        y: pos.y + dir.offset.y,
        z: pos.z + dir.offset.z,
      };
      const k = chave(prox);
      if (visitados.has(k)) continue;
      visitados.add(k);

      const bloco = dimension.getBlock(prox);
      if (!bloco) continue;

      if (SOURCE_ENTITY_BY_BLOCK[bloco.typeId] && cargaDaFonte(dimension, bloco) > 0) {
        return bloco;
      }
      if (bloco.typeId === CABLE_BLOCK_ID && dist < MAX_CABLE_REACH) {
        fila.push({ pos: prox, dist: dist + 1 });
      }
    }
  }
  return undefined;
}

/** Consome `quantidade` da fonte. Retorna true se havia o suficiente. */
export function consumirDaFonte(dimension, block, quantidade) {
  const ent = entidadeDaFonte(dimension, block);
  const carga = ent?.getDynamicProperty(PROP_ENTITY_CHARGE) ?? 0;
  if (!ent || carga < quantidade) return false;
  ent.setDynamicProperty(PROP_ENTITY_CHARGE, carga - quantidade);
  return true;
}

/**
 * BFS que coleta TODAS as fontes (geradores e baterias) alcançáveis pela rede
 * de cabos. Base da rede unificada: a máquina soma a carga de todas elas.
 * Inclui fontes com carga zero — quem filtra é o consumidor, o que mantém o
 * cache de topologia estável.
 */
export function coletarFontes(dimension, origem) {
  const chave = (l) => `${l.x},${l.y},${l.z}`;
  const visitados = new Set([chave(origem)]);
  const fila = [{ pos: origem, dist: 0 }];
  const fontes = [];

  while (fila.length > 0) {
    const { pos, dist } = fila.shift();
    for (const dir of DIRECTIONS) {
      const prox = {
        x: pos.x + dir.offset.x,
        y: pos.y + dir.offset.y,
        z: pos.z + dir.offset.z,
      };
      const k = chave(prox);
      if (visitados.has(k)) continue;
      visitados.add(k);

      const bloco = dimension.getBlock(prox);
      if (!bloco) continue;

      if (SOURCE_ENTITY_BY_BLOCK[bloco.typeId]) fontes.push(bloco);
      if (bloco.typeId === CABLE_BLOCK_ID && dist < MAX_CABLE_REACH) {
        fila.push({ pos: prox, dist: dist + 1 });
      }
    }
  }
  return fontes;
}

/**
 * BFS que acha um bloco de um tipo específico com carga > 0, ligado por cabos.
 * Usado pela bateria para puxar de geradores mesmo à distância (antes ela só
 * enxergava geradores diretamente adjacentes).
 */
export function buscarBlocoComCarga(dimension, origem, tiposAceitos) {
  const chave = (l) => `${l.x},${l.y},${l.z}`;
  const visitados = new Set([chave(origem)]);
  const fila = [{ pos: origem, dist: 0 }];

  while (fila.length > 0) {
    const { pos, dist } = fila.shift();
    for (const dir of DIRECTIONS) {
      const prox = {
        x: pos.x + dir.offset.x,
        y: pos.y + dir.offset.y,
        z: pos.z + dir.offset.z,
      };
      const k = chave(prox);
      if (visitados.has(k)) continue;
      visitados.add(k);

      const bloco = dimension.getBlock(prox);
      if (!bloco) continue;

      if (tiposAceitos.has(bloco.typeId) && cargaDaFonte(dimension, bloco) > 0) {
        return bloco;
      }
      if (bloco.typeId === CABLE_BLOCK_ID && dist < MAX_CABLE_REACH) {
        fila.push({ pos: prox, dist: dist + 1 });
      }
    }
  }
  return undefined;
}

/** Entidade de uma fonte, exposto para quem precisa ler/escrever carga. */
export { entidadeDaFonte };
