/**
 * machine/status.js
 * ---------------------------------------------------------------------------
 * Exibição do status da máquina na action bar (agachar + olhar).
 *
 * Roda no TICK do bloco, não no entity_sensor: o sensor tem cadência própria
 * (a cada vários ticks), o que fazia os números parecerem congelados. Aqui a
 * leitura é atualizada a cada tick, em tempo real.
 *
 * Custo controlado: o raycast só acontece se houver um jogador AGACHADO por
 * perto — no caso normal a checagem para no `isSneaking`.
 *
 * Para uma máquina exibir status, basta a definição ter `statusTexto(entity)`.
 * ---------------------------------------------------------------------------
 */

import { SELECTION_RANGE } from "../core/constants";
import { mesmaPosicaoDeBloco } from "../core/vectors";

export function atualizarStatus(entity, block, def) {
  if (!def.statusTexto) return;

  const player = entity.dimension.getPlayers({
    location: entity.location,
    maxDistance: SELECTION_RANGE,
    closest: 1,
  })[0];

  // Só mostra para quem está agachado (evita raycast no caso comum)
  if (!player?.isSneaking) return;

  const alvo = player.getBlockFromViewDirection({
    maxDistance: SELECTION_RANGE,
  })?.block;
  if (!alvo || !mesmaPosicaoDeBloco(alvo.location, block.location)) return;

  player.onScreenDisplay.setActionBar(def.statusTexto(entity, def));
}
