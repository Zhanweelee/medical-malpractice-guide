const MedicalGuideSearch = (() => {
  const groups = [
    ['医务部', '医务科', '医务处'], ['接收医院', '接受医院'],
    ['转院', '转诊'], ['病历', '病案'], ['监控', '录像', '视频'],
    ['封存', '保全'], ['救护车', '救护转运'], ['u盘', '优盘'],
    ['免责', '推卸责任', '风险承担'], ['卫健委', '卫健部门', '卫生健康部门']
  ];
  const normalize = value => String(value).normalize('NFKC').toLowerCase().replace(/[\s\p{P}\p{S}]/gu, '');
  const terms = query => String(query).slice(0, 80).trim().split(/[\s，,；;、]+/u).map(normalize).filter(Boolean).slice(0, 8);
  const variants = term => [...new Set([term, ...groups.filter(group => group.includes(term)).flat()])];
  const distance = (a, b) => {
    let previous = Array.from({ length:b.length + 1 }, (_, i) => i);
    for (let i = 1; i <= a.length; i++) {
      const row = [i];
      for (let j = 1; j <= b.length; j++) {
        row.push(Math.min(row[j - 1] + 1, previous[j] + 1, previous[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)));
      }
      previous = row;
    }
    return previous[b.length];
  };
  const locate = (text, term) => {
    const exact = text.indexOf(term);
    if (exact >= 0) return { score:100, index:exact };
    for (const alternative of variants(term).slice(1)) {
      const index = text.indexOf(alternative);
      if (index >= 0) return { score:85, index };
    }
    if (term.length >= 4) {
      for (let start = text.indexOf(term[0]); start >= 0; start = text.indexOf(term[0], start + 1)) {
        let position = start;
        for (const character of term.slice(1)) {
          position = text.indexOf(character, position + 1);
          if (position < 0 || position - start >= term.length + 12) break;
        }
        if (position >= start && position - start < term.length + 12) {
          // Confirm that the complete term fits in this short passage.
          let cursor = 0;
          for (const character of text.slice(start, position + 1)) if (character === term[cursor]) cursor++;
          if (cursor === term.length) return { score:60, index:start };
        }
      }
    }
    if (term.length >= 3 && term.length <= 12) {
      for (let start = 0; start < text.length; start++) {
        for (const length of [term.length, term.length - 1, term.length + 1]) {
          const sample = text.slice(start, start + length);
          if (sample.length === length && distance(sample, term) <= 1) return { score:45, index:start };
        }
      }
    }
    return { score:0, index:-1 };
  };
  const search = (documents, query) => {
    const tokens = terms(query);
    if (!tokens.length) return [];
    return documents.map(document => {
      const title = normalize(document.title);
      const text = normalize(`${document.title} ${document.text}`);
      const matches = tokens.map(token => locate(text, token));
      const score = matches.every(match => match.score > 0)
        ? matches.reduce((sum, match) => sum + match.score, 0) + tokens.reduce((sum, token) => sum + locate(title, token).score * 2, 0)
        : 0;
      return { ...document, score };
    }).filter(document => document.score > 0).sort((a, b) => b.score - a.score);
  };
  const excerpt = (value, query) => {
    const text = String(value).replace(/\s+/g, ' ').trim();
    const normalized = normalize(text);
    const match = terms(query).map(term => locate(normalized, term)).find(item => item.index >= 0);
    // Map the normalized offset back to the original text, preserving punctuation.
    let normalizedOffset = 0;
    let originalOffset = 0;
    for (const character of text) {
      if (normalizedOffset >= (match?.index || 0)) break;
      normalizedOffset += normalize(character).length;
      originalOffset += character.length;
    }
    const start = Math.max(0, originalOffset - 35);
    return `${start ? '…' : ''}${text.slice(start, start + 160)}${start + 160 < text.length ? '…' : ''}`;
  };
  return { search, excerpt, terms, variants };
})();
