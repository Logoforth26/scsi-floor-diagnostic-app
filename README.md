# SCSI Floor Diagnostic App

A Next.js app for Southern Cleaning Services Inc. that lets a user upload a floor photo, add facility context, and receive an AI-generated floor condition diagnostic report.

## Why this version is safer

The original HTML called Anthropic directly from the browser. That is not safe because it exposes your API key and usually fails in production because of browser/CORS restrictions.

This version sends the photo to a server-side API route:

`/app/api/analyze-floor/route.js`

Your Anthropic API key stays private in `.env.local`.

## Setup

1. Install dependencies:

```bash
npm install
```

2. Create `.env.local`:

```bash
ANTHROPIC_API_KEY=your_real_key_here
```

3. Run locally:

```bash
npm run dev
```

4. Open:

```bash
http://localhost:3000
```

## Deploy

Recommended: Vercel.

Add this environment variable in Vercel:

```bash
ANTHROPIC_API_KEY
```

Then deploy the repo.