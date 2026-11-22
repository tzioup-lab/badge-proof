export const BUILD = "__BUILD_ID__";
let pendingInstall;
let installChanged = () => {};
window.addEventListener("beforeinstallprompt", event => {
  event.preventDefault(); pendingInstall = event; installChanged();
});

export async function startShell({local, t, canReload}) {
  const $ = selector => document.querySelector(selector);
  let registration;
  let dismissed = false;
  let requestedReload = false;
  let message = local ? "localUpdates" : "checkingUpdates";
  const render = () => {
    $("#app-version").textContent = "v" + (BUILD.startsWith("__") ? "0.2.0" : BUILD.split("-")[0]);
    $("#shell-status").textContent = t(message);
    $("#update-banner").hidden = !registration?.waiting || dismissed;
    $("#update-text").textContent = t(message === "finishWork" ? "finishWork" : "updateReady");
    $("#install-app").hidden = local || !pendingInstall;
    $("#check-updates").disabled = local || !registration;
  };
  $("#dismiss-update").onclick = () => {dismissed = true; render();};
  $("#apply-update").onclick = () => {
    if (!canReload()) {message = "finishWork"; render(); return;}
    if (!registration?.waiting) return;
    requestedReload = true;
    registration.waiting.postMessage({type: "APPLY_UPDATE"});
  };
  $("#install-app").onclick = async () => {
    if (!pendingInstall) return;
    await pendingInstall.prompt();
    pendingInstall = null;
    render();
  };
  installChanged = render;
  $("#check-updates").onclick = async () => {
    if (!registration) return;
    message = "checkingUpdates"; render();
    try {
      await registration.update();
      dismissed = false;
      message = registration.waiting ? "updateReady" : registration.installing ? "checkingUpdates" : "upToDate";
    } catch {message = "offlineUpdate";}
    render();
  };
  if (local || !("serviceWorker" in navigator)) {
    if (!local) message = "offlineUpdate";
    render(); return {render};
  }
  navigator.serviceWorker.addEventListener("controllerchange", () => {
    // Another window accepting an update must not reload this user's work.
    if (requestedReload) location.reload();
  });
  try {
    registration = await navigator.serviceWorker.register(new URL("./service-worker.js", import.meta.url), {updateViaCache: "none"});
    registration.addEventListener("updatefound", () => {
      const worker = registration.installing;
      worker?.addEventListener("statechange", () => {
        if (worker.state === "installed") message = navigator.serviceWorker.controller ? "updateReady" : "offlineReady";
        if (worker.state === "redundant") message = "offlineUpdate";
        render();
      });
    });
    message = registration.waiting ? "updateReady" : registration.active ? "offlineReady" : "checkingUpdates";
    render();
    const interval = setInterval(() => {if (navigator.onLine) registration.update().catch(() => {});}, 60 * 60 * 1000);
    window.addEventListener("pagehide", () => clearInterval(interval), {once: true});
  } catch {message = "offlineUpdate"; render();}
  return {render};
}
