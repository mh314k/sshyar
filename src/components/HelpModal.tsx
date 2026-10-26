import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Search, X } from "lucide-react";
import { filterHelpSections } from "../lib/helpContent";
import { APP_VERSION } from "../lib/version";
import { iconStroke } from "./IconButton";

interface Props {
  open: boolean;
  onClose: () => void;
}

export function HelpModal({ open, onClose }: Props) {
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const sections = useMemo(() => filterHelpSections(query), [query]);

  useEffect(() => {
    if (!open) return;
    setQuery("");
    const t = window.setTimeout(() => inputRef.current?.focus(), 30);
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => {
      window.clearTimeout(t);
      window.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  if (!open) return null;

  return createPortal(
    <div
      className="help-overlay"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="help-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="help-modal-title"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <header className="help-header">
          <div className="help-header-text">
            <h2 id="help-modal-title">Help</h2>
            <p className="muted">SSHyar v{APP_VERSION} — features and how to use them</p>
          </div>
          <button type="button" className="help-close" onClick={onClose} title="Close" aria-label="Close">
            <X size={18} strokeWidth={iconStroke} />
          </button>
        </header>

        <div className="help-search">
          <Search size={15} strokeWidth={iconStroke} className="help-search-icon" aria-hidden />
          <input
            ref={inputRef}
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search help… e.g. sftp, paste, vault, snippet"
            autoComplete="off"
            spellCheck={false}
          />
          {query ? (
            <button type="button" className="help-search-clear" onClick={() => setQuery("")}>
              Clear
            </button>
          ) : null}
        </div>

        <div className="help-body">
          {sections.length === 0 ? (
            <p className="help-empty muted">No topics match “{query}”.</p>
          ) : (
            sections.map((section) => (
              <section key={section.id} className="help-section" id={`help-${section.id}`}>
                <h3 className="help-section-title">{section.title}</h3>
                <p className="help-section-summary muted">{section.summary}</p>
                {section.blocks.map((block) => (
                  <article key={block.id} className="help-block">
                    <h4 className="help-block-title">{block.title}</h4>
                    <ol className="help-steps">
                      {block.steps.map((step, i) => (
                        <li key={i}>{step}</li>
                      ))}
                    </ol>
                  </article>
                ))}
              </section>
            ))
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}
