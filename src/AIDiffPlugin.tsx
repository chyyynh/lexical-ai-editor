import { $convertFromMarkdownString, type Transformer } from '@lexical/markdown';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { $createParagraphNode, $getRoot } from 'lexical';
import { useEffect, useRef } from 'react';
import { $clearDiffHighlights, $collectBlockTexts, $highlightChangedBlocks, $insertDeletedBlocks } from './diff-ops';

const DEFAULT_HIGHLIGHT_MS = 3000;
const FADE_OUT_MS = 600;
const DEFAULT_TAG = 'ai-diff';

export interface AIDiffRequest {
  /** The new markdown content to diff against the current editor state. */
  newMarkdown: string;
}

export interface AIDiffPluginProps {
  /** Pass a diff request to trigger the diff pipeline. Set to `null` to idle. */
  diff: AIDiffRequest | null;
  /** Markdown transformers used to parse `newMarkdown` into Lexical nodes. */
  transformers: Transformer[];
  /** How long highlights stay visible before fading out. Default: 3000ms. */
  highlightDurationMs?: number;
  /** CSS classes to add to highlights during fade-out. Default: `['diff-fade-out']`. */
  fadeOutClasses?: string[];
  /** Editor update tag applied to diff operations. Default: `'ai-diff'`. */
  tag?: string;
  /** Called after diff highlights are applied to the editor. */
  onApplied?: () => void;
  /** Called after highlights are cleared (fade-out complete). */
  onCleared?: () => void;
}

export function AIDiffPlugin({
  diff,
  transformers,
  highlightDurationMs = DEFAULT_HIGHLIGHT_MS,
  fadeOutClasses = ['diff-fade-out'],
  tag = DEFAULT_TAG,
  onApplied,
  onCleared,
}: AIDiffPluginProps) {
  const [editor] = useLexicalComposerContext();
  const isApplying = useRef(false);

  useEffect(() => {
    if (!diff || isApplying.current) return;
    isApplying.current = true;

    // 1. Apply new markdown and highlight diffs
    editor.update(
      () => {
        const oldBlockTexts = $collectBlockTexts();

        const root = $getRoot();
        root.clear();
        $convertFromMarkdownString(diff.newMarkdown, transformers);
        if (root.getChildrenSize() === 0) root.append($createParagraphNode());

        const newBlockTexts = $collectBlockTexts();
        $highlightChangedBlocks(oldBlockTexts);
        $insertDeletedBlocks(oldBlockTexts, newBlockTexts);
      },
      { tag },
    );

    onApplied?.();

    // 2. Fade out highlights after duration (scoped to this editor)
    const fadeTimer = setTimeout(() => {
      const root = editor.getRootElement();
      if (!root) return;
      root.querySelectorAll('.diff-inserted, .diff-deleted').forEach((el) => {
        for (const cls of fadeOutClasses) el.classList.add(cls);
      });
    }, highlightDurationMs);

    // 3. Clear highlights from Lexical tree after fade completes
    const clearTimer = setTimeout(
      () => {
        editor.update(() => $clearDiffHighlights(), { tag });
        isApplying.current = false;
        onCleared?.();
      },
      highlightDurationMs + FADE_OUT_MS,
    );

    return () => {
      clearTimeout(fadeTimer);
      clearTimeout(clearTimer);
      isApplying.current = false;
    };
  }, [editor, diff, transformers, highlightDurationMs, fadeOutClasses, tag, onApplied, onCleared]);

  return null;
}
