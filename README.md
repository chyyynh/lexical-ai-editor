# lexical-ai-tools

AI editing toolkit for [Lexical](https://lexical.dev) — selection rewrite, inline diff preview, accept/reject.

- **Provider-agnostic** — bring your own AI API (OpenAI, Anthropic, local models, whatever)
- **Headless** — no UI included, you build the toolbar
- **Small** — ~10KB, zero runtime dependencies beyond Lexical peer deps
- **TypeScript-first** — full type definitions with JSDoc

## Install

```bash
pnpm add lexical-ai-tools
```

Peer dependencies: `lexical`, `@lexical/react`, `@lexical/markdown`, `react`

## Quick Start

### 1. Register the node

```tsx
import { DiffHighlightNode } from 'lexical-ai-tools';

const editorConfig = {
  nodes: [DiffHighlightNode, ...otherNodes],
  theme: {
    // Style the diff highlights however you want
    diffHighlight: {
      inserted: 'bg-green-100 text-green-900',
      deleted: 'bg-red-100 text-red-900 line-through',
    },
  },
};
```

### 2. AI Rewrite — `useAIEdit`

Select text → call your AI → result replaces the selection.

```tsx
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { useAIEdit } from 'lexical-ai-tools';

function AIToolbar() {
  const [editor] = useLexicalComposerContext();

  const { isProcessing, selectedText, presets, rewrite, rewriteWithPreset } = useAIEdit({
    editor,
    onRewrite: async (text, instruction) => {
      // Call YOUR API — this package doesn't care which provider you use
      const res = await fetch('/api/rewrite', {
        method: 'POST',
        body: JSON.stringify({ text, instruction }),
      });
      const data = await res.json();
      return data.result;
    },
    onError: (err) => console.error('Rewrite failed:', err),
    tag: 'ai-rewrite', // filter this in your OnChangePlugin
  });

  if (!selectedText) return null;

  return (
    <div>
      {presets.map((p) => (
        <button key={p.id} disabled={isProcessing} onClick={() => rewriteWithPreset(p.id)}>
          {p.label}
        </button>
      ))}
      <button disabled={isProcessing} onClick={() => rewrite('Translate to Japanese')}>
        Custom
      </button>
    </div>
  );
}
```

### 3. Diff Preview — `AIDiffPlugin`

Show what changed when AI rewrites the whole document.

```tsx
import { AIDiffPlugin } from 'lexical-ai-tools';
import { TRANSFORMERS } from '@lexical/markdown';

function EditorPlugins() {
  const [pendingDiff, setPendingDiff] = useState(null);

  return (
    <>
      {/* Your other plugins... */}
      <AIDiffPlugin
        diff={pendingDiff}
        transformers={TRANSFORMERS}
        highlightDurationMs={3000}
        tag="ai-diff"
        onApplied={() => console.log('Diff applied')}
        onCleared={() => setPendingDiff(null)}
      />
    </>
  );
}

// Trigger from anywhere:
setPendingDiff({ newMarkdown: '# Updated content\n\nAI rewrote this.' });
```

### 4. Low-level operations

For full control, use the `$`-prefixed functions directly inside `editor.update()`:

```tsx
import {
  $captureSelection,
  $getSelectedText,
  $replaceSelection,
  $collectBlockTexts,
  $highlightChangedBlocks,
  $insertDeletedBlocks,
  $clearDiffHighlights,
} from 'lexical-ai-tools';

// Capture selection before async work
let saved;
editor.getEditorState().read(() => {
  saved = $captureSelection();
});

// After AI responds, apply the result
editor.update(() => {
  $replaceSelection(saved, aiResult);
});
```

## CSS

The package doesn't ship CSS. Add your own styles for the diff highlights:

```css
/* Inserted text */
.diff-inserted {
  background: rgba(34, 197, 94, 0.15);
  border-bottom: 2px solid rgba(34, 197, 94, 0.4);
}

/* Deleted text */
.diff-deleted {
  background: rgba(239, 68, 68, 0.15);
  text-decoration: line-through;
  opacity: 0.6;
}

/* Fade-out animation (applied before clearing) */
.diff-fade-out {
  transition: opacity 0.6s ease;
  opacity: 0;
}
```

Or use Tailwind classes in the theme config (see Quick Start step 1).

## API Reference

### Plugins

| Export | Type | Description |
|---|---|---|
| `AIDiffPlugin` | React component | Diff preview with auto-highlight and fade |

### Hooks

| Export | Type | Description |
|---|---|---|
| `useAIEdit` | React hook | Selection-based rewrite lifecycle |
| `DEFAULT_PRESETS` | `AIEditPreset[]` | Built-in English presets (improve, shorten, expand, formal, casual) |

### Selection operations (`$`-prefixed, call inside `editor.update()`)

| Export | Description |
|---|---|
| `$captureSelection()` | Snapshot current range selection |
| `$getSelectedText()` | Get selected text content |
| `$replaceSelection(saved, text)` | Replace saved selection with new text |

### Diff operations (`$`-prefixed, call inside `editor.update()`)

| Export | Description |
|---|---|
| `$collectBlockTexts()` | Get text of each root-level block |
| `$highlightChangedBlocks(oldTexts)` | Wrap changed blocks in DiffHighlightNode |
| `$insertDeletedBlocks(oldTexts, newTexts)` | Insert deleted block placeholders |
| `$clearDiffHighlights()` | Remove all diff highlights (unwrap inserted, remove deleted) |

### Node

| Export | Description |
|---|---|
| `DiffHighlightNode` | Custom ElementNode for inline diff highlighting |
| `$createDiffHighlightNode(type, id)` | Create a diff highlight node |
| `$isDiffHighlightNode(node)` | Type guard |

### Types

| Export | Description |
|---|---|
| `DiffType` | `'inserted' \| 'deleted'` |
| `SavedSelection` | Serializable selection snapshot |
| `AIDiffRequest` | `{ newMarkdown: string }` |
| `AIEditPreset` | `{ id, label, instruction }` |

## License

MIT
