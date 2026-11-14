import { createRoot } from "react-dom/client";
import { MDXProvider } from "@mdx-js/react";
import { App } from "./App";
import { mdxComponents } from "./mdx/components";
import "react-datepicker/dist/react-datepicker.css";
import "./styles.css";

createRoot(document.getElementById("root")!).render(
  <MDXProvider components={mdxComponents}>
    <App />
  </MDXProvider>,
);
