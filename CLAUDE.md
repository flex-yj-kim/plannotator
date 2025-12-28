# Plannotator

A plan review UI for Claude Code that intercepts `ExitPlanMode` and lets you approve or request changes with annotated feedback.

## How It Works

### Hook Flow

```
Claude calls ExitPlanMode
        │
        ▼
PermissionRequest hook fires
        │
        ▼
hooks/exit-plan-mode.sh reads plan from stdin JSON
        │
        ▼
Bun server starts (random port)
        │
        ▼
Browser opens to Plannotator UI
        │
        ▼
User reviews plan, optionally adds annotations
        │
        ├─── Approve ───► JSON output: {"decision": {"behavior": "allow"}}
        │                       │
        │                       ▼
        │                 Claude proceeds with implementation
        │
        └─── Request Changes ───► JSON output: {"decision": {"behavior": "deny", "message": "..."}}
                                       │
                                       ▼
                                 Claude receives feedback, revises plan
```

### Key Files

| File | Purpose |
|------|---------|
| `hooks/exit-plan-mode.sh` | Shell script invoked by Claude Code hook system |
| `server/index.ts` | Bun server that serves UI and handles approve/deny API |
| `App.tsx` | React app with API mode detection |
| `dist/index.html` | Built single-file app served by Bun |

### Hook Configuration

The hook is configured in `.claude/settings.local.json`:

```json
{
  "hooks": {
    "PermissionRequest": [
      {
        "matcher": "ExitPlanMode",
        "hooks": [
          {
            "type": "command",
            "command": "/path/to/planning-hook/hooks/exit-plan-mode.sh",
            "timeout": 600
          }
        ]
      }
    ]
  }
}
```

**Why PermissionRequest instead of PreToolUse?**

- `PermissionRequest` fires when Claude Code is about to show a permission dialog
- Hook can return JSON to `allow` or `deny` directly — no second dialog
- `PreToolUse` would require a second approval step in Claude Code UI

### Server API

The Bun server exposes three endpoints:

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/plan` | GET | Returns plan content as JSON |
| `/api/approve` | POST | User approved the plan |
| `/api/deny` | POST | User denied with feedback in request body |

### Multi-Instance Support

Each Plannotator instance runs on a random port (`Bun.serve({ port: 0 })`). The browser's same-origin policy ensures each tab talks to its own server — no cross-instance interference.

### Hook Output Format

The server outputs JSON to stdout for the PermissionRequest hook:

**Approve:**
```json
{
  "hookSpecificOutput": {
    "hookEventName": "PermissionRequest",
    "decision": {
      "behavior": "allow"
    }
  }
}
```

**Deny:**
```json
{
  "hookSpecificOutput": {
    "hookEventName": "PermissionRequest",
    "decision": {
      "behavior": "deny",
      "message": "# Plan Feedback\n\n..."
    }
  }
}
```

## Annotation Data Model

### Types (`types.ts`)

```typescript
enum AnnotationType {
  DELETION = 'DELETION',      // Remove this text
  INSERTION = 'INSERTION',    // Add new text (originalText is context)
  REPLACEMENT = 'REPLACEMENT', // Replace originalText with text
  COMMENT = 'COMMENT',        // Comment on originalText
}

interface Annotation {
  id: string;              // From web-highlighter or `codeblock-{timestamp}`
  blockId: string;         // References Block.id (legacy, for sorting)
  startOffset: number;     // Char offset in block (legacy)
  endOffset: number;       // End char offset (legacy)
  type: AnnotationType;
  text?: string;           // User text for comment/replacement/insertion
  originalText: string;    // The selected/highlighted text
  createdA: number;        // Timestamp for ordering
  author?: string;         // Tater identity for collaborative sharing
  startMeta?: { parentTagName, parentIndex, textOffset }; // web-highlighter DOM pos
  endMeta?: { parentTagName, parentIndex, textOffset };
}

interface Block {
  id: string;              // e.g., "block-0"
  type: 'paragraph' | 'heading' | 'blockquote' | 'list-item' | 'code' | 'hr';
  content: string;
  level?: number;          // For headings (1-6)
  order: number;
  startLine: number;       // 1-based line in original markdown
}
```

### Annotation Creation Flow

1. User selects text → `web-highlighter` fires `CREATE` event
2. In **selection mode**: Toolbar appears with type options
3. In **redline mode**: Auto-creates `DELETION` annotation
4. `createAnnotationFromSource()` builds `Annotation` object
5. Annotation stored in `App.tsx` state: `useState<Annotation[]>([])`

### Code Block Annotations

Code blocks can't use web-highlighter (content not directly selectable). Instead:
- Hover triggers `CodeBlockToolbar`
- Manual `<mark>` wrapper created with `range.surroundContents()`
- ID format: `codeblock-{timestamp}`
- Must handle removal separately via `data-bind-id` attribute

## URL-Based Sharing

Plannotator supports decentralized sharing via URL hash. The entire plan and annotations are compressed into the URL — no server storage required.

### Implementation

| File | Purpose |
|------|---------|
| `utils/sharing.ts` | Compress/decompress using native `CompressionStream` (deflate-raw) + base64url |
| `hooks/useSharing.ts` | URL state management, hash change detection |
| `components/ExportModal.tsx` | Tabbed modal with Share and Raw Diff tabs |

### Share Format

```typescript
interface SharePayload {
  p: string;  // Plan markdown
  a: ShareableAnnotation[];  // Minimal annotation tuples
}

// Annotations compressed to tuples: [type, originalText, text?, author?]
type ShareableAnnotation =
  | ['D', string, string | null]              // Deletion
  | ['R', string, string, string | null]      // Replacement
  | ['C', string, string, string | null]      // Comment
  | ['I', string, string, string | null];     // Insertion
```

### How It Works

**Sharing:**
1. User clicks Share → payload compressed with `deflate-raw` → base64url encoded
2. URL becomes `plannotator.app/#<compressed-data>`
3. Typical plan + annotations: ~1-2KB URL

**Loading:**
1. On mount, check `location.hash`
2. If present, decompress → restore plan and annotations
3. Find annotation text in DOM using `TreeWalker`
4. Apply `<mark>` highlights programmatically

### Tater Identity System

Anonymous identities for collaborative annotation:
- Format: `{adjective}-{noun}-tater` (e.g., "swift-falcon-tater")
- Generated via `unique-username-generator` library
- Stored in localStorage, shown on annotation cards
- Regenerate anytime in Settings

## Development

```bash
# Install dependencies
npm install

# Run dev server (for UI development)
npm run dev

# Build for production
npm run build

# Test server standalone
bun run server/index.ts "# Test Plan\n\nSome content"
```

## Requirements

- Bun runtime
- Claude Code with hooks support
- macOS (uses `open` command for browser)
