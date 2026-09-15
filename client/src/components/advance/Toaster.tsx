import React, { useState, useEffect } from "react";

import Container from "../common/Container";

import { ToasterProps } from "../../types/index.types";

// @ts-ignore: Sass files are not typed in this project.
import "../../assets/Styles/components/Advance/Toaster.sass";

function Toaster({ className, children, title, content = "" }: ToasterProps) {
  return (
    <Container className={`${className} toaster`}>
      {children || (
        <>
          <div className="toaster_content wrapper">
            <div className="toaster_icon wrapper">
              <span className="toaster_icon"></span>
            </div>
            <div className="toaster_body">
              <h6 className="toaster_text">{title}</h6>
              <p className="toaster_description">{content}</p>
            </div>
          </div>
        </>
      )}
    </Container>
  );
}

export default React.memo(Toaster);
