# Arquitetura de Máquinas — Padrão do Projeto

Toda máquina customizada deste addon (Extrator Genético, e futuras: Biomassa,
Incubadora, Banco Genético) segue o mesmo padrão comprovado. Este documento
define a receita para quem for implementar a próxima.

---

## Estrutura de pastas (scripts)

```
scripts/
├── main.js                 entry point, só registra + assina
├── core/                   sem dependência de feature
│   ├── constants.js        TODOS os identifiers/estados/ajustes
│   ├── random.js           sorteios genéricos
│   ├── vectors.js          distância, posição, chave
│   └── items.js            ItemStack, container helpers
└── <maquina>/              um diretório por máquina
    ├── config.js           receitas, layout de slots, pesos
    ├── component.js        custom components V2 (onPlace, onTick, etc.)
    ├── entity.js           criação/busca/ancoragem/remoção da entidade
    ├── ui.js               montagem da Fake UI + proteção de peças
    ├── processing.js       lógica de produção
    ├── hopper.js           compatibilidade com funil (se aplicável)
    ├── selection.js        seleção falsa / outline (se aplicável)
    └── events.js           assinaturas de evento de mundo
```

### Regras

- **Nenhuma string solta**: identifiers, state keys e dynamic properties vivem
  em `core/constants.js`. Se um identifier muda, ele muda em um único lugar.
- **Um módulo = uma responsabilidade.** Se estiver em dúvida entre jogar algo
  em `processing` ou em `ui`, pergunte: "isso afeta o inventário do jogador ou
  o progresso da receita?" O primeiro vai em `ui`, o segundo em `processing`.
- **`main.js` nunca executa lógica** — só importa e amarra.
- **Sem dependências circulares.** Se dois módulos precisam um do outro, o que
  é mais genérico desce para `core/`.

---

## Componente no bloco (Custom Components V2)

`format_version 1.21.100` ativa V2. Regras:

| Aspecto | V2 (este projeto) | V1 (NÃO usar) |
|---|---|---|
| JSON | `"ns:component": {}` como chave em `components` | Array em `minecraft:custom_components` |
| Script | `system.beforeEvents.startup` | `world.beforeEvents.worldInitialize` |
| Handler de quebra | `onPlayerBreak` | `onPlayerDestroy` |
| Manifest | `@minecraft/server` ≥ `2.8.0` | versões anteriores |

### Regra crítica: id do bloco ≠ id do component

Se forem iguais, o binding quebra silenciosamente (ver `identifiers.md`).
Convenção de nomes: o bloco leva o nome da máquina
(`revive_dinos:<maquina>`), o component leva um sufixo distinto
(`revive_dinos:<maquina>_machine`, `revive_dinos:<maquina>_handler`, etc.).

---

## Entidade-container invisível (padrão Furnaces)

Bedrock não tem API nativa para HUD customizado sobreposto a um container.
A solução provada é:

1. Bloco real = casca visual.
2. `onPlace` spawna uma **entidade invisível** com `minecraft:inventory`.
3. A entidade NÃO tem client entity (sem `.entity.json` no RP) — assim não
   renderiza nada (nem sombra, nem flash no spawn).
4. Interação com o bloco abre o inventário da entidade.
5. `onPlayerBreak` dropa o conteúdo e remove a entidade.

### Vínculo entidade ↔ bloco

Dynamic property `PROP_HOME` guarda a posição do bloco. Sem isso, dois
blocos próximos poderiam "roubar" a entidade um do outro na busca por raio.

### Duas rotas de remoção

1. `onPlayerBreak` (component).
2. `inside_block_notifier` + evento data-driven (cobre explosão, pistão,
   `/setblock`).

Em ambas: **dropar antes de remover**, e **checar `entity.isValid`** (sem
parênteses) antes de operar — a outra rota pode já ter removido.

### Ancoragem

Cada `onTick`: se a entidade se afastou mais que o limiar, teleporta de volta
e desmonta de veículo. Previne barco, minecart, pistão, explosão, `/tp`.

---

## Fake UI (blocos-item no inventário)

As "peças de interface" (fundo, barra de progresso) são itens reais de blocos
que possuem `item_display_transforms.gui` customizado. Cada peça é um bloco
com geometria plana.

### Proteção

- `restaurarSlotsDeUi` roda todo tick: repõe peças faltantes, devolve ao
  mundo itens de jogador que pararam em slot errado.
