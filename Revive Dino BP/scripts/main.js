import { world, system, ItemStack, GameMode } from "@minecraft/server";

import {
  layout,
  findRecipe,
  pickOutput,
  saidasPossiveis,
  slotParaIngrediente,
} from "./extractorConfig";

const SAIDAS = saidasPossiveis();
const HOME = "revive_dinos:home";

// Marca a entidade como pertencente a um bloco específico. Sem isso, buscar
// num raio maior poderia capturar a entidade de um Extrator vizinho.
function chaveDoBloco(block) {
  const l = block.location;
  return `${l.x},${l.y},${l.z}`;
}

function criarEntidade(block, dimension) {
  const entity = dimension.spawnEntity(ENTITY_ID, block.bottomCenter());
  entity.nameTag = "\u00a7r";
  entity.setDynamicProperty(HOME, chaveDoBloco(block));
  setupUi(entity);
  return entity;
}

// Procura a entidade deste bloco. O raio é largo para reencontrá-la caso
// tenha sido arrastada, mas o vínculo garante que é a certa.
function acharEntidade(block, dimension) {
  const chave = chaveDoBloco(block);
  const candidatos = dimension.getEntities({
    location: block.center(),
    type: ENTITY_ID,
    maxDistance: 6,
  });
  for (const e of candidatos) {
    if (e.getDynamicProperty(HOME) === chave) return e;
  }
  // entidades antigas, criadas antes do vínculo existir
  return candidatos.find((e) => e.getDynamicProperty(HOME) === undefined);
}

const ENTITY_ID = "revive_dinos:genetic_extractor_ui";
const BLOCK_ID = "revive_dinos:genetic_extractor";
const OUTLINE_ID = "revive_dinos:outline_selection";
const FAKE_SELECTION = "revive_dinos:fake_selection";
const RANGE = 8;

system.beforeEvents.startup.subscribe((initEvent) => {
  const reg = initEvent.blockComponentRegistry;

  reg.registerCustomComponent("revive_dinos:extractor_machine", {
    onPlace: ({ block, dimension }) => {
      if (acharEntidade(block, dimension)) return;
      criarEntidade(block, dimension);
    },

    onPlayerBreak: ({ block, dimension }) => {
      const entity = acharEntidade(block, dimension);
      if (!entity?.isValid) return;
      dropInventory(entity);
      entity.remove();
    },

    // Dirige o processamento. Vem do minecraft:tick do bloco, igual ao Furnaces,
    // deixando o timer da entidade livre para o hopper.
    onTick: ({ block, dimension }) => {
      const entity = acharEntidade(block, dimension);

      // Sumiu (/kill, chunk corrompido): recria para a UI não morrer de vez
      if (!entity?.isValid) {
        criarEntidade(block, dimension);
        return;
      }

      garantirPosicao(entity, block);
      tickExtractor(entity);
    },
  });

  // Blocos de UI nunca devem existir no mundo: viram ar se forem colocados.
  reg.registerCustomComponent("revive_dinos:ui_placeholder", {
    onPlace: ({ block }) => block.setType("minecraft:air"),
  });

  // Rocha Fossilizada: sorteia a face-alvo inicial ao ser colocada. Sem isso
  // ela cairia sempre na face 0 (de baixo), pois é o valor padrão do state.
  reg.registerCustomComponent("revive_dinos:fossil_rock", {
    onPlace: ({ block }) => {
      const face = Math.floor(Math.random() * 6);
      block.setPermutation(
        block.permutation
          .withState("revive_dinos:stage", 0)
          .withState("revive_dinos:target_face", face)
          .withState("revive_dinos:used_faces", 0),
      );
    },
  });
});

// Ponto único de criação das peças de interface.
// (ItemLockMode foi descartado: polui o tooltip e não segurava de fato.)
function uiItem(typeId) {
  return new ItemStack(typeId, 1);
}

// ---------------------------------------------------------------------------
// Montagem inicial da interface falsa
// ---------------------------------------------------------------------------
function setupUi(entity) {
  const inv = entity.getComponent("minecraft:inventory")?.container;
  if (!inv) return;

  const funcionais = [layout.inputA, layout.inputB, layout.output];
  const reservados = [
    ...funcionais,
    ...layout.backgroundSlots,
    layout.progressSlot,
  ];

  inv.setItem(layout.output, uiItem(layout.placeholderItem));

  for (let slot = 0; slot < inv.size; slot++) {
    if (funcionais.includes(slot)) continue;

    if (layout.backgroundSlots.includes(slot)) {
      inv.setItem(slot, uiItem(`${layout.uiBackgroundId}_${slot}`));
    } else if (slot === layout.progressSlot) {
      inv.setItem(slot, uiItem(`${layout.uiProgressId}_0`));
    } else if (!reservados.includes(slot)) {
      inv.setItem(slot, uiItem(layout.placeholderItem));
    }
  }
}

