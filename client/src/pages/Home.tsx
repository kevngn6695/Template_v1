import React from "react";

import Container from "../components/common/Container";
import Heading from "../components/common/Headng";

function Home() {
  return (
    <Container className="main-ctn">
      <Heading className="main-heading">Hello, </Heading>
    </Container>
  );
}

export default React.memo(Home);
