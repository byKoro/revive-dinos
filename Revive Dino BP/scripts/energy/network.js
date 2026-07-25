/**
 * energy/network.js
 * ---------------------------------------------------------------------------
 * Busca de energia via BFS pela rede de cabos. As máquinas chamam
 * `buscarFonte()` para achar um gerador ou bateria com carga, conectado por
 * até MAX_CABLE_REACH blocos de cabo (ou diretamente adjacente).
 *
 * A carga vive em dynamic properties do mundo (ver storage.js), não no bloco.
 * ---------------------------------------------------------------------------
 */

import {
  BATTERY_BLOCK_ID,
  CABLE_BLOCK_ID,
  DIRECTIONS,
  GENERATOR_BLOCK_ID,
  MAX_CABLE_REACH,
} from "./constants";
import { consumirCarga, getCarga } from "./storage";

const ehFonte = (typeId) =>
  typeId === BATTERY_BLOCK_ID || typeId === GENERATOR_BLOCK_ID;

/**
 * Acha uma fonte (gerador ou bateria) com carga > 0, ligada ao bloco `origem`
 * por no máximo MAX_CABLE_REACH cabos. Aceita fonte diretamente adjacente.
 * Retorna o bloco da fonte, ou undefined.
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

      if (ehFonte(bloco.typeId) && getCarga(bloco.location) > 0) {
        return bloco;
      }

      if (bloco.typeId === CABLE_BLOCK_ID && dist < MAX_CABLE_REACH) {
        fila.push({ pos: prox, dist: dist + 1 });
      }
    }
  }

  return undefined;
}

/**
 * Consome `quantidade` da fonte encontrada. Retorna true se havia o
 * suficiente. As máquinas devem chamar isto por tick de processamento.
 */
export function consumirDaFonte(fonte, quantidade) {
  if (!fonte) return false;
  return consumirCarga(fonte.location, quantidade);
}
