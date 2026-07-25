/**
 * battery/processing.js
 * ---------------------------------------------------------------------------
 * Processamento da Bateria. A cada tick puxa energia de geradores da rede
 * (adjacentes OU ligados por cabo) para encher o próprio buffer.
 *
 * A bateria não processa itens — é puro armazenamento. As máquinas encontram
 * a bateria via BFS (network.js) e consomem dela.
 *
 * Só puxa de GERADOR, nunca de outra bateria: senão duas baterias ficariam
 * trocando carga entre si indefinidamente.
 * ---------------------------------------------------------------------------
 */

import { PROP_FRAME } from "../core/constants";
import { inventarioDe } from "../core/items";
import {
  BATTERY_MAX_CHARGE,
  GENERATOR_BLOCK_ID,
  PROP_ENTITY_CHARGE,
} from "../energy/constants";
import { buscarBlocoComCarga, entidadeDaFonte } from "../energy/network";
import { limparItensDropados, restaurarSlotsDeUi } from "../machine/ui";

/** Quanto a bateria puxa por tick. Alto para não ser gargalo da rede. */
const TAXA_CARGA = 500;

/** A bateria só se recarrega a partir de geradores. */
const FONTES = new Set([GENERATOR_BLOCK_ID]);

export function tickBattery(entity, def) {
  const inv = inventarioDe(entity);
  if (inv) {
    restaurarSlotsDeUi(def, entity, inv, PROP_FRAME);
    limparItensDropados(entity);
  }

  const charge = entity.getDynamicProperty(PROP_ENTITY_CHARGE) ?? 0;
  if (charge >= BATTERY_MAX_CHARGE) return;

  // Acha um gerador com carga na rede (adjacente ou via cabo)
  const gerador = buscarBlocoComCarga(entity.dimension, entity.location, FONTES);
  if (!gerador) return;

  const genEnt = entidadeDaFonte(entity.dimension, gerador);
  if (!genEnt?.isValid) return;

  const genCharge = genEnt.getDynamicProperty(PROP_ENTITY_CHARGE) ?? 0;
  const transferir = Math.min(TAXA_CARGA, genCharge, BATTERY_MAX_CHARGE - charge);
  if (transferir <= 0) return;

  genEnt.setDynamicProperty(PROP_ENTITY_CHARGE, genCharge - transferir);
  entity.setDynamicProperty(PROP_ENTITY_CHARGE, charge + transferir);
}
