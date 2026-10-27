import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import CloseIcon from "@mui/icons-material/Close";
import SearchIcon from "@mui/icons-material/Search";
import { HELP_SECTIONS, filterHelpSections } from "../../lib/helpContent";
import { APP_VERSION } from "../../lib/version";
import { iconProps } from "../../components/IconButton";

interface Props {
  open: boolean;
  onClose: () => void;
}

export function HelpModal({ open, onClose }: Props) {
  const [query, setQuery] = useState("");
  const [activeId, setActiveId] = useState(HELP_SECTIONS[0]?.id ?? "start");
  const inputRef = useRef<HTMLInputElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);

  const sections = useMemo(() => filterHelpSections(query), [query]);

  const active = useMemo(() => {
    const hit = sections.find((s) => s.id === activeId);
    return hit ?? sections[0] ?? null;
  }, [sections, activeId]);

  useEffect(() => {
    if (!open) return;
    setQuery("");
    setActiveId(HELP_SECTIONS[0]?.id ?? "start");
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

  useEffect(() => {
    if (!sections.length) return;
    if (!sections.some((s) => s.id === activeId)) {
      setActiveId(sections[0].id);
    }
  }, [sections, activeId]);

  useEffect(() => {
    bodyRef.current?.scrollTo({ top: 0 });
  }, [active?.id, query]);

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
            <p className="muted">v{APP_VERSION}</p>
          </div>
          <div className="help-search">
            <SearchIcon {...iconProps(15)} className="help-search-icon" aria-hidden />
            <input
              ref={inputRef}
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search… sftp, vault, docker, paste"
              autoComplete="off"
              spellCheck={false}
              aria-label="Search help"
            />
            {query ? (
              <button type="button" className="help-search-clear" onClick={() => setQuery("")}>
                Clear
              </button>
            ) : null}
          </div>
          <button type="button" className="help-close" onClick={onClose} title="Close" aria-label="Close">
            <CloseIcon {...iconProps(18)} />
          </button>
        </header>

        <div className="help-layout">
          <nav className="help-nav" aria-label="Topics">
            {sections.length === 0 ? (
              <p className="help-nav-empty muted">No matches</p>
            ) : (
              sections.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  className={`help-nav-item${active?.id === s.id ? " is-active" : ""}`}
                  onClick={() => setActiveId(s.id)}
                  aria-current={active?.id === s.id ? "page" : undefined}
                >
                  <span className="help-nav-title">{s.title}</span>
                  <span className="help-nav-blurb muted">{s.summary}</span>
                </button>
              ))
            )}
          </nav>

          <div className="help-body" ref={bodyRef}>
            {!active ? (
              <p className="help-empty muted">No topics match “{query}”.</p>
            ) : (
              <>
                <header className="help-topic-head">
                  <h3 className="help-section-title">{active.title}</h3>
                  <p className="help-section-summary muted">{active.summary}</p>
                </header>
                {active.blocks.map((block) => (
                  <article key={block.id} className="help-block">
                    <h4 className="help-block-title">{block.title}</h4>
                    <ul className="help-steps">
                      {block.steps.map((step, i) => (
                        <li key={i}>{step}</li>
                      ))}
                    </ul>
                    {block.tip ? <p className="help-tip">{block.tip}</p> : null}
                  </article>
                ))}
              </>
            )}
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