- `limparInventarioDoJogador` roda ao entrar no mundo (playerSpawn) para
  pegar quem deslogou carregando peça de sessão anterior.
- `limparItensDropados` apaga peças que caíram no chão.

### Slot de saída sempre ocupado

Usa `placeholder_invisible` quando não há resultado. Para a lógica de
produção, placeholder = vazio. Assim o jogador não consegue depositar nada
no slot de saída.

---

## Receitas

Definidas em `config.js` da máquina. Busca posicional (slot de cima = `a`,
slot de baixo = `b`). Suporta:

- `{ item: "ns:id" }` — match por typeId
- `{ tag: "ns:tag" }` — match por item tag
- Saída: fixa, sorteio simples ou callback (como `dnaDoFossil`)

### Regra de consumo

**Só consumir DEPOIS de confirmar que o resultado cabe na saída.** Resultado
aleatório pode diferir do que já está empilhado, então validar primeiro evita
comer inputs sem produzir.

---

## Compatibilidade com funil

A entidade usa `can_be_siphoned_from: false` para que o funil vanilla não
enxergue o container (senão sugaria as peças de UI). A troca é feita pelo
timer da entidade, respeitando `facing_direction` e roteando pelo slot que
a receita aceitar (não pela face do bloco).

---

## Checklist para adicionar uma máquina nova

1. [ ] Criar JSON do bloco (`blocks/`) com component V2 e `minecraft:tick`.
   Se tiver frente, seguir "Bloco direcional: a frente na mão do jogador".
2. [ ] Criar JSON da entidade (`entities/`) com inventory, proteção, timer.
3. [ ] Criar blocos-item de UI (`blocks/ui/`) + geometria + textura.
4. [ ] Criar `scripts/<maquina>/` com todos os módulos do template.
5. [ ] Registrar constants em `core/constants.js`.
6. [ ] Registrar component + eventos em `main.js`.
7. [ ] Se a frente anima: state `machine_stage`, permutações por estágio,
   texturas `_front_1..3` e `frontAnimada: true` na definição.
8. [ ] Testar: spawn, interação, funil, explosão, /kill, playerSpawn, agachar.
9. [ ] Testar a frente: colocar virado para os 4 lados **e** conferir o item
   na mão, no inventário e num item frame.


---

## Blocos conectáveis (cabos, tubos) — pegadinha do eixo X

Blocos com braços direcionais (cabo de energia) que aparecem/somem por
`bone_visibility` lendo states de conexão têm uma pegadinha do modelo de bloco
do Bedrock:

- **O eixo X do modelo é espelhado** em relação ao mundo: `model +X = oeste`,
  `model -X = leste`. O eixo Z é padrão (`model -Z = norte`, `model +Z = sul`)
  e o Y também (`model +Y = cima`).
- Portanto o braço **"leste"** deve ficar em **model -X**, e o **"oeste"** em
  **model +X** (parece invertido, mas é o correto). Norte/sul/cima/baixo ficam
  na posição intuitiva.
- A **detecção no script** usa offsets de MUNDO normais (leste = x+1,
  oeste = x-1, norte = z-1, sul = z+1). Não inverter a detecção — inverter
  só a posição do braço na geometria.

Referência comprovada: o cabo do addon UtilityCraft. Se for criar outro bloco
conectável, copie a disposição de bones dele (norte -Z, sul +Z, oeste +X,
leste -X) em vez de deduzir pela tentativa.

### Hitbox de cabo

O jeito simples e comprovado (UtilityCraft): `collision_box` zero (atravessa)
+ `selection_box` fixo 8×8×8 (fácil de mirar/quebrar), sem permutations.
Uma hitbox que cresce com as conexões é possível gerando permutations (uma
por combinação de estados, com a caixa = bounding box dos braços conectados),
mas é bem mais verboso e normalmente desnecessário.


---

## Regras do sistema de energia (valem para TODA máquina nova)

### Energia entra por qualquer face

Máquina nunca tem "face de energia". Ela aceita energia pelas **6 faces**
(norte, sul, leste, oeste, cima, baixo), seja de uma fonte diretamente
adjacente ou de um cabo. A bateria e o gerador também **distribuem pelas 6
faces**. Isso é consequência de `DIRECTIONS` (em `energy/constants.js`) cobrir
os 6 vizinhos — não fixar face em nenhum lugar.

