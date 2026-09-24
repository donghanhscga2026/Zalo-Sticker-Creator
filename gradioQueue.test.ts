import { test } from "node:test";
import assert from "node:assert/strict";
import { readQueueResult } from "./gradioQueue";

function stream(text: string) {
  const bytes = new TextEncoder().encode(text);
  return new Response(new ReadableStream({start(controller) {
    // Exercise framing and UTF-8 decoding across arbitrary network chunks.
    for (let i=0;i<bytes.length;i+=7) controller.enqueue(bytes.slice(i,i+7));
    controller.close();
  }}));
}
test("preserves observed ZeroGPU quota error and exposes status 429", async () => {
  const event={msg:"process_completed",event_id:"job",success:false,output:{error:"You have exceeded your ZeroGPU quota (60s requested vs. 0s left)."}};
  await assert.rejects(readQueueResult(stream(`data: ${JSON.stringify(event)}\n\n`),"job"), (e:any)=>e.status===429 && /0s left/.test(e.message));
});
test("returns completed output after progress and ignores unrelated events", async()=>{
  const lines=[{msg:"process_starts",event_id:"job"},{msg:"process_completed",event_id:"other",success:false,output:{error:"irrelevant"}},{msg:"process_completed",event_id:"job",success:true,output:{data:[{path:"/tmp/image.png"},"43",[]]}}];
  assert.deepEqual(await readQueueResult(stream(lines.map(e=>`data: ${JSON.stringify(e)}\r\n\r\n`).join('')),"job"),[{path:"/tmp/image.png"},"43",[]]);
});
test("rejects truncated stream instead of reporting success",async()=>{
  await assert.rejects(readQueueResult(stream('data: {"msg":"process_starts","event_id":"job"}\n\n'),"job"),/kết thúc/);
});
test("preserves provider error even when success flag is absent",async()=>{
  await assert.rejects(readQueueResult(stream('data: {"msg":"process_completed","event_id":"job","output":{"error":"GPU unavailable"}}\n\n'),"job"),/GPU unavailable/);
});
