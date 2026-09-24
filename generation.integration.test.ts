import {test} from 'node:test';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {mkdtemp,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {once} from 'node:events';

test('partial quota failure preserves outputs; resume targets requested pose; saved token survives restart', async()=>{
  const dir=await mkdtemp(path.join(tmpdir(),'zalo-integration-'));
  const tokenFile=path.join(dir,'HF_TOKEN.env');
  await writeFile(tokenFile,'HF_TOKEN=hf_savedtest\n');
  let child:ReturnType<typeof spawn> | undefined;
  let origin='';
  const start=async()=>{
    child=spawn(process.execPath,['--import',pathToFileURL(path.resolve('test-provider.mjs')).href,'--import','tsx','server.ts'],{env:{...process.env,HF_TOKEN:'hf_oldtest',HF_TOKEN_FILE:tokenFile,PORT:'3197',NODE_ENV:'production'},stdio:['ignore','pipe','pipe'],windowsHide:true});
    origin='http://127.0.0.1:3197';
    for(let i=0;i<100;i++){try{if((await fetch(origin+'/api/health')).ok)return;}catch{}await new Promise(r=>setTimeout(r,100));}
    throw new Error('Server did not start');
  };
  const stop=async()=>{if(child){const closed=once(child,'close');child.kill();await closed;child=undefined;}};
  const post=(route:string,body:unknown)=>fetch(origin+route,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
  try{
    await start();
    assert.equal((await (await fetch(origin+'/api/config/hf-token')).json()).account,'saved-account');
    const batch=await post('/api/generate-stickers',{image:'data:image/jpeg;base64,YQ==',preset:'pulid_flux_fidelity',count:3});
    const result=await batch.json();
    assert.equal(batch.status,200);assert.equal(result.stickers.length,1);assert.deepEqual(result.remaining,[1,2]);assert.equal(result.code,'HF_QUOTA_EXCEEDED');
    const quota=await post('/api/generate-stickers',{image:'data:image/jpeg;base64,YQ==',preset:'pulid_flux_fidelity',poseIndices:[2]});
    assert.equal(quota.status,429);assert.deepEqual((await quota.json()).remaining,[2]);
    assert.equal((await post('/api/generate-stickers',{image:'x',poseIndices:[-1]})).status,400);
    assert.equal((await post('/api/config/hf-token',{token:'hf_invalid'})).status,400);
    assert.equal((await (await fetch(origin+'/api/config/hf-token')).json()).account,'saved-account');
    assert.equal((await post('/api/config/hf-token',{token:'hf_newtest'})).status,200);
    await stop();await start();
    const status=await (await fetch(origin+'/api/config/hf-token')).json();
    assert.equal(status.account,'new-account');assert.equal(status.source,'saved-file');assert.equal(JSON.stringify(status).includes('hf_newtest'),false);
    const resumed=await (await post('/api/generate-stickers',{image:'data:image/jpeg;base64,YQ==',preset:'pulid_flux_fidelity',poseIndices:[2]})).json();
    assert.equal(resumed.stickers[0].id,'sticker_3');
  }finally{await stop();await rm(dir,{recursive:true,force:true});}
});
