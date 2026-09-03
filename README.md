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
- Node `crypto` (X25519 + HKDF-SHA256 + AES-256-GCM) for public-key encryption of
  pledge PII — the server can only encrypt, never decrypt

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
- **PII is sealed with public-key encryption** (X25519 → HKDF-SHA256 →
  AES-256-GCM) using `PLEDGE_PUBLIC_KEY`. Each record uses a fresh ephemeral key,
  so **the deployed app can only encrypt — it never holds a key that can decrypt**.
  Only your offline **private** key can open pledges. The amount and timestamp are
  kept in clear text so aggregate stats never require decrypting personal data.
- Records are written to **Vercel Blob** with `access: "private"`
  (`pledges/<id>.json`). When `BLOB_READ_WRITE_TOKEN` is not present (local dev),
  sealed records are written to `./.data/pledges` instead, so the full flow is
  testable offline.

### Generate your keypair

```bash
openssl genpkey -algorithm X25519 -out pledge_private.pem
openssl pkey -in pledge_private.pem -pubout -out pledge_public.pem

# Put the PUBLIC key in the app (single-line friendly):
base64 -i pledge_public.pem            # paste into PLEDGE_PUBLIC_KEY (or paste the PEM directly)
```

Keep `pledge_private.pem` **offline** — never deploy it. If you lose it, sealed
pledges are unrecoverable.

### Read pledges (offline, on your machine)

```bash
# Local dev store (./.data/pledges):
npm run decrypt -- --key pledge_private.pem

# Production (Vercel Blob): also export BLOB_READ_WRITE_TOKEN and BLOB_STORE_ID
BLOB_READ_WRITE_TOKEN=... BLOB_STORE_ID=... npm run decrypt -- --key pledge_private.pem --json
```

## Environment variables

| Variable                  | Where       | Description                                                          |
| ------------------------- | ----------- | ------------------------------------------------------------------- |
| `GOOGLE_DOC_URL`          | app         | Public Google Doc link with the article (optional\*).               |
| `PLEDGE_PUBLIC_KEY`       | app         | X25519 **public** key used to seal pledge PII (encrypt-only).       |
| `BLOB_READ_WRITE_TOKEN`   | app         | Vercel Blob token. Without it, dev falls back to local files.       |
| `BLOB_STORE_ID`           | app         | Vercel Blob store id (used to read private blobs back).             |
| `BLOB_WEBHOOK_PUBLIC_KEY` | app         | Public key for verifying Vercel Blob webhooks (optional).           |
| `PLEDGE_PRIVATE_KEY(_FILE)` | **offline** | X25519 private key for the decrypt tool. **Never deploy this.**    |
| `PLEDGE_LOCAL_DIR`        | dev         | Override the local dev pledge directory (default `./.data/pledges`). |

\*Without `GOOGLE_DOC_URL`, the sample article is shown. `PLEDGE_PUBLIC_KEY` +
`BLOB_READ_WRITE_TOKEN` are required in production for the backer program.

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
