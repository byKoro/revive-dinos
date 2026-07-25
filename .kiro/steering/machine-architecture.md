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
2. [ ] Criar JSON da entidade (`entities/`) com inventory, proteção, timer.
3. [ ] Criar blocos-item de UI (`blocks/ui/`) + geometria + textura.
4. [ ] Criar `scripts/<maquina>/` com todos os módulos do template.
5. [ ] Registrar constants em `core/constants.js`.
6. [ ] Registrar component + eventos em `main.js`.
7. [ ] Testar: spawn, interação, funil, explosão, /kill, playerSpawn, agachar.


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
