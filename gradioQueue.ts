import { randomUUID } from "node:crypto";

// The simplified /call SSE can replace visible provider errors with null.
// Queue messages retain the actual error, including ZeroGPU quota failures.
export async function readQueueResult(response: Response, eventId: string): Promise<any[]> {
  if (!response.body) throw new Error("PuLID-FLUX queue không có response body.");
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let pending = "";
  try {
    while (true) {
      const { value, done } = await reader.read();
      pending += done ? decoder.decode() : decoder.decode(value, { stream: true });
      const lines = pending.split(/\r?\n/);
      pending = lines.pop() || "";
      if (done && pending) { lines.push(pending); pending = ""; }
      for (const line of lines) {
        if (!line.startsWith("data:")) continue;
        const event = JSON.parse(line.slice(5).trim());
        if (event.event_id !== eventId) continue;
        if (event.msg === "process_completed") {
          if (event.success === false || event.output?.error) {
            const detail = String(event.output?.error || "Provider generation failed");
            const quota = /quota/i.test(detail);
            throw Object.assign(new Error(quota
              ? `PuLID-FLUX đã hết quota GPU. ${detail}`
              : `PuLID-FLUX: ${detail}`), { status: quota ? 429 : 502 });
          }
          if (!Array.isArray(event.output?.data)) throw new Error("PuLID-FLUX queue trả kết quả không hợp lệ.");
          return event.output.data;
        }
      }
      if (done) throw new Error("PuLID-FLUX queue kết thúc trước khi có kết quả.");
    }
  } finally {
    await reader.cancel().catch(() => {});
    reader.releaseLock();
  }
}

export async function callGradioQueue(space: string, endpoint: string, data: unknown[], headers: Record<string, string>) {
  const signal = AbortSignal.timeout(5 * 60 * 1000);
  const configResponse = await fetch(`${space}/config`, { headers, signal });
  if (!configResponse.ok) throw new Error(`PuLID-FLUX config HTTP ${configResponse.status}`);
  const config: any = await configResponse.json();
  const fn = config.dependencies?.find((entry: any) => entry.api_name === endpoint);
  if (!Number.isInteger(fn?.id)) throw new Error(`PuLID-FLUX thiếu queue endpoint ${endpoint}.`);
  const session = randomUUID();
  const joined = await fetch(`${space}/gradio_api/queue/join`, {
    method: "POST", headers: { ...headers, "Content-Type": "application/json" }, signal,
    body: JSON.stringify({ data, fn_index: fn.id, session_hash: session }),
  });
  if (!joined.ok) throw Object.assign(new Error(`PuLID-FLUX queue HTTP ${joined.status}: ${(await joined.text()).slice(0, 700)}`), { status: joined.status });
  const job: any = await joined.json();
  if (!job.event_id) throw new Error("PuLID-FLUX queue không trả event_id.");
  const response = await fetch(`${space}/gradio_api/queue/data?session_hash=${session}`, { headers, signal });
  if (!response.ok) throw new Error(`PuLID-FLUX queue result HTTP ${response.status}`);
  return readQueueResult(response, job.event_id);
}
