(function(root){
function fetchYoudaoSuggest(word) {
  return new Promise(resolve => {
    const q = word.trim();
    const cb = "__wbDictCb_" + Date.now() + "_" + Math.floor(Math.random() * 1e5);
    const script = document.createElement("script");
    let done = false;
    const cleanup = () => { if (done) return; done = true; try { delete window[cb]; } catch {} if (script.parentNode) script.parentNode.removeChild(script); clearTimeout(timer); };
    const timer = setTimeout(() => { cleanup(); resolve(null); }, 8000);
    window[cb] = (data) => {
      cleanup();
      try {
        const entries = data && data.data && data.data.entries;
        const exact = entries && entries.find(e => (e.entry || "").toLowerCase() === q.toLowerCase());
        if (!exact || !exact.explain) return resolve({ miss: true });
        const m = exact.explain.match(/^([a-z]+\.\s*)([\s\S]*)$/i);
        resolve({ w: q, ph: "", pos: m ? m[1].trim() : "", def: m ? m[2] : exact.explain, ex: [], online: true });
      } catch { resolve(null); }
    };
    script.onerror = () => { cleanup(); resolve(null); };
    script.src = "https://dict.youdao.com/suggest?num=3&ver=3.0&doctype=json&cache=false&le=en&q=" + encodeURIComponent(q) + "&callback=" + cb;
    document.head.appendChild(script);
  });
}
async function fetchWordOnline(word) {
  const yd = await fetchYoudaoSuggest(word);
  if (yd) return yd;
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 8000);
    const res = await fetch("https://api.dictionaryapi.dev/api/v2/entries/en/" + encodeURIComponent(word.trim()), { signal: ctrl.signal });
    clearTimeout(t);
    if (!res.ok) return { miss: true };
    const data = await res.json();
    if (!Array.isArray(data) || !data.length) return { miss: true };
    const entry = data[0];
    const phRaw = entry.phonetic || (entry.phonetics || []).map(p => p.text).find(Boolean) || "";
    const ph = phRaw && !/^[\[\/]/.test(phRaw) ? "/" + phRaw.replace(/^\/+|\/+$/g, "") + "/" : phRaw;
    const meanings = entry.meanings || [];
    const posList = [...new Set(meanings.map(m => m.partOfSpeech).filter(Boolean))].slice(0, 3);
    const defs = []; const ex = [];
    meanings.forEach(m => {
      const d = (m.definitions || [])[0];
      if (d && defs.length < 3) {
        defs.push((m.partOfSpeech ? "[" + m.partOfSpeech + "] " : "") + d.definition);
        if (d.example) ex.push(d.example);
      }
    });
    if (!defs.length) return { miss: true };
    return { w: word.trim(), ph, pos: posList.join(" / "), def: defs.join("  "), ex: ex.slice(0, 2), online: true };
  } catch { return null; }
}


root.StudyDictionary={lookup:fetchWordOnline};
})(globalThis);
