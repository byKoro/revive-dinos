/**
 * fossil/loot.js
 * ---------------------------------------------------------------------------
 * Entrega das recompensas da Rocha Fossilizada.
 *
 * Duas armadilhas conhecidas, ambas tratadas aqui:
 *  - `Dimension.runCommandAsync` não existe mais na API 2.x -> usar runCommand.
 *  - `setblock ... destroy` dispararia TAMBÉM o `minecraft:loot` do bloco
 *    (qualidade "poor") por cima do drop do minigame -> usar setType.
 *
 * O caminho passado ao /loot é relativo a `loot_tables/` e sem `.json`.
 * ---------------------------------------------------------------------------
 */

import { AIR_BLOCK_ID } from "../core/constants";

export const LOOT_MEDIO = "blocks/fossil_rock_mid";
export const LOOT_ALTO = "blocks/fossil_rock_high";

/**
 * Dropa a loot table indicada na posição do bloco e remove o bloco sem
 * acionar o loot padrão.
 */
export function quebrarComLoot(block, lootTable) {
  const { x, y, z } = block.location;
  block.dimension.runCommand(
    `loot spawn ${x} ${y} ${z} loot "${lootTable}"`,
  );
  block.setType(AIR_BLOCK_ID);
}
