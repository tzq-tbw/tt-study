(function (root) {
  'use strict';
  const gaps = [1, 1, 2, 3, 8, 15];
  const key = word => word.trim().toLowerCase();
  const day = (date = new Date()) => `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
  function addDays(value, n) { const [y,m,d] = value.split('-').map(Number); return day(new Date(y,m-1,d+n,12)); }
  function validDay(value) { return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) && addDays(value,0) === value; }
  function parseWords(text) { return [...new Map(text.split(/[\n,，;；]+/).map(w=>w.trim()).filter(Boolean).map(w=>[key(w),w])).values()]; }
  function normalize(word, count = 0, today = day()) {
    const stage = Math.max(0,Math.min(6,Math.floor(Number(count)||0)));
    const added = String(word.addedAt || '').split('/').map(n=>n.padStart(2,'0')).join('-');
    return {...word, id:key(word.w), stage, next:stage===6?null:validDay(added)?addDays(added,[1,2,4,7,15,30][stage]):addDays(today,1), logs:[], lastDay:null};
  }
  function answer(word, remembered, today = day()) {
    if (word.stage >= 6 || word.lastDay === today || !word.def?.trim() || word.next > today) return word;
    const stage = word.stage + (remembered ? 1 : 0);
    return {...word, stage, lastDay:today, next:stage===6?null:addDays(today,remembered?gaps[stage]:1), logs:[...word.logs,{day:today,remembered,stage}]};
  }
  function due(words,today=day()) { return words.filter(w=>w.stage<6 && w.next<=today && w.lastDay!==today && w.def?.trim()).sort((a,b)=>a.next.localeCompare(b.next)||a.id.localeCompare(b.id)); }
  function paragraphs(body) { return body.trim().split(/\n\s*\n|\n/).filter(p=>p.trim()).flatMap(p=>{ const result=[]; for(let i=0;i<p.length;i+=1800) result.push(p.slice(i,i+1800)); return result; }); }
  function context(body,quote,question,budget=12000) {
    const ps=paragraphs(body), numbered=ps.map((p,i)=>`[第${i+1}段] ${p}`);
    if(numbered.join('\n\n').length<=budget) return {text:numbered.join('\n\n'),scope:'全文',indices:ps.map((_,i)=>i)};
    const anchor=quote?.indices||[], tokens=(question.toLowerCase().match(/[a-z]{3,}/g)||[]);
    const priorities=[...anchor,...anchor.flatMap(i=>[i-1,i+1]),...ps.map((p,i)=>({i,score:tokens.reduce((s,t)=>s+(p.toLowerCase().includes(t)?1:0),0)})).sort((a,b)=>b.score-a.score).map(x=>x.i)];
    const chosen=[];let used=0;
    for(const i of new Set(priorities)){if(i<0||i>=ps.length)continue;if(used+numbered[i].length>budget)continue;chosen.push(i);used+=numbered[i].length+2;}
    chosen.sort((a,b)=>a-b);
    return {text:chosen.map(i=>numbered[i]).join('\n\n'),scope:`部分正文 · 第 ${chosen.map(i=>i+1).join('、')} 段`,indices:chosen};
  }
  function chunks(body,budget=10000) { const output=[];let current=''; paragraphs(body).forEach((p,i)=>{const t=`[第${i+1}段] ${p}\n\n`;if(current.length+t.length>budget){output.push(current);current='';}current+=t;});if(current)output.push(current);return output; }
  const api={key,day,addDays,validDay,parseWords,normalize,answer,due,paragraphs,context,chunks};
  if(typeof module!=='undefined')module.exports=api;else root.StudyCore=api;
})(globalThis);
