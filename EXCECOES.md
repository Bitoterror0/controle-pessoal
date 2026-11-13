# Ações, exceções e recuperação — Controle Pessoal

Revisão de 30/09/2026 sobre `91426f4`. Esta matriz cobre os fluxos existentes e os casos previsíveis de entrada, persistência, concorrência, datas, acessibilidade e exportação. Não é uma garantia de cobrir todo defeito possível ou todo navegador.

## Regras de uso

| Ação ou situação | Permitido / comportamento | Bloqueio ou recuperação |
|---|---|---|
| Registrar entrada ou saída | Descrição até 80 caracteres, valor positivo, data real | Campos vazios recebem mensagem, `aria-invalid` e foco no primeiro erro |
| Escolher tipo | Entrada ou saída | Tipo ausente/desconhecido não é salvo |
| Descrição só com espaços | Não | Preencher uma descrição; espaços repetidos são normalizados |
| Categoria | Opcional, até 40 caracteres; ausente = Sem categoria | Categoria inválida é bloqueada; maiúsculas, espaços repetidos e acentos Unicode equivalentes são agrupados |
| Dinheiro | `45,90`, `45.90`, `1.234,56`, `R$ 45,90` | Até R$ 999.999.999,99 e duas casas decimais; não arredonda uma entrada inválida |
| Letras, expoente, sinal, negativo, infinito, centavos excessivos | Não | `1e3`, `45reais`, `-1`, `NaN`, `0.001` e `1,234` são rejeitados |
| Valor zero | Não | Explica que o valor precisa ser maior que zero |
| Data impossível | Não | Rejeita 31/04, 29/02 fora de ano bissexto, mês/dia zero e formato inválido |
| Data antiga ou futura real | Sim, de 1900 a 9999 | Futuro é registro planejado, não previsão automática de saldo |
| Lançamento em outro mês | Sim | Após confirmação de gravação, abre o mês correspondente |
| Lançamentos iguais | Sim, se intencionais | Exige marcar confirmação explícita; mudar qualquer campo ou tipo cancela essa confirmação |
| Duplo clique / Enter repetido | Uma operação por vez | Bloqueia gravações e navegação enquanto aguarda confirmação |
| Excluir lançamento | Após confirmação | Foco começa em Cancelar; cancelar não altera o histórico; falha de gravação mantém o registro |
| Saldo negativo ou zerado | Sim | Tipo/situação ficam escritos; totais calculados em centavos |
| Navegar pelos meses | Sim, janeiro/1900 até dezembro/9999 | Botão bloqueado no limite; evita datas fora da faixa |
| Cadastrar conta recorrente | Descrição até 80 caracteres, valor positivo, dia inteiro 1–31 | Dia `32`, `0`, fracionário ou com letras é rejeitado |
| Conta igual a outra | Permitida mediante confirmação | Não duplica silenciosamente; alteração dos campos cancela confirmação |
| Conta começa em mês anterior ao cadastro | Não | A recorrência do app começa no mês do cadastro |
| Dia já passou no mês do cadastro | Permitido | Esse vencimento aparece atrasado até ser marcado como pago |
| Dia 29, 30 ou 31 em mês curto | Permitido | Usa o último dia existente desse mês |
| Marcar como paga / desfazer | Apenas o mês em exibição | Não cria entrada/saída nem altera saldo; só muda após confirmação da gravação |
| Pagamento em outro mês | Permitido navegando ao mês | A operação pendente bloqueia mudança de mês |
| Excluir conta | Após confirmação | Exclui a recorrência e suas marcações no app; não altera a agenda externa |
| Atraso com mais de 12 meses | Continua no aviso | Conta todas as ocorrências desde cadastro; lê até três de cada grupo para não criar aviso interminável |
| Conta paga | Não volta ao aviso daquele mês | Desfazer pagamento permite voltar; meses seguintes são independentes |
| Conta futura | Não aparece como atraso antes do início | Próximos vencimentos entram na janela de até sete dias |
| Dados carregando ou indisponíveis | Consultas financeiras e alterações bloqueadas | Não apresenta zero como saldo confirmado; ajustes de leitura continuam disponíveis |
| Armazenamento cheio / bloqueado | Não confirma operação | Mantém campos; memória só muda depois de escrita local bem-sucedida |
| JSON corrompido ou vazio salvo | Não substitui por lista vazia | Preserva conteúdo original, bloqueia alterações e oferece cópia bruta para recuperação local |
| Dados com tipo, valor, data, ID ou UID inválidos | Não são tratados como histórico saudável | Bloqueia escrita; IDs/UIDs duplicados também bloqueados |
| Mais de 10.000 registros por coleção | Não aceita novas inclusões acima do limite | Limite protege memória e tempo de processamento; arquivo preexistente maior deve ser recuperado sem descarte |
| Outra aba altera ou limpa dados | Bloqueia a aba desatualizada | Mantém campos; pede recarregar. Com Web Locks, compara e grava sob exclusão mútua; sem suporte, comparação é uma proteção parcial |
| Conta remota falha / login indisponível | Não troca silenciosamente para armazenamento local | Explica o erro e mantém gravações bloqueadas; recarregar após corrigir acesso |
| Carregamento remoto demora | Avisa após 15 segundos | Continua aguardando; desbloqueia quando chega snapshot validado |
| Gravação remota demora | Avisa após 15 segundos, mantém operação pendente | Não libera repetição enquanto a confirmação estiver indefinida; fechar a aba pode deixar resultado desconhecido |
| Falha remota ao gravar | Não anuncia sucesso | Preserva campos; conferir histórico antes de repetir, pois falha de resposta não prova que o servidor deixou de salvar |
| Snapshot chega durante gravação | Preserva outros registros recebidos | Não substitui a lista inteira por uma cópia anterior após confirmação |
| Voz ausente, bloqueada ou com erro | Resumo escrito continua disponível | Mensagem visual e regiões de anúncio; síntese pode depender de interação prévia |
| Interromper fala | Botão novamente cancela síntese | Não altera dados financeiros |
| Preferências corrompidas | Usa padrões seguros | Só aceita os cinco tamanhos previstos e booleanos para contraste/aviso |
| Preferência não pode ser salva | Aplica durante a sessão | Informa que o ajuste não foi guardado |
| Texto 200% / tela estreita | Controles e texto quebram linhas | Reflow verificado em viewport de 320 px, sem esconder conteúdo com `overflow:hidden` |
| Resumo por categoria | Lê três maiores gastos do mês | Sem dados, informa ausência; resultados acompanham o mês selecionado |
| Exportar sem contas ou durante gravação | Não | Botão desabilitado e guarda defensiva no evento |
| Exportar .ics | Um evento mensal por conta, UID estável e lembrete de um dia | Textos escapados, CR/LF protegidos, linhas UTF-8 até 75 bytes, datas de dia inteiro |
| Primeiro vencimento da agenda já passou | Exportação começa no próximo vencimento | Histórico atrasado permanece no app; agenda não recebe automaticamente todos os atrasos |
| Mudar fuso após cadastrar conta nova | Data de cadastro fica registrada | Contas antigas sem `dataCadastro` ainda usam timestamp local legado; verificar caso de mudança de fuso |
| Reimportar .ics | Depende da agenda | UID estável ajuda, mas não garante ausência de duplicatas em todas as agendas |
| Pagar, excluir ou mudar algo no app após exportar | Não sincroniza calendário | Agenda é cópia; limpar/atualizar eventos na própria agenda |
| Download indisponível | Informa falha de geração quando detectável | Navegador pode bloquear download sem erro JavaScript; verificar arquivo baixado |
| Editar lançamento/conta; restaurar backup pela interface; importar extrato | Ainda sem função na interface | Não prometer suporte; recuperação é manual e deve preservar cópia original |

