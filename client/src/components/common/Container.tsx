import React from "react";

import { ContainerProps } from "../../types/index.types";

function Container({ className, children }: ContainerProps) {
  return <section className={className}>{children}</section>;
}

export default React.memo(Container);
