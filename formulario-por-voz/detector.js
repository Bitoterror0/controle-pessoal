// Descobre os campos de um formulário Word (word/document.xml) e devolve o XML preenchido.
// Sem dependências: funciona no navegador e no Node (para os testes).
(function (raiz, fabrica) {
  if (typeof module === 'object' && module.exports) module.exports = fabrica();
  else raiz.Detector = fabrica();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';
  const RE_P = /<w:p(?:\s[^>]*)?>[\s\S]*?<\/w:p>/g;
  const RE_T = /(<w:t(?:\s[^>]*)?>)([^<]*)(<\/w:t>)/g;
  // Caixas de marcar escritas como texto: ( ), (x), [ ], [x], ☐, ☑, ☒
  const RE_CAIXA = /\(\s*[xX]?\s*\)|\[\s*[xX]?\s*\]|[☐☑☒]/g;
  const RE_ROTULO = /^\s*([^:]{2,80}):[\s_.…]*$/;

  const ler = (s) => s.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&amp;/g, '&');
  const escrever = (s) => String(s).replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const limpar = (s) => s.replace(/\s+/g, ' ').trim();

  // Cada parágrafo vira { xml, nos: [{ini, fim, texto}], texto }
  function paragrafos(xml) {
    const lista = [];
    let m;
    RE_P.lastIndex = 0;
    while ((m = RE_P.exec(xml))) {
      const nos = [];
      let t;
      RE_T.lastIndex = 0;
      while ((t = RE_T.exec(m[0]))) nos.push({ ini: t.index + t[1].length, fim: t.index + t[1].length + t[2].length, texto: ler(t[2]) });
      lista.push({ pos: m.index, xml: m[0], nos, texto: nos.map((n) => n.texto).join('') });
    }
    return lista;
  }

  function detectar(xml) {
    const ps = paragrafos(xml);
    const campos = [];
    let pendente = null; // rótulo "Algo:" à espera de saber se é texto ou título de um grupo
    let grupo = null;    // grupo de caixas ainda aberto (pode continuar no parágrafo seguinte)
    const fecharPendente = (proximo) => {
      if (!pendente) return;
      const vazio = proximo !== undefined && !limpar(ps[proximo].texto);
      campos.push({ tipo: 'texto', rotulo: pendente.rotulo, p: pendente.p, onde: vazio ? 'proximo' : 'mesmo', alvo: vazio ? proximo : pendente.p });
      pendente = null;
    };
    ps.forEach((p, i) => {
      const caixas = [];
      p.nos.forEach((no, k) => {
        let c;
        RE_CAIXA.lastIndex = 0;
        while ((c = RE_CAIXA.exec(no.texto))) caixas.push({ no: k, ini: c.index, fim: c.index + c[0].length, marca: c[0] });
      });
      if (caixas.length) {
        const antes = p.nos.slice(0, caixas[0].no).map((n) => n.texto).join('') + p.nos[caixas[0].no].texto.slice(0, caixas[0].ini);
        const proprio = RE_ROTULO.exec(antes);
        if (proprio) { fecharPendente(); grupo = null; }
        if (proprio || pendente || !grupo) {
          grupo = { tipo: 'opcoes', rotulo: proprio ? limpar(proprio[1]) : pendente ? pendente.rotulo : 'Opções', opcoes: [] };
          campos.push(grupo);
          pendente = null;
        }
        caixas.forEach((c, j) => {
          // O nome da opção vai da caixa até a próxima caixa (ou o fim do parágrafo)
          const prox = caixas[j + 1];
          let nome = '';
          for (let k = c.no; k < p.nos.length; k++) {
            const de = k === c.no ? c.fim : 0;
            const ate = prox && k === prox.no ? prox.ini : undefined;
            nome += p.nos[k].texto.slice(de, ate);
            if (prox && k === prox.no) break;
          }
          const complemento = /:\s*$/.test(nome) && (!prox || prox.no === c.no || true);
          const fimNome = c.fim + (p.nos[c.no].texto.slice(c.fim, prox && prox.no === c.no ? prox.ini : undefined).replace(/\s+$/, '').length);
          grupo.opcoes.push({
            nome: limpar(nome).replace(/:$/, ''), p: i, no: c.no, ini: c.ini, fim: c.fim, marca: c.marca,
            marcada: /[xX☑☒]/.test(c.marca), complemento: complemento ? { no: c.no, pos: fimNome } : null,
          });
        });
        return;
      }
      const r = RE_ROTULO.exec(p.texto);
      if (r) {
        fecharPendente(i);
        grupo = null;
        pendente = { rotulo: limpar(r[1]), p: i };
        return;
      }
      if (pendente && pendente.p === i - 1) { fecharPendente(i); if (limpar(p.texto)) grupo = null; return; }
      if (limpar(p.texto)) grupo = null;
    });
    fecharPendente();
    campos.forEach((c, i) => { c.id = 'c' + i; });
    return campos;
  }

  function marcar(marca, ligado) {
    if (/[☐☑☒]/.test(marca)) return ligado ? '☒' : '☐';
    const [a, b] = marca[0] === '(' ? ['(', ')'] : ['[', ']'];
    const largo = marca.length > 3;
    return ligado ? (largo ? `${a} x ${b}` : `${a}x${b}`) : (largo ? `${a}   ${b}` : `${a} ${b}`);
  }

  // respostas: { c0: "texto", c1: { marcadas: [0, 2], complementos: { 2: "texto" } } }
  function preencher(xml, respostas) {
    const ps = paragrafos(xml);
    const campos = detectar(xml);
    // edições por parágrafo: trocas dentro de um nó de texto e trechos novos antes de </w:p>
    const trocas = new Map(), finais = new Map();
    const trocar = (p, no, ini, fim, texto) => { if (!trocas.has(p)) trocas.set(p, []); trocas.get(p).push({ no, ini, fim, texto }); };
    campos.forEach((c) => {
      const r = respostas[c.id];
      if (c.tipo === 'texto') {
        const valor = typeof r === 'string' ? r.trim() : '';
        if (!valor) return;
        const p = ps[c.alvo];
        if (c.onde === 'proximo' && p.nos.length) return trocar(c.alvo, 0, 0, p.nos[0].texto.length, valor);
        const sublinhado = c.onde === 'mesmo' && p.nos.length ? /[_.…]{2,}\s*$/.exec(p.nos[p.nos.length - 1].texto) : null;
        if (sublinhado) return trocar(c.alvo, p.nos.length - 1, sublinhado.index, p.nos[p.nos.length - 1].texto.length, valor);
        // Reaproveita a formatação da última letra do parágrafo, sem o negrito do rótulo
        const rprs = p.xml.match(/<w:rPr>[\s\S]*?<\/w:rPr>/g);
        const rpr = rprs ? rprs[rprs.length - 1].replace(/<w:b(?:Cs)?(?:\s[^>]*)?\/>/g, '') : '';
        const espaco = c.onde === 'mesmo' && !/\s$/.test(p.texto) ? ' ' : '';
        finais.set(c.alvo, (finais.get(c.alvo) || '') + `<w:r>${rpr}<w:t xml:space="preserve">${escrever(espaco + valor)}</w:t></w:r>`);
      } else if (r && Array.isArray(r.marcadas)) {
        c.opcoes.forEach((o, k) => {
          const ligado = r.marcadas.includes(k);
          trocar(o.p, o.no, o.ini, o.fim, marcar(o.marca, ligado));
          const extra = ligado && o.complemento && r.complementos && String(r.complementos[k] || '').trim();
          if (extra) trocar(o.p, o.complemento.no, o.complemento.pos, o.complemento.pos, ' ' + extra);
        });
      }
    });
    let saida = '', cursor = 0;
    ps.forEach((p, i) => {
      let px = p.xml;
      // de trás para a frente, para as posições anteriores continuarem valendo
      (trocas.get(i) || []).sort((a, b) => b.no - a.no || b.ini - a.ini).forEach((t) => {
        const no = p.nos[t.no];
        const novo = no.texto.slice(0, t.ini) + t.texto + no.texto.slice(t.fim);
        px = px.slice(0, no.ini) + escrever(novo) + px.slice(no.fim);
        no.texto = novo; // os nós anteriores não mudam de posição
        const delta = escrever(novo).length - (no.fim - no.ini);
        no.fim += delta;
      });
      if (finais.has(i)) px = px.slice(0, px.lastIndexOf('</w:p>')) + finais.get(i) + '</w:p>';
      saida += xml.slice(cursor, p.pos) + px;
      cursor = p.pos + p.xml.length;
    });
    return saida + xml.slice(cursor);
  }

  return { detectar, preencher, paragrafos };
});
