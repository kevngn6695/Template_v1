import React from "react";

// @ts-ignore: Sass files are not typed in this project.
import "../../assets/styles/components/common/Button.sass";

import { ButtonProps } from "../../types/index.types";

function Button({ className, children, type, onClick }: ButtonProps) {
  return (
    <button className={`${className} btn`} type={type} onClick={onClick}>
      {!children ? "Button" : children}
    </button>
  );
}

export default React.memo(Button);
