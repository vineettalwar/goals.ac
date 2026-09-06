import type { ContentPieceDetail } from "./types";

// ---------------------------------------------------------------------------
// Save payload (public — re-exported via content-piece-ui → index)
// ---------------------------------------------------------------------------

export type ContentPieceSavePayload = {
  title: string;
  bodyMarkdown: string;
  status?: "draft" | "ready";
  plannedDate?: string | null;
};

// ---------------------------------------------------------------------------
// Draft key — stable string that identifies whether the server piece changed
// ---------------------------------------------------------------------------

export function pieceDraftKey(piece: ContentPieceDetail): string {
  return `${piece.id}:${piece.title}:${piece.bodyMarkdown ?? ""}:${piece.status}:${piece.plannedDate ?? ""}`;
}

// ---------------------------------------------------------------------------
// Edit-time status — published pieces are not editable, so we only track draft|ready
// ---------------------------------------------------------------------------

function editableStatusDraft(status: string): "draft" | "ready" {
  return status === "ready" ? "ready" : "draft";
}

// ---------------------------------------------------------------------------
// Editor state + reducer
// ---------------------------------------------------------------------------

export type EditorState = {
  editing: boolean;
  previewMode: boolean;
  copied: boolean;
  titleDraft: string;
  bodyDraft: string;
  statusDraft: "draft" | "ready";
  plannedDateDraft: string;
  draftKey: string;
};

export type EditorAction =
  | { type: "sync"; piece: ContentPieceDetail }
  /** Apply server piece into drafts even while editing (stock image attach). */
  | { type: "apply_remote"; piece: ContentPieceDetail }
  | { type: "start_edit" }
  | { type: "toggle_preview" }
  | { type: "set_title"; value: string }
  | { type: "set_body"; value: string }
  | { type: "set_status"; value: "draft" | "ready" }
  | { type: "set_planned_date"; value: string }
  | { type: "cancel"; piece: ContentPieceDetail }
  | { type: "saved"; piece: ContentPieceDetail }
  | { type: "copied" }
  | { type: "clear_copied" };

export function createEditorState(piece: ContentPieceDetail): EditorState {
  return {
    editing: false,
    previewMode: false,
    copied: false,
    titleDraft: piece.title,
    bodyDraft: piece.bodyMarkdown ?? "",
    statusDraft: editableStatusDraft(piece.status),
    plannedDateDraft: piece.plannedDate ?? "",
    draftKey: pieceDraftKey(piece),
  };
}

export function editorReducer(state: EditorState, action: EditorAction): EditorState {
  switch (action.type) {
    case "sync": {
      const nextKey = pieceDraftKey(action.piece);
      if (state.editing || state.draftKey === nextKey) return state;
      return {
        ...state,
        titleDraft: action.piece.title,
        bodyDraft: action.piece.bodyMarkdown ?? "",
        statusDraft: editableStatusDraft(action.piece.status),
        plannedDateDraft: action.piece.plannedDate ?? "",
        draftKey: nextKey,
      };
    }
    case "apply_remote":
      return {
        ...state,
        // Stock attach updates body/metadata; keep other drafts while editing.
        titleDraft: state.editing ? state.titleDraft : action.piece.title,
        bodyDraft: action.piece.bodyMarkdown ?? "",
        statusDraft: state.editing
          ? state.statusDraft
          : editableStatusDraft(action.piece.status),
        plannedDateDraft: state.editing
          ? state.plannedDateDraft
          : (action.piece.plannedDate ?? ""),
        draftKey: pieceDraftKey(action.piece),
      };
    case "start_edit":
      return { ...state, editing: true, previewMode: false };
    case "toggle_preview":
      return { ...state, previewMode: !state.previewMode };
    case "set_title":
      return { ...state, titleDraft: action.value };
    case "set_body":
      return { ...state, bodyDraft: action.value };
    case "set_status":
      return { ...state, statusDraft: action.value };
    case "set_planned_date":
      return { ...state, plannedDateDraft: action.value };
    case "cancel":
      return createEditorState(action.piece);
    case "saved":
      return {
        ...state,
        editing: false,
        previewMode: false,
        draftKey: pieceDraftKey({
          ...action.piece,
          title: state.titleDraft.trim() || action.piece.title,
          bodyMarkdown: state.bodyDraft,
          status: state.statusDraft,
          plannedDate: state.plannedDateDraft.trim() || null,
        }),
      };
    case "copied":
      return { ...state, copied: true };
    case "clear_copied":
      return { ...state, copied: false };
    default:
      return state;
  }
}
