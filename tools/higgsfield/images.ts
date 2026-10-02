/* Generates the page's photographic stills with the Higgsfield API (Soul 2)
   and writes them to assets/img/<name>.webp, where releaseshow.css picks them
   up through the --img-* tokens at the top of the file.

       bun run images.ts             every still that is missing
       bun run images.ts presenter   (re)generate the named stills

   Credentials: HF_CREDENTIALS ("key-id:key-secret") in tools/higgsfield/.env.local,
   which Bun loads at startup and git ignores. Never commit it, never print it.
   Each still is one billable request. Needs cwebp (brew install webp).

   The prompts below are the source of truth for these images. Change a prompt,
   rerun for that name, commit both. Everything shown is generic: no real
   person, no real product UI, no logos, no on-image text. */

import { config, higgsfield, HiggsfieldError, NotEnoughCreditsError, AuthenticationError, TimeoutError } from '@higgsfield/client/v2';
import { mkdir, mkdtemp, rm, stat } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

const MODEL = 'higgsfield-ai/soul/v2/standard';
const OUT = resolve(import.meta.dir, '../../assets/img');

const STYLE = 'Warm cream and amber palette, soft film grain, shallow depth of field, cinematic 35mm still, editorial and calm. No text, no letters, no logos, no watermark.';

type Still = { prompt: string; aspect: '16:9' | '3:4'; width: number };

const STILLS: Record<string, Still> = {
  hero: {
    aspect: '16:9',
    width: 2400,
    prompt: `An empty vintage cinema at the moment before a premiere, seen from the back rows: rows of cream velvet seats, warm amber house lights dimming, a soft projector beam cutting through haze toward a blank screen. Bright, airy, high-key, lots of cream negative space in the centre of the frame. ${STYLE}`,
  },
  presenter: {
    aspect: '3:4',
    width: 1200,
    prompt: `Portrait of a friendly product presenter in their early thirties, wearing a simple dark crew-neck, speaking to camera mid-sentence with a relaxed smile, head and shoulders, centred, dark charcoal studio backdrop with a warm amber rim light from behind. Photorealistic. ${STYLE}`,
  },
  blog: {
    aspect: '16:9',
    width: 2400,
    prompt: `A laptop on a wooden desk at dusk showing an abstract software interface switching from light to dark mode, the screen split diagonally: left half cream, right half deep charcoal with amber accents. Abstract interface blocks only, nothing readable. Moody, warm practical lamp light. ${STYLE}`,
  },
  finale: {
    aspect: '16:9',
    width: 2400,
    prompt: `A cinema projector in a dark projection booth, seen from the side, its lens throwing a bright amber beam through drifting dust into darkness, film reels glowing at the edges. Mostly deep black with warm amber light. ${STYLE}`,
  },
};

const exists = (p: string) => stat(p).then(s => s.size > 0, () => false);

async function generate(name: string, still: Still, tmp: string): Promise<void> {
  const result = await higgsfield.subscribe(MODEL, {
    input: {
      prompt: still.prompt,
      aspect_ratio: still.aspect,
      resolution: '1080p',
      batch_size: 1,
      enhance_prompt: false,
    },
    withPolling: true,
  });

  // subscribe() resolves on every terminal state, not only success.
  if (result.status !== 'completed') {
    const why = result.status === 'nsfw' ? 'rejected by moderation' : result.status;
    throw new Error(`${name}: request ${result.request_id} ended ${why}`);
  }
  const url = result.images?.[0]?.url;
  if (!url) throw new Error(`${name}: request ${result.request_id} completed without an image`);

  const res = await fetch(url);
  if (!res.ok) throw new Error(`${name}: download failed (${res.status})`);
  const src = join(tmp, `${name}.src`);
  await Bun.write(src, res);

  const out = join(OUT, `${name}.webp`);
  const cwebp = Bun.spawnSync(['cwebp', '-quiet', '-q', '80', '-resize', String(still.width), '0', src, '-o', out]);
  if (cwebp.exitCode !== 0) throw new Error(`${name}: cwebp failed: ${cwebp.stderr.toString()}`);

  const kb = Math.round((await stat(out)).size / 1024);
  console.log(`${name.padEnd(10)} ${kb} KB  ${url}`);
}

async function main(): Promise<number> {
  const credentials = process.env.HF_CREDENTIALS;
  if (!credentials) {
    console.error('HF_CREDENTIALS is not set. Put it in tools/higgsfield/.env.local as key-id:key-secret.');
    return 1;
  }
  // A request can sit in the queue for good: on 2026-10-02 three of seven hung for
  // 15+ minutes while their retries finished in 2. Give up after 6 minutes and
  // rerun that name instead of waiting forever.
  config({ credentials, maxPollTime: 6 * 60 * 1000 });

  const asked = process.argv.slice(2);
  for (const n of asked) {
    if (!STILLS[n]) {
      console.error(`unknown still: ${n} (one of: ${Object.keys(STILLS).join(', ')})`);
      return 2;
    }
  }
  const names = asked.length ? asked : Object.keys(STILLS);

  await mkdir(OUT, { recursive: true });
  const tmp = await mkdtemp(join(tmpdir(), 'releaseshow-stills-'));
  let failed = 0;
  try {
    for (const name of names) {
      if (!asked.length && (await exists(join(OUT, `${name}.webp`)))) {
        console.log(`${name.padEnd(10)} exists, skipped`);
        continue;
      }
      console.log(`${name.padEnd(10)} generating (${STILLS[name].aspect})`);
      try {
        await generate(name, STILLS[name], tmp);
      } catch (err) {
        failed++;
        // The SDK's errors carry the HTTP detail, never the credentials.
        if (err instanceof NotEnoughCreditsError) console.error(`${name}: not enough credits on this API key`);
        else if (err instanceof TimeoutError) console.error(`${name}: still queued after 6 minutes; rerun: tools/generate-images.sh ${name}`);
        else if (err instanceof AuthenticationError) console.error(`${name}: the API key was rejected`);
        else if (err instanceof HiggsfieldError) console.error(`${name}: ${err.name}: ${err.message}`);
        else console.error(err instanceof Error ? err.message : String(err));
        if (err instanceof NotEnoughCreditsError || err instanceof AuthenticationError) break;
      }
    }
  } finally {
    await rm(tmp, { recursive: true, force: true });
  }
  return failed ? 1 : 0;
}

process.exit(await main());