Para o cabo conectar visualmente e a rede reconhecer a máquina nova, adicione
o id dela ao `CONNECTABLE` em `energy/cable.js`.

### Rede unificada

A máquina não escolhe uma fonte: `energy/consumer.js` soma a carga de **todas**
as fontes alcançáveis pela rede de cabos e cobra o custo do conjunto.

- Drena **gerador primeiro**, **bateria depois** (bateria é reserva).
- Consumo é **tudo ou nada**: se o total não cobre o custo, nada é consumido e
  a máquina pausa (não perde progresso).
- A topologia é **cacheada por 20 ticks**, o que mantém a velocidade de
  processamento constante independente do comprimento do cabo.

Para consumir energia numa máquina nova:

```js
import { consumirEnergia } from "../energy/consumer";
import { ENERGY_COST } from "../energy/constants";

if (!consumirEnergia(entity, ENERGY_COST.minhaMaquina)) return; // pausa
```

### Balanceamento

Geração precisa **superar** o consumo, senão a máquina fica esperando carga e
parece travada (foi um bug real: consumo 30/tick contra geração 5/tick fazia a
receita levar 6× mais tempo). Referência atual: carvão gera 40/tick, carvite
100/tick; o Extrator consome 30/tick.

### Status na action bar (tempo real)

Basta a definição expor `statusTexto(entity, def)`. O framework chama isso no
**tick do bloco** quando há um jogador agachado olhando para ele.

Não usar o `entity_sensor` para isso: ele tem cadência própria (vários ticks),
o que faz os números parecerem congelados.

### Persistir estado no item ao quebrar

Padrão usado pela bateria (carga sobrevive a quebrar/recolocar):

1. Bloco aponta `minecraft:loot` para uma loot table **vazia** (senão dropa
   duas vezes: a do bloco e a nossa).
2. `def.onBroken(entity, block, player)` cria o ItemStack, grava o valor numa
   dynamic property do item e escreve a **lore** visível.
3. `def.onPlaced(entity, block)` restaura. Como o `onPlace` não recebe o item
   usado, a captura acontece no interact (ver `battery/transfer.js`).

Itens com dynamic property **não empilham** — aqui isso é desejável, cada
unidade carrega o próprio estado.


### Bloco de máquina precisa ser imóvel a pistão

Todo bloco que tem entidade-container (ou estado próprio) precisa de:

```json
"minecraft:movable": { "movement_type": "immovable" }
```

Sem isso o pistão **empurra o bloco**: ele muda de posição, a entidade fica
para trás dentro de ar, o `inside_block_notifier` dispara `destroyed_block` e a
máquina **dropa o item sem o bloco ter sido quebrado** — duplicando o item e
deixando um bloco órfão sem entidade.

`movement_type` aceita `push_pull` (padrão), `push`, `popped` (destrói ao ser
movido) e `immovable` (pistão simplesmente não move). Para máquinas use sempre
`immovable`. Já aplicado em: extrator, gerador, bateria, cabo, sintetizador e
rocha fossilizada.


---

## Bloco direcional: a frente na mão do jogador

Esta é a receita **obrigatória** para qualquer bloco com frente (máquinas,
fornos, etc.). Errar aqui dá um bug silencioso: no mundo o bloco fica certo,
mas o item na mão / no inventário / no item frame mostra a traseira.

```json
"traits": {
  "minecraft:placement_direction": {
    "enabled_states": ["minecraft:cardinal_direction"],
    "y_rotation_offset": 180
  }
}
```

```json
"permutations": [
  { "condition": "q.block_state('minecraft:cardinal_direction') == 'north'",
    "components": { "minecraft:transformation": { "rotation": [0, 0, 0] } } },
  { "condition": "q.block_state('minecraft:cardinal_direction') == 'west'",
    "components": { "minecraft:transformation": { "rotation": [0, 90, 0] } } },
  { "condition": "q.block_state('minecraft:cardinal_direction') == 'south'",
    "components": { "minecraft:transformation": { "rotation": [0, 180, 0] } } },
  { "condition": "q.block_state('minecraft:cardinal_direction') == 'east'",
    "components": { "minecraft:transformation": { "rotation": [0, -90, 0] } } }
]
```

Com a textura da frente na face **`north`** do `material_instances`.

### Por que, exatamente

