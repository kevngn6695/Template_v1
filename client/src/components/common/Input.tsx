import React from "react";

import { InputProps } from "../../types/index.types";

function Input({ value, className, onChange, onSubmit }: InputProps) {
  return (
    <input
      value={value}
      className={className}
      onChange={(e) => onChange(e.target.value)}
      onKeyDown={(e) => e.key === "Enter" && onSubmit()}
    />
  );
}

export default React.memo(Input);
