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
  PROP_ENTITY_FUEL_MAX,
  PROP_ENTITY_RATE,
} from "../energy/constants";
import { infoCombustivel } from "../energy/fuel";
import { espelharDaEntidade, primeiroTick, restaurarNaEntidade } from "../machine/state";
import { aplicarFrame, limparItensDropados, restaurarSlotsDeUi } from "../machine/ui";
import { marcarProgressoVisual } from "../machine/visual";

/**
 * Estado do gerador espelhado por posição do bloco. É o que impede a máquina
 * de "parar de gerar" quando a entidade é recriada (ex.: ao entrar no mundo, se
 * o bloco tica antes da entidade carregar).
 */
export const CAMPOS_GERADOR = {
  "rd_gen_charge": PROP_ENTITY_CHARGE,
  "rd_gen_fuel": PROP_ENTITY_FUEL,
  "rd_gen_rate": PROP_ENTITY_RATE,
  "rd_gen_fuelmax": PROP_ENTITY_FUEL_MAX,
};

export function tickGenerator(entity, def) {
  const inv = inventarioDe(entity);
  if (!inv) return;

  restaurarSlotsDeUi(def, entity, inv, PROP_FRAME);
  limparItensDropados(entity);

  let fuel = entity.getDynamicProperty(PROP_ENTITY_FUEL) ?? 0;
  let charge = entity.getDynamicProperty(PROP_ENTITY_CHARGE) ?? 0;
  let rate = entity.getDynamicProperty(PROP_ENTITY_RATE) ?? 0;

  // Entidade recém-nascida: recupera o estado que pertence ao bloco, para o
  // gerador não "parar de gerar" quando a entidade é recriada.
  //
  // O gatilho é o primeiro tick DELA, não "estado zerado". Zerado é também o
  // estado legítimo de um gerador sem combustível já drenado, e nesse caso o
  // espelho (gravado no fim do tick anterior, antes do consumo que veio depois)
  // devolvia a carga gasta a cada tick: energia infinita.
  if (primeiroTick(entity)) {
    if (restaurarNaEntidade(entity, entity.location, CAMPOS_GERADOR)) {
      fuel = entity.getDynamicProperty(PROP_ENTITY_FUEL) ?? 0;
      charge = entity.getDynamicProperty(PROP_ENTITY_CHARGE) ?? 0;
      rate = entity.getDynamicProperty(PROP_ENTITY_RATE) ?? 0;
    }
  }

  // Sem combustível queimando: tenta pegar 1 item do slot (se há espaço p/ carga)
  if (fuel <= 0 && charge < GENERATOR_MAX_CHARGE) {
    const item = inv.getItem(GENERATOR_FUEL_SLOT);
    const info = item ? infoCombustivel(item.typeId) : undefined;
    if (info) {
      consumirUm(inv, GENERATOR_FUEL_SLOT);
      fuel = info.ticks;
      rate = info.rate;
      entity.setDynamicProperty(PROP_ENTITY_RATE, rate);
      // Guarda o total para a chama saber a altura proporcional
      entity.setDynamicProperty(PROP_ENTITY_FUEL_MAX, info.ticks);
    }
  }

  // Queima 1 tick de combustível e acumula carga (pausa se o buffer encheu)
  if (fuel > 0 && charge < GENERATOR_MAX_CHARGE) {
    charge = Math.min(charge + rate, GENERATOR_MAX_CHARGE);
    fuel -= 1;
    entity.setDynamicProperty(PROP_ENTITY_CHARGE, charge);
    entity.setDynamicProperty(PROP_ENTITY_FUEL, fuel);
  }

  desenharChama(def, entity, inv, fuel);

  // Mantém o espelho do bloco em dia
  espelharDaEntidade(entity, entity.location, CAMPOS_GERADOR);
}

/**
 * Altura da chama = combustível restante, como na fornalha: cheia ao acender e
 * baixando conforme queima. Sem combustível, apaga.
 */
function desenharChama(def, entity, inv, fuel) {
  const total = entity.getDynamicProperty(PROP_ENTITY_FUEL_MAX) ?? fuel;
  const restante = Math.min(1, Math.max(0, fuel / Math.max(1, total)));

  // Frente do bloco + som. O gerador não tem PROP_PROGRESS: aqui "progresso" é
  // o combustível JÁ QUEIMADO, então a frente avança de estágio conforme a
  // fornada é consumida e apaga quando o combustível acaba.
  //
  // Não marcar nada quando fuel <= 0 é o que apaga a frente (ver visual.js).
  if (fuel > 0) marcarProgressoVisual(entity, 1 - restante);

  const frames = def.layout.progressFrames;
  if (!frames) return;

  if (fuel <= 0) {
    aplicarFrame(def, entity, inv, 0, PROP_FRAME);
    return;
  }

  aplicarFrame(def, entity, inv, Math.max(1, Math.ceil(restante * frames)), PROP_FRAME);
}
