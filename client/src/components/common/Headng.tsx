import React from "react";

import { HeadingProps } from "../../types/index.types";

// @ts-ignore: Sass files are not typed in this project.
import "../../assets/styles/components/common/Heading.sass";

function Heading({ className, children }: HeadingProps) {
  return <h1 className={className}>{children}</h1>;
}

export default React.memo(Heading);
