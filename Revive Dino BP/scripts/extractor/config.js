/**
 * extractor/config.js
 * ---------------------------------------------------------------------------
 * Arquivo de configuração do Extrator Genético.
 * Receitas, tempos, layout de slots e as tabelas de sorteio do DNA.
 *
 * É o único arquivo que precisa ser editado para adicionar espécie, receita
 * ou rebalancear pesos — a lógica que consome isso vive em processing.js.
 * ---------------------------------------------------------------------------
 */

import { indicePorPeso } from "../core/random";

// ---------------------------------------------------------------------------
// LAYOUT DA INTERFACE
// Grade de 27 slots (3 linhas x 9 colunas):
//   linha 0 -> 0..8    linha 1 -> 9..17    linha 2 -> 18..26
// ---------------------------------------------------------------------------
export const layout = {
  inputA: 2, // fóssil (slot de cima)
  inputB: 20, // tubo de ensaio (slot de baixo)
  output: 15, // DNA extraído (à direita)

  backgroundSlots: [9, 17],
  progressSlot: 26,

  uiBackgroundId: "revive_dinos:genetic_extractor_ui",
  uiProgressId: "revive_dinos:genetic_extractor_ui_progress",
  progressFrames: 19,

  placeholderItem: "revive_dinos:placeholder_invisible",
};

/**
 * Duração de um ciclo completo de animação da frente do extrator (ticks).
 * A cada EXTRACTOR_LOOP_TICKS a frente percorre 1→2→3→1→2→3... repetidamente.
 * 28 ticks ≈ 1.4s por loop → ~7 ciclos durante os 10s de processamento.
 */
export const EXTRACTOR_LOOP_TICKS = 28;

// ---------------------------------------------------------------------------
// ESPÉCIES
// A ordem define o índice de raridade (0 = mais comum, 4 = mais raro).
// Esse índice é usado pelas tabelas de qualidade mais abaixo.
// ---------------------------------------------------------------------------
export const especies = [
  { id: "revive_dinos:dna_dodo", nome: "Dodo" }, // 0 Comum
  { id: "revive_dinos:dna_triceratops", nome: "Triceratops" }, // 1 Incomum
  { id: "revive_dinos:dna_pterodactyl", nome: "Pterodáctilo" }, // 2 Raro
  { id: "revive_dinos:dna_velociraptor", nome: "Velociraptor" }, // 3 Épico
  { id: "revive_dinos:dna_trex", nome: "T-Rex" }, // 4 Lendário
];

// ---------------------------------------------------------------------------
// PESO POR TIPO DE FÓSSIL
// Um array de 5 números, na mesma ordem de `especies`.
// A linha do GDD (45/25/15/10/5) é o fêmur — os outros variam em volta dela.
// Crânio favorece espécies raras; Fragmento Misterioso é curinga uniforme.
// ---------------------------------------------------------------------------
export const tiposDeFossil = {
  cranio: [30, 25, 20, 15, 10],
  dente: [40, 27, 17, 10, 6],
  garra: [35, 27, 20, 12, 6],
  costela: [50, 25, 13, 8, 4],
  vertebra: [48, 26, 14, 8, 4],
  femur: [45, 25, 15, 10, 5],
  umero: [46, 26, 15, 9, 4],
  cauda: [42, 26, 17, 10, 5],
  fragmento: [20, 20, 20, 20, 20],
};

// ---------------------------------------------------------------------------
// MULTIPLICADOR POR FAIXA DE QUALIDADE
// Também um array de 5, aplicado por cima do peso do tipo.
// Fóssil danificado empurra o resultado para o comum; pristino, para o raro.
// ---------------------------------------------------------------------------
export const qualidades = {
  danificado: [1.5, 1.0, 0.5, 0.3, 0.1],
  intacto: [1.0, 1.0, 1.0, 1.0, 1.0],
  pristino: [0.7, 1.0, 1.5, 2.0, 3.0],
};

