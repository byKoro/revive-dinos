/**
 * energy/cable.js
 * ---------------------------------------------------------------------------
 * Custom component do Cabo de Energia. Detecta blocos vizinhos que fazem parte
 * da rede de energia e atualiza os states de conexão (que dirigem a
 * bone_visibility na geometria).
 *
 * A detecção roda em onPlace e onTick. onTick é necessário porque quando um
 * bloco vizinho é colocado/removido, o nosso bloco não recebe onPlace de novo
 * — só o tick percebe a mudança.
 * ---------------------------------------------------------------------------
 */

import { CABLE_BLOCK_ID, DIRECTIONS, ENERGY_NETWORK_BLOCKS } from "./constants";
import { EXTRACTOR_BLOCK_ID } from "../core/constants";

/** Todos os block IDs que o cabo reconhece como "conectável". */
const CONNECTABLE = new Set([
  ...ENERGY_NETWORK_BLOCKS,
  EXTRACTOR_BLOCK_ID,
  "revive_dinos:biomass_synthesizer",
  // Futuramente: SEQUENCER_BLOCK_ID, INCUBATOR_BLOCK_ID
]);

/**
 * Verifica os vizinhos e atualiza os states de conexão se mudaram.
 * Retorna true se houve alteração.
 */
function atualizarConexoes(block) {
  let perm = block.permutation;
  let mudou = false;

  for (const dir of DIRECTIONS) {
    const state = `revive_dinos:connected_${dir.name}`;
    const vizinho = block.dimension.getBlock({
      x: block.location.x + dir.offset.x,
      y: block.location.y + dir.offset.y,
      z: block.location.z + dir.offset.z,
    });

    const conectado = vizinho ? CONNECTABLE.has(vizinho.typeId) : false;
    const atual = perm.getState(state) ?? false;

    if (conectado !== atual) {
      perm = perm.withState(state, conectado);
      mudou = true;
    }
  }

  if (mudou) block.setPermutation(perm);
  return mudou;
}

export const energyCableComponent = {
  onPlace: ({ block }) => {
    atualizarConexoes(block);
    // Notifica vizinhos para que eles também atualizem suas conexões
    notificarVizinhos(block);
  },

  onTick: ({ block }) => {
    atualizarConexoes(block);
  },

  onPlayerBreak: ({ block }) => {
    // Ao quebrar, notifica os vizinhos para que removam a conexão conosco
    notificarVizinhosDe(block.dimension, block.location);
  },
};

/** Força atualização dos cabos vizinhos (para que conectem a nós). */
function notificarVizinhos(block) {
  for (const dir of DIRECTIONS) {
    const vizinho = block.dimension.getBlock({
      x: block.location.x + dir.offset.x,
      y: block.location.y + dir.offset.y,
      z: block.location.z + dir.offset.z,
    });
    if (vizinho?.typeId === CABLE_BLOCK_ID) {
      atualizarConexoes(vizinho);
    }
  }
}

/** Versão que opera sem referência ao bloco (já foi quebrado). */
function notificarVizinhosDe(dimension, location) {
  for (const dir of DIRECTIONS) {
    const vizinho = dimension.getBlock({
      x: location.x + dir.offset.x,
      y: location.y + dir.offset.y,
      z: location.z + dir.offset.z,
    });
    if (vizinho?.typeId === CABLE_BLOCK_ID) {
      atualizarConexoes(vizinho);
    }
  }
}
