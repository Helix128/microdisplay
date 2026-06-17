import { useProjectHistory } from "./utils/useProjectHistory";
import { EditorScreen } from "./screens/EditorScreen";
import { StartScreen } from "./screens/StartScreen";
import "./App.css";

function App() {
  const {
    project,
    setProject,
    undo,
    redo,
    canUndo,
    canRedo,
  } = useProjectHistory(null);

  if (project === null) {
    return <StartScreen onCreateProject={setProject} />;
  }

  return (
    <EditorScreen
      project={project}
      onExit={() => setProject(null)}
      onProjectChange={setProject}
      undo={undo}
      redo={redo}
      canUndo={canUndo}
      canRedo={canRedo}
    />
  );
}

export default App;
