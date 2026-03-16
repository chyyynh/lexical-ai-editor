/**
 * Headless React hook for AI-powered text rewriting in Lexical.
 *
 * Manages the full lifecycle: capture selection → call your AI → apply result.
 * Provider-agnostic — you supply the async rewrite function.
 *
 * @example
 * ```tsx
 * function MyToolbar() {
 *   const [editor] = useLexicalComposerContext();
 *
 *   const { isProcessing, rewrite, selectedText } = useAIEdit({
 *     editor,
 *     onRewrite: async (text, instruction) => {
 *       const res = await fetch('/api/rewrite', {
 *         method: 'POST',
 *         body: JSON.stringify({ text, instruction }),
 *       });
 *       const data = await res.json();
 *       return data.result;
 *     },
 *   });
 *
 *   return (
 *     <button
 *       disabled={isProcessing || !selectedText}
 *       onClick={() => rewrite('Make it shorter')}
 *     >
 *       Shorten
 *     </button>
 *   );
 * }
 * ```
 */

import { $getSelection, $isRangeSelection, type LexicalEditor } from 'lexical';
import { useCallback, useEffect, useRef, useState } from 'react';
import { type SavedSelection, $captureSelection, $replaceSelection } from './selection-ops';

/** Preset for common rewrite operations. */
export interface AIEditPreset {
  /** Unique identifier. */
  id: string;
  /** Display label. */
  label: string;
  /** Instruction passed to the AI provider. */
  instruction: string;
}

/**
 * Built-in English presets. Override with your own via `useAIEdit({ presets })`.
 */
export const DEFAULT_PRESETS: AIEditPreset[] = [
  { id: 'improve', label: 'Improve writing', instruction: 'Improve the writing quality and clarity' },
  { id: 'shorter', label: 'Make shorter', instruction: 'Make this text more concise while preserving the meaning' },
  { id: 'longer', label: 'Make longer', instruction: 'Expand this text with more detail and explanation' },
  { id: 'formal', label: 'More formal', instruction: 'Rewrite in a formal, professional tone' },
  { id: 'casual', label: 'More casual', instruction: 'Rewrite in a casual, friendly tone' },
];

export interface UseAIEditOptions {
  /** The Lexical editor instance. */
  editor: LexicalEditor;

  /**
   * Your AI rewrite function. Receives the selected text and an instruction string.
   * Return the rewritten text. Throw to signal an error.
   *
   * This is where you call your own API — the hook doesn't care which AI provider you use.
   */
  onRewrite: (selectedText: string, instruction: string) => Promise<string>;

  /**
   * Called when rewrite fails. If not provided, errors are silently logged.
   */
  onError?: (error: unknown) => void;

  /**
   * Editor update tag applied when replacing text. Default: `'ai-rewrite'`.
   * Use this to filter out AI changes in your OnChangePlugin or autosave logic.
   */
  tag?: string;

  /** Available presets. Default: `DEFAULT_PRESETS`. */
  presets?: AIEditPreset[];
}

export interface UseAIEditReturn {
  /** Whether an AI operation is currently in progress. */
  isProcessing: boolean;

  /** The currently selected text (empty string if no selection). */
  selectedText: string;

  /** The saved selection snapshot. `null` when nothing is selected. */
  savedSelection: SavedSelection | null;

  /** Available presets (from options or defaults). */
  presets: AIEditPreset[];

  /**
   * Trigger a rewrite on the current selection.
   *
   * @param instruction - Free-form instruction for the AI, e.g. "Make it shorter"
   * @returns The rewritten text, or `null` if the operation failed.
   */
  rewrite: (instruction: string) => Promise<string | null>;

  /**
   * Trigger a rewrite using a preset ID.
   *
   * @param presetId - One of the preset IDs.
   * @returns The rewritten text, or `null` if the operation failed.
   */
  rewriteWithPreset: (presetId: string) => Promise<string | null>;

  /**
   * Manually refresh the selected text / saved selection state.
   * Normally this is tracked automatically via selection change listener.
   */
  refreshSelection: () => void;
}

export function useAIEdit({
  editor,
  onRewrite,
  onError,
  tag = 'ai-rewrite',
  presets = DEFAULT_PRESETS,
}: UseAIEditOptions): UseAIEditReturn {
  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedText, setSelectedText] = useState('');
  const savedSelectionRef = useRef<SavedSelection | null>(null);

  // Track selection changes — only setState when selection actually changes
  const prevTextRef = useRef('');
  useEffect(() => {
    return editor.registerUpdateListener(({ editorState }) => {
      editorState.read(() => {
        const sel = $getSelection();
        if (!$isRangeSelection(sel) || sel.isCollapsed()) {
          if (prevTextRef.current !== '') {
            prevTextRef.current = '';
            setSelectedText('');
            savedSelectionRef.current = null;
          }
          return;
        }
        const text = sel.getTextContent();
        if (text !== prevTextRef.current) {
          prevTextRef.current = text;
          setSelectedText(text);
          savedSelectionRef.current = $captureSelection();
        }
      });
    });
  }, [editor]);

  const refreshSelection = useCallback(() => {
    editor.getEditorState().read(() => {
      const sel = $getSelection();
      if (!$isRangeSelection(sel) || sel.isCollapsed()) {
        setSelectedText('');
        savedSelectionRef.current = null;
        return;
      }
      setSelectedText(sel.getTextContent());
      savedSelectionRef.current = $captureSelection();
    });
  }, [editor]);

  const isProcessingRef = useRef(false);
  const rewrite = useCallback(
    async (instruction: string): Promise<string | null> => {
      const saved = savedSelectionRef.current;
      const text = prevTextRef.current;

      if (!saved || !text || isProcessingRef.current) return null;

      isProcessingRef.current = true;
      setIsProcessing(true);
      try {
        const result = await onRewrite(text, instruction);

        editor.update(
          () => {
            $replaceSelection(saved, result);
          },
          { tag },
        );

        return result;
      } catch (error) {
        if (onError) {
          onError(error);
        } else {
          console.error('[useAIEdit] Rewrite failed:', error);
        }
        return null;
      } finally {
        isProcessingRef.current = false;
        setIsProcessing(false);
      }
    },
    [editor, onRewrite, onError, tag],
  );

  const rewriteWithPreset = useCallback(
    async (presetId: string): Promise<string | null> => {
      const preset = presets.find((p) => p.id === presetId);
      if (!preset) {
        console.warn(`[useAIEdit] Preset "${presetId}" not found`);
        return null;
      }
      return rewrite(preset.instruction);
    },
    [presets, rewrite],
  );

  return {
    isProcessing,
    selectedText,
    savedSelection: savedSelectionRef.current,
    presets,
    rewrite,
    rewriteWithPreset,
    refreshSelection,
  };
}
