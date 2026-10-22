const assert=require('node:assert/strict'),M=require('./migration.js'),C=require('./core.js');
const defaults={words:[],profiles:[{id:'qwen',name:'千问',base:'https://example.test/v1',model:'test'}],activeProfile:'qwen',articles:[],chats:{},drafts:{},pool:{},done:{},free:[],deletedArticles:[],generated:[],study:{},daily:20,activeArticle:'',assistantPositions:{},newsDaily:{},summaries:{},vision:{base:'https://example.test/v1',model:'vision'}};
function storage(values){const data=new Map(Object.entries(values).map(([k,v])=>[k,JSON.stringify(v)]));return {data,writes:0,getItem(k){if(/key|guardian/i.test(k)&&k!=='wb_learning_v2')throw Error('Credentials must not be read');return data.get(k)??null;},setItem(k,v){this.writes++;data.set(k,v);}};}
const old={
 wb_errorBook:[{w:'Apple',def:'苹果',ex:['An apple.'],addedAt:'2026/10/1'},{w:'apple',def:'',addedAt:'broken'},{w:'Missing date',def:'缺日期'},{w:'Finished',def:'已完成',addedAt:'2026/10/1'}],
 wb_reviewCounts:{Apple:1,apple:4,Finished:6},wb_sentencePool:{'2026/10/2':['Apple','break the ice'],'2026-10-02':['apple','other'],'bad date':['untimed']},
 wb_importedArticles:[{id:'imp_1',title:'Imported',body:'First\n\nLast paragraph.',date:'2026-10-01'}],
 wb_chatThreads:{'1':[{role:'user',content:'Old question'},{role:'assistant',content:'Old error',error:true}],imp_1:[{role:'user',content:'Imported question'}]},
 wb_articleNotes:{'1':'Local note',imp_1:'Imported note'},wb_aiArticles:[{date:'2026/10/2',words:['Apple'],en:'An apple.',zh:'一个苹果。'}],
 wb_diaryEntries:[{date:'2026/10/1',text:'My diary.',notes:'私有笔记',review:{text:'Review',overall:'Good',items:'One',better:'Better',praise:'Nice',words:[{w:'Nice',def:'好'}]}}],
 wb_customBooks:[{id:'custom_1',name:'My book',level:'cet4',tagSource:true,words:[{w:'custom phrase',def:'自定义短语',ex:[]}]}],
 wb_tagScope:'all',wb_learnedWords:{cet4:['Apple']},wb_dailyWords:{cet4:['Apple','Other']},wb_completedByBook:{cet4:['Apple']},wb_dailyCounts:{cet4:35}
};
const s=storage(old),before=new Map(s.data),state=M.load(s,defaults,{articles:[{id:1}]});
assert.equal(state.words.length,3);const apple=state.words.find(w=>w.id==='apple');assert.equal(apple.stage,4);assert.equal(apple.next,'2026-10-16');assert.deepEqual(apple.logs,[]);assert.equal(apple.lastDay,null);assert.equal(state.words.find(w=>w.id==='missing date').next,C.addDays(C.day(),1));assert.equal(state.words.find(w=>w.id==='finished').next,null);
assert.deepEqual(state.pool['2026-10-02'],['apple','break the ice','other']);assert.deepEqual(state.pool['bad date'],['untimed']);assert.deepEqual(state.chats.local_1,old.wb_chatThreads['1']);assert.deepEqual(state.chats.imp_1,old.wb_chatThreads.imp_1);assert.equal(state.articleNotes.local_1,'Local note');assert.equal(state.articleNotes.imp_1,'Imported note');
assert.deepEqual(state.articles,old.wb_importedArticles);assert.deepEqual(state.diaryEntries,old.wb_diaryEntries);assert.deepEqual(state.customBooks,old.wb_customBooks);assert.deepEqual(state.learnedWords,old.wb_learnedWords);assert.equal(state.tagScope,'all');assert.deepEqual(state.legacy,old);assert.deepEqual(state.study,{});assert.deepEqual(state.done,{});assert.equal(state.generated[0].text,'An apple.\n\n===翻译===\n一个苹果。');assert.equal(state.generated[0].source,'today');assert.equal(state.generated[0].date,'2026-10-02');
for(const [k,v] of before)assert.equal(s.data.get(k),v);assert.equal(s.writes,1);assert.equal(JSON.stringify(state).includes('test-key'),false);
s.data.set('wb_errorBook','corrupted old value');assert.deepEqual(M.load(s,defaults,{articles:[{id:1}]}),state);assert.equal(s.writes,1);
for(const [k,v] of [['wb_errorBook',{}],['wb_reviewCounts',{Apple:'bad'}],['wb_diaryEntries',[{date:'now',text:123}]],['wb_customBooks',[{id:'x',name:'X',words:'bad'}]],['wb_chatThreads',{a:[{role:'system',content:'bad'}]}]]){const bad=storage({...old,[k]:v});assert.throws(()=>M.load(bad,defaults,{}),/格式异常/);assert.equal(bad.writes,0);assert.equal(bad.data.has('wb_learning_v2'),false);}
const malformed=storage({});malformed.data.set('wb_sentencePool','{bad');assert.throws(()=>M.load(malformed,defaults,{}),/无法解析/);assert.equal(malformed.writes,0);
const badNew=storage({'wb_learning_v2':{words:'broken'}});assert.throws(()=>M.load(badNew,defaults,{}),/格式异常/);assert.equal(badNew.writes,0);
const full=storage(old),original=new Map(full.data);full.setItem=()=>{throw new DOMException('Full','QuotaExceededError');};assert.throws(()=>M.load(full,defaults,{}),/迁移保存失败/);assert.deepEqual(full.data,original);
assert.equal(M.validate(state),state);assert.throws(()=>M.validate({...state,words:[{...apple,next:'2026-02-30'}]}),/格式异常/);
const fresh=storage({});assert.equal(M.load(fresh,defaults,{}).words.length,0);assert.equal(fresh.writes,1);
console.log('Migration checks passed: complete legacy mapping, duplicate progress, dates, article references, no credential reads, idempotence, malformed data protection and failed storage writes.');
