import React from "react";

import { ContainerProps } from "../../types/index.types";

// @ts-ignore
import "../../assets/components/common/Container.sass";

function Container({ className, children }: ContainerProps) {
  return <section className={className}>{children}</section>;
}

export default React.memo(Container);
