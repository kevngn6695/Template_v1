import React from "react";

import { InputProps } from "../../types/index.types";

// @ts-ignore
import "../../assets/components/common/Input.sass";

function Input({
  value,
  className,
  placeholder,
  onChange,
  onSubmit,
}: InputProps) {
  return (
    <input
      value={value}
      placeholder={placeholder}
      className={`${className} input`}
      onChange={(event) => onChange(event.target.value, event)}
      onKeyDown={(e) => e.key === "Enter" && onSubmit?.()}
    />
  );
}

export default React.memo(Input);
