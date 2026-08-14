import React from "react";

import { LoadingProps } from "../../types/index.types";

function Loading({ className, children }: LoadingProps) {
  return <div className={className}>{children}</div>;
}

export default React.memo(Loading);
