import React from "react";

import Container from "../common/Container";

import { DashboardProps } from "../../types/index.types";
function Dashboard({ className, children }: DashboardProps) {
  return <Container className={`${className}`}>{children}</Container>;
}

export default React.memo(Dashboard);
