import { useEffect, useState } from "react";
import { api } from "../lib/api";

export type FileEditorMode = "view" | "edit";

interface Props {
  sftpId: string;
  path: string;
  mode: FileEditorMode;
  onClose: () => void;
  onSaved?: () => void;
}

export function RemoteFileEditor({ sftpId, path, mode: initialMode, onClose, onSaved }: Props) {
  const [mode, setMode] = useState<FileEditorMode>(initialMode);
  const [content, setContent] = useState("");
  const [original, setOriginal] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const name = path.split("/").pop() || path;
  const dirty = content !== original;

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError("");
    api
      .sftpReadText(sftpId, path)
      .then((text) => {
        if (cancelled) return;
        setContent(text);
        setOriginal(text);
      })
      .catch((err) => {
        if (!cancelled) setError(String(err));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [sftpId, path]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.preventDefault();
        requestClose();
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s" && mode === "edit") {
        e.preventDefault();
        void save();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, content, dirty]);

  function requestClose() {
    if (mode === "edit" && dirty && !confirm("Discard unsaved changes?")) return;
    onClose();
  }

  async function save() {
    setSaving(true);
    setError("");
    try {
      await api.sftpWriteText(sftpId, path, content);
      setOriginal(content);
      onSaved?.();
    } catch (err) {
      setError(String(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="file-editor-overlay" onMouseDown={requestClose}>
      <div
        className="file-editor"
        onMouseDown={(e) => e.stopPropagation()}
        role="dialog"
        aria-label={name}
      >
        <div className="file-editor-header">
          <div className="file-editor-title">
            <strong>{mode === "view" ? "View" : "Edit"}</strong>
            <span className="file-editor-path" title={path}>
              {name}
            </span>
            {dirty && mode === "edit" && <span className="file-editor-dirty">●</span>}
          </div>
          <div className="file-editor-actions">
            {mode === "view" ? (
              <button type="button" className="ghost" onClick={() => setMode("edit")}>
                Edit
              </button>
            ) : (
              <>
                <button
                  type="button"
                  className="ghost"
                  disabled={!dirty}
                  onClick={() => {
                    setContent(original);
                  }}
                >
                  Revert
                </button>
                <button type="button" onClick={() => void save()} disabled={saving || !dirty}>
                  {saving ? "Saving…" : "Save"}
                </button>
              </>
            )}
            <button type="button" className="ghost" onClick={requestClose}>
              Close
            </button>
          </div>
        </div>
        {loading ? (
          <div className="file-editor-status">Loading…</div>
        ) : error && !content ? (
          <div className="file-editor-status error">{error}</div>
        ) : (
          <textarea
            className="file-editor-body"
            value={content}
            readOnly={mode === "view"}
            spellCheck={false}
            onChange={(e) => setContent(e.target.value)}
          />
        )}
        {error && content ? <p className="error file-editor-footer-error">{error}</p> : null}
        <div className="file-editor-footer">
          <span className="muted">{path}</span>
          <span className="muted">
            {mode === "edit" ? "Ctrl+S save · Esc close" : "Esc close"}
          </span>
        </div>
      </div>
    </div>
  );
}
