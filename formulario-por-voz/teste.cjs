// Testa o detector com a ficha real (gerada em branco pelo app Fichas de Avaliação) e com um modelo sintético.
const fs = require('node:fs'), vm = require('node:vm'), assert = require('node:assert/strict');
const D = require('./detector.js');
const html = fs.readFileSync(__dirname + '/../fichas-avaliacao-2026/index.html', 'utf8');
const bloco = html.slice(html.indexOf('const TPL='), html.indexOf('return { gerar, gerarBuffer, documentXml };'));
const ctx = {}; vm.createContext(ctx);
vm.runInContext(bloco + 'return { documentXml }; })(); globalThis.xml = DOCX.documentXml([{}]);', ctx);
const xml = ctx.xml;
const texto = (x) => D.paragrafos(x).map((p) => p.texto).join('\n');

const campos = D.detectar(xml);
const resumo = campos.map((c) => c.tipo === 'texto' ? `${c.rotulo} [texto]` : `${c.rotulo} [${c.opcoes.map((o) => o.nome + (o.complemento ? '+' : '')).join(' | ')}]`);
console.log(resumo.join('\n'));
const por = (r) => campos.find((c) => c.rotulo === r);
assert.equal(por('Nome do educando').tipo, 'texto');
assert.deepEqual(por('Atendimento').opcoes.map((o) => o.nome), ['informática', 'Celular', 'TA']);
assert.equal(por('Frequência do educando').opcoes.length, 5);
assert.equal(por('Estratégias').opcoes.length, 6);
assert.equal(por('Dificuldades apresentadas').opcoes.length, 5);
assert.equal(por('Resultados').opcoes.length, 3);
assert.equal(por('Justifique').tipo, 'texto');

const r = {};
r[por('Nome do educando').id] = 'João <da> Silva & Cia';
r[por('Atendimento').id] = { marcadas: [0, 2], complementos: { 2: 'lupa eletrônica' } };
r[por('Frequência do educando').id] = { marcadas: [1, 3] };
r[por('Resultados').id] = { marcadas: [2] };
r[por('Justifique').id] = 'Evoluiu na leitura.';
const cheio = D.preencher(xml, r);
const t = texto(cheio);
assert.match(t, /Nome do educando:\nJoão <da> Silva & Cia\n/);
assert.match(t, /\( x \) informática  \(   \) Celular  \( x \) TA: lupa eletrônica/);
assert.match(t, /\(   \) seg   \( x \) terç   \(   \) quart   \( x \) quint   \(   \) sext/);
assert.match(t, /\(   \)  objetivo alcançado   \(   \)  objetivo não alcançado   \( x \)  objetivo parcialmente alcançado/);
assert.match(t, /Justifique: Evoluiu na leitura\./);
// Só o que foi respondido muda; o resto do documento fica igual
assert.equal(D.preencher(xml, {}), xml);
const de = D.detectar(cheio);
assert.deepEqual(de.find((c) => c.rotulo === 'Frequência do educando').opcoes.map((o) => o.marcada), [false, true, false, true, false]);

// Modelo sintético: sublinhado, colchetes e caixas Unicode
const p = (s) => `<w:p><w:r><w:t xml:space="preserve">${s}</w:t></w:r></w:p>`;
const sint = `<w:body>${p('Requerimento')}${p('Nome: ________')}${p('Turno:')}${p('[ ] Manhã  [ ] Tarde')}${p('Aceito: ☐ Sim ☐ Não')}${p('Observações:')}${p('Texto fixo depois.')}</w:body>`;
const cs = D.detectar(sint);
assert.deepEqual(cs.map((c) => c.rotulo), ['Nome', 'Turno', 'Aceito', 'Observações']);
const s2 = texto(D.preencher(sint, { [cs[0].id]: 'Ana', [cs[1].id]: { marcadas: [1] }, [cs[2].id]: { marcadas: [0] }, [cs[3].id]: 'Nada.' }));
assert.match(s2, /Nome: Ana\nTurno:\n\[ \] Manhã  \[x\] Tarde\nAceito: ☒ Sim ☐ Não\nObservações: Nada\.\nTexto fixo depois\./);
console.log('\nOK: detector e preenchimento passaram.');
