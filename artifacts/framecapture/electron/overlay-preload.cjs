const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("annotationOverlay", {
  post: (action) => ipcRenderer.send("annotation:action", action),
  onAction: (callback) => {
    const listener = (_event, action) => callback(action);
    ipcRenderer.on("annotation:action", listener);
    return () => ipcRenderer.removeListener("annotation:action", listener);
  },
  requestRecordingState: () => ipcRenderer.send("recording:request-state"),
  sendRecordingControl: (command) =>
    ipcRenderer.send("recording:control", command),
  onRecordingState: (callback) => {
    const listener = (_event, state) => callback(state);
    ipcRenderer.on("recording:state", listener);
    return () => ipcRenderer.removeListener("recording:state", listener);
  },
});
