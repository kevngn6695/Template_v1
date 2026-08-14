import React from "react";

import Dashboard from "../components/advanced/Dashboard";
import Input from "../components/common/Input";
import Form from "../components/common/Form";
import Button from "../components/common/Button";

function Admin() {
  return (
    <Dashboard className="admin-dashboard">
      <Form
        className="admin-form"
        action=""
        autoComplete="off"
        name="admin-form"
        onSubmit={function (): void {
          throw new Error("Function not implemented.");
        }}
      >
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
      </Form>
      <Button
        className="admin-button"
        type="submit"
        onClick={function (): void {
          throw new Error("Function not implemented.");
        }}
      >
        Submit
      </Button>
    </Dashboard>
  );
}

export default React.memo(Admin);
