import { test } from "node:test";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { once } from "node:events";

test("OpenAI flow preserves completed stickers and exposes remaining work", async () => {
  let child: ReturnType<typeof spawn> | undefined;
  const origin = "http://127.0.0.1:3197";

  const start = async () => {
    child = spawn(
      process.execPath,
      ["--import", pathToFileURL(path.resolve("test-provider.mjs")).href, "--import", "tsx", "server.ts"],
      {
        env: { ...process.env, OPENAI_API_KEY: "sk-test", PORT: "3197", NODE_ENV: "production" },
        stdio: ["ignore", "pipe", "pipe"],
        windowsHide: true,
      },
    );

    for (let i = 0; i < 100; i++) {
      try {
        if ((await fetch(origin + "/api/health")).ok) return;
      } catch {}
      await new Promise((resolve) => setTimeout(resolve, 100));
    }

    throw new Error("Server did not start");
  };

  const stop = async () => {
    if (!child) return;
    const closed = once(child, "close");
    child.kill();
    await closed;
    child = undefined;
  };

  const post = (body: unknown) =>
    fetch(origin + "/api/generate-stickers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

  try {
    await start();

    const health = await (await fetch(origin + "/api/health")).json();
    assert.equal(health.imageProvider, "openai");
    assert.equal(health.configured, true);

    const batch = await post({
      image: "data:image/jpeg;base64,YQ==",
      count: 3,
      style: "photo_real",
    });

    assert.equal(batch.status, 200);
    const result = await batch.json();
    assert.equal(result.stickers.length, 1);
    assert.equal(result.stickers[0].id, "sticker_1");
    assert.deepEqual(result.remaining, [1, 2]);

    const invalidStyle = await post({
      image: "data:image/jpeg;base64,YQ==",
      count: 1,
      style: "not-a-style",
    });
    assert.equal(invalidStyle.status, 400);

    const missingImage = await post({ count: 1, style: "photo_real" });
    assert.equal(missingImage.status, 400);
  } finally {
    await stop();
  }
});
