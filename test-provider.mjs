// Test-only upstream fixture. Never loaded by the application in normal use.
import { readFileSync } from 'node:fs';
const real = globalThis.fetch;
let generated = 0;
globalThis.fetch = async (url, options = {}) => {
  const text = String(url);
  if (text.startsWith('http://127.0.0.1')) return real(url, options);
  if (text.includes('whoami-v2')) {
    const token = options.headers.Authorization;
    return new Response(JSON.stringify(token === 'Bearer hf_savedtest' ? {name:'saved-account'} : token === 'Bearer hf_newtest' ? {name:'new-account'} : {}), {status: token === 'Bearer hf_invalid' ? 401 : 200});
  }
  if (text.endsWith('/gradio_api/info')) return Response.json({generate_image:true});
  if (text.endsWith('/gradio_api/upload')) return Response.json(['/tmp/test.jpg']);
  if (text.endsWith('/config')) return Response.json({dependencies:[{id:4,api_name:'generate_image'}]});
  if (text.endsWith('/queue/join')) return Response.json({event_id:'job'});
  if (text.includes('/queue/data')) {
    const event = generated++ === 0 ? {msg:'process_completed',event_id:'job',success:true,output:{data:[{url:'https://yanze-pulid-flux.hf.space/test-image.png'}]}} : {msg:'process_completed',event_id:'job',success:false,output:{error:'You have exceeded your ZeroGPU quota (60s requested vs. 0s left)'}};
    return new Response('data: '+JSON.stringify(event)+'\n\n',{headers:{'Content-Type':'text/event-stream'}});
  }
  if(text.endsWith('/test-image.png')) return new Response(Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScLbtAAAAABJRU5ErkJggg==','base64'),{headers:{'Content-Type':'image/png'}});
  throw new Error('Unexpected test request '+text);
};
