/**
 * Lexical selection utilities for AI text operations.
 *
 * All `$`-prefixed functions must be called inside `editor.update()` or `editorState.read()`.
 */

import {
  $createRangeSelection,
  $getNodeByKey,
  $getSelection,
  $isRangeSelection,
  $isTextNode,
  $setSelection,
} from 'lexical';

/**
 * Serializable snapshot of a Lexical range selection.
 * Captured before async AI operations so the selection can be restored afterwards.
 */
export interface SavedSelection {
  anchorKey: string;
  anchorOffset: number;
  focusKey: string;
  focusOffset: number;
}

/**
 * Capture the current range selection as a serializable object.
 * Returns `null` if there is no range selection or it is collapsed.
 *
 * Must be called inside `editor.update()` or `editorState.read()`.
 *
 * @example
 * ```ts
 * let saved: SavedSelection | null = null;
 * editor.getEditorState().read(() => {
 *   saved = $captureSelection();
 * });
 * ```
 */
export function $captureSelection(): SavedSelection | null {
  const sel = $getSelection();
  if (!$isRangeSelection(sel) || sel.isCollapsed()) return null;
  return {
    anchorKey: sel.anchor.key,
    anchorOffset: sel.anchor.offset,
    focusKey: sel.focus.key,
    focusOffset: sel.focus.offset,
  };
}

/**
 * Get the text content of the current range selection.
 * Returns an empty string if there is no valid range selection.
 *
 * Must be called inside `editor.update()` or `editorState.read()`.
 */
export function $getSelectedText(): string {
  const sel = $getSelection();
  if (!$isRangeSelection(sel) || sel.isCollapsed()) return '';
  return sel.getTextContent();
}

/**
 * Replace the text in a saved selection range with new text.
 * Handles both single-node and cross-node selections.
 *
 * Must be called inside `editor.update()`.
 *
 * @param saved - The selection snapshot captured before the async operation.
 * @param newText - The replacement text.
 * @returns `true` if the replacement succeeded, `false` if nodes were not found.
 *
 * @example
 * ```ts
 * editor.update(() => {
 *   $replaceSelection(savedSelection, rewrittenText);
 * }, { tag: 'ai-rewrite' });
 * ```
 */
export function $replaceSelection(saved: SavedSelection, newText: string): boolean {
  const anchorNode = $getNodeByKey(saved.anchorKey);
  const focusNode = $getNodeByKey(saved.focusKey);
  if (!anchorNode || !focusNode) return false;

  // Fast path: single text node — direct splice
  if (saved.anchorKey === saved.focusKey && $isTextNode(anchorNode)) {
    const text = anchorNode.getTextContent();
    const start = Math.min(saved.anchorOffset, saved.focusOffset);
    const end = Math.max(saved.anchorOffset, saved.focusOffset);
    anchorNode.setTextContent(text.slice(0, start) + newText + text.slice(end));
    return true;
  }

  // Cross-node: restore selection then use insertText
  const newSelection = $createRangeSelection();
  newSelection.anchor.set(saved.anchorKey, saved.anchorOffset, 'text');
  newSelection.focus.set(saved.focusKey, saved.focusOffset, 'text');
  $setSelection(newSelection);

  const sel = $getSelection();
  if ($isRangeSelection(sel)) {
    sel.insertText(newText);
    return true;
  }

  return false;
}
