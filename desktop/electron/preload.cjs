// Puente controlado entre la ventana (renderer) y Node (main). Hoy no
// expone nada: la pantalla de estado habla con el backend por HTTP común
// (fetch), no por IPC. Este archivo existe para el día que la app
// necesite algo que sólo Node puede dar (por ejemplo, diálogos nativos
// de archivo) — se agrega acá, explícitamente, con contextBridge.

// const { contextBridge } = require("electron");
// contextBridge.exposeInMainWorld("esbozo", { ... });
