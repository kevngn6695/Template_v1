/**
 * @copyright 2026 - present, Heniseeyou, LLC
 * @license Apache-2.0
 * @author Hiep Nguyen
 *
 */

import React, { useEffect, useState } from "react";

import { TooltipProps } from "../../types/index.types";

// @ts-ignore
import "../../assets/styles/components/common/Tooltip.sass";

function Tooltip({
  className = "",
  children,
  text,
  status = "info",
  open,
  position = "top",
  duration = 0,
}: TooltipProps) {
  // No `open` prop => the plain hover tooltip. With one, the parent owns visibility.
  const controlled = open !== undefined;

  const [hovered, setHovered] = useState(false);
  const [expired, setExpired] = useState(false);

  useEffect(() => {
    if (!controlled || !open || duration <= 0) return;

    setExpired(false);
    const timer = window.setTimeout(() => setExpired(true), duration);

    return () => window.clearTimeout(timer);
  }, [controlled, open, duration, text]);

  const visible = controlled ? Boolean(open) && !expired : hovered;
  const hover = (state: boolean) => () => !controlled && setHovered(state);

  return (
    <div
      className={`tooltip ${className}`.trim()}
      onMouseEnter={hover(true)}
      onMouseLeave={hover(false)}
      onFocus={hover(true)}
      onBlur={hover(false)}
    >
      {children}

      {text && (
        <span
          className={`tooltip-text tooltip-${status} tooltip-${position} ${
            visible ? "show" : ""
          }`}
          role={status === "error" ? "alert" : "status"}
          aria-live={status === "error" ? "assertive" : "polite"}
        >
          {text}
        </span>
      )}
    </div>
  );
}

export default React.memo(Tooltip);
