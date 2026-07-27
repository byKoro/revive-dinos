/**
 * fossil/faces.js
 * ---------------------------------------------------------------------------
 * Regras das faces da Rocha Fossilizada.
 *
 * A ordem dos índices tem que casar com as permutations do bloco
 * (`blocks/fossilized_rock.json`): 0=down 1=up 2=north 3=south 4=west 5=east.
 * Mudar aqui sem mudar lá desalinha o highlight.
 * ---------------------------------------------------------------------------
 */

import { stateUsedFace } from "../core/constants";
import { escolherUm, inteiroAte } from "../core/random";

/** Nome da face vinda do evento -> índice do state. */
export const INDICE_DA_FACE = {
  Down: 0,
  Up: 1,
  North: 2,
  South: 3,
  West: 4,
  East: 5,
};

export const TOTAL_DE_FACES = 6;

/** Último estágio de escavação; acertar nele quebra a rocha com loot alto. */
export const ESTAGIO_FINAL = 3;

/** Sorteia a face inicial de uma rocha recém-colocada. */
export function sortearFaceInicial() {
  return inteiroAte(TOTAL_DE_FACES);
}

/**
 * Sorteia a próxima face-alvo entre as que ainda não foram escavadas.
 * A face atual entra como usada, então ela nunca sai repetida.
 */
export function sortearProximaFace(permutation, faceAtual) {
  const disponiveis = [];
  for (let face = 0; face < TOTAL_DE_FACES; face++) {
    if (face === faceAtual) continue;
    if (permutation.getState(stateUsedFace(face)) === true) continue;
    disponiveis.push(face);
  }
  return escolherUm(disponiveis);
}
