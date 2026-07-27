/**
 * generator/processing.js
 * ---------------------------------------------------------------------------
 * Processamento do Gerador a Combustão, rodando no tick do bloco (framework
 * de máquina). Queima combustível do slot e acumula carga NA ENTIDADE.
 *
 * A carga fica na entidade-container (dynamic property), coerente com o
 * inventário/UI viverem nela. A rede de energia (network.js) lê essa carga
 * pela entidade da fonte.
 * ---------------------------------------------------------------------------
 */

import { PROP_FRAME } from "../core/constants";
import { consumirUm, inventarioDe } from "../core/items";
import {
  GENERATOR_FUEL_SLOT,
  GENERATOR_MAX_CHARGE,
  PROP_ENTITY_CHARGE,
  PROP_ENTITY_FUEL,
  PROP_ENTITY_RATE,
} from "../energy/constants";
import { infoCombustivel } from "../energy/fuel";
import { limparItensDropados, restaurarSlotsDeUi } from "../machine/ui";

export function tickGenerator(entity, def) {
  const inv = inventarioDe(entity);
  if (!inv) return;

  restaurarSlotsDeUi(def, entity, inv, PROP_FRAME);
  limparItensDropados(entity);

  let fuel = entity.getDynamicProperty(PROP_ENTITY_FUEL) ?? 0;
  let charge = entity.getDynamicProperty(PROP_ENTITY_CHARGE) ?? 0;
  let rate = entity.getDynamicProperty(PROP_ENTITY_RATE) ?? 0;

  // Sem combustível queimando: tenta pegar 1 item do slot (se há espaço p/ carga)
  if (fuel <= 0 && charge < GENERATOR_MAX_CHARGE) {
    const item = inv.getItem(GENERATOR_FUEL_SLOT);
    const info = item ? infoCombustivel(item.typeId) : undefined;
    if (info) {
      consumirUm(inv, GENERATOR_FUEL_SLOT);
      fuel = info.ticks;
      rate = info.rate;
      entity.setDynamicProperty(PROP_ENTITY_RATE, rate);
    }
  }

  // Queima 1 tick de combustível e acumula carga (pausa se o buffer encheu)
  if (fuel > 0 && charge < GENERATOR_MAX_CHARGE) {
    charge = Math.min(charge + rate, GENERATOR_MAX_CHARGE);
    fuel -= 1;
    entity.setDynamicProperty(PROP_ENTITY_CHARGE, charge);
    entity.setDynamicProperty(PROP_ENTITY_FUEL, fuel);
  }
}
