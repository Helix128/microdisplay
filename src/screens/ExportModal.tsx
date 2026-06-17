import { X } from "lucide-react";
import { memo, useCallback, useMemo, useRef, useState } from "react";
import type { Project, Screen } from "../core";
import { defaultExportConfig, generateProject, generateScreenFunction } from "../targets/u8g2";
import type { ExportConfig } from "../targets/u8g2";

type ExportScope = "project" | "screen";

type ExportModalProps = {
  project: Project;
  activeScreen: Screen;
  onClose: () => void;
};

export const ExportModal = memo(function ExportModal({ project, activeScreen, onClose }: ExportModalProps) {
  const [scope, setScope] = useState<ExportScope>("project");
  const [instanceName, setInstanceName] = useState(defaultExportConfig.instanceName);
  const [copyStatus, setCopyStatus] = useState<"idle" | "copied">("idle");
  const copyTimeoutRef = useRef<number | null>(null);

  const config: ExportConfig = useMemo(
    () => ({ instanceName: instanceName.trim() || defaultExportConfig.instanceName }),
    [instanceName],
  );

  const code = useMemo(() => {
    if (scope === "screen") {
      return generateScreenFunction(activeScreen, project, config);
    }
    return generateProject(project, config);
  }, [scope, project, activeScreen, config]);

  const handleCopy = useCallback(async () => {
    await navigator.clipboard.writeText(code);
    setCopyStatus("copied");
    if (copyTimeoutRef.current !== null) {
      window.clearTimeout(copyTimeoutRef.current);
    }
    copyTimeoutRef.current = window.setTimeout(() => {
      setCopyStatus("idle");
      copyTimeoutRef.current = null;
    }, 2000);
  }, [code]);

  const handleBackdropClick = useCallback(
    (event: React.MouseEvent) => {
      if (event.target === event.currentTarget) {
        onClose();
      }
    },
    [onClose],
  );

  return (
    <div className="modal-backdrop" role="presentation" onClick={handleBackdropClick}>
      <section
        className="export-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="export-modal-title"
      >
        <div className="export-modal-header">
          <h2 id="export-modal-title">Exportar código U8G2</h2>
          <button type="button" aria-label="Cerrar" onClick={onClose}>
            <X size={16} />
          </button>
        </div>

        <div className="export-modal-config">
          <fieldset className="export-fieldset">
            <legend>Pantallas</legend>
            <label className="radio-field">
              <input
                type="radio"
                name="export-scope"
                value="project"
                checked={scope === "project"}
                onChange={() => setScope("project")}
              />
              Todas ({project.screens.length})
            </label>
            <label className="radio-field">
              <input
                type="radio"
                name="export-scope"
                value="screen"
                checked={scope === "screen"}
                onChange={() => setScope("screen")}
              />
              Solo &ldquo;{activeScreen.name}&rdquo;
            </label>
          </fieldset>

          <label className="export-instance-label">
            Nombre del objeto C++
            <input
              type="text"
              value={instanceName}
              placeholder="u8g2"
              spellCheck={false}
              onChange={(e) => setInstanceName(e.currentTarget.value)}
            />
          </label>
        </div>

        <textarea className="export-textarea" readOnly value={code} />

        <div className="export-modal-actions">
          <button type="button" onClick={handleCopy}>
            {copyStatus === "copied" ? "¡Copiado!" : "Copiar código"}
          </button>
        </div>
      </section>
    </div>
  );
});
