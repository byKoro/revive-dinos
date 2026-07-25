/**
 * core/random.js
 * ---------------------------------------------------------------------------
 * Sorteios genéricos. Isolados para ficarem fáceis de trocar por um gerador
 * com semente, caso um dia se queira resultado reproduzível em teste.
 * ---------------------------------------------------------------------------
 */

/** Inteiro aleatório em [0, max). */
export function inteiroAte(max) {
  return Math.floor(Math.random() * max);
}

/** Um elemento aleatório da lista, ou undefined se ela estiver vazia. */
export function escolherUm(lista) {
  if (!lista?.length) return undefined;
  return lista[inteiroAte(lista.length)];
}

/**
 * Índice sorteado por peso. Recebe um array de números e devolve a posição
 * escolhida, ou undefined se a soma for zero.
 */
export function indicePorPeso(pesos) {
  const total = pesos.reduce((soma, p) => soma + p, 0);
  if (total <= 0) return undefined;

  let sorte = Math.random() * total;
  for (let i = 0; i < pesos.length; i++) {
    sorte -= pesos[i];
    if (sorte <= 0) return i;
  }
  return pesos.length - 1;
}