- O item (mão, inventário, item frame) é renderizado a partir da
  **permutação default** do bloco, e o default de `minecraft:cardinal_direction`
  é **`south`**.
- A câmera do render de item usa `rotation: [30, 225, 0]`, ou seja mostra as
  faces **sul**, leste e topo. Quem aparece para o jogador é a face que estiver
  virada para o **sul** depois da rotação.
- Logo: o default (`south`) precisa girar 180°, para levar a frente (`north`)
  a apontar para o sul. É o que a tabela acima faz.

### O erro que já aconteceu neste projeto

As máquinas tinham os 180° **embutidos em cada permutação**
(`north: 180, south: 0, east: 90, west: 270`) e **nenhum** `y_rotation_offset`.
No mundo o resultado era idêntico — mas o default (`south`) caía em rotação
`0`, deixando a frente apontada para o norte, longe da câmera do item.

Consequência importante para o diagnóstico: **qualquer correção que preserve o
comportamento no mundo para o state default também preserva o bug do item.**
Trocar a frente para a face `south` e girar tudo −180°, por exemplo, **não
resolve**. A única saída é tirar os 180° das permutações e colocá-los no
`y_rotation_offset` do trait — que muda qual state é gravado na hora de colocar
o bloco, sem mexer na geometria renderizada.

Regra prática: com `y_rotation_offset: 180`, o state guarda **para onde a frente
aponta**; sem ele, guarda **para onde o jogador estava olhando**.

---

## Animação da frente por estágio de processo

Máquina trabalhando troca a textura da face frontal e toca um som baixo.
Implementação em `machine/visual.js`, ligada no tick do bloco por
`machine/component.js`.

### Como funciona

1. O bloco declara um state inteiro `revive_dinos:machine_stage: [0, 1, 2, 3]`
   (0 = parada; o default é o primeiro valor, então bloco recém-colocado nasce
   apagado).
2. Uma permutação por estágio aceso sobrescreve `minecraft:material_instances`
   trocando **só** a face `north` por `<maquina>_front_N`.
3. O `processing.js` da máquina chama `marcarProgressoVisual(entity, fracao)`
   no mesmo lugar onde já desenha a barra de progresso da UI.
4. `atualizarVisual(entity, block, def)` roda no tick do bloco (é o único lugar
   com referência ao `block`), aplica a permutação e toca o som.

### Regras

- **A definição precisa de `frontAnimada: true`.** Sem isso o módulo não faz
  nada. Máquina sem o state `machine_stage` no JSON (ex.: a bateria) **não** pode
  receber a flag: `withState` lançaria a cada tick.
- **Sempre encadear a partir de `block.permutation`**
  (`block.permutation.withState(...)`), nunca montar permutação nova — senão
  `fake_selection` e `cardinal_direction` são perdidos.
- **Só chamar `setPermutation` quando o estágio muda.** Reescrever por tick é
  caro e faz o bloco piscar.
- **A permutação de estágio precisa repetir `*`, `up` e `down`.**
  `minecraft:material_instances` é substituído por inteiro, não mesclado: quem
  declarar só a face frontal perde as texturas de lateral e topo.
- **Pausar é parar de marcar.** O estágio vale por
  `MACHINE_STAGE_STALE_TICKS` ticks; passou disso, a frente apaga sozinha. É de
  propósito: os vários `return` do processamento (sem receita, sem energia,
  saída cheia) não precisam saber que existe animação.

### Estágios

A fração de progresso é dividida em `MACHINE_STAGES` faixas iguais, então a
frente passa por 1 → 2 → 3 e volta para 0 quando o ciclo fecha. O gerador não
tem `PROP_PROGRESS`: para ele a fração é o **combustível já queimado**.

### Som

Vem de `MACHINE_SOUND_ID` em `core/constants.js`, repetido a cada
`MACHINE_SOUND_INTERVAL` ticks com volume baixo. Hoje é um som do vanilla, para
o addon não depender de asset de áudio. Para usar um som próprio: coloque o
`.ogg` em `Revive Dino RP/sounds/`, declare o id em
`Revive Dino RP/sounds/sound_definitions.json` e mude **só** essa constante.

### Texturas

Padrão de toda máquina: `<maquina>_side`, `<maquina>_top`, `<maquina>_front` e
`<maquina>_front_1..3`, todas 16×16, declaradas em `terrain_texture.json`.
`tools/gen_machine_frames.py` regenera os frames a partir do `_front.png`.
