/**
 * @copyright 2026 - present, Heniseeyou, LLC
 * @license Apache-2.0
 * @author Hiep Nguyen
 *
 */

import { ChangeEvent } from "react";

/**
 * Common component props
 *
 */

export interface HeadingProps {
  className?: string;
  children: React.ReactNode;
}

/**
 * Form component props
 */
export interface FormProps {
  children: React.ReactNode;
  className?: string;
  action?: string;
  autoComplete?: string;
  name?: string;
  onSubmit: () => void;
}

/**
 * Label component props
 */
export interface LabelProps {
  id?: string;
  className?: string;
  hidden?: boolean;
  for?: string;
  form?: string;
}

/**
 * Input component props
 */
export interface InputProps {
  value: string;
  className?: string;
  placeholder?: string;
  type?:
    | "text"
    | "email"
    | "password"
    | "number"
    | "checkbox"
    | "radio"
    | "file"
    | "date"
    | "time"
    | "url";
  onChange: (value: string, event: ChangeEvent<HTMLInputElement>) => void;
  onSubmit: () => void;
}

/**
 * Button component props
 */
export interface ButtonProps {
  className?: string;
  children: React.ReactNode;
  type?: "button" | "submit" | "reset";
  onClick?: () => void;
}

/**
 * Tooltip component props
 */

export interface TooltipProps {
  className?: string;
  /** The element the tooltip is anchored to. */
  children: React.ReactNode;
  /** Tooltip content. Nothing renders while this is empty. */
  text?: React.ReactNode;
  /** Colour/semantics of the bubble. */
  status?: "info" | "error" | "success";
  /**
   * Controlled visibility. Leave undefined for the plain hover/focus tooltip;
   * pass a boolean to drive it from state (validation errors, confirmations).
   */
  open?: boolean;
  /** Side of the anchor the bubble sits on. */
  position?: "top" | "bottom" | "left" | "right";
  /** Auto-hide after this many ms. 0 keeps it up until `open` goes false. */
  duration?: number;
}

/**
 * Loading component props
 */
export interface LoadingProps {
  className?: string;
  children?: React.ReactNode;
}

/**
 * Container component props
 */
export interface ContainerProps {
  className?: string;
  children: React.ReactNode;
}

/**
 * Advanced Components
 */

export interface DashboardProps {
  className?: string;
  children: React.ReactNode;
}
