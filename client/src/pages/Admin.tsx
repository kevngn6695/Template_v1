import React from "react";

import Dashboard from "../components/advanced/Dashboard";
import Input from "../components/common/Input";

function Admin() {
  return (
    <Dashboard className="admin-dashboard">
      <Input
        className="admin-input"
        value={""}
        onChange={function (value: string): void {
          throw new Error("Function not implemented.");
        }}
        onSubmit={function (): void {
          throw new Error("Function not implemented.");
        }}
      />
    </Dashboard>
  );
}

export default React.memo(Admin);
