const assert=require('node:assert/strict'),AI=require('./ai-client.js');
(async()=>{
 const original=global.fetch;
 try{
  let calls=0,active=0,max=0;
  global.fetch=async()=>{calls++;active++;max=Math.max(max,active);await new Promise(r=>setTimeout(r,15));active--;return new Response(JSON.stringify({choices:[{message:{content:'OK'}}]}));};
  const req=()=>AI.request('https://example.com/v1',{}, {signal:new AbortController().signal,spacing:0});
  await Promise.all([req(),req(),req()]);assert.equal(max,1);
  calls=0;global.fetch=async()=>{calls++;return calls===1?new Response(JSON.stringify({error:{code:'Throttling.RateQuota',message:'request limit exceeded'},request_id:'req-test'}),{status:429,headers:{'retry-after':'0'}}):new Response(JSON.stringify({choices:[{message:{content:'OK'}}]}));};
  assert.equal(await req(),'OK');assert.equal(calls,2);
  calls=0;global.fetch=async()=>{calls++;return new Response(JSON.stringify({error:{code:'BudgetLimitExceeded',message:'budget exhausted'},request_id:'req-budget'}),{status:429});};
  await assert.rejects(req,/BudgetLimitExceeded[\s\S]*req-budget/);assert.equal(calls,1);
  const controller=new AbortController();global.fetch=async()=>new Response(JSON.stringify({error:{code:'Throttling',message:'rate limit'}}),{status:429,headers:{'retry-after':'10'}});
  const pending=AI.request('https://cancel.test',{}, {signal:controller.signal,spacing:0,onStatus:s=>{if(s.includes('等待 10 秒'))controller.abort();}});await assert.rejects(pending,e=>e.name==='AbortError');

  for(const phase of ['headers','body']){
   calls=0;let aborted=false;
   global.fetch=async(_url,{signal})=>{
    calls++;
    if(calls>1){assert.equal(aborted,true,'queued request must wait for timeout cleanup');return new Response(JSON.stringify({choices:[{message:{content:'AFTER TIMEOUT'}}]}));}
    if(phase==='headers')return new Promise((_resolve,reject)=>signal.addEventListener('abort',()=>{aborted=true;reject(new DOMException('aborted','AbortError'));},{once:true}));
    return new Response(new ReadableStream({start(stream){stream.enqueue(new TextEncoder().encode('{"choices":'));signal.addEventListener('abort',()=>{aborted=true;stream.error(new DOMException('aborted','AbortError'));},{once:true});}}));
   };
   const url='https://timeout-'+phase+'.test';
   const timed=AI.request(url,{}, {spacing:0,timeoutMs:25});
   const failed=assert.rejects(timed,e=>e.name==='TimeoutError'&&e.message.includes('请求超时'));
   const next=AI.request(url,{}, {spacing:0,timeoutMs:500});
   await failed;assert.equal(await next,'AFTER TIMEOUT');assert.equal(calls,2,'timeout must not automatically retry');
  }

  const cancelling=new AbortController();let entered;
  const started=new Promise(resolve=>entered=resolve);
  global.fetch=async(_url,{signal})=>new Promise((_resolve,reject)=>{signal.addEventListener('abort',()=>reject(new DOMException('aborted','AbortError')),{once:true});entered();});
  const activeRequest=AI.request('https://active-cancel.test',{}, {signal:cancelling.signal,spacing:0,timeoutMs:500});
  const cancelled=assert.rejects(activeRequest,e=>e.name==='AbortError');
  await started;cancelling.abort();await cancelled;

  calls=0;let release,firstStarted;
  const inFlight=new Promise(resolve=>firstStarted=resolve);
  global.fetch=async()=>{calls++;if(calls===1){firstStarted();await new Promise(resolve=>release=resolve);}return new Response(JSON.stringify({choices:[{message:{content:'OK'}}]}));};
  const first=AI.request('https://queued-cancel.test',{}, {spacing:0});
  await inFlight;
  const queuedController=new AbortController();
  const queued=AI.request('https://queued-cancel.test',{}, {signal:queuedController.signal,spacing:0});
  const queuedFailure=assert.rejects(queued,e=>e.name==='AbortError');queuedController.abort();await queuedFailure;
  const third=AI.request('https://queued-cancel.test',{}, {spacing:0});
  await new Promise(resolve=>setTimeout(resolve,10));assert.equal(calls,1,'cancelling the middle request must not bypass the first');
  release();await Promise.all([first,third]);assert.equal(calls,2,'cancelled queued request must not be sent');

  const originalTimer=global.setTimeout,delays=[],statuses=[];
  try{
   global.setTimeout=(callback,ms,...args)=>{if(ms===15000||ms===30000){delays.push(ms);return originalTimer(callback,0,...args);}return originalTimer(callback,ms,...args);};
   calls=0;global.fetch=async()=>{calls++;return new Response(JSON.stringify({error:{code:'Throttling.RateQuota',message:'You have exceeded your current request limit.'},request_id:'req-limit-final'}),{status:429});};
   await assert.rejects(AI.request('https://backoff.test',{}, {spacing:0,onStatus:s=>statuses.push(s)}),e=>/触发服务限流/.test(e.message)&&/HTTP 429/.test(e.message)&&/Throttling.RateQuota/.test(e.message)&&/req-limit-final/.test(e.message));
   assert.equal(calls,3);assert.deepEqual(delays,[15000,30000]);
   assert.ok(statuses.some(s=>s.includes('等待 15 秒')));assert.ok(statuses.some(s=>s.includes('等待 30 秒')));
  }finally{global.setTimeout=originalTimer;}
  console.log('AI checks passed: serialized calls, 15/30s bounded throttling retry, quota no-retry, header/body timeouts, queue recovery, active/queued cancellation, diagnostic metadata.');
 }finally{global.fetch=original;}
})().catch(e=>{console.error(e);process.exitCode=1;});
