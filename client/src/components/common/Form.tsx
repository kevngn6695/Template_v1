import React from "react";

// @ts-ignore: Sass files are not typed in this project.
import "../../assets/styles/components/common/Form.sass";

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
