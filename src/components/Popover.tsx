import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
  type RefObject,
} from "react";
import { createPortal } from "react-dom";

interface Props {
  open: boolean;
  onClose: () => void;
  anchorRef: RefObject<HTMLElement | null>;
  children: ReactNode;
  className?: string;
  width?: number;
  align?: "start" | "end";
}

export function Popover({
  open,
  onClose,
  anchorRef,
  children,
  className = "",
  width = 260,
  align = "start",
}: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState({ top: 0, left: 0, ready: false });

  useLayoutEffect(() => {
    if (!open) {
      setPos((p) => ({ ...p, ready: false }));
      return;
    }
    const anchor = anchorRef.current;
    const el = ref.current;
    if (!anchor || !el) return;

    const a = anchor.getBoundingClientRect();
    const r = el.getBoundingClientRect();
    let left = align === "end" ? a.right - width : a.left;
    let top = a.bottom + 6;
    left = Math.max(8, Math.min(left, window.innerWidth - width - 8));
    if (top + r.height > window.innerHeight - 8) {
      top = Math.max(8, a.top - r.height - 6);
    }
    setPos({ top, left, ready: true });
  }, [open, anchorRef, align, width, children]);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    function onDown(e: MouseEvent) {
      const t = e.target as Node;
      if (ref.current?.contains(t)) return;
      if (anchorRef.current?.contains(t)) return;
      // Keep popover open while an app modal is up (modals portal to body).
      if (
        t instanceof Element &&
        t.closest(".app-modal-overlay, .help-overlay, .docker-logs-overlay")
      )
        return;
      onClose();
    }
    function onReposition() {
      const anchor = anchorRef.current;
      const el = ref.current;
      if (!anchor || !el) return;
      const a = anchor.getBoundingClientRect();
      const r = el.getBoundingClientRect();
      let left = align === "end" ? a.right - width : a.left;
      let top = a.bottom + 6;
      left = Math.max(8, Math.min(left, window.innerWidth - width - 8));
      if (top + r.height > window.innerHeight - 8) {
        top = Math.max(8, a.top - r.height - 6);
      }
      setPos({ top, left, ready: true });
    }
    window.addEventListener("keydown", onKey);
    window.addEventListener("mousedown", onDown, true);
    window.addEventListener("resize", onReposition);
    window.addEventListener("scroll", onReposition, true);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("mousedown", onDown, true);
      window.removeEventListener("resize", onReposition);
      window.removeEventListener("scroll", onReposition, true);
    };
  }, [open, onClose, anchorRef, align, width]);

  if (!open) return null;

  return createPortal(
    <div
      ref={ref}
      className={`popover ${className}`}
      style={{
        top: pos.top,
        left: pos.left,
        width,
        visibility: pos.ready ? "visible" : "hidden",
      }}
      role="dialog"
    >
      {children}
    </div>,
    document.body,
  );
}