// ---------------------------------------------------------------------------
// Processamento — roda no timer da própria entidade
// ---------------------------------------------------------------------------
function tickExtractor(entity) {
  const inv = entity.getComponent("minecraft:inventory")?.container;
  if (!inv) return;

  restaurarSlotsDeUi(entity, inv);
  protegerSlotDeSaida(entity, inv);
  limparItensDropados(entity);

  const itemA = inv.getItem(layout.inputA);
  const itemB = inv.getItem(layout.inputB);
  const match = findRecipe(itemA, itemB);

  if (!match || !outputTemEspaco(inv)) return resetProgress(entity, inv);

  const total = match.recipe.time;
  const progresso =
    (entity.getDynamicProperty("revive_dinos:progress") ?? 0) + 1;

  if (progresso >= total) {
    // Se não couber na saída, segura o progresso no máximo e tenta de novo
    if (concluir(entity, inv, match)) resetProgress(entity, inv);
    return;
  }

  entity.setDynamicProperty("revive_dinos:progress", progresso);
  desenharProgresso(entity, inv, progresso / total);
}

// Retorna true se conseguiu concluir. Só consome os ingredientes se o
// resultado realmente couber na saída — senão pausa e tenta no tick seguinte.
function concluir(entity, inv, match) {
  // O DNA depende do fóssil que está na entrada, então o item vai junto
  const itemA = inv.getItem(match.aSlot);
  const resultado = pickOutput(match.recipe, itemA);
  if (!resultado) return false;

  const atual = inv.getItem(layout.output);
  const vazia = saidaVazia(inv);
  const empilha =
    !vazia &&
    atual.typeId === resultado.item &&
    atual.amount + resultado.amount <= atual.maxAmount;

  if (!vazia && !empilha) return false;

  consumirUm(inv, match.aSlot);
  consumirUm(inv, match.bSlot);

  inv.setItem(
    layout.output,
    vazia
      ? new ItemStack(resultado.item, resultado.amount)
      : new ItemStack(atual.typeId, atual.amount + resultado.amount),
  );
  return true;
}

function consumirUm(inv, slot) {
  const item = inv.getItem(slot);
  if (!item) return;
  inv.setItem(
    slot,
    item.amount > 1 ? new ItemStack(item.typeId, item.amount - 1) : undefined,
  );
}

// O slot de saída fica sempre ocupado: com o resultado, ou com o placeholder
// invisível. Assim o jogador não consegue depositar nada nele.
// Placeholder conta como "vazio" para a lógica de produção.
function saidaVazia(inv) {
  const atual = inv.getItem(layout.output);
  return !atual || atual.typeId === layout.placeholderItem;
}

function outputTemEspaco(inv) {
  if (saidaVazia(inv)) return true;
  const atual = inv.getItem(layout.output);
  return atual.amount < atual.maxAmount;
}

// Devolve ao mundo qualquer coisa estranha que apareça na saída e repõe o
// placeholder quando ela fica vazia.
function protegerSlotDeSaida(entity, inv) {
  const atual = inv.getItem(layout.output);

  if (!atual) {
    inv.setItem(layout.output, new ItemStack(layout.placeholderItem, 1));
    return;
  }
  if (atual.typeId === layout.placeholderItem) return;
  if (SAIDAS.has(atual.typeId)) return;

  entity.dimension.spawnItem(atual, entity.location);
  inv.setItem(layout.output, new ItemStack(layout.placeholderItem, 1));
}

function desenharProgresso(entity, inv, fracao) {
  const frame = Math.min(
    layout.progressFrames,
    Math.ceil(fracao * layout.progressFrames),
  );
  aplicarFrame(entity, inv, frame);
}

function resetProgress(entity, inv) {
  entity.setDynamicProperty("revive_dinos:progress", 0);
  aplicarFrame(entity, inv, 0);
}

// Só troca o item quando o frame muda de verdade
function aplicarFrame(entity, inv, frame) {
  if (entity.getDynamicProperty("revive_dinos:frame") === frame) return;
  inv.setItem(layout.progressSlot, uiItem(`${layout.uiProgressId}_${frame}`));
  entity.setDynamicProperty("revive_dinos:frame", frame);
}

