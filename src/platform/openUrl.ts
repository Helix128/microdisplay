import { openUrl as tauriOpenUrl } from "@tauri-apps/plugin-opener";

const isTauri = "__TAURI_INTERNALS__" in window;

export async function openUrl(url: string): Promise<void> {
  if (isTauri) {
    await tauriOpenUrl(url);
  } else {
    window.open(url, "_blank", "noreferrer");
  }
}
