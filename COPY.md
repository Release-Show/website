# COPY.md: every factual claim on release.show, and what backs it

release.show is in early access and has no public product repository yet, so
the source for most claims is the product brief: the Claude Design canvas
`release.show Landing v2 White.dc.html` (claude.ai/design project
`9ee8b43e-5b76-472b-9be0-fb4c4fd5ccc8`), checked on 2026-10-02. When the
product ships, replace "brief" with the file or page that backs each line, and
change the page wherever the product differs.

## Status

| Claim | Status | Source |
| :--- | :--- | :--- |
| In early access; sign-up by waitlist | True | This repository; the form posts to the waitlist |
| Your first video is free | Brief | Canvas finale: "get your first video free" |
| Launch pricing for early access | Brief | Canvas `TICKETS` and `ADDONS` |

## Product

| Claim | Status | Source |
| :--- | :--- | :--- |
| Turns GitHub releases, merged PRs and website changes into 30 to 90 second videos | Brief | Canvas hero |
| Branded, captioned, ready to post | Brief | Canvas hero |
| AI avatar presenters, blog posts, release widgets, social posts, email digests | Brief | Canvas hero chips, reel 06 |
| Detects new releases, PRs and site changes | Brief | Canvas reel 04, act two |
| 16:9, 1:1 and 9:16 from one render | Brief | Canvas `FRAMES[3]` |
| Weekly recap episode every Friday | Brief | Canvas `FRAMES[5]` |
| Public channel page per project; changelog embed with one script tag | Brief | Canvas `FRAMES[6]`, reel 06 widget |
| Avatars by HeyGen | Brief | Canvas `FRAMES[4]`, credits |
| Integrations: GitHub, GitLab, Linear, Vercel, your website, HeyGen | Brief | Canvas credits |

## Removed from the canvas

| What | Why |
| :--- | :--- |
| Two "Customer quote placeholder" testimonials | No customers yet. Invent nothing |
| Four "Customer logo" slots ("In association with") | Same |
| "Connect GitHub" as the call to action | The connect flow is not public; every CTA leads to early access |
| "Follow channel" button on reel 07 | Nothing to follow; the channel shown is an illustration |
| Logos loaded from cdn.simpleicons.org and google.com/s2/favicons | Vendored to `assets/logos/` so the page makes no third-party requests besides Google Fonts |