// ---------------------------------------------------------------------------
// RECEITAS
//
// Ingrediente aceita { item: "ns:id" } ou { tag: "ns:tag" }.
// A posição é FIXA: `a` no slot de cima, `b` no de baixo.
//
// Saída pode ser:
//   output: { item: "ns:id", amount: 1 }        -> fixa
//   output: { random: [ {item, weight}, ... ] } -> sorteio simples
//   output: { dnaDoFossil: true }               -> usa as tabelas acima,
//                                                  lendo o fóssil da entrada
// ---------------------------------------------------------------------------
export const recipes = [
  {
    id: "extracao_dna",
    time: 200, // ticks -> 10s
    a: { tag: "revive_dinos:fossil" },
    b: { item: "revive_dinos:test_tube" },
    output: { dnaDoFossil: true },
  },
];

// ---------------------------------------------------------------------------
// APOIO — normalmente não precisa mexer daqui para baixo
// ---------------------------------------------------------------------------

function matches(ingredient, itemStack) {
  if (!itemStack || !ingredient) return false;
  if (ingredient.item) return itemStack.typeId === ingredient.item;
  if (ingredient.tag) return itemStack.hasTag(ingredient.tag);
  return false;
}

/**
 * Quebra "revive_dinos:fossil_cranio_pristino" em { tipo, qualidade }.
 * Retorna undefined se o id não seguir esse formato.
 */
export function lerFossil(typeId) {
  const nome = typeId.split(":")[1] ?? "";
  const partes = nome.split("_");
  if (partes[0] !== "fossil" || partes.length < 3) return undefined;

  const qualidade = partes[partes.length - 1];
  const tipo = partes.slice(1, -1).join("_");

  if (!tiposDeFossil[tipo] || !qualidades[qualidade]) return undefined;
  return { tipo, qualidade };
}

/**
 * Sorteia o DNA a partir do fóssil de entrada, combinando o peso do tipo
 * com o multiplicador da faixa de qualidade.
 */
function dnaDoFossil(itemFossil) {
  const info = lerFossil(itemFossil?.typeId ?? "");
  if (!info) return undefined;

  const base = tiposDeFossil[info.tipo];
  const mult = qualidades[info.qualidade];
  const pesos = base.map((p, i) => p * mult[i]);

  const escolhida = indicePorPeso(pesos);
  if (escolhida === undefined) return undefined;

  return { item: especies[escolhida].id, amount: 1 };
}

export function findRecipe(itemInA, itemInB) {
  for (const recipe of recipes) {
    if (matches(recipe.a, itemInA) && matches(recipe.b, itemInB)) {
      return { recipe, aSlot: layout.inputA, bSlot: layout.inputB };
    }
  }
  return undefined;
}

/**
 * Resolve a saída de uma receita. `itemA` é o item do slot de cima, usado
 * pelas receitas que dependem da entrada (como a extração de DNA).
 */
export function pickOutput(recipe, itemA) {
  const out = recipe.output;

  if (out.dnaDoFossil) return dnaDoFossil(itemA);
  if (out.item) return { item: out.item, amount: out.amount ?? 1 };

  const pool = out.random ?? [];
  const escolhido = indicePorPeso(pool.map((e) => e.weight ?? 1));
  if (escolhido === undefined) return undefined;

  const entry = pool[escolhido];
  return { item: entry.item, amount: entry.amount ?? 1 };
}

/**
 * Todos os itens que o Extrator consegue produzir. Usado para distinguir
 * o que saiu da máquina do que o jogador tentou enfiar no slot de saída.
 */
export function saidasPossiveis() {
  const set = new Set();
  for (const recipe of recipes) {
    const out = recipe.output;
    if (out.dnaDoFossil) for (const e of especies) set.add(e.id);
    if (out.item) set.add(out.item);
    for (const entry of out.random ?? []) set.add(entry.item);
  }
  return set;
}

/**
 * Em qual slot de entrada um item cabe. Usado pelos funis para rotear
 * sozinhos, sem depender da face em que estão.
 */
export function slotParaIngrediente(item) {
  for (const recipe of recipes) {
    if (matches(recipe.a, item)) return layout.inputA;
    if (matches(recipe.b, item)) return layout.inputB;
  }
  return undefined;
}
