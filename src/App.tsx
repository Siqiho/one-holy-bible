import { Workbench } from "./components/Workbench";
import { cuvGenesis1, kjvGenesis1, sampleResources } from "./data/sampleLibrary";
import { defaultWorkbenchLayout } from "./domain/layout";
import "./styles.css";

export default function App() {
  return (
    <Workbench
      versions={[cuvGenesis1, kjvGenesis1]}
      resources={sampleResources}
      initialLayout={defaultWorkbenchLayout}
    />
  );
}