// ---------------------------------------------------------------------------
// Remoção da entidade
// ---------------------------------------------------------------------------
world.afterEvents.dataDrivenEntityTrigger.subscribe(
  ({ entity }) => {
    if (!entity?.isValid) return;
    dropInventory(entity);
    entity.remove();
  },
  { eventTypes: ["revive_dinos:destroyed_block"] },
);

function dropInventory(entity) {
  if (!entity?.isValid) return;
  const inv = entity.getComponent("minecraft:inventory")?.container;
  if (!inv) return;

  for (let slot = 0; slot < inv.size; slot++) {
    const item = inv.getItem(slot);
    if (!item) continue;
    if (item.typeId.includes("_ui") || item.typeId.includes("placeholder"))
      continue;
    entity.dimension.spawnItem(item, entity.location);
  }
}

// ---------------------------------------------------------------------------
// COMPATIBILIDADE COM FUNIS
// A entidade tem can_be_siphoned_from: false, então o funil vanilla não a
// enxerga. A troca é feita na mão, respeitando a direção do funil como o
// jogo faria.
//
// facing_direction do funil: 0=baixo 1=cima 2=norte 3=sul 4=oeste 5=leste
// Um funil só insere se estiver APONTANDO para o Extrator.
// ---------------------------------------------------------------------------
const FACES_DE_ENTRADA = {
  above: 0, // funil em cima precisa apontar para baixo
  north: 3, // funil ao norte precisa apontar para o sul
  south: 2,
  east: 4,
  west: 5,
};

world.afterEvents.dataDrivenEntityTrigger.subscribe(
  ({ entity }) => {
    if (!entity?.isValid) return;
    const block = entity.dimension.getBlock(entity.location);
    if (!block || block.isAir) return;

    const inv = entity.getComponent("minecraft:inventory")?.container;
    if (!inv) return;

    for (const [face, facing] of Object.entries(FACES_DE_ENTRADA)) {
      const funil = block[face]();
      if (funil?.typeId !== "minecraft:hopper") continue;
      if (funil.permutation.getState("facing_direction") !== facing) continue;
      inserirDoFunil(funil, inv);
    }

    const abaixo = block.below();
    if (abaixo?.typeId === "minecraft:hopper") extrairParaFunil(inv, abaixo);
  },
  { eventTypes: ["revive_dinos:hopper_compatibility"] },
);

// Move 1 item do funil para o slot de entrada que a receita aceitar.
// Uma unidade por ciclo, como o funil do jogo.
function inserirDoFunil(funil, inv) {
  const funilInv = funil.getComponent("minecraft:inventory")?.container;
  if (!funilInv) return;

  for (let slot = 0; slot < funilInv.size; slot++) {
    const item = funilInv.getItem(slot);
    if (!item) continue;

    const destino = slotParaIngrediente(item);
    if (destino === undefined) continue;

    const atual = inv.getItem(destino);
    if (
      atual &&
      (atual.typeId !== item.typeId || atual.amount >= atual.maxAmount)
    )
      continue;

    inv.setItem(destino, new ItemStack(item.typeId, (atual?.amount ?? 0) + 1));
    funilInv.setItem(
      slot,
      item.amount > 1 ? new ItemStack(item.typeId, item.amount - 1) : undefined,
    );
    return;
  }
}

// Puxa 1 item da saída para o funil de baixo. O placeholder invisível nunca
// é puxado — para o funil, saída com placeholder é saída vazia.
function extrairParaFunil(inv, funil) {
  const funilInv = funil.getComponent("minecraft:inventory")?.container;
  if (!funilInv) return;

  const saida = inv.getItem(layout.output);
  if (!saida || saida.typeId === layout.placeholderItem) return;

  for (let slot = 0; slot < funilInv.size; slot++) {
    const alvo = funilInv.getItem(slot);
    if (alvo && (alvo.typeId !== saida.typeId || alvo.amount >= alvo.maxAmount))
      continue;

    funilInv.setItem(
      slot,
      new ItemStack(saida.typeId, (alvo?.amount ?? 0) + 1),
    );
    inv.setItem(
      layout.output,
      saida.amount > 1
        ? new ItemStack(saida.typeId, saida.amount - 1)
        : new ItemStack(layout.placeholderItem, 1),
    );
    return;
  }
}