## Evidência de verificação

- 34 grupos automatizados com casos válidos e inválidos no script real da página: parser, datas, registros, corrupção, quota, conflito, carregamento/gravação remota simulados, duplo envio, foco após falha, totais, atrasos e ICS. Executar: `node testes-excecoes.cjs`.
- Navegador real: vazio, `1e3`, vencimento 32, salvar, duplicado bloqueado/confirmado, categoria Mercado/mercado, cancelamento com foco em Cancelar, conta dia 31, pagamento sem alterar saldo, recarregar mantendo dados e resumo por categoria.
- Duas abas reais: gravação na segunda bloqueou a primeira com aviso de atualização.
- Falha de quota simulada em página de teste no navegador: saldo e campos mantidos, foco retornou ao botão Adicionar. Resumo já visível foi atualizado após novo lançamento no mesmo mês.
- Viewport 320 px, texto 200%, alto contraste: largura útil e largura do conteúdo iguais a 305 px após a correção. Isso não equivale a testar zoom nativo em todos os navegadores.
- Sem erros JavaScript observados na página durante esses fluxos. Arquivo ICS validado no teste automatizado; botão mostrou geração na interface, mas o mecanismo de observação do download no navegador de teste expirou. Importação em agenda real não foi executada.

## Limites e testes manuais necessários

1. NVDA/JAWS, VoiceOver/TalkBack: nomes, anúncio de erro, confirmação, foco após excluir, fala simultânea e datalist. Presença de ARIA não prova a experiência real.
2. Google/Apple/Outlook Calendar: recorrência 29–31, alarmes, UID/reimportação, dia inteiro e fuso.
3. Serviço remoto real: login, autorização por usuário, perda de conexão, snapshot e consistência. As proteções de front-end não substituem regras de acesso do servidor.
4. Duas pessoas/dispositivos pagando a mesma conta simultaneamente: mapas `pagas` continuam escritos como documento inteiro. Uma solução definitiva exige transação/atualização atômica do SDK; não afirmar que está resolvido.
5. Exclusão não tem lixeira/desfazer; confirmação permanece obrigatória. Cópia de recuperação financeira contém dados privados, sem envio automático.

## Comunicação ao Claude

O Claude confirmou recebimento do relatório pela ponte local. Após liberar a rede, também recebeu o código completo e apontou três defeitos: contagem truncada de próximos vencimentos, resumo escrito desatualizado e foco após falha. Os três foram corrigidos e verificados. A primeira tentativa expirou sem resposta.

As consultas são independentes da sessão que já está aberta no terminal: não sincronizam históricos nem significam que o Claude executou testes. Respostas originais guardadas em `outputs/controle-pessoal-excecoes/resposta-claude.md` e `revisao-codigo-claude.md` na pasta desta tarefa do Codex.
