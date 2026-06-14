import { type FormEvent, useState } from "react";
import { createProject, type Project } from "../core";
import { createId } from "../utils/id";

type StartScreenProps = {
  onCreateProject: (project: Project) => void;
};

export function StartScreen({ onCreateProject }: StartScreenProps) {
  const [name, setName] = useState("Untitled");
  const [width, setWidth] = useState(128);
  const [height, setHeight] = useState(64);

  function createNewProject(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    onCreateProject(
      createProject({
        name,
        width,
        height,
        screenId: createId("screen"),
      }),
    );
  }

  return (
    <main className="start-shell">
      <section className="panel start-panel">
        <h1>microdisplay</h1>
        <form className="editor-form" onSubmit={createNewProject}>
          <label>
            Nombre
            <input
              value={name}
              onChange={(event) => setName(event.currentTarget.value)}
            />
          </label>

          <div className="field-grid">
            <label>
              Width
              <input
                type="number"
                value={width}
                onChange={(event) => setWidth(event.currentTarget.valueAsNumber)}
              />
            </label>
            <label>
              Height
              <input
                type="number"
                value={height}
                onChange={(event) => setHeight(event.currentTarget.valueAsNumber)}
              />
            </label>
          </div>

          <button className="primary-button" type="submit">
            Crear proyecto
          </button>
        </form>
      </section>
    </main>
  );
}
