/**
 * machine/ui.js
 * ---------------------------------------------------------------------------
 * Fake UI genérica. As peças de interface são blocos-item reais no container
 * da entidade. Este módulo monta a interface, protege as peças e desenha a
 * barra de progresso — tudo parametrizado pelo `layout` da definição.
 *
 * Uma máquina sem arte de UI ainda usa isto: basta `backgroundSlots: []` e
 * `progressSlot: null` — os slots não-funcionais recebem o placeholder.
 * ---------------------------------------------------------------------------
 */

import { NAMESPACE } from "../core/constants";
import { criarItem, inventarioDe } from "../core/items";

/** Reconhece qualquer peça de interface deste addon. */
export function ehItemDeUi(item) {
  if (!item) return false;
  const id = item.typeId;
  return (
    id.startsWith(`${NAMESPACE}:`) &&
    (id.includes("_ui_") || id.includes("placeholder"))
  );
}

const idFundo = (L, slot) => `${L.uiBackgroundId}_${slot}`;
const idProgresso = (L, frame) => `${L.uiProgressId}_${frame}`;

/**
 * Prende o frame ao intervalo que realmente tem peça criada.
 *
 * O frame vive numa dynamic property da entidade, então um valor gravado por
 * uma versão anterior sobrevive à atualização. Quando a bateria passou de 20
 * para 16 fatias, as entidades antigas continuaram pedindo o frame 20 e o
 * `criarItem` estourava com "Invalid item identifier" a cada tick.
 */
function frameValido(L, frame) {
  const max = L.progressFrames ?? 0;
  if (!Number.isFinite(frame) || frame < 0) return 0;
  return Math.min(Math.floor(frame), max);
}

/**
 * Conjunto de slots reservados, memoizado por layout. Antes isso recriava
 * arrays e fazia includes() dentro de um loop por tick — custo desnecessário
 * multiplicado por cada máquina no mundo.
 */
const cacheReservados = new WeakMap();
function reservados(L) {
  let set = cacheReservados.get(L);
  if (!set) {
    set = new Set([...L.inputs, ...L.outputs, ...L.backgroundSlots]);
    if (L.progressSlot != null) set.add(L.progressSlot);
    for (const o of L.overlaySlots ?? []) set.add(o.slot);
    cacheReservados.set(L, set);
  }
  return set;
}

/**
 * Peças de overlay: slots extras que mostram um frame de animação.
 * A bateria usa dois (metade esquerda e direita) para o preenchimento cobrir
 * a interface inteira. `progressSlot` continua funcionando para as máquinas
 * que só têm a barra única.
 */
const overlays = (L) => L.overlaySlots ?? [];

/** Montagem inicial, uma vez no spawn da entidade. */
export function montarUi(def, entity) {
  const inv = inventarioDe(entity);
  if (!inv) return;
  const L = def.layout;
  const res = reservados(L);

  for (const slot of L.outputs) inv.setItem(slot, criarItem(L.placeholderItem));

  const overlayPorSlot = new Map(overlays(L).map((o) => [o.slot, o.idPrefix]));

  for (let slot = 0; slot < inv.size; slot++) {
    if (L.inputs.includes(slot) || L.outputs.includes(slot)) continue;
    if (L.backgroundSlots.includes(slot)) {
      inv.setItem(slot, criarItem(idFundo(L, slot)));
    } else if (slot === L.progressSlot) {
      inv.setItem(slot, criarItem(idProgresso(L, 0)));
    } else if (overlayPorSlot.has(slot)) {
      inv.setItem(slot, criarItem(`${overlayPorSlot.get(slot)}_0`));
    } else if (!res.has(slot)) {
      inv.setItem(slot, criarItem(L.placeholderItem));
    }
  }
}

/**
 * Repõe uma peça retirada/trocada. Item legítimo do jogador num slot que não
 * é dele volta ao jogador mais próximo (dropa na posição dele, não do bloco).
 */
