import {
  $applyNodeReplacement,
  type EditorConfig,
  ElementNode,
  type LexicalNode,
  type LexicalUpdateJSON,
  type NodeKey,
  type SerializedElementNode,
} from 'lexical';

export type DiffType = 'deleted' | 'inserted';

export interface SerializedDiffHighlightNode extends SerializedElementNode {
  diffType: DiffType;
  diffId: string;
}

export class DiffHighlightNode extends ElementNode {
  __diffType: DiffType;
  __diffId: string;

  static getType(): string {
    return 'diff-highlight';
  }

  static clone(node: DiffHighlightNode): DiffHighlightNode {
    return new DiffHighlightNode(node.__diffType, node.__diffId, node.__key);
  }

  constructor(diffType: DiffType, diffId: string, key?: NodeKey) {
    super(key);
    this.__diffType = diffType;
    this.__diffId = diffId;
  }

  createDOM(config: EditorConfig): HTMLElement {
    const span = document.createElement('span');
    const cls = (config.theme.diffHighlight as Record<string, string> | undefined)?.[this.__diffType];
    if (cls) span.className = cls;
    return span;
  }

  updateDOM(): boolean {
    return false;
  }

  isInline(): boolean {
    return true;
  }

  canInsertTextBefore(): boolean {
    return false;
  }

  canInsertTextAfter(): boolean {
    return false;
  }

  canBeEmpty(): boolean {
    return false;
  }

  getDiffType(): DiffType {
    return this.__diffType;
  }

  getDiffId(): string {
    return this.__diffId;
  }

  static importJSON(json: SerializedDiffHighlightNode): DiffHighlightNode {
    return $createDiffHighlightNode(json.diffType, json.diffId);
  }

  exportJSON(): SerializedDiffHighlightNode {
    return {
      ...super.exportJSON(),
      type: 'diff-highlight',
      diffType: this.__diffType,
      diffId: this.__diffId,
    };
  }

  updateFromJSON(json: LexicalUpdateJSON<SerializedDiffHighlightNode>): this {
    return super.updateFromJSON(json).setDiffType(json.diffType).setDiffId(json.diffId);
  }

  setDiffType(diffType: DiffType): this {
    const self = this.getWritable();
    self.__diffType = diffType;
    return self;
  }

  setDiffId(diffId: string): this {
    const self = this.getWritable();
    self.__diffId = diffId;
    return self;
  }
}

export function $createDiffHighlightNode(diffType: DiffType, diffId: string): DiffHighlightNode {
  return $applyNodeReplacement(new DiffHighlightNode(diffType, diffId));
}

export function $isDiffHighlightNode(node: LexicalNode | null | undefined): node is DiffHighlightNode {
  return node instanceof DiffHighlightNode;
}
