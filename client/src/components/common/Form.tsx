import React from "react";

import { FormProps } from "../../types/index.types";

function Form({
  children,
  className,
  action,
  autoComplete,
  name,
  onSubmit,
}: FormProps) {
  return (
    <form
      className={className}
      action={action}
      autoComplete={autoComplete}
      name={name}
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit();
      }}
    >
      {children}
    </form>
  );
}

export default React.memo(Form);
