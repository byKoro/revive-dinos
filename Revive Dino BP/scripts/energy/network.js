/**
 * energy/network.js
 * ---------------------------------------------------------------------------
 * Busca de energia via BFS pela rede de cabos. As máquinas chamam
 * `buscarFonte()` para encontrar um gerador ativo ou bateria carregada
 * conectada por até MAX_CABLE_REACH blocos de cabo.
 *
 * A busca é intencionalmente limitada (máx 16 blocos) para evitar lag em
 * redes grandes — cabos mais longos que isso não conduzem.
 * ---------------------------------------------------------------------------
 */

import {
  BATTERY_BLOCK_ID,
  CABLE_BLOCK_ID,
  DIRECTIONS,
  GENERATOR_BLOCK_ID,
  MAX_CABLE_REACH,
  PROP_CHARGE,
} from "./constants";

/**
 * Busca uma fonte de energia (bateria com carga ou gerador ativo) conectada
 * ao bloco `origem` por no máximo MAX_CABLE_REACH blocos de cabo.
 *
 * Retorna o bloco da fonte encontrada, ou undefined se não houver.
 * Também aceita fonte diretamente adjacente (sem cabo).
 */
export function buscarFonte(dimension, origem) {
  const chave = (l) => `${l.x},${l.y},${l.z}`;
  const visitados = new Set();
  const fila = [{ pos: origem, dist: 0 }];
  visitados.add(chave(origem));

  while (fila.length > 0) {
    const { pos, dist } = fila.shift();

    for (const dir of DIRECTIONS) {
      const nextPos = {
        x: pos.x + dir.offset.x,
        y: pos.y + dir.offset.y,
        z: pos.z + dir.offset.z,
      };
      const key = chave(nextPos);
      if (visitados.has(key)) continue;
      visitados.add(key);

      const bloco = dimension.getBlock(nextPos);
      if (!bloco) continue;

      // Encontrou uma fonte?
      if (bloco.typeId === BATTERY_BLOCK_ID) {
        const carga = bloco.getDynamicProperty?.(PROP_CHARGE) ?? 0;
        if (carga > 0) return bloco;
      }
      if (bloco.typeId === GENERATOR_BLOCK_ID) {
        // Gerador é fonte direta (o processamento de combustível adiciona
        // carga à rede; aqui só precisamos confirmar que ele existe)
        return bloco;
      }

      // Cabo: continua a busca
      if (bloco.typeId === CABLE_BLOCK_ID && dist < MAX_CABLE_REACH) {
        fila.push({ pos: nextPos, dist: dist + 1 });
      }
    }
  }

  return undefined;
}

/**
 * Consome `quantidade` de energia da fonte. Retorna true se tinha o
 * suficiente. Se a fonte for um gerador, assume que ele tem carga infinita
 * enquanto estiver queimando (o processamento de combustível é feito
 * separadamente no tick do gerador).
 */
export function consumirEnergia(fonte, quantidade) {
  if (!fonte) return false;

  if (fonte.typeId === GENERATOR_BLOCK_ID) {
    // Gerador ativo = energia disponível (combustível gerencia separadamente)
    return true;
  }

  if (fonte.typeId === BATTERY_BLOCK_ID) {
    const carga = fonte.getDynamicProperty?.(PROP_CHARGE) ?? 0;
    if (carga < quantidade) return false;
    fonte.setDynamicProperty(PROP_CHARGE, carga - quantidade);
    return true;
  }

  return false;
}
