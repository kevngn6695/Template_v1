import React from "react";

import { ButtonProps } from "../../types/index.types";

function Button({ className, children, type, onClick }: ButtonProps) {
  return (
    <button className={className} type={type} onClick={onClick}>
      {!children ? "Button" : children}
    </button>
  );
}

export default React.memo(Button);
