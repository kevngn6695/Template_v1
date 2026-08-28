import React from "react";

import { TooltipProps } from "../../types/index.types";

function Tooltip({ className, children }: TooltipProps) {
  return <div className={className}>{children}</div>;
}

export default React.memo(Tooltip);
