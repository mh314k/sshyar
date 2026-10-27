import { useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
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

type Pos = { x: number; y: number };
type Size = { w: number; h: number };

const MIN_W = 560;
const MIN_H = 420;
const DEFAULT_W = 820;
const DEFAULT_H = 580;
const STORAGE_KEY = "sshyar.helpWindow";

function clampPos(pos: Pos, size: Size): Pos {
  const maxX = Math.max(8, window.innerWidth - size.w - 8);
  const maxY = Math.max(8, window.innerHeight - size.h - 8);
  return {
    x: Math.min(Math.max(8, pos.x), maxX),
    y: Math.min(Math.max(8, pos.y), maxY),
  };
}

function defaultPos(size: Size): Pos {
  return clampPos(
    {
      x: Math.round((window.innerWidth - size.w) / 2),
      y: Math.round((window.innerHeight - size.h) / 2),
    },
    size,
  );
}

function loadGeometry(): { pos: Pos; size: Size } {
  const size: Size = { w: DEFAULT_W, h: DEFAULT_H };
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as { x?: number; y?: number; w?: number; h?: number };
      if (typeof parsed.w === "number") size.w = Math.max(MIN_W, Math.min(parsed.w, window.innerWidth - 16));
      if (typeof parsed.h === "number") size.h = Math.max(MIN_H, Math.min(parsed.h, window.innerHeight - 16));
      if (typeof parsed.x === "number" && typeof parsed.y === "number") {
        return { pos: clampPos({ x: parsed.x, y: parsed.y }, size), size };
      }
    }
  } catch {
    /* ignore */
  }
  return { pos: defaultPos(size), size };
}

function saveGeometry(pos: Pos, size: Size) {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ ...pos, ...size }));
  } catch {
    /* ignore */
  }
}

export function HelpWindow({ open, onClose }: Props) {
  const [query, setQuery] = useState("");
  const [activeId, setActiveId] = useState(HELP_SECTIONS[0]?.id ?? "start");
  const [pos, setPos] = useState<Pos>(() => loadGeometry().pos);
  const [size, setSize] = useState<Size>(() => loadGeometry().size);
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);
  const posRef = useRef(pos);
  const sizeRef = useRef(size);
  const dragRef = useRef<{ ox: number; oy: number } | null>(null);
  const resizeRef = useRef<{ ox: number; oy: number; sw: number; sh: number } | null>(null);
  posRef.current = pos;
  sizeRef.current = size;

  const sections = useMemo(() => filterHelpSections(query), [query]);

  const active = useMemo(() => {
    const hit = sections.find((s) => s.id === activeId);
    return hit ?? sections[0] ?? null;
  }, [sections, activeId]);

  useEffect(() => {
    if (!open) return;
    const geo = loadGeometry();
    setPos(geo.pos);
    setSize(geo.size);
    setQuery("");
    setActiveId(HELP_SECTIONS[0]?.id ?? "start");
    const t = window.setTimeout(() => inputRef.current?.focus(), 40);
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

  useEffect(() => {
    if (!open) return;
    function onMove(e: PointerEvent) {
      if (dragRef.current) {
        const next = clampPos(
          {
            x: e.clientX - dragRef.current.ox,
            y: e.clientY - dragRef.current.oy,
          },
          sizeRef.current,
        );
        setPos(next);
      } else if (resizeRef.current) {
        const p = posRef.current;
        const nextSize: Size = {
          w: Math.max(
            MIN_W,
            Math.min(window.innerWidth - p.x - 8, resizeRef.current.sw + (e.clientX - resizeRef.current.ox)),
          ),
          h: Math.max(
            MIN_H,
            Math.min(window.innerHeight - p.y - 8, resizeRef.current.sh + (e.clientY - resizeRef.current.oy)),
          ),
        };
        setSize(nextSize);
      }
    }
    function onUp() {
      if (!dragRef.current && !resizeRef.current) return;
      dragRef.current = null;
      resizeRef.current = null;
      setDragging(false);
      const nextPos = clampPos(posRef.current, sizeRef.current);
      setPos(nextPos);
      saveGeometry(nextPos, sizeRef.current);
    }
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
  }, [open]);

  function onTitlePointerDown(e: ReactPointerEvent<HTMLElement>) {
    if (e.button !== 0) return;
    const target = e.target as HTMLElement;
    if (target.closest("button, input, a")) return;
    dragRef.current = { ox: e.clientX - pos.x, oy: e.clientY - pos.y };
    setDragging(true);
  }

  function onResizePointerDown(e: ReactPointerEvent<HTMLElement>) {
    if (e.button !== 0) return;
    e.stopPropagation();
    resizeRef.current = { ox: e.clientX, oy: e.clientY, sw: size.w, sh: size.h };
    setDragging(true);
  }

  if (!open) return null;

  return createPortal(
    <div
      className={`help-window${dragging ? " is-dragging" : ""}`}
      role="dialog"
      aria-modal="false"
      aria-labelledby="help-window-title"
      style={{
        left: pos.x,
        top: pos.y,
        width: size.w,
        height: size.h,
      }}
    >
      <header className="help-window-titlebar" onPointerDown={onTitlePointerDown}>
        <div className="help-window-title-text">
          <h2 id="help-window-title">Help</h2>
          <span className="muted">SSHyar v{APP_VERSION}</span>
        </div>
        <button type="button" className="help-close" onClick={onClose} title="Close" aria-label="Close">
          <CloseIcon {...iconProps(16)} />
        </button>
      </header>

      <div className="help-window-toolbar">
        <div className="help-search">
          <SearchIcon {...iconProps(15)} className="help-search-icon" aria-hidden />
          <input
            ref={inputRef}
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search… sftp, vault, docker, paste, nginx"
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
      </div>

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

      <div
        className="help-window-resize"
        onPointerDown={onResizePointerDown}
        title="Resize"
        aria-hidden
      />
    </div>,
    document.body,
  );
}
