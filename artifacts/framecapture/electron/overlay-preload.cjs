const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("annotationOverlay", {
  post: (action) => ipcRenderer.send("annotation:action", action),
  onAction: (callback) => {
    const listener = (_event, action) => callback(action);
    ipcRenderer.on("annotation:action", listener);
    return () => ipcRenderer.removeListener("annotation:action", listener);
  },
});
