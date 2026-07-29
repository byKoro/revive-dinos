# Convenção de identifiers (Extrator Genético)

Esta regra substitui a antiga nota do `CLAUDE.md` que dizia que o typo
`genetic_extrator` era proposital e "não uniformizar". O typo foi removido.

## Regra crítica: id do bloco != id do custom component

O id de um bloco e o id do custom component vinculado a ele **não podem ser
a mesma string** — se forem iguais, o binding do component quebra (o `onTick`
para de rodar, a seleção/ancoragem da entidade deixa de funcionar) e blocos
já colocados passam a lançar erro em `setPermutation`.

Identifiers atuais (todos sem typo):

| O quê | Identifier |
|---|---|
| Bloco real (Extrator) | `revive_dinos:genetic_extractor` |
| Custom component do Extrator | `revive_dinos:extractor_machine` |
| Entidade-container | `revive_dinos:genetic_extractor_ui` |
| Bloco do minigame | `revive_dinos:fossilized_rock` |

- As texturas do Extrator também usam `genetic_extractor` (sem typo) — isso é
  seguro, não afeta dados do mundo. Ele usa `minecraft:geometry.full_block` e o
  mesmo padrão das outras máquinas (`_side`, `_top`, `_front`, `_front_1..3`),
  sem geometria própria.
- **Nunca** dê ao custom component o mesmo nome do bloco.

## Renomear identifier de bloco quebra mundos existentes

Trocar o `identifier` de um bloco torna órfãs todas as instâncias já
colocadas no mundo (não há migração limpa no Bedrock). Só renomeie um id de
bloco quando for realmente necessário, ciente de que blocos antigos terão de
ser recolocados. O handler `player_nearby` já ignora blocos que não sejam
`revive_dinos:genetic_extractor` para não quebrar com instâncias órfãs.

## Namespace

Sempre `revive_dinos` (com underscore). Nunca `revivedinos`.
