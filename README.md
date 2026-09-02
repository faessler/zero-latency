# Zero Latency

A fancy single-article website for the **Zero Latency** blog post. The article
content is authored in a Google Doc and loaded at runtime via an environment
variable, so the copy can be edited without a redeploy. The page ends with a
built-in **backer program**: visitors pledge an amount in CHF and leave their
contact details, which are encrypted and stored in Vercel Blob.

Built to deploy on **Vercel**.

## Stack

- [Next.js](https://nextjs.org/) 14 (App Router) + React 18 + TypeScript
- [Tailwind CSS](https://tailwindcss.com/) for styling
- [Framer Motion](https://www.framer.com/motion/) for animations (scroll-triggered
  reveals, scroll-independent floating tech icons, animated counters — **no scroll
  hijacking**, native scrolling throughout)
- [cheerio](https://cheerio.js.org/) to parse the Google Doc HTML export
- [@vercel/blob](https://vercel.com/docs/storage/vercel-blob) as the pledge store
- Node `crypto` (AES-256-GCM) to encrypt pledge PII at rest

## Content: Google Doc

Set `GOOGLE_DOC_URL` to a **publicly viewable** Google Doc. Supported URL shapes:

- `https://docs.google.com/document/d/<DOC_ID>/edit`
- `https://docs.google.com/document/d/e/<PUBLISHED_ID>/pub` (File → Share → Publish to web)
- any direct URL returning the exported HTML (handy for local testing)

The doc must be shared as **"Anyone with the link can view"**. Headings,
paragraphs, bold/italic, links, bullet lists and images are parsed into clean,
animated blocks. Images embedded by Google are served through a same-origin proxy
at `/api/image`.

If `GOOGLE_DOC_URL` is unset or the fetch fails, the site renders bundled sample
content so it always works.

## Backer program (pledges)

The closing section lets visitors pledge an amount in CHF and submit their first
name, last name, email and phone number.

- Submissions `POST` to `/api/pledge`, which validates the input server-side.
- **PII is encrypted with AES-256-GCM** using `PLEDGE_ENCRYPTION_KEY` before it
  ever touches storage. The pledge amount and timestamp are kept in clear text so
  aggregate stats never require decrypting personal data.
- Records are written to **Vercel Blob** with `access: "private"`
  (`pledges/<id>.json`). When `BLOB_READ_WRITE_TOKEN` is not present (local dev),
  encrypted records are written to `./.data/pledges` instead, so the full flow is
  testable offline.

Generate an encryption key with:

```bash
openssl rand -base64 32
```

## Environment variables

| Variable                  | Required | Description                                                        |
| ------------------------- | -------- | ------------------------------------------------------------------ |
| `GOOGLE_DOC_URL`          | No\*     | Public Google Doc link with the article.                           |
| `PLEDGE_ENCRYPTION_KEY`   | Yes\*\*  | 32-byte key (base64/hex/passphrase) used to encrypt pledge PII.    |
| `BLOB_READ_WRITE_TOKEN`   | Yes\*\*  | Vercel Blob token. Without it, dev falls back to local files.      |
| `BLOB_STORE_ID`           | No       | Vercel Blob store id.                                              |
| `BLOB_WEBHOOK_PUBLIC_KEY` | No       | Public key for verifying Vercel Blob webhooks.                     |
| `PLEDGE_LOCAL_DIR`        | No       | Override the local dev pledge directory (default `./.data/pledges`). |

\*Without it, the sample article is shown. See `.env.example`.
\*\*Required in production for the backer program to store pledges.

## Getting started

```bash
npm install
npm run dev        # http://localhost:3000
```

## Scripts

| Command         | Description                          |
| --------------- | ------------------------------------ |
| `npm run dev`   | Start the Next.js dev server          |
| `npm run build` | Production build (what Vercel runs)   |
| `npm start`     | Serve the production build            |
| `npm test`      | Run the parser unit tests (Vitest)    |
| `npm run lint`  | Lint with ESLint / Next               |

## Deploying to Vercel

Import the repo into Vercel, set `GOOGLE_DOC_URL` (and optionally
`NEXT_PUBLIC_KICKSTARTER_URL`) in Project → Settings → Environment Variables, and
deploy. No extra configuration required.
