"use client";

import { CircleHelp, X } from "lucide-react";
import Link from "next/link";
import { useId, useRef, useState } from "react";

export function HelpTip({ title, children, href, linkLabel = "Read the guide" }: { title: string; children: string; href?: string; linkLabel?: string }) {
  const [open, setOpen] = useState(false);
  const id = useId();
  const triggerRef = useRef<HTMLButtonElement>(null);

  return (
    <span
      className="help-tip-wrap"
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setOpen(false);
      }}
      // Opening only on click (or Enter/Space) keeps a dialog's initial focus
      // from covering its first field with the help popover.
      onKeyDown={(event) => {
        if (event.key === "Escape" && open) {
          event.preventDefault();
          setOpen(false);
          triggerRef.current?.focus();
        }
      }}
    >
      <button
        aria-label={`Help: ${title}`}
        aria-expanded={open}
        aria-controls={id}
        className="help-tip-trigger"
        onClick={() => setOpen((value) => !value)}
        ref={triggerRef}
        type="button"
      >
        <CircleHelp aria-hidden="true" size={17} />
      </button>
      {open && (
        <span aria-label={title} className="help-tip-popover" id={id} role="dialog">
          <span className="help-tip-title">{title}</span>
          <span>{children}</span>
          {href && <Link className="help-tip-link" href={href} target="_blank" rel="noopener noreferrer">{linkLabel}</Link>}
          <button aria-label="Close help" className="help-tip-close" onClick={() => setOpen(false)} type="button">
            <X aria-hidden="true" size={15} />
          </button>
        </span>
      )}
    </span>
  );
}
