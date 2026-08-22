/**
 * @copyright 2026 - present, Heniseeyou, LLC
 * @license Apache-2.0
 * @author Hiep Nguyen
 *
 */

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
  onChange: (value: string) => void;
  onSubmit: () => void;
}

/**
 * Button component props
 */
export interface ButtonProps {
  className?: string;
  children: React.ReactNode;
  type?: "button" | "submit" | "reset";
  onClick: () => void;
}

/**
 * Tooltip component props
 */

export interface TooltipProps {
  children: React.ReactNode;
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
