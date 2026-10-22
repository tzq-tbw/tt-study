(function(root){
  'use strict';
  const lanes=new Map();
  function wait(ms,signal){return new Promise((resolve,reject)=>{if(signal.aborted)return reject(new DOMException('已取消','AbortError'));const stop=()=>{clearTimeout(timer);reject(new DOMException('已取消','AbortError'));};const timer=setTimeout(()=>{signal.removeEventListener('abort',stop);resolve();},ms);signal.addEventListener('abort',stop,{once:true});});}
  async function request(url,options,{signal=new AbortController().signal,onStatus=()=>{},spacing=1000,timeoutMs=120000}={}){
    const lane=lanes.get(url)||{tail:Promise.resolve(),last:0};lanes.set(url,lane);
    const previous=lane.tail;let unlock;lane.tail=new Promise(r=>unlock=r);
    try{
      onStatus('等待当前服务的请求队列…');
      await new Promise((resolve,reject)=>{
        const stop=()=>reject(new DOMException('已取消','AbortError'));
        if(signal.aborted){stop();return;}
        signal.addEventListener('abort',stop,{once:true});
        previous.then(()=>{signal.removeEventListener('abort',stop);resolve();});
      });
      for(let attempt=0;attempt<3;attempt++){
        await wait(Math.max(0,lane.last+spacing-Date.now()),signal);onStatus(attempt?'正在重试…':'正在请求 AI…');lane.last=Date.now();
        const controller=new AbortController();let timedOut=false,response,data;
        const stop=()=>controller.abort();signal.addEventListener('abort',stop,{once:true});if(signal.aborted)stop();
        const timer=setTimeout(()=>{timedOut=true;controller.abort();},timeoutMs);
        try{
          response=await fetch(url,{...options,signal:controller.signal});
          data=await response.json().catch(e=>{if(e.name==='SyntaxError')return null;throw e;});
          if(controller.signal.aborted)throw new DOMException('请求中止','AbortError');
        }catch(e){
          if(signal.aborted)throw new DOMException('已取消','AbortError');
          if(timedOut)throw new DOMException(`请求超时：等待 ${Math.ceil(timeoutMs/1000)} 秒仍未收到完整回答。可缩小选段或稍后重新发送；本次不会自动重试。`,'TimeoutError');
          if(e.name==='AbortError')throw e;
          throw Error('无法连接或完整读取 API 响应，请检查网络、服务地址及浏览器跨域支持。');
        }finally{clearTimeout(timer);signal.removeEventListener('abort',stop);}
        if(signal.aborted)throw new DOMException('已取消','AbortError');
        if(response.ok){const text=data?.choices?.[0]?.message?.content;if(typeof text!=='string'||!text.trim())throw Error('模型返回空内容或不兼容格式。');return text;}
        const code=String(data?.error?.code||data?.code||data?.error?.type||''),message=String(data?.error?.message||data?.message||'请求失败'),id=data?.request_id||response.headers.get('x-request-id')||response.headers.get('x-dashscope-request-id');
        const exhausted=/budget|arrear|billing|prepaid|postpaid|free allocated|freequota|commodity/i.test(code+' '+message);
        let hint='';
        if(exhausted)hint='服务额度或账单限制：请在服务商控制台核对预算、免费额度及账单状态。等待或反复重试通常无法解决。';
        else if(response.status===429)hint=/allocationquota|token.*limit|tokens per/i.test(code+' '+message)?'触发 Token 速率限制：请稍后重试，或缩小选段、降低正文预算。':'触发服务限流：请暂停其他使用同一账号的调用，稍候再试；持续失败请检查模型调用限额。';
        const detail=`${hint?hint+'\n':''}HTTP ${response.status}${code?' · '+code:''}\n${message}${id?'\nRequest ID: '+id:''}`;
        const retryable=response.status===429&&!exhausted&&/throttl|rate|request.*limit|too many|allocationquota|concurrency|overloaded/i.test(code+' '+message);
        if(!retryable||attempt===2)throw Error(detail);
        const header=response.headers.get('retry-after');const delay=header?(Number.isFinite(Number(header))?Number(header)*1000:Date.parse(header)-Date.now()):15000*2**attempt;
        const ms=Math.max(1000,Number.isFinite(delay)?delay:15000*2**attempt);
        onStatus(`${detail}\n等待 ${Math.ceil(ms/1000)} 秒后重试（${attempt+1}/2），可取消。`);await wait(ms,signal);
      }
    }finally{previous.then(unlock);}
  }
  const api={request};if(typeof module!=='undefined')module.exports=api;else root.StudyAI=api;
})(globalThis);
