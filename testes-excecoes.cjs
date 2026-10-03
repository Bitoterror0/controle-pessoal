// Tests the actual application script in isolation; browser flows are checked separately.
const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const html = fs.readFileSync(__dirname + '/index.html', 'utf8').replace(/\r\n/g,'\n');
const scripts = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(m => m[1]);
scripts.forEach(s => new vm.Script(s));
let checks = 0;
function ok(name, fn) { return Promise.resolve().then(fn).then(() => { checks++; console.log('OK ' + name); }); }
function app(initial = {}) {
  const store = new Map(Object.entries(initial)), els = new Map(), listeners = {};
  const element = id => {
    if (!els.has(id)) els.set(id, {id, value:'', textContent:'', hidden:false, disabled:false, checked:false, dataset:{}, style:{}, classList:{toggle(){}}, setAttribute(){}, removeAttribute(){}, addEventListener(){}, focus(){}, replaceChildren(){}});
    return els.get(id);
  };
  class FixedDate extends Date { constructor(...args) { super(...(args.length ? args : ['2026-09-30T15:00:00-03:00'])); } }
  const context = {document:{getElementById:element, querySelectorAll:()=>[], querySelector:()=>null, documentElement:{style:{},classList:{toggle(){}}}}, navigator:{}, localStorage:{getItem:k=>store.has(k)?store.get(k):null, setItem:(k,v)=>store.set(k,v)}, Date:FixedDate, Intl, TextEncoder, console, setTimeout:()=>1, clearTimeout(){}};
  context.window = {addEventListener:(n,fn)=>listeners[n]=fn};
  vm.createContext(context);
  const source = scripts.at(-1).replace('  desenhar();\n  iniciar();', `
  desenhar = () => {};
  globalThis.api = {lerValor, dataValida, mesValido, registroValido, validarLista, usarLocal, iniciar, adicionar, remover, salvarConta, removerConta, executarGravacao, gerarICS, icsTexto, icsDobrar, diasEntre, diaDoVencimento, contasPendentes, fraseAviso, totais, moverMes,
    state: () => ({itens,contas,carregado,gravando,mes,prefs,problemaDados}),
    set: (s) => { if ('itens' in s) itens=s.itens; if ('contas' in s) contas=s.contas; if ('carregado' in s) carregado=s.carregado; if ('colecao' in s) colecao=s.colecao; if ('mes' in s) mes=s.mes; }
  };`);
  vm.runInContext(source,context);
  return {a:context.api,context,store,els,listeners};
}
const transaction = (overrides={}) => ({id:'t1',tipo:'saida',descricao:'Mercado',valor:12.34,data:'2026-09-30',criado:1790794800000,...overrides});
const bill = (overrides={}) => ({id:'c1',tipo:'conta',descricao:'Aluguel',valor:650,dia:31,criado:1790794800000,primeiroMes:'2026-09',dataCadastro:'2026-09-30',uid:'c1@controle-pessoal',pagas:{},...overrides});
async function main() {
  let {a} = app();
  await ok('Valores brasileiros e centavos', () => {
    for (const [s,n] of [['45,90',45.9],['45.90',45.9],['1.234,56',1234.56],['R$ 1.234',1234],['0,01',.01],['999.999.999,99',999999999.99]]) assert.equal(a.lerValor(s),n,s);
  });
  await ok('Valores incompletos, letras, expoente, negativos, infinito e limite rejeitados', () => {
    for (const s of ['', 'abc','45reais','1e3','-1','+1','NaN','Infinity','1,234','1.00,20','1000000000','0.001']) assert.equal(a.lerValor(s),null,s);
    assert.equal(a.registroValido(transaction({valor:0})),false);
  });
  await ok('Datas reais, anos bissextos e limites', () => {
    for (const s of ['2024-02-29','2000-02-29','1900-01-01','9999-12-31']) assert.equal(a.dataValida(s),true,s);
    for (const s of ['2026-02-29','2100-02-29','2026-04-31','2026-13-01','1899-12-31','2026-02-00','01/02/2026']) assert.equal(a.dataValida(s),false,s);
  });
  await ok('Registros com tipos, números e identificadores inválidos bloqueados', () => {
    for (const r of [null,[],transaction({tipo:'transferencia'}),transaction({id:'x\" onclick=1'}),transaction({valor:NaN}),transaction({valor:12.345}),transaction({descricao:''}),transaction({categoria:3}),transaction({criado:-1})]) assert.equal(a.registroValido(r),false);
    assert.equal(a.registroValido(transaction({criado:undefined,categoria:undefined})),true,'compatibilidade com lançamento antigo');
  });
  await ok('Contas, pagamentos e UIDs validados', () => {
    assert.equal(a.registroValido(bill(),true),true);
    for (const r of [bill({dia:0}),bill({dia:32}),bill({dia:1.5}),bill({uid:'a\r\nSUMMARY:injetado'}),bill({pagas:{'2026-09':'true'}}),bill({pagas:[]}),bill({primeiroMes:'2026-00'}),bill({dataCadastro:'2026-02-30'}),bill({criado:undefined})]) assert.equal(a.registroValido(r,true),false);
  });
  await ok('IDs, UIDs repetidos e limite de registros bloqueados', () => {
    assert.throws(()=>a.validarLista([transaction(),transaction()]));
    assert.throws(()=>a.validarLista([bill(),bill({id:'c2'})],true));
    assert.throws(()=>a.validarLista(Array(10001).fill(transaction())));
  });
  await ok('Preferências malformadas não quebram tamanho, contraste ou aviso', () => {
    const h=app({'cp-prefs':JSON.stringify({texto:100000,contraste:'false',avisoAbrir:'false'})});
    assert.equal(h.a.state().prefs.texto,100); assert.equal(h.a.state().prefs.contraste,false); assert.equal(h.a.state().prefs.avisoAbrir,true);
  });
  await ok('JSON corrompido é preservado e bloqueia alterações', () => {
    const h=app({'cp-lancamentos':'{inválido','cp-contas':'[]'}); h.a.usarLocal();
    assert.equal(h.a.state().carregado,false); assert.equal(h.store.get('cp-lancamentos'),'{inválido');
  });
  await ok('Array válido com registro inválido também preservado', () => {
    const raw=JSON.stringify([transaction({data:'2026-02-30'})]); const h=app({'cp-lancamentos':raw}); h.a.usarLocal();
    assert.equal(h.a.state().carregado,false); assert.equal(h.store.get('cp-lancamentos'),raw);
  });
  await ok('Conteúdo vazio salvo é corrupção, não histórico novo', () => {
    const h=app({'cp-lancamentos':''}); h.a.usarLocal(); assert.equal(h.a.state().carregado,false); assert.equal(h.store.get('cp-lancamentos'),'');
  });
  await ok('SDK remoto falha sem substituir por histórico local', async () => {
    const h=app({'cp-lancamentos':JSON.stringify([transaction()])});
    h.context.claude=h.context.window.claude={use:async()=>{throw Error('rede');}};
    await h.a.iniciar(); assert.equal(h.a.state().carregado,false); assert.equal(h.a.state().itens.length,0); assert.equal(h.els.get('backup-dados').hidden,true);
  });
  await ok('Login remoto ausente mantém gravações bloqueadas', async () => {
    const h=app(); h.context.claude=h.context.window.claude={use:async key => key==='db'?{}:{id:async()=>null}};
    await h.a.iniciar(); assert.equal(h.a.state().carregado,false);
  });
  await ok('Snapshot remoto válido libera; inválido preserva e bloqueia', async () => {
    const h=app(); let snapshot;
    h.context.claude=h.context.window.claude={use:async key=>key==='db'?{collection:()=>({onSnapshot:fn=>snapshot=fn})}:{id:async()=> 'user1'}};
    await h.a.iniciar(); assert.equal(h.a.state().carregado,false);
    const doc=r=>({id:r.id,data:()=>r}); snapshot({docs:[doc(transaction()),doc(bill())]});
    assert.equal(h.a.state().carregado,true); assert.equal(h.a.state().contas.length,1);
    snapshot({docs:[doc(transaction({valor:'12,34'}))]});
    assert.equal(h.a.state().carregado,false); assert.equal(h.a.state().itens[0].valor,12.34);
  });
  await ok('Falha ao ler armazenamento não vira histórico vazio editável', () => {
    const h=app(); h.context.localStorage.getItem=()=>{throw Error('SecurityError');}; h.a.usarLocal(); assert.equal(h.a.state().carregado,false);
  });
  await ok('Adicionar e excluir confirmam armazenamento antes de mudar memória', async () => {
    const h=app(); h.a.usarLocal(); await h.a.adicionar(transaction()); assert.equal(h.a.state().itens.length,1);
    await h.a.remover('t1'); assert.equal(h.a.state().itens.length,0); assert.equal(h.store.get('cp-lancamentos'),'[]');
  });
  await ok('Quota: inclusão falha sem registro fantasma', async () => {
    const h=app(); h.a.usarLocal(); h.context.localStorage.setItem=()=>{throw Error('QuotaExceededError');};
    assert.equal(await h.a.executarGravacao(()=>h.a.adicionar(transaction())),false); assert.equal(h.a.state().itens.length,0); assert.equal(h.a.state().gravando,false);
  });
  await ok('Quota: exclusão falha e mantém registro', async () => {
    const h=app({'cp-lancamentos':JSON.stringify([transaction()])}); h.a.usarLocal(); h.context.localStorage.setItem=()=>{throw Error('quota');};
    assert.equal(await h.a.executarGravacao(()=>h.a.remover('t1')),false); assert.equal(h.a.state().itens.length,1);
  });
  await ok('Pagamento e exclusão de conta só mudam após salvar', async () => {
    const h=app({'cp-contas':JSON.stringify([bill()])}); h.a.usarLocal(); h.context.localStorage.setItem=()=>{throw Error('quota');};
    assert.equal(await h.a.executarGravacao(()=>h.a.salvarConta(bill({pagas:{'2026-09':true}}))),false);
    assert.equal(h.a.state().contas[0].pagas['2026-09'],undefined);
    assert.equal(await h.a.executarGravacao(()=>h.a.removerConta('c1')),false); assert.equal(h.a.state().contas.length,1);
  });
  await ok('Outro estado salvo durante edição não é sobrescrito', async () => {
    const h=app(); h.a.usarLocal(); const outro=JSON.stringify([transaction({id:'outro'})]); h.store.set('cp-lancamentos',outro);
    assert.equal(await h.a.executarGravacao(()=>h.a.adicionar(transaction())),false); assert.equal(h.store.get('cp-lancamentos'),outro); assert.equal(h.a.state().carregado,false);
  });
  await ok('Evento de outra aba bloqueia novas gravações', async () => {
    const h=app(); h.a.usarLocal(); h.listeners.storage({key:'cp-contas'}); let invoked=false;
    assert.equal(await h.a.executarGravacao(()=>{invoked=true;}),false); assert.equal(invoked,false);
  });
  await ok('Duplo envio executa uma única gravação', async () => {
    const h=app(); h.a.usarLocal(); let release, calls=0;
    const pending=h.a.executarGravacao(()=>{calls++;return new Promise(r=>release=r);});
    assert.equal(await h.a.executarGravacao(()=>calls++),false); release(); assert.equal(await pending,true); assert.equal(calls,1);
  });
  await ok('Falha de gravação devolve foco ao controle de origem', async () => {
    const h=app(); h.a.usarLocal(); let focus=0; h.context.document.activeElement={isConnected:true,disabled:false,focus:()=>focus++};
    assert.equal(await h.a.executarGravacao(()=>{throw Error('quota');}),false); assert.equal(focus,1);
  });
  await ok('Falha remota não anuncia confirmação nem acrescenta memória', async () => {
    const h=app(); h.a.set({carregado:true,colecao:{doc:()=>({set:async()=>{throw Error('rede');}})}});
    assert.equal(await h.a.executarGravacao(()=>h.a.adicionar(transaction())),false); assert.equal(h.a.state().itens.length,0);
  });
  await ok('Snapshot concorrente preservado após confirmação remota', async () => {
    const h=app(); let finish; h.a.set({carregado:true,colecao:{doc:()=>({set:()=>new Promise(r=>finish=r)})}});
    const pending=h.a.adicionar(transaction()); h.a.set({itens:[transaction({id:'outro'})]}); finish(); await pending;
    assert.equal(h.a.state().itens.length,2);
  });
  await ok('Totais em centavos e saldo negativo', () => {
    const t=a.totais([transaction({tipo:'entrada',valor:.1}),transaction({tipo:'entrada',valor:.2}),transaction({valor:.4})]);
    assert.equal(t.entradas,.3); assert.equal(t.saidas,.4); assert.equal(t.saldo,-.1);
  });
  await ok('Navegação respeita janeiro de 1900 e dezembro de 9999', () => {
    a.set({mes:'1900-01'}); a.moverMes(-1); assert.equal(a.state().mes,'1900-01');
    a.set({mes:'9999-12'}); a.moverMes(1); assert.equal(a.state().mes,'9999-12');
  });
  await ok('Datas por calendário, inclusive meses curtos e horário de verão', () => {
    assert.equal(a.diaDoVencimento(bill(),'2026-02'),28); assert.equal(a.diaDoVencimento(bill(),'2024-02'),29);
    assert.equal(a.diasEntre('2026-03-08','2026-03-09'),1);
  });
  await ok('Atrasos com mais de 12 meses permanecem; pagos não voltam', () => {
    a.set({contas:[bill({dia:1,primeiroMes:'2025-01',pagas:{'2025-01':true}})]});
    const pending=a.contasPendentes(); assert.equal(pending.totalAtrasadas,20); assert.equal(pending.atrasadas.length,3);
    assert.equal(pending.atrasadas[0].iso,'2025-02-01'); assert.match(a.fraseAviso(),/20 vencimentos atrasados/);
  });
  await ok('Conta não aparece antes do cadastro; vence hoje/próximos 7 dias', () => {
    a.set({contas:[bill({dia:30}),bill({id:'c2',uid:'c2@cp',dia:7}),bill({id:'f',uid:'f@cp',primeiroMes:'2027-01'})]});
    assert.equal(a.contasPendentes().totalProximas,2);
  });
  await ok('Aviso conta cinco vencimentos próximos e descreve só três', () => {
    a.set({contas:Array.from({length:5},(_,k)=>bill({id:'c'+k,uid:'c'+k+'@cp',dia:30}))});
    assert.equal(a.contasPendentes().totalProximas,5); assert.equal(a.contasPendentes().proximas.length,3); assert.match(a.fraseAviso(),/5 vencimentos próximos/);
  });
  await ok('ICS: dia 31 mensal, DTSTART estável e UID estável', () => {
    a.set({contas:[bill()]}); const first=a.gerarICS(),second=a.gerarICS();
    assert.equal(first,second); assert.match(first,/UID:c1@controle-pessoal\r\n/); assert.match(first,/DTSTART;VALUE=DATE:20260930/);
    assert.match(first,/DTEND;VALUE=DATE:20261001/); assert.match(first,/BYMONTHDAY=28,29,30,31;BYSETPOS=-1/);
    assert.match(first,/TRIGGER:-P1D/); assert.equal((first.match(/BEGIN:VEVENT/g)||[]).length,1);
  });
  await ok('ICS: vencimento passado começa no próximo mês; pagamento não altera agenda', () => {
    a.set({contas:[bill({dia:1,pagas:{'2026-09':true}})]}); assert.match(a.gerarICS(),/DTSTART;VALUE=DATE:20261001/);
  });
  await ok('ICS: escape CR/LF, vírgulas, ponto e vírgula e barra; dobra UTF8 em 75 bytes', () => {
    assert.equal(a.icsTexto('a\r\nb\rc\nd,;\\'),'a\\nb\\nc\\nd\\,\\;\\\\');
    const folded=a.icsDobrar('SUMMARY:'+ 'Á🙂'.repeat(60));
    for (const line of folded.split('\r\n')) assert.ok(Buffer.byteLength(line)<=75);
    assert.equal(folded.replace(/\r\n /g,''),'SUMMARY:'+'Á🙂'.repeat(60));
  });
  await ok('Pagamento mensal não altera lançamentos ou saldo', async () => {
    const h=app({'cp-lancamentos':JSON.stringify([transaction()]),'cp-contas':JSON.stringify([bill()])}); h.a.usarLocal();
    await h.a.salvarConta(bill({pagas:{'2026-09':true}})); assert.equal(h.a.state().itens.length,1); assert.equal(h.a.totais().saldo,-12.34);
  });
  console.log(`\n${checks} grupos de testes passaram; scripts JavaScript compilados.`);
}
main().catch(e=>{console.error(e);process.exitCode=1;});
