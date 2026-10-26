import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import CloseIcon from "@mui/icons-material/Close";
import SearchIcon from "@mui/icons-material/Search";
import { HELP_SECTIONS, filterHelpSections } from "../lib/helpContent";
import { APP_VERSION } from "../lib/version";
import { iconProps } from "./IconButton";

interface Props {
  open: boolean;
  onClose: () => void;
}

export function HelpModal({ open, onClose }: Props) {
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);
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

  function jumpTo(id: string) {
    setQuery("");
    requestAnimationFrame(() => {
      const el = document.getElementById(`help-${id}`);
      el?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }

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
            <CloseIcon {...iconProps(18)} />
          </button>
        </header>

        <div className="help-search">
          <SearchIcon {...iconProps(15)} className="help-search-icon" aria-hidden />
          <input
            ref={inputRef}
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search help… e.g. sftp, paste, vault, zsh, timeout"
            autoComplete="off"
            spellCheck={false}
          />
          {query ? (
            <button type="button" className="help-search-clear" onClick={() => setQuery("")}>
              Clear
            </button>
          ) : null}
        </div>

        {!query ? (
          <div className="help-toc" aria-label="Topics">
            {HELP_SECTIONS.map((s) => (
              <button key={s.id} type="button" className="help-toc-chip" onClick={() => jumpTo(s.id)}>
                {s.title}
              </button>
            ))}
          </div>
        ) : null}

        <div className="help-body" ref={bodyRef}>
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
