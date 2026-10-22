(function(root){
  'use strict';
  const C=root.StudyCore||(typeof require==='function'?require('./core.js'):null);
  const object=x=>x!==null&&typeof x==='object'&&!Array.isArray(x);
  const text=x=>typeof x==='string';
  const strings=x=>Array.isArray(x)&&x.every(text);
  function check(ok,path){if(!ok)throw Error('学习数据格式异常：'+path+'。原记录未被覆盖，请先检查或恢复备份。');}
  function record(value,path,item){check(object(value),path);Object.entries(value).forEach(([k,v])=>item(v,path+'.'+k));}
  function list(value,path,item){check(Array.isArray(value),path);value.forEach((v,i)=>item(v,path+'['+i+']'));}
  function word(w,path){check(object(w)&&text(w.w)&&!!w.w.trim(),path);for(const k of ['def','ph','pos','addedAt'])if(w[k]!=null)check(text(w[k]),path+'.'+k);if(w.ex!=null)check(strings(w.ex),path+'.ex');}
  function article(a,path){check(object(a)&&text(a.id)&&!!a.id&&text(a.title)&&text(a.body),path);if(a.date!=null)check(text(a.date),path+'.date');}
  function messages(value,path){list(value,path,(m,p)=>{check(object(m)&&['user','assistant'].includes(m.role)&&text(m.content),p);if(m.quote!=null)check(object(m.quote)&&text(m.quote.text)&&Array.isArray(m.quote.indices)&&m.quote.indices.every(Number.isInteger),p+'.quote');});}
  function diary(value,path){list(value,path,(d,p)=>{check(object(d)&&text(d.date)&&text(d.text),p);if(d.notes!=null)check(text(d.notes),p+'.notes');if(d.review!=null){check(object(d.review),p+'.review');for(const k of ['text','overall','items','better','praise'])if(d.review[k]!=null)check(text(d.review[k]),p+'.review.'+k);if(d.review.words!=null)list(d.review.words,p+'.review.words',word);}});}
  function books(value,path){const ids=new Set();list(value,path,(b,p)=>{check(object(b)&&text(b.id)&&!!b.id&&text(b.name)&&!ids.has(b.id),p);ids.add(b.id);list(b.words,p+'.words',word);});}
  function date(value){if(!text(value)||!/^\d{4}[/-]\d{1,2}[/-]\d{1,2}$/.test(value))return '';const d=value.split(/[/-]/).map(n=>n.padStart(2,'0')).join('-');return C.validDay(d)?d:'';}
  function validate(state){
    check(object(state),'根对象');
    const ids=new Set();list(state.words,'words',(w,p)=>{word(w,p);check(text(w.id)&&w.id===C.key(w.w)&&!ids.has(w.id),p+'.id');ids.add(w.id);check(Number.isInteger(w.stage)&&w.stage>=0&&w.stage<=6,p+'.stage');check(w.stage===6?w.next===null:C.validDay(w.next),p+'.next');check(w.lastDay===null||C.validDay(w.lastDay),p+'.lastDay');list(w.logs,p+'.logs',(l,q)=>check(object(l)&&C.validDay(l.day),q));});
    list(state.profiles,'profiles',(p,k)=>check(object(p)&&text(p.id)&&!!p.id&&text(p.name)&&text(p.base)&&text(p.model),k));check(state.profiles.length>0,'profiles');
    check(text(state.activeProfile)&&state.profiles.some(p=>p.id===state.activeProfile),'activeProfile');
    list(state.articles,'articles',article);record(state.chats,'chats',messages);record(state.drafts,'drafts',(v,p)=>check(text(v),p));
    for(const k of ['pool','done'])record(state[k],k,(v,p)=>check(strings(v),p));
    for(const k of ['free','deletedArticles'])check(strings(state[k]),k);
    list(state.generated,'generated',(g,p)=>check(object(g)&&text(g.id)&&text(g.date)&&strings(g.words)&&text(g.text)&&['article','sentences'].includes(g.kind)&&['today','free'].includes(g.source),p));
    record(state.study,'study',(s,p)=>{check(object(s)&&strings(s.list)&&strings(s.group)&&Number.isInteger(s.cursor)&&s.cursor>=0&&Number.isInteger(s.round)&&s.round>=1&&typeof s.summary==='boolean',p);check(new Set(s.list).size===s.list.length&&s.group.every(w=>s.list.includes(w))&&(s.group.length===0?s.cursor===0:s.cursor<s.group.length),p+'.group');record(s.status,p+'.status',(v,q)=>check(['learned','forgotten'].includes(v),q));});
    check(Number.isInteger(state.daily)&&state.daily>=1&&state.daily<=200,'daily');check(text(state.activeArticle),'activeArticle');
    if(state.diaryEntries!=null)diary(state.diaryEntries,'diaryEntries');
    if(state.customBooks!=null)books(state.customBooks,'customBooks');
    if(state.articleNotes!=null)record(state.articleNotes,'articleNotes',(v,p)=>check(text(v),p));
    if(state.learnedWords!=null)record(state.learnedWords,'learnedWords',(v,p)=>check(strings(v),p));
    if(state.tagScope!=null)check(text(state.tagScope),'tagScope');
    if(state.dailyCounts!=null)record(state.dailyCounts,'dailyCounts',(n,p)=>check(Number.isInteger(n)&&n>=1&&n<=200,p));
    if(state.diaryDraft!=null){check(object(state.diaryDraft)&&text(state.diaryDraft.text)&&text(state.diaryDraft.notes),'diaryDraft');if(state.diaryDraft.review!=null)diary([{date:'',text:'',review:state.diaryDraft.review}],'diaryDraft.review');}
    if(state.legacy!=null)check(object(state.legacy),'legacy');
    for(const k of ['assistantPositions','newsDaily','summaries'])if(state[k]!=null)check(object(state[k]),k);
    if(state.vision!=null)check(object(state.vision)&&text(state.vision.base)&&text(state.vision.model),'vision');
    return state;
  }
  function load(storage,defaults,library){
    const store=root.StudyConfig?.store||'wb_learning_v2';
    const parse=(raw,key)=>{try{return JSON.parse(raw);}catch{throw Error('学习数据无法解析：'+key+'。原记录未被覆盖，请先检查或恢复备份。');}};
    const saved=storage.getItem(store);
    if(saved!==null)return validate({...structuredClone(defaults),...validate(parse(saved,store))});
    const old={},arrayKeys=['wb_errorBook','wb_aiArticles','wb_importedArticles','wb_customBooks','wb_diaryEntries'],mapKeys=['wb_reviewCounts','wb_sentencePool','wb_chatThreads','wb_articleNotes','wb_learnedWords','wb_dailyWords','wb_completedByBook','wb_dailyCounts'];
    for(const key of [...arrayKeys,...mapKeys,'wb_tagScope']){const raw=storage.getItem(key);if(raw!==null)old[key]=parse(raw,key);}
    for(const key of arrayKeys)if(key in old)check(Array.isArray(old[key]),key);
    for(const key of mapKeys)if(key in old)check(object(old[key]),key);
    list(old.wb_errorBook||[],'wb_errorBook',word);
    record(old.wb_reviewCounts||{},'wb_reviewCounts',(n,p)=>check(typeof n==='number'&&Number.isFinite(n)&&n>=0,p));
    for(const key of ['wb_sentencePool','wb_learnedWords','wb_dailyWords','wb_completedByBook'])record(old[key]||{},key,(v,p)=>check(strings(v),p));
    record(old.wb_dailyCounts||{},'wb_dailyCounts',(n,p)=>check(Number.isInteger(n)&&n>0,p));
    list(old.wb_importedArticles||[],'wb_importedArticles',article);
    record(old.wb_chatThreads||{},'wb_chatThreads',messages);record(old.wb_articleNotes||{},'wb_articleNotes',(v,p)=>check(text(v),p));
    books(old.wb_customBooks||[],'wb_customBooks');diary(old.wb_diaryEntries||[],'wb_diaryEntries');
    if('wb_tagScope' in old)check(text(old.wb_tagScope),'wb_tagScope');
    list(old.wb_aiArticles||[],'wb_aiArticles',(a,p)=>check(object(a)&&text(a.date)&&strings(a.words)&&text(a.en)&&(a.zh==null||text(a.zh)),p));
    const counts=new Map();for(const [w,n] of Object.entries(old.wb_reviewCounts||{}))counts.set(C.key(w),Math.max(counts.get(C.key(w))||0,n));
    const words=new Map();for(const w of old.wb_errorBook||[]){const id=C.key(w.w),prior=words.get(id);if(!prior)words.set(id,{...w,w:w.w.trim()});else{for(const k of ['def','ph','pos'])if(!prior[k]&&w[k])prior[k]=w[k];if(!prior.ex?.length&&w.ex?.length)prior.ex=w.ex;if(!date(prior.addedAt)&&date(w.addedAt))prior.addedAt=w.addedAt;}}
    const builtins=new Set((library?.articles||[]).map(a=>String(a.id))),imported=new Set((old.wb_importedArticles||[]).map(a=>a.id));
    const articleId=id=>!imported.has(id)&&builtins.has(id)?'local_'+id:id;
    const pool=new Map();for(const [day,items] of Object.entries(old.wb_sentencePool||{})){const d=date(day)||day;const merged=new Map([...(pool.get(d)||[]),...items].map(w=>[C.key(w),w]));pool.set(d,[...merged.values()]);}
    const state={...structuredClone(defaults),
      words:[...words.values()].map(w=>C.normalize({...w,...(date(w.addedAt)?{addedAt:date(w.addedAt)}:{})},counts.get(C.key(w.w))||0)),
      pool:Object.fromEntries(pool),
      articles:structuredClone(old.wb_importedArticles||[]).map(a=>({...a,date:date(a.date)||a.date})),
      chats:Object.fromEntries(Object.entries(old.wb_chatThreads||{}).map(([id,m])=>[articleId(id),m])),
      articleNotes:Object.fromEntries(Object.entries(old.wb_articleNotes||{}).map(([id,n])=>[articleId(id),n])),
      generated:(old.wb_aiArticles||[]).map((a,i)=>({...a,id:'legacy_article_'+i,date:date(a.date)||a.date,source:'today',kind:'article',text:a.en+(a.zh?'\n\n===翻译===\n'+a.zh:'')})),
      diaryEntries:structuredClone(old.wb_diaryEntries||[]),customBooks:structuredClone(old.wb_customBooks||[]),
      tagScope:old.wb_tagScope??'hf',learnedWords:structuredClone(old.wb_learnedWords||{}),legacy:structuredClone(old)
    };
    const oldModel=storage.getItem('wb_qwen_model');if(oldModel&&oldModel.trim())state.profiles=state.profiles.map(p=>p.id==='qwen'?{...p,model:oldModel.trim()}:p);
    validate(state);
    try{storage.setItem(store,JSON.stringify(state));}catch{throw Error('迁移保存失败：浏览器存储不可用或空间不足。旧学习记录保留，恢复存储后可再次尝试。');}
    return state;
  }
  const api={load,validate};if(typeof module!=='undefined')module.exports=api;else root.StudyMigration=api;
})(globalThis);
