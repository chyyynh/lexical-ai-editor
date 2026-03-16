// =============================================================================
// Node
// =============================================================================
export { DiffHighlightNode, $createDiffHighlightNode, $isDiffHighlightNode } from './DiffHighlightNode';
export type { DiffType, SerializedDiffHighlightNode } from './DiffHighlightNode';

// =============================================================================
// Tree operations (must be called inside editor.update() or editorState.read())
// =============================================================================
export { $collectBlockTexts, $highlightChangedBlocks, $insertDeletedBlocks, $clearDiffHighlights } from './diff-ops';

// =============================================================================
// Selection operations
// =============================================================================
export { $captureSelection, $getSelectedText, $replaceSelection } from './selection-ops';
export type { SavedSelection } from './selection-ops';

// =============================================================================
// React plugins
// =============================================================================
export { AIDiffPlugin } from './AIDiffPlugin';
export type { AIDiffPluginProps, AIDiffRequest } from './AIDiffPlugin';

// =============================================================================
// React hooks
// =============================================================================
export { useAIEdit, DEFAULT_PRESETS } from './useAIEdit';
export type { UseAIEditOptions, UseAIEditReturn, AIEditPreset } from './useAIEdit';