// ---------------------------------------------------------------------------
// ANCORAGEM DA ENTIDADE
// Barco, minecart, pistão, explosão, /tp ou correnteza podem tirar a entidade
// do lugar e quebrar a interface. Aqui ela é devolvida à força todo tick.
// ---------------------------------------------------------------------------
function garantirPosicao(entity, block) {
  // desmonta de qualquer veículo
  const riding = entity.getComponent("minecraft:riding");
  if (riding) {
    try {
      riding.entityRidingOn
        ?.getComponent("minecraft:rideable")
        ?.ejectRider(entity);
    } catch {
      // se a API falhar, o teleporte abaixo ainda tira ela de lá
    }
  }

  const alvo = block.permutation.getState(FAKE_SELECTION)
    ? block.bottomCenter()
    : block.center();

  const p = entity.location;
  const desvio = Math.hypot(p.x - alvo.x, p.y - alvo.y, p.z - alvo.z);
  if (desvio > 0.05) {
    entity.teleport(alvo);
    entity.clearVelocity();
  }
}

// ---------------------------------------------------------------------------
// PROTEÇÃO DOS ITENS DE UI
// Os blocos de interface são itens de verdade dentro de um container que o
// jogador abre. Sem isso ele consegue tirá-los e ficar com blocos inválidos.
// ---------------------------------------------------------------------------

// Reconhece qualquer peça de interface deste addon
function ehItemDeUi(item) {
  if (!item) return false;
  const id = item.typeId;
  return (
    id.startsWith("revive_dinos:") &&
    (id.includes("_ui_") || id.includes("placeholder"))
  );
}

// Repõe qualquer peça que tenha sido retirada ou trocada de lugar.
// Item legítimo do jogador que apareça num slot que não é dele é devolvido
// ao mundo, nunca apagado.
function forcarPeca(entity, inv, slot, esperado) {
  const atual = inv.getItem(slot);
  if (atual?.typeId === esperado) return;

  if (atual && !ehItemDeUi(atual)) {
    entity.dimension.spawnItem(atual, entity.location);
  }
  inv.setItem(slot, uiItem(esperado));
}

function restaurarSlotsDeUi(entity, inv) {
  // metades do fundo
  for (const slot of layout.backgroundSlots) {
    forcarPeca(entity, inv, slot, `${layout.uiBackgroundId}_${slot}`);
  }

  // barra de progresso: confere contra o frame atual, não só quando ele muda
  const frame = entity.getDynamicProperty("revive_dinos:frame") ?? 0;
  forcarPeca(
    entity,
    inv,
    layout.progressSlot,
    `${layout.uiProgressId}_${frame}`,
  );

  // demais slots decorativos
  const reservados = [
    layout.inputA,
    layout.inputB,
    layout.output,
    ...layout.backgroundSlots,
    layout.progressSlot,
  ];

  for (let slot = 0; slot < inv.size; slot++) {
    if (reservados.includes(slot)) continue;
    forcarPeca(entity, inv, slot, layout.placeholderItem);
  }
}

// Tira as peças do inventário e do cursor do jogador
function limparInventarioDoJogador(player) {
  const inv = player.getComponent("minecraft:inventory")?.container;
  if (inv) {
    for (let slot = 0; slot < inv.size; slot++) {
      if (ehItemDeUi(inv.getItem(slot))) inv.setItem(slot, undefined);
    }
  }

  const cursor = player.getComponent("minecraft:cursor_inventory");
  if (cursor && ehItemDeUi(cursor.item)) cursor.clear();
}

