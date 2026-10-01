# Controle Pessoal

Controle financeiro pessoal bem simples, feito para funcionar com leitor de tela, teclado e baixa visão.

## Como usar

Abra o arquivo `index.html` no navegador. Não precisa instalar nada.

1. Escolha **Saída (gastei)** ou **Entrada (recebi)**.
2. Escreva a descrição e o valor (por exemplo, `45,90`).
3. Aperte **Adicionar**.

O saldo, o total de entradas e o total de saídas aparecem no topo. Cada lançamento tem um botão **Excluir**, que pede confirmação antes de apagar.

Os dados ficam salvos no próprio navegador (localStorage), só neste aparelho.

## Acessibilidade

- **Leitor de tela** (NVDA, JAWS, VoiceOver, TalkBack): o app anuncia o que aconteceu ao adicionar ou excluir, e cada botão diz o que faz (ex.: "Excluir: Mercado, saída de R$ 45,90").
- **Teclado**: tudo funciona sem mouse, com foco bem visível. Um link no começo da página leva direto ao formulário.
- **Baixa visão**: botões para aumentar o texto até 200%, modo de alto contraste e a fonte Atkinson Hyperlegible, criada para quem enxerga pouco.
- **Ouvir saldo**: lê o saldo em voz alta (em navegadores com síntese de voz).
- Nada depende só de cor: o tipo e a situação do saldo sempre aparecem escritos.

## Próximos passos

- Categorias
- Separar por mês
- Editar um lançamento
