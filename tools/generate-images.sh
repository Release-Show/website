#!/usr/bin/env bash
# Generates the page's photographic stills with the Higgsfield API and writes
# them to assets/img/*.webp. The prompts live in tools/higgsfield/images.ts.
#
#     tools/generate-images.sh            generate every still that is missing
#     tools/generate-images.sh presenter  (re)generate one still by name
#
# Needs bun, cwebp (brew install webp) and HF_CREDENTIALS (key-id:key-secret)
# in tools/higgsfield/.env.local, which git ignores. Each still is one billable
# request. Then run tools/render-og.sh: the OG card and banner use the stills.
set -euo pipefail
cd "$(dirname "$0")/higgsfield"
bun install --frozen-lockfile --silent
exec bun run images.ts "$@"
