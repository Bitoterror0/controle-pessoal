# Formulário por Voz (protótipo)

A pessoa envia o modelo de formulário em Word (.docx), responde falando ou escrevendo e baixa o documento preenchido no mesmo formato.

- `detector.js`: acha os campos no documento e devolve o arquivo preenchido.
- `index.html`: a página. O arquivo é lido só no aparelho; nada é enviado para servidor.
- `teste.cjs`: testes do detector. Rode com `node formulario-por-voz/teste.cjs`.

## O que ele reconhece hoje

- Rótulo terminado em dois-pontos (`Nome:`), com a resposta na mesma linha, em sublinhado (`Nome: ____`) ou na linha de baixo vazia.
- Caixas de marcar escritas como `( )`, `[ ]` ou `☐`, com o título na mesma linha ou na linha de cima.
- Opção terminada em dois-pontos (`Outras:`) ganha um campo para completar.

## O que ainda não faz

- Formulários em tabela, vários campos na mesma linha e controles de formulário do Word.
- Conversa livre ("conte tudo de uma vez"): hoje a pessoa responde campo a campo, com ditado por campo.
- Não foi testado com NVDA, TalkBack ou VoiceOver, nem com modelos reais além da ficha de avaliação.
