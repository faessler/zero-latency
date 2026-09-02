# Zero Latency

A fancy single-article website for the **Zero Latency** blog post. The article
content is authored in a Google Doc and loaded at runtime via an environment
variable, so the copy can be edited without a redeploy. The page ends with a
call-to-action to back a Kickstarter for a data center in the Swiss Alps.

Built to deploy on **Vercel**.

## Stack

- [Next.js](https://nextjs.org/) 14 (App Router) + React 18 + TypeScript
- [Tailwind CSS](https://tailwindcss.com/) for styling
- [Framer Motion](https://www.framer.com/motion/) for animations (scroll-triggered
  reveals, playful floaters, animated counters — **no scroll hijacking**, native
  scrolling throughout)
- [cheerio](https://cheerio.js.org/) to parse the Google Doc HTML export

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

## Environment variables

| Variable                      | Required | Description                                  |
| ----------------------------- | -------- | -------------------------------------------- |
| `GOOGLE_DOC_URL`              | No\*     | Public Google Doc link with the article.     |
| `NEXT_PUBLIC_KICKSTARTER_URL` | No       | Link used by the closing Kickstarter button. |

\*Without it, the sample article is shown. See `.env.example`.

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