function forcarPeca(entity, inv, slot, esperado) {
  const atual = inv.getItem(slot);
  if (atual?.typeId === esperado) return;

  // A peça esperada precisa existir. Se um id inválido chegasse aqui, o
  // criarItem lançava e derrubava o tick INTEIRO da máquina — foi o que fazia a
  // bateria parar de carregar e o status não aparecer. A UI nunca deve ter esse
  // poder: na dúvida, deixa o slot como está e a máquina segue funcionando.
  let peca;
  try {
    peca = criarItem(esperado);
  } catch {
    return;
  }

  if (atual && !ehItemDeUi(atual)) {
    const jogador = entity.dimension.getPlayers({
      location: entity.location,
      maxDistance: 10,
      closest: 1,
    })[0];
    const dropPos = jogador?.location ?? entity.location;
    entity.dimension.spawnItem(atual, dropPos);
  }
  inv.setItem(slot, peca);
}

/** Varredura por tick: garante que toda peça de UI está no lugar. */
export function restaurarSlotsDeUi(def, entity, inv, frameProp) {
  const L = def.layout;

  for (const slot of L.backgroundSlots) forcarPeca(entity, inv, slot, idFundo(L, slot));

  const frameGravado = entity.getDynamicProperty(frameProp) ?? 0;
  const frameAtual = frameValido(L, frameGravado);

  // Valor obsoleto (versão anterior tinha mais frames): corrige de vez
  if (frameAtual !== frameGravado) entity.setDynamicProperty(frameProp, frameAtual);

  if (L.progressSlot != null) {
    forcarPeca(entity, inv, L.progressSlot, idProgresso(L, frameAtual));
  }

  // Peças de animação (ex.: as duas metades do preenchimento da bateria):
  // repostas todo tick, então o jogador não consegue retirá-las.
  for (const o of overlays(L)) {
    forcarPeca(entity, inv, o.slot, `${o.idPrefix}_${frameAtual}`);
  }

  // Protege inputs: se uma peca de UI parar num slot de entrada, devolve.
  for (const slot of L.inputs) {
    const item = inv.getItem(slot);
    if (item && ehItemDeUi(item)) {
      inv.setItem(slot, undefined);
    }
  }

  const res = reservados(L);
  for (let slot = 0; slot < inv.size; slot++) {
    if (res.has(slot)) continue;
    forcarPeca(entity, inv, slot, L.placeholderItem);
  }
}

/** Troca o item da barra só quando o frame muda de verdade. */
export function aplicarFrame(def, entity, inv, frame, frameProp) {
  const L = def.layout;
  if (L.progressSlot == null && overlays(L).length === 0) return;

  const alvo = frameValido(L, frame);
  if (entity.getDynamicProperty(frameProp) === alvo) return;

  // Mesmo cuidado do forcarPeca: um id de frame inexistente não pode abortar o
  // tick da máquina.
  try {
    if (L.progressSlot != null) {
      inv.setItem(L.progressSlot, criarItem(idProgresso(L, alvo)));
    }
    for (const o of overlays(L)) {
      inv.setItem(o.slot, criarItem(`${o.idPrefix}_${alvo}`));
    }
  } catch {
    return;
  }

  entity.setDynamicProperty(frameProp, alvo);
}

/** Tira as peças do inventário e do cursor do jogador. */
export function limparInventarioDoJogador(player) {
  const inv = inventarioDe(player);
  if (inv) {
    for (let slot = 0; slot < inv.size; slot++) {
      if (ehItemDeUi(inv.getItem(slot))) inv.setItem(slot, undefined);
    }
  }
  const cursor = player.getComponent("minecraft:cursor_inventory");
  if (cursor && ehItemDeUi(cursor.item)) cursor.clear();
}

/**
 * Apaga peças que viraram item no chão perto da máquina.
 *
 * getEntities é caro para rodar a cada tick em cada máquina, então a varredura
 * acontece a cada VARREDURA_INTERVALO ticks. Peças no chão não são urgentes:
 * o importante é que desapareçam, não que desapareçam no mesmo tick.
 */
const VARREDURA_INTERVALO = 20;
const PROP_VARREDURA = "revive_dinos:scan_tick";

export function limparItensDropados(entity) {
  const contador = (entity.getDynamicProperty(PROP_VARREDURA) ?? 0) + 1;
  if (contador < VARREDURA_INTERVALO) {
    entity.setDynamicProperty(PROP_VARREDURA, contador);
    return;
  }
  entity.setDynamicProperty(PROP_VARREDURA, 0);

  const dropados = entity.dimension.getEntities({
    type: "minecraft:item",
    location: entity.location,
    maxDistance: 4,
  });
  for (const drop of dropados) {
    const item = drop.getComponent("minecraft:item")?.itemStack;
    if (ehItemDeUi(item)) drop.remove();
  }
}
