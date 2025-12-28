import React from 'react';
import logoImage from '../plannotator.webp';

interface LandingProps {
  onEnter: () => void;
}

export const Landing: React.FC<LandingProps> = ({ onEnter }) => {
  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Nav */}
      <nav className="fixed top-0 left-0 right-0 h-12 flex items-center justify-between px-6 bg-background/80 backdrop-blur-sm border-b border-border/30 z-50">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-md bg-primary/20 flex items-center justify-center">
            <svg className="w-3.5 h-3.5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <span className="text-sm font-semibold tracking-tight">Plannotator</span>
        </div>
        <a
          href="https://github.com/anthropics/claude-code"
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          Claude Code Docs
        </a>
      </nav>

      {/* Content wrapper with vertical borders */}
      <div className="max-w-4xl mx-auto border-x border-border/30">
        {/* Hero */}
        <section className="pt-32 pb-20 px-8">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium mb-6">
              <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
              For Claude Code
            </div>

            <div className="flex items-center gap-6 mb-4">
              <h1 className="text-4xl md:text-5xl font-bold tracking-tight leading-[1.1]">
                Annotate plans.<br />
                <span className="text-muted-foreground">Not in the terminal.</span>
              </h1>
              <img
                src={logoImage}
                alt="Plannotator logo"
                className="w-20 h-20 md:w-24 md:h-24 object-contain shrink-0"
              />
            </div>

            <p className="text-lg text-muted-foreground mb-8 max-w-lg">
              A visual interface for reviewing Claude Code plans. Select text, add feedback, export structured annotations that Claude understands.
            </p>

            <button
              onClick={onEnter}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-primary text-primary-foreground font-medium hover:opacity-90 transition-opacity"
            >
              Open Editor
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </button>
          </div>
        </section>

        {/* Problem → Solution */}
        <section className="py-16 px-8 border-t border-border/30">
          <div className="grid md:grid-cols-2 gap-8 max-w-2xl">
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">The Problem</h3>
              <p className="text-foreground/90">
                Claude Code shows plans in the terminal. You read them, approve or deny, but giving specific feedback means typing everything out. Hard to reference exact sections.
              </p>
            </div>
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">The Solution</h3>
              <p className="text-foreground/90">
                Select the exact text you want to change. Mark it for deletion, add a comment, or suggest a replacement. Export as structured feedback Claude can act on.
              </p>
            </div>
          </div>
        </section>

        {/* Privacy */}
        <section className="py-16 px-8 border-t border-border/30">
          <div className="flex items-start gap-4 max-w-2xl">
            <div className="w-10 h-10 rounded-lg bg-secondary/10 flex items-center justify-center shrink-0">
              <svg className="w-5 h-5 text-secondary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <div>
              <h3 className="font-semibold mb-1">Runs locally. Your data stays private.</h3>
              <p className="text-muted-foreground text-sm">
                No server. No network requests. Plannotator is a lightweight, local HTML page that runs in your browser. Plans never leave your machine.
              </p>
            </div>
          </div>
        </section>

        {/* Preview */}
        <section className="py-16 px-8 border-t border-border/30">
          <h2 className="text-xl font-semibold mb-8 text-center">What it looks like</h2>

          {/* App Preview */}
          <div className="rounded-xl border border-border/50 bg-card/50 overflow-hidden shadow-2xl">
            {/* Mock Header */}
            <div className="h-10 bg-card/80 border-b border-border/30 flex items-center px-4 gap-2">
              <div className="flex gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full bg-destructive/60" />
                <div className="w-2.5 h-2.5 rounded-full bg-accent/60" />
                <div className="w-2.5 h-2.5 rounded-full bg-secondary/60" />
              </div>
              <div className="flex-1 flex justify-center">
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <div className="w-4 h-4 rounded bg-primary/20" />
                  <span>Plannotator</span>
                </div>
              </div>
              <div className="w-16" />
            </div>

            {/* Mock Content */}
            <div className="flex h-80">
              {/* Document Area */}
              <div className="flex-1 p-6 bg-background/50 flex items-start justify-center">
                <div className="w-full max-w-sm bg-card rounded-lg border border-border/30 p-5 shadow-lg">
                  {/* Mock heading */}
                  <div className="h-3 w-3/4 bg-foreground/80 rounded mb-4" />

                  {/* Mock paragraph */}
                  <div className="space-y-2 mb-4">
                    <div className="h-2 w-full bg-muted-foreground/30 rounded" />
                    <div className="h-2 w-5/6 bg-muted-foreground/30 rounded" />
                    <div className="flex items-center gap-1">
                      <div className="h-2 w-1/4 bg-muted-foreground/30 rounded" />
                      <div className="h-2 w-1/3 bg-destructive/40 rounded line-through" />
                      <div className="h-2 w-1/6 bg-muted-foreground/30 rounded" />
                    </div>
                  </div>

                  {/* Mock subheading */}
                  <div className="h-2.5 w-1/2 bg-foreground/60 rounded mb-3 mt-5" />

                  {/* Mock list */}
                  <div className="space-y-2 mb-4">
                    <div className="flex items-center gap-2">
                      <div className="w-1 h-1 rounded-full bg-primary/60" />
                      <div className="h-2 w-4/5 bg-muted-foreground/30 rounded" />
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-1 h-1 rounded-full bg-primary/60" />
                      <div className="h-2 w-2/3 bg-accent/40 rounded border-b border-accent" />
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-1 h-1 rounded-full bg-primary/60" />
                      <div className="h-2 w-3/4 bg-muted-foreground/30 rounded" />
                    </div>
                  </div>

                  {/* Mock code block */}
                  <div className="bg-muted/50 rounded p-2 space-y-1.5">
                    <div className="h-1.5 w-1/2 bg-primary/40 rounded" />
                    <div className="h-1.5 w-2/3 bg-muted-foreground/30 rounded" />
                    <div className="h-1.5 w-1/3 bg-secondary/40 rounded" />
                  </div>
                </div>
              </div>

              {/* Mock Sidebar */}
              <div className="w-48 border-l border-border/30 bg-card/30 p-3">
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-3 flex items-center justify-between">
                  <span>Annotations</span>
                  <span className="bg-muted px-1.5 py-0.5 rounded text-[9px]">2</span>
                </div>

                {/* Mock annotation cards */}
                <div className="space-y-2">
                  <div className="p-2 rounded-md border border-destructive/30 bg-destructive/5">
                    <div className="flex items-center gap-1 mb-1.5">
                      <div className="w-3 h-3 rounded bg-destructive/20" />
                      <span className="text-[9px] font-semibold text-destructive uppercase">Delete</span>
                    </div>
                    <div className="h-1.5 w-full bg-muted rounded" />
                  </div>

                  <div className="p-2 rounded-md border border-accent/30 bg-accent/5">
                    <div className="flex items-center gap-1 mb-1.5">
                      <div className="w-3 h-3 rounded bg-accent/20" />
                      <span className="text-[9px] font-semibold text-accent uppercase">Comment</span>
                    </div>
                    <div className="h-1.5 w-3/4 bg-muted rounded mb-1" />
                    <div className="h-1.5 w-full bg-accent/20 rounded" />
                  </div>
                </div>
              </div>
            </div>
          </div>

          <p className="text-center text-sm text-muted-foreground mt-6">
            Select text → annotate → export feedback
          </p>
        </section>

        {/* How it works */}
        <section className="py-16 px-8 border-t border-border/30 bg-card/30">
          <h2 className="text-xl font-semibold mb-8">How it works</h2>

          <div className="space-y-6 max-w-2xl">
            <Step num={1} title="Hook into ExitPlanMode">
              <code className="text-xs bg-muted px-2 py-1 rounded font-mono">
                ExitPlanMode → opens Plannotator with plan content
              </code>
            </Step>

            <Step num={2} title="Annotate visually">
              Select text → choose action (delete, comment) → annotations appear in the sidebar
            </Step>

            <Step num={3} title="Export feedback">
              Structured markdown that Claude Code understands. Paste it back, Claude revises the plan.
            </Step>
          </div>
        </section>

        {/* Technical */}
        <section className="py-16 px-8 border-t border-border/30 bg-card/30">
          <h2 className="text-xl font-semibold mb-6">Technical details</h2>
          <ul className="space-y-2 text-sm text-muted-foreground max-w-2xl">
            <li className="flex items-center gap-2">
              <span className="text-primary">•</span>
              Single HTML file build — easy to distribute
            </li>
            <li className="flex items-center gap-2">
              <span className="text-primary">•</span>
              Uses Claude Code hooks (PreToolUse/PostToolUse)
            </li>
            <li className="flex items-center gap-2">
              <span className="text-primary">•</span>
              Plan content injected at runtime via shell script
            </li>
            <li className="flex items-center gap-2">
              <span className="text-primary">•</span>
              React + Tailwind + Vite — hackable
            </li>
          </ul>
        </section>

        {/* Footer */}
        <footer className="py-8 px-8 border-t border-border/30 text-center">
          <p className="text-xs text-muted-foreground">
            Built for Claude Code users who want better plan reviews.
          </p>
        </footer>
      </div>
    </div>
  );
};

const Step: React.FC<{ num: number; title: string; children: React.ReactNode }> = ({ num, title, children }) => (
  <div className="flex gap-4">
    <div className="w-7 h-7 rounded-full bg-primary/10 text-primary text-sm font-semibold flex items-center justify-center shrink-0">
      {num}
    </div>
    <div>
      <h4 className="font-medium mb-1">{title}</h4>
      <p className="text-sm text-muted-foreground">{children}</p>
    </div>
  </div>
);
