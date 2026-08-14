import React from "react";

import { HeadingProps } from "../../types/index.types";

function Heading({ className, children }: HeadingProps) {
  return <h1 className={className}>{children}</h1>;
}

export default React.memo(Heading);
