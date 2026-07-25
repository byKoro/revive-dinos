/**
 * battery/processing.js
 * ---------------------------------------------------------------------------
 * Processamento da Bateria. A cada tick:
 *  1. Se há um gerador adjacente (ou conectado por cabo) com carga, puxa
 *     energia dele para encher o próprio buffer.
 *
 * A bateria não processa itens — é puro armazenamento de energia. As máquinas
 * encontram a bateria via BFS (network.js) e consomem dela diretamente.
 *
 * A carga fica na entidade (dynamic property), mesmo padrão do gerador.
 * ---------------------------------------------------------------------------
 */

import { PROP_FRAME } from "../core/constants";
import { inventarioDe } from "../core/items";
import {
  BATTERY_MAX_CHARGE,
  DIRECTIONS,
  GENERATOR_BLOCK_ID,
  PROP_ENTITY_CHARGE,
} from "../energy/constants";
import { limparItensDropados, restaurarSlotsDeUi } from "../machine/ui";

/** Quanto a bateria puxa do gerador adjacente por tick. */
const TAXA_CARGA = 500;

export function tickBattery(entity, def) {
  const inv = inventarioDe(entity);
  if (inv) {
    restaurarSlotsDeUi(def, entity, inv, PROP_FRAME);
    limparItensDropados(entity);
  }

  const charge = entity.getDynamicProperty(PROP_ENTITY_CHARGE) ?? 0;
  if (charge >= BATTERY_MAX_CHARGE) return;

  // Procura geradores adjacentes e puxa carga deles
  const loc = entity.location;
  const dim = entity.dimension;

  for (const dir of DIRECTIONS) {
    const vizPos = {
      x: Math.floor(loc.x) + dir.offset.x,
      y: Math.floor(loc.y) + dir.offset.y,
      z: Math.floor(loc.z) + dir.offset.z,
    };
    const vizBloco = dim.getBlock(vizPos);
    if (!vizBloco || vizBloco.typeId !== GENERATOR_BLOCK_ID) continue;

    // Acha a entidade do gerador pra ler a carga dele
    const genEnt = dim.getEntities({
      location: vizBloco.center(),
      type: "revive_dinos:combustion_generator_ui",
      maxDistance: 2,
    })[0];
    if (!genEnt?.isValid) continue;

    const genCharge = genEnt.getDynamicProperty(PROP_ENTITY_CHARGE) ?? 0;
    if (genCharge <= 0) continue;

    const espacoLivre = BATTERY_MAX_CHARGE - charge;
    const transferir = Math.min(TAXA_CARGA, genCharge, espacoLivre);
    if (transferir <= 0) continue;

    genEnt.setDynamicProperty(PROP_ENTITY_CHARGE, genCharge - transferir);
    entity.setDynamicProperty(PROP_ENTITY_CHARGE, charge + transferir);
    return; // uma transferência por tick é suficiente
  }
}
