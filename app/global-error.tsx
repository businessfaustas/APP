"use client";

import { useEffect } from "react";

import { reportClientError } from "@/lib/analytics/client";

/**
 * Last-resort screen when the root layout itself fails. It replaces the whole document, so it
 * brings its own markup and styles (no app CSS, no translations available here).
 */
export default function GlobalError({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  useEffect(() => {
    reportClientError(error, { digest: error.digest });
  }, [error]);
  return (
    <html lang="en">
      <head>
        <title>Something went wrong · FlagBid</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <style>{`
          body{margin:0;min-height:100dvh;display:grid;place-items:center;padding:24px;text-align:center;font:16px/1.5 system-ui,-apple-system,Segoe UI,sans-serif;background:#f8f9fb;color:#14151c}
          @media (prefers-color-scheme:dark){body{background:#13141c;color:#e8e9f0}p{color:#a5a8b8}}
          h1{font-size:1.5rem;margin:0 0 .5rem}p{margin:.25rem 0;color:#5b5e70}
          button,a{display:inline-block;margin:16px 6px 0;padding:10px 18px;border-radius:999px;border:1px solid #5a6bf2;font:inherit;cursor:pointer;text-decoration:none}
          button{background:#5a6bf2;color:#fff}a{color:inherit}
        `}</style>
      </head>
      <body>
        <main role="alert">
          <h1>Something went wrong</h1>
          <p>We hit an unexpected problem. It has been reported and we&apos;ll look into it. Your data is safe.</p>
          {error.digest && <p style={{ fontFamily: "monospace", fontSize: 12 }}>Reference: {error.digest}</p>}
          <button type="button" onClick={() => retry()}>
            Try again
          </button>
          {/* A plain link on purpose: this screen replaces the whole document, so there is no router to use. */}
          {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
          <a href="/">Back to home</a>
        </main>
      </body>
    </html>
  );
}