// Apaga peças que tenham virado item no chão
function limparItensDropados(entity) {
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

// Rede de segurança: limpa quem entrar no mundo carregando peças de sessões
// anteriores, já que a varredura só acontece perto do bloco.
world.afterEvents.playerSpawn.subscribe(({ player }) => {
  system.run(() => limparInventarioDoJogador(player));
});

// ---------------------------------------------------------------------------
// Seleção falsa: outline ao mirar, libera mineração ao agachar
// ---------------------------------------------------------------------------
world.afterEvents.dataDrivenEntityTrigger.subscribe(
  ({ entity }) => {
    if (!entity?.isValid) return;

    const block = entity.dimension.getBlock(entity.location);
    if (!block || block.isAir) return;
    // Blocos órfãos (ex.: instâncias antigas após renomear o identifier) não
    // têm os states deste bloco; mexer neles quebra o setPermutation.
    if (block.typeId !== BLOCK_ID) return;

    const center = block.center();
    const fakeSelection = block.permutation.getState(FAKE_SELECTION);

    const player = entity.dimension.getPlayers({
      location: center,
      maxDistance: RANGE + 2,
      closest: 1,
    })[0];

    if (!player) {
      if (!fakeSelection) enableFakeSelection(entity, block);
      return;
    }

    const eyes = player.getHeadLocation();
    const dist = Math.hypot(
      eyes.x - center.x,
      eyes.y - center.y,
      eyes.z - center.z,
    );
    if (dist > RANGE) return;

    let lookingAtIt = false;
    if (fakeSelection) {
      const target = player.getEntitiesFromViewDirection({
        maxDistance: RANGE,
        type: ENTITY_ID,
      })[0]?.entity;
      lookingAtIt = target?.id === entity.id;
    } else {
      const target = player.getBlockFromViewDirection({
        maxDistance: RANGE,
      })?.block;
      const l = block.location;
      lookingAtIt =
        target !== undefined &&
        target.location.x === l.x &&
        target.location.y === l.y &&
        target.location.z === l.z;
    }

    if (!lookingAtIt) return;

    limparInventarioDoJogador(player);

    const sneaking = player.isSneaking;
    if (!sneaking && !fakeSelection) enableFakeSelection(entity, block);
    if (sneaking && fakeSelection) disableFakeSelection(entity, block);
    if (!sneaking) entity.dimension.spawnEntity(OUTLINE_ID, center);
  },
  { eventTypes: ["revive_dinos:player_nearby"] },
);

function enableFakeSelection(entity, block) {
  entity.triggerEvent("revive_dinos:add_collision");
  block.setPermutation(block.permutation.withState(FAKE_SELECTION, true));
  entity.teleport(block.bottomCenter());
}

function disableFakeSelection(entity, block) {
  entity.triggerEvent("revive_dinos:remove_collision");
  block.setPermutation(block.permutation.withState(FAKE_SELECTION, false));
  entity.teleport(block.center());
}

// Mapeamento das faces do Minecraft para os inteiros da nossa trait
const faceMap = {
  Down: 0,
  Up: 1,
  North: 2,
  South: 3,
  West: 4,
  East: 5,
};

const FOSSIL_ID = "revive_dinos:fossilized_rock";

world.afterEvents.entityHitBlock.subscribe((event) => {
  const player = event.damagingEntity;
  const block = event.hitBlock;

  if (player?.typeId !== "minecraft:player" || block?.typeId !== FOSSIL_ID)
    return;

  const equipment = player.getComponent("minecraft:equippable");
  const mainhandSlot = equipment?.getEquipmentSlot("Mainhand");
  const item = mainhandSlot?.getItem();

  // Só o martelo aciona o minigame
  if (!item || item.typeId !== "revive_dinos:hammer") return;

  // 1. Durabilidade do martelo (1 ponto por batida)
  if (player.getGameMode() !== GameMode.creative) {
    const durability = item.getComponent("minecraft:durability");
    if (durability) {
      if (durability.damage + 1 >= durability.maxDurability) {
        mainhandSlot.setItem(undefined); // quebra o martelo
        player.playSound("random.break");
      } else {
        durability.damage += 1;
        mainhandSlot.setItem(item);
      }
    }
  }

  // 2. Minigame
  const hitFaceId = faceMap[event.blockFace];
  const stage = block.permutation.getState("revive_dinos:stage") ?? 0;
  const targetFace =
    block.permutation.getState("revive_dinos:target_face") ?? 0;
  const usedMask = block.permutation.getState("revive_dinos:used_faces") ?? 0;

  const dim = block.dimension;
  const { x, y, z } = block.location;

  // ERROU a face -> quebra e dropa qualidade média.
  // setType (não "setblock ... destroy") para NÃO soltar também o loot padrão.
  if (hitFaceId !== targetFace) {
    dim.runCommand(`loot spawn ${x} ${y} ${z} loot "blocks/fossil_rock_mid"`);
    block.setType("minecraft:air");
    player.playSound("random.glass");
    return;
  }

  // ACERTOU
  player.playSound("dig.stone");

  // Último estágio -> quebra e dropa alta qualidade
  if (stage >= 3) {
    dim.runCommand(`loot spawn ${x} ${y} ${z} loot "blocks/fossil_rock_high"`);
    block.setType("minecraft:air");
    return;
  }

  // Marca a face atual como já interagida e sorteia uma nova entre as que
  // ainda não foram usadas (bitmask), para nunca repetir uma face anterior.
  const newMask = usedMask | (1 << targetFace);
  const disponiveis = [];
  for (let f = 0; f < 6; f++) {
    if (!(newMask & (1 << f))) disponiveis.push(f);
  }
  const novaFace = disponiveis[Math.floor(Math.random() * disponiveis.length)];

  // A textura base muda conforme o stage (permutations do bloco) simulando a
  // escavação; o highlight vai para a nova face-alvo.
  block.setPermutation(
    block.permutation
      .withState("revive_dinos:stage", stage + 1)
      .withState("revive_dinos:target_face", novaFace)
      .withState("revive_dinos:used_faces", newMask),
  );
});
