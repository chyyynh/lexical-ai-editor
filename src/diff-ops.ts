/**
 * Lexical tree operations for block-level diff highlighting.
 *
 * All `$`-prefixed functions must be called inside `editor.update()` or `editorState.read()`.
 */

import { $createParagraphNode, $createTextNode, $getRoot, $isElementNode, type LexicalNode } from 'lexical';
import { $createDiffHighlightNode, $isDiffHighlightNode } from './DiffHighlightNode';

/** Collect text content of each root-level block node. */
export function $collectBlockTexts(): string[] {
  return $getRoot()
    .getChildren()
    .map((c) => c.getTextContent());
}

/** Highlight blocks whose text differs from oldBlockTexts. */
export function $highlightChangedBlocks(oldBlockTexts: string[]): void {
  const oldBag = buildCountMap(oldBlockTexts);
  const root = $getRoot();
  let idx = 0;

  for (const child of root.getChildren()) {
    const text = child.getTextContent();
    const count = oldBag.get(text);
    if (count && count > 0) {
      oldBag.set(text, count - 1);
      continue;
    }
    $wrapBlockTextNodes(child, `diff-${idx++}`);
  }
}

/** Insert deleted block text at approximate positions. */
export function $insertDeletedBlocks(oldBlockTexts: string[], newBlockTexts: string[]): void {
  const newBag = buildCountMap(newBlockTexts);
  const root = $getRoot();
  const children = root.getChildren();
  let cursor = 0;

  for (const oldText of oldBlockTexts) {
    const count = newBag.get(oldText);
    if (count && count > 0) {
      newBag.set(oldText, count - 1);
      cursor = advanceCursor(children, oldText, cursor);
      continue;
    }
    insertDeletedParagraph(root, children, oldText, cursor);
  }
}

/** Remove all diff highlight nodes — unwrap inserted, remove deleted paragraphs. */
export function $clearDiffHighlights(): void {
  const root = $getRoot();

  // Pass 1: remove paragraphs that only contain deleted highlights
  for (const child of root.getChildren()) {
    if (!$isElementNode(child)) continue;
    const kids = child.getChildren();
    if (kids.length > 0 && kids.every((c) => $isDiffHighlightNode(c) && c.getDiffType() === 'deleted')) {
      child.remove();
    }
  }

  // Pass 2: unwrap inserted highlights (move children out)
  for (const tNode of root.getAllTextNodes()) {
    const parent = tNode.getParent();
    if (!$isDiffHighlightNode(parent) || parent.getDiffType() !== 'inserted') continue;
    for (const c of parent.getChildren()) parent.insertBefore(c);
    parent.remove();
  }
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function buildCountMap(texts: string[]): Map<string, number> {
  const map = new Map<string, number>();
  for (const t of texts) map.set(t, (map.get(t) ?? 0) + 1);
  return map;
}

function $wrapBlockTextNodes(block: LexicalNode, diffId: string): void {
  if (!$isElementNode(block)) return;
  for (const tNode of block.getAllTextNodes()) {
    if ($isDiffHighlightNode(tNode.getParent())) continue;
    const wrapper = $createDiffHighlightNode('inserted', diffId);
    tNode.insertBefore(wrapper);
    wrapper.append(tNode);
  }
}

function advanceCursor(children: LexicalNode[], text: string, from: number): number {
  for (let i = from; i < children.length; i++) {
    if (children[i].getTextContent() === text) return i + 1;
  }
  return from;
}

function insertDeletedParagraph(
  root: ReturnType<typeof $getRoot>,
  children: LexicalNode[],
  text: string,
  cursor: number,
): void {
  const para = $createParagraphNode();
  const wrapper = $createDiffHighlightNode('deleted', 'diff-del');
  wrapper.append($createTextNode(text));
  para.append(wrapper);

  if (cursor < children.length) {
    children[cursor].insertBefore(para);
  } else {
    root.append(para);
  }
}
