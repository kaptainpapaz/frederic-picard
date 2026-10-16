import type { ReactNode } from 'react'

export function PageHeader({ eyebrow, title, lead, action }: { eyebrow?: string; title: string; lead?: string; action?: ReactNode }) {
  return (
    <div className="mb-7 flex flex-wrap items-end justify-between gap-5">
      <div>
        {eyebrow ? <div className="eyebrow">{eyebrow}</div> : null}
        <h1 className="font-display mt-1 text-[32px] leading-none md:text-[38px]">{title}</h1>
        {lead ? <p className="mt-1.5 max-w-[60ch] text-sm text-muted-foreground">{lead}</p> : null}
      </div>
      {action}
    </div>
  )
}

export function Card({ children, title, className = '' }: { children: ReactNode; title?: string; className?: string }) {
  return (
    <div className={`grid gap-4 border border-border bg-background p-5 ${className}`}>
      {title ? <div className="eyebrow">{title}</div> : null}
      <div className="grid gap-4">{children}</div>
    </div>
  )
}

export function StatusPill({ tone, children }: { tone: 'ok' | 'warn' | 'bad' | 'muted'; children: ReactNode }) {
  const color = { ok: 'text-success border-success/40', warn: 'text-accent border-accent/40', bad: 'text-destructive border-destructive/40', muted: 'text-muted-foreground border-border' }[tone]
  return <span className={`border px-2 py-0.5 text-[10px] tracking-[0.14em] whitespace-nowrap uppercase ${color}`}>{children}</span>
}
