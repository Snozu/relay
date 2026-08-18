"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

/**
 * The agent writes Markdown. Rendering it as literal asterisks is the fastest
 * way to make a demo look unfinished.
 */
export function Markdown({ children }: { children: string }) {
  return (
    <div className="text-[15px] leading-relaxed">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          p: ({ children }) => <p className="mb-3 last:mb-0">{children}</p>,
          strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
          ul: ({ children }) => <ul className="mb-3 space-y-1 last:mb-0">{children}</ul>,
          ol: ({ children }) => <ol className="mb-3 space-y-1 last:mb-0">{children}</ol>,
          li: ({ children }) => (
            <li className="relative pl-4 before:absolute before:left-1 before:top-[0.6em] before:size-1 before:rounded-full before:bg-border-strong">
              {children}
            </li>
          ),
          code: ({ children }) => (
            <code className="rounded bg-surface-muted px-1 py-0.5 font-mono text-[13px]">
              {children}
            </code>
          ),
          a: ({ children, href }) => (
            <a href={href} className="text-accent underline underline-offset-2">
              {children}
            </a>
          ),
          h1: ({ children }) => <h3 className="mb-2 font-semibold">{children}</h3>,
          h2: ({ children }) => <h3 className="mb-2 font-semibold">{children}</h3>,
          h3: ({ children }) => <h3 className="mb-2 font-semibold">{children}</h3>,
          table: ({ children }) => (
            <div className="scroll-x mb-3">
              <table className="w-full border-collapse text-[13px]">{children}</table>
            </div>
          ),
          th: ({ children }) => (
            <th className="border-b border-border px-2 py-1 text-left font-medium">{children}</th>
          ),
          td: ({ children }) => (
            <td className="border-b border-border/60 px-2 py-1 align-top">{children}</td>
          ),
        }}
      >
        {children}
      </ReactMarkdown>
    </div>
  );
}
