/**
 * fossil/rock.js
 * ---------------------------------------------------------------------------
 * Custom component da Rocha Fossilizada.
 *
 * Serve para sortear a face-alvo quando o jogador coloca a rocha — sem isso
 * ela nasceria sempre na face 0 (de baixo), que é o valor padrão do state.
 *
 * Rochas vindas de estrutura (.mcstructure) NÃO passam por aqui: o arquivo
 * já guarda os states salvos, então a face é a que foi gravada na estrutura.
 * ---------------------------------------------------------------------------
 */

import { STATE_STAGE, STATE_TARGET_FACE } from "../core/constants";
import { sortearFaceInicial } from "./faces";

export const fossilRockComponent = {
  onPlace: ({ block }) => {
    block.setPermutation(
      block.permutation
        .withState(STATE_STAGE, 0)
        .withState(STATE_TARGET_FACE, sortearFaceInicial()),
    );
  },
};
