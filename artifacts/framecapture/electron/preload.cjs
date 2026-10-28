const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("frameCapture", {
  getSources: () => ipcRenderer.invoke("capture:get-sources"),
  selectSource: (sourceId) =>
    ipcRenderer.invoke("capture:select-source", sourceId),
  getOutputDirectory: () =>
    ipcRenderer.invoke("settings:get-output-directory"),
  chooseOutputDirectory: () =>
    ipcRenderer.invoke("settings:choose-output-directory"),
  listRecordings: () => ipcRenderer.invoke("recordings:list"),
  revealRecording: (filePath) =>
    ipcRenderer.invoke("recordings:reveal", filePath),
  beginRecording: (name) => ipcRenderer.invoke("recording:begin", name),
  writeRecordingChunk: (id, chunk) =>
    ipcRenderer.invoke("recording:write-chunk", id, chunk),
  finishRecording: (id, durationSeconds) =>
    ipcRenderer.invoke("recording:finish", id, durationSeconds),
  cancelRecording: (id) => ipcRenderer.invoke("recording:cancel", id),
  onExportProgress: (callback) => {
    const listener = (_event, progress) => callback(progress);
    ipcRenderer.on("recording:export-progress", listener);
    return () =>
      ipcRenderer.removeListener("recording:export-progress", listener);
  },
});
