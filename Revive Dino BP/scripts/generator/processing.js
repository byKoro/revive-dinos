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
import { marcarProgressoVisualLoop } from "../machine/visual";
import {
  GENERATOR_LOOP_TICKS,
  GENERATOR_PARTICLE_ID,
  GENERATOR_PARTICLE_INTERVAL,
  PROP_GEN_PARTICLE_TICK,
} from "../core/constants";

/** Offset da face frontal por direção cardinal (normal apontando pra fora). */
const FRONT_OFFSETS = {
  north: { x: 0, z: -0.52 },
  south: { x: 0, z: 0.52 },
  east:  { x: 0.52, z: 0 },
  west:  { x: -0.52, z: 0 },
};

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
 * Animação da frente em LOOP + partículas de fogo.
 *
 * Em vez de avançar 1→2→3 numa única passada ao longo de toda a queima (que
 * deixava a animação travada por centenas de ticks em cada frame), agora os
 * estágios ciclam rapidamente a cada GENERATOR_LOOP_TICKS — é o que dá a
 * sensação de "máquina em funcionamento" como a fornalha vanilla.
 */
function desenharChama(def, entity, inv, fuel) {
  const total = entity.getDynamicProperty(PROP_ENTITY_FUEL_MAX) ?? fuel;
  const restante = Math.min(1, Math.max(0, fuel / Math.max(1, total)));

  if (fuel > 0) {
    // Animação em loop rápido na frente do bloco
    marcarProgressoVisualLoop(entity, GENERATOR_LOOP_TICKS);
    // Partículas de fogo na frente, piscando aleatoriamente
    spawnParticulas(entity);
  }

  // Barra de chama na UI (mantém o comportamento original: proporcional ao
  // combustível restante, não ao loop)
  const frames = def.layout.progressFrames;
  if (!frames) return;

  if (fuel <= 0) {
    aplicarFrame(def, entity, inv, 0, PROP_FRAME);
    return;
  }

  aplicarFrame(def, entity, inv, Math.max(1, Math.ceil(restante * frames)), PROP_FRAME);
}

/**
 * Spawna 1–2 partículas de fogo (basic_flame_particle) na base da face frontal
 * do gerador. Não é constante: pisca aleatoriamente a cada ~2.5s (±30%).
 *
 * Usa a posição da entidade (ancorada ao bloco) e lê a cardinal_direction do
 * bloco para saber para onde a frente aponta. O getBlock é barato aqui: a
 * entidade está no mesmo chunk e isto só roda a cada ~50 ticks.
 */
function spawnParticulas(entity) {
  const contador = (entity.getDynamicProperty(PROP_GEN_PARTICLE_TICK) ?? 0) + 1;

  const alvo = GENERATOR_PARTICLE_INTERVAL;
  if (contador < alvo) {
    entity.setDynamicProperty(PROP_GEN_PARTICLE_TICK, contador);
    return;
  }

  // Reseta com variação aleatória para o próximo ciclo parecer orgânico
  const variacao = Math.floor(alvo * 0.3 * (Math.random() * 2 - 1));
  entity.setDynamicProperty(PROP_GEN_PARTICLE_TICK, variacao);

  // Descobre a direção da frente via o bloco
  const block = entity.dimension.getBlock(entity.location);
  if (!block) return;
  const dir = block.permutation.getState("minecraft:cardinal_direction") ?? "south";
  const offsets = FRONT_OFFSETS[dir] ?? FRONT_OFFSETS.south;

  // Centro do bloco
  const cx = Math.floor(entity.location.x) + 0.5;
  const cy = Math.floor(entity.location.y);
  const cz = Math.floor(entity.location.z) + 0.5;

  const quantidade = Math.random() < 0.4 ? 2 : 1;

  for (let i = 0; i < quantidade; i++) {
    // Deslocamento lateral (perpendicular à face) ±0.25 do centro
    const lateral = (Math.random() - 0.5) * 0.5;
    const offsetY = 0.1 + Math.random() * 0.2; // rente ao chão

    // Lateral é no eixo perpendicular à normal da face
    const px = cx + offsets.x + (offsets.z !== 0 ? lateral : 0);
    const py = cy + offsetY;
    const pz = cz + offsets.z + (offsets.x !== 0 ? lateral : 0);

    entity.dimension.spawnParticle(GENERATOR_PARTICLE_ID, { x: px, y: py, z: pz });
  }
}
