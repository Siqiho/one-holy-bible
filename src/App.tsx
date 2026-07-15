import type { ComponentType } from "react";

import { Workbench } from "./core/components/Workbench";
import { defaultWorkbenchLayout } from "./core/domain/layout";
import { PublicApp, type PublicWorkbenchProps } from "./public/PublicApp";
import "./styles.css";

const ReadOnlyWorkbench = Workbench as unknown as ComponentType<PublicWorkbenchProps>;

export default function App() {
  return (
    <PublicApp
      WorkbenchComponent={ReadOnlyWorkbench}
      initialLayout={defaultWorkbenchLayout}
    />
  );
}
