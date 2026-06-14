import { type FormEvent, useState } from "react";
import {
  addElementToScreen,
  createProject,
  getActiveScreen,
  removeElementFromScreen,
  type DesignElement,
  type LineElement,
  type RectElement,
  updateElementInScreen,
} from "./core";
import { u8g2 } from "./exporters";
import { ScreenPreview } from "./preview/ScreenPreview";
import { createId } from "./utils/id";
import "./App.css";

type ElementKind = "rect" | "line";

type RectForm = {
  x: number;
  y: number;
  width: number;
  height: number;
  filled: boolean;
};

type LineForm = {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
};

function App() {
  const [project, setProject] = useState(() =>
    createProject({ screenId: createId("screen") }),
  );
  const [elementKind, setElementKind] = useState<ElementKind>("rect");
  const [selectedElementId, setSelectedElementId] = useState<string | null>(null);
  const [rectForm, setRectForm] = useState<RectForm>({
    x: 0,
    y: 0,
    width: 32,
    height: 16,
    filled: false,
  });
  const [lineForm, setLineForm] = useState<LineForm>({
    x1: 0,
    y1: 0,
    x2: 127,
    y2: 0,
  });

  const activeScreen = getActiveScreen(project);
  const selectedElement =
    activeScreen.elements.find((element) => element.id === selectedElementId) ?? null;
  const screenCode = u8g2.generateScreen(activeScreen);

  function addElement(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (elementKind === "rect") {
      const rect: RectElement = {
        id: createId("rect"),
        type: "rect",
        ...rectForm,
      };

      setProject((currentProject) =>
        addElementToScreen(currentProject, currentProject.activeScreenId, rect),
      );
      setSelectedElementId(rect.id);
      return;
    }

    const line: LineElement = {
      id: createId("line"),
      type: "line",
      ...lineForm,
    };

    setProject((currentProject) =>
      addElementToScreen(currentProject, currentProject.activeScreenId, line),
    );
    setSelectedElementId(line.id);
  }

  function removeElement(elementId: string) {
    setProject((currentProject) =>
      removeElementFromScreen(
        currentProject,
        currentProject.activeScreenId,
        elementId,
      ),
    );

    if (selectedElementId === elementId) {
      setSelectedElementId(null);
    }
  }

  function updateSelectedElement(element: DesignElement) {
    setProject((currentProject) =>
      updateElementInScreen(currentProject, currentProject.activeScreenId, element),
    );
  }

  return (
    <main className="app-shell">
      <header className="app-header">
        <h1>microdisplay</h1>
      </header>

      <section className="workspace-grid">
        <article className="panel editor-panel">
          <h2>Añadir figura</h2>
          <form className="editor-form" onSubmit={addElement}>
            <label>
              Tipo
              <select
                value={elementKind}
                onChange={(event) =>
                  setElementKind(event.currentTarget.value as ElementKind)
                }
              >
                <option value="rect">Rectángulo</option>
                <option value="line">Línea</option>
              </select>
            </label>

            {elementKind === "rect" ? (
              <>
                <div className="field-grid">
                  <label>
                    X
                    <input
                      type="number"
                      value={rectForm.x}
                      onChange={(event) =>
                        setRectForm({
                          ...rectForm,
                          x: event.currentTarget.valueAsNumber,
                        })
                      }
                    />
                  </label>
                  <label>
                    Y
                    <input
                      type="number"
                      value={rectForm.y}
                      onChange={(event) =>
                        setRectForm({
                          ...rectForm,
                          y: event.currentTarget.valueAsNumber,
                        })
                      }
                    />
                  </label>
                  <label>
                    Width
                    <input
                      type="number"
                      value={rectForm.width}
                      onChange={(event) =>
                        setRectForm({
                          ...rectForm,
                          width: event.currentTarget.valueAsNumber,
                        })
                      }
                    />
                  </label>
                  <label>
                    Height
                    <input
                      type="number"
                      value={rectForm.height}
                      onChange={(event) =>
                        setRectForm({
                          ...rectForm,
                          height: event.currentTarget.valueAsNumber,
                        })
                      }
                    />
                  </label>
                </div>
                <label className="checkbox-field">
                  <input
                    type="checkbox"
                    checked={rectForm.filled}
                    onChange={(event) =>
                      setRectForm({
                        ...rectForm,
                        filled: event.currentTarget.checked,
                      })
                    }
                  />
                  Relleno
                </label>
              </>
            ) : (
              <div className="field-grid">
                <label>
                  X1
                  <input
                    type="number"
                    value={lineForm.x1}
                    onChange={(event) =>
                      setLineForm({
                        ...lineForm,
                        x1: event.currentTarget.valueAsNumber,
                      })
                    }
                  />
                </label>
                <label>
                  Y1
                  <input
                    type="number"
                    value={lineForm.y1}
                    onChange={(event) =>
                      setLineForm({
                        ...lineForm,
                        y1: event.currentTarget.valueAsNumber,
                      })
                    }
                  />
                </label>
                <label>
                  X2
                  <input
                    type="number"
                    value={lineForm.x2}
                    onChange={(event) =>
                      setLineForm({
                        ...lineForm,
                        x2: event.currentTarget.valueAsNumber,
                      })
                    }
                  />
                </label>
                <label>
                  Y2
                  <input
                    type="number"
                    value={lineForm.y2}
                    onChange={(event) =>
                      setLineForm({
                        ...lineForm,
                        y2: event.currentTarget.valueAsNumber,
                      })
                    }
                  />
                </label>
              </div>
            )}

            <button className="primary-button" type="submit">
              Añadir {elementKind === "rect" ? "rectángulo" : "línea"}
            </button>
          </form>
        </article>

        <article className="panel edit-panel">
          <h2>Editar figura</h2>
          {selectedElement === null ? (
            <p className="empty-state">Selecciona una figura.</p>
          ) : selectedElement.type === "rect" ? (
            <div className="editor-form">
              <div className="field-grid">
                <label>
                  X
                  <input
                    type="number"
                    value={selectedElement.x}
                    onChange={(event) =>
                      updateSelectedElement({
                        ...selectedElement,
                        x: event.currentTarget.valueAsNumber,
                      })
                    }
                  />
                </label>
                <label>
                  Y
                  <input
                    type="number"
                    value={selectedElement.y}
                    onChange={(event) =>
                      updateSelectedElement({
                        ...selectedElement,
                        y: event.currentTarget.valueAsNumber,
                      })
                    }
                  />
                </label>
                <label>
                  Width
                  <input
                    type="number"
                    value={selectedElement.width}
                    onChange={(event) =>
                      updateSelectedElement({
                        ...selectedElement,
                        width: event.currentTarget.valueAsNumber,
                      })
                    }
                  />
                </label>
                <label>
                  Height
                  <input
                    type="number"
                    value={selectedElement.height}
                    onChange={(event) =>
                      updateSelectedElement({
                        ...selectedElement,
                        height: event.currentTarget.valueAsNumber,
                      })
                    }
                  />
                </label>
              </div>
              <label className="checkbox-field">
                <input
                  type="checkbox"
                  checked={selectedElement.filled}
                  onChange={(event) =>
                    updateSelectedElement({
                      ...selectedElement,
                      filled: event.currentTarget.checked,
                    })
                  }
                />
                Relleno
              </label>
            </div>
          ) : (
            <div className="editor-form">
              <div className="field-grid">
                <label>
                  X1
                  <input
                    type="number"
                    value={selectedElement.x1}
                    onChange={(event) =>
                      updateSelectedElement({
                        ...selectedElement,
                        x1: event.currentTarget.valueAsNumber,
                      })
                    }
                  />
                </label>
                <label>
                  Y1
                  <input
                    type="number"
                    value={selectedElement.y1}
                    onChange={(event) =>
                      updateSelectedElement({
                        ...selectedElement,
                        y1: event.currentTarget.valueAsNumber,
                      })
                    }
                  />
                </label>
                <label>
                  X2
                  <input
                    type="number"
                    value={selectedElement.x2}
                    onChange={(event) =>
                      updateSelectedElement({
                        ...selectedElement,
                        x2: event.currentTarget.valueAsNumber,
                      })
                    }
                  />
                </label>
                <label>
                  Y2
                  <input
                    type="number"
                    value={selectedElement.y2}
                    onChange={(event) =>
                      updateSelectedElement({
                        ...selectedElement,
                        y2: event.currentTarget.valueAsNumber,
                      })
                    }
                  />
                </label>
              </div>
            </div>
          )}
        </article>

        <article className="panel">
          <h2>Proyecto</h2>
          <dl>
            <div>
              <dt>Nombre</dt>
              <dd>{project.name}</dd>
            </div>
            <div>
              <dt>Pantalla</dt>
              <dd>
                {project.device.width} × {project.device.height}
              </dd>
            </div>
            <div>
              <dt>Screen activa</dt>
              <dd>{activeScreen.name}</dd>
            </div>
            <div>
              <dt>Figuras</dt>
              <dd>{activeScreen.elements.length}</dd>
            </div>
          </dl>
        </article>

        <article className="panel element-panel">
          <h2>Figuras</h2>
          {activeScreen.elements.length === 0 ? (
            <p className="empty-state">Sin figuras.</p>
          ) : (
            <ul className="element-list">
              {activeScreen.elements.map((element) => (
                <li
                  className={element.id === selectedElementId ? "selected" : ""}
                  key={element.id}
                  onClick={() => setSelectedElementId(element.id)}
                >
                  <div>
                    <code>{element.type}</code>
                    <span>{element.id}</span>
                  </div>
                  <button
                    className="danger-button"
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      removeElement(element.id);
                    }}
                  >
                    Borrar
                  </button>
                </li>
              ))}
            </ul>
          )}
        </article>
      </section>

      <section className="output-grid">
        <article className="panel">
          <h2>Preview</h2>
          <ScreenPreview device={project.device} screen={activeScreen} />
        </article>

        <article className="panel">
          <h2>Código U8G2</h2>
          <pre>{screenCode || "// Añade figuras para generar código"}</pre>
        </article>

        <article className="panel">
          <h2>JSON del proyecto</h2>
          <pre>{JSON.stringify(project, null, 2)}</pre>
        </article>
      </section>
    </main>
  );
}

export default App;
