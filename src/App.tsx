import { useCallback, useRef, useState } from "react";
import { useProjectHistory } from "./utils/useProjectHistory";
import { EditorScreen } from "./screens/EditorScreen";
import { StartScreen } from "./screens/StartScreen";
import "./App.css";

const LEAVE_DURATION = 180;

function App() {
  const {
    project,
    setProject,
    undo,
    redo,
    canUndo,
    canRedo,
  } = useProjectHistory(null);

  const [isLeaving, setIsLeaving] = useState(false);
  const leaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const navigate = useCallback((action: () => void) => {
    if (leaveTimerRef.current !== null) clearTimeout(leaveTimerRef.current);
    setIsLeaving(true);
    leaveTimerRef.current = setTimeout(() => {
      action();
      setIsLeaving(false);
      leaveTimerRef.current = null;
    }, LEAVE_DURATION);
  }, []);

  if (project === null) {
    return (
      <div className={`screen-wrapper${isLeaving ? " is-leaving" : ""}`}>
        <StartScreen onCreateProject={(p) => navigate(() => setProject(p))} />
      </div>
    );
  }

  return (
    <div className={`screen-wrapper${isLeaving ? " is-leaving" : ""}`}>
      <EditorScreen
        project={project}
        onExit={() => navigate(() => setProject(null))}
        onProjectChange={setProject}
        undo={undo}
        redo={redo}
        canUndo={canUndo}
        canRedo={canRedo}
      />
    </div>
  );
}

export default App;
