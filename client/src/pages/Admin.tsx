/**
 * @copyright 2026 - present, Heniseeyou, LLC
 * @license Apache-2.0
 * @author Hiep Nguyen
 *
 */

import React, { useState, useEffect } from "react";

import Dashboard from "../components/advanced/Dashboard";
import Input from "../components/common/Input";
import Form from "../components/common/Form";
import Button from "../components/common/Button";

function Admin() {
  const [loading, setLoading] = useState<null | boolean>(null);
  const [name, setName] = useState("");

  useEffect(() => {}, []);

  const handleSubmit = (): void => {
    if (!name.trim()) return;

    setLoading(true);
    setName("");
    setLoading(false);
    console.log("submit:", name);
  };

  return (
    <Dashboard className="admin-dashboard">
      <Form
        className="admin-form"
        action=""
        autoComplete="off"
        name="admin-form"
        onSubmit={handleSubmit}
      >
        <Input
          className="admin"
          placeholder="Enter name"
          value={name}
          onChange={setName}
          onSubmit={handleSubmit}
        />
        <Button className="admin" type="submit">
          Save
        </Button>
      </Form>
    </Dashboard>
  );
}

export default React.memo(Admin);
