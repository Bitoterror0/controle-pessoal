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

## Categorias, meses, resumo falado e contas

- **Categoria opcional e data obrigatória** no formulário (data preenchida com hoje). Lançamentos antigos sem categoria aparecem como "Sem categoria".
- **Mês**: botões "Mês anterior", "Próximo mês" e "Ir para o mês atual". Saldo, totais e lista mostram o mês escolhido.
- **Resumo do mês**: o botão "Ouvir o resumo do mês" fala entradas, saídas, saldo e os 3 maiores gastos por categoria (o texto também fica na tela). Ao abrir, um aviso opcional (caixa "Avisar sobre contas ao abrir o app") cobre contas atrasadas e as que vencem em até 7 dias.
- **Contas a vencer**: descrição, valor e dia do vencimento, todo mês. "Marcar como paga" vale para o mês em exibição e não registra saída no saldo. O aviso conta todos os vencimentos não pagos desde o cadastro. "Exportar contas para a agenda" gera `contas-a-vencer.ics`; o UID é fixo, mas algumas agendas podem duplicar ao reimportar. O arquivo é uma cópia: excluir ou pagar uma conta no app não altera a agenda.

## Proteções e exceções

Valores e datas são validados antes de salvar. Duplicados intencionais precisam de confirmação. Falhas de armazenamento preservam campos; dados corrompidos e alterações em outra aba bloqueiam gravações para proteger o histórico.

A matriz [EXCECOES.md](EXCECOES.md) descreve as ações permitidas, bloqueios, recuperação, testes executados e limites. Os testes podem ser executados com `node testes-excecoes.cjs`. A acessibilidade com leitores de tela e a importação em calendários reais ainda precisam de verificação manual.

## Próximos passos

- Editar um lançamento ou uma conta
