import { useEffect, useMemo, useState } from "react";
import CodeMirror from "@uiw/react-codemirror";
import { EditorView } from "@codemirror/view";
import { oneDark } from "@codemirror/theme-one-dark";
import { Eye, Pencil, RotateCcw, Save, X } from "lucide-react";
import { api } from "../lib/api";
import { appConfirm } from "../lib/dialogs";
import { languageForPath } from "../lib/editorLang";
import type { ThemeMode } from "../lib/theme";
import { IconButton, iconStroke } from "./IconButton";

export type FileEditorMode = "view" | "edit";

interface Props {
  sftpId: string;
  path: string;
  mode: FileEditorMode;
  theme?: ThemeMode;
  onClose: () => void;
  onSaved?: () => void;
}

export function RemoteFileEditor({
  sftpId,
  path,
  mode: initialMode,
  theme = "dark",
  onClose,
  onSaved,
}: Props) {
  const [mode, setMode] = useState<FileEditorMode>(initialMode);
  const [content, setContent] = useState("");
  const [original, setOriginal] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const name = path.split("/").pop() || path;
  const dirty = content !== original;

  const lang = useMemo(() => languageForPath(path), [path]);

  const extensions = useMemo(() => {
    const exts = [
      EditorView.lineWrapping,
      EditorView.theme({
        "&": { height: "100%", maxHeight: "100%", fontSize: "13px" },
        ".cm-scroller": {
          overflow: "auto !important",
          fontFamily: "var(--mono)",
        },
        ".cm-content": { padding: "0.75rem 0" },
        ".cm-gutters": { border: "none" },
      }),
    ];
    if (lang) exts.push(lang.extension);
    if (theme === "dark") exts.push(oneDark);
    return exts;
  }, [lang, theme]);

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
        void requestClose();
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

  async function requestClose() {
    if (mode === "edit" && dirty) {
      const ok = await appConfirm({
        title: "Discard unsaved changes?",
        message: "Your edits will be lost.",
        confirmLabel: "Discard",
        danger: true,
      });
      if (!ok) return;
    }
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
    <div className="file-editor-overlay" onMouseDown={() => void requestClose()}>
      <div
        className="file-editor"
        onMouseDown={(e) => e.stopPropagation()}
        role="dialog"
        aria-label={name}
      >
        <div className="file-editor-header">
          <div className="file-editor-title">
            <strong className="file-editor-mode">
              {mode === "view" ? (
                <Eye size={14} strokeWidth={iconStroke} />
              ) : (
                <Pencil size={14} strokeWidth={iconStroke} />
              )}
              {mode === "view" ? "View" : "Edit"}
            </strong>
            <span className="file-editor-path" title={path}>
              {name}
            </span>
            {lang ? <span className="file-editor-lang">{lang.name}</span> : null}
            {dirty && mode === "edit" && <span className="file-editor-dirty">●</span>}
          </div>
          <div className="file-editor-actions">
            {mode === "view" ? (
              <IconButton
                variant="ghost"
                label="Edit"
                icon={<Pencil size={14} strokeWidth={iconStroke} />}
                onClick={() => setMode("edit")}
              />
            ) : (
              <>
                <IconButton
                  variant="ghost"
                  label="Revert"
                  disabled={!dirty}
                  icon={<RotateCcw size={14} strokeWidth={iconStroke} />}
                  onClick={() => setContent(original)}
                />
                <IconButton
                  variant="primary"
                  label={saving ? "Saving…" : "Save"}
                  disabled={saving || !dirty}
                  icon={<Save size={14} strokeWidth={iconStroke} />}
                  onClick={() => void save()}
                />
              </>
            )}
            <IconButton
              variant="icon"
              title="Close"
              icon={<X size={15} strokeWidth={iconStroke} />}
              onClick={() => void requestClose()}
            />
          </div>
        </div>
        {loading ? (
          <div className="file-editor-status">Loading…</div>
        ) : error && !content ? (
          <div className="file-editor-status error">{error}</div>
        ) : (
          <div className={`file-editor-cm ${mode === "view" ? "is-readonly" : ""}`}>
            <CodeMirror
              value={content}
              height="100%"
              maxHeight="100%"
              theme={theme === "dark" ? "dark" : "light"}
              extensions={extensions}
              basicSetup={{
                lineNumbers: true,
                foldGutter: true,
                highlightActiveLine: mode === "edit",
                highlightSelectionMatches: true,
                bracketMatching: true,
                autocompletion: false,
                searchKeymap: true,
              }}
              editable={mode === "edit"}
              readOnly={mode === "view"}
              onChange={(v) => {
                if (mode === "edit") setContent(v);
              }}
            />
          </div>
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
