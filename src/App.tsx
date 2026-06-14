import { useState } from "react";
import type { Project } from "./core";
import { EditorScreen } from "./screens/EditorScreen";
import { StartScreen } from "./screens/StartScreen";
import "./App.css";

function App() {
  const [project, setProject] = useState<Project | null>(null);

  if (project === null) {
    return <StartScreen onCreateProject={setProject} />;
  }

  return (
    <EditorScreen
      project={project}
      onExit={() => setProject(null)}
      onProjectChange={setProject}
    />
  );
}

export default App;
