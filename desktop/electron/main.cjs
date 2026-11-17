const { app, BrowserWindow, dialog, utilityProcess } = require('electron');
const { existsSync } = require('node:fs');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const { startBackend } = require('./backend-runtime.cjs');
const isDev = process.env.NODE_ENV === 'development';
let runtime, mainWindow, starting;
const iconPath = existsSync(path.join(__dirname, '../assets/esbozo-app-icon.png'))
  ? path.join(__dirname, '../assets/esbozo-app-icon.png')
  : path.join(__dirname, '../src/assets/esbozo-app-icon.png');
function backendDirectory() {
  const packaged = path.join(app.getAppPath(), 'backend');
  return existsSync(packaged) ? packaged : path.resolve(app.getAppPath(), '../backend');
}
async function createWindow() {
  if (starting) return starting;
  starting = (async () => {
    if (!isDev && !runtime) {
      const backendDir = backendDirectory();
      const configPath = process.env.ESBOZO_ENV_FILE || (app.isPackaged ? path.join(app.getPath('userData'), 'backend.env') : path.join(backendDir, '.env'));
      runtime = await startBackend({ backendDir, configPath, appVersion: app.getVersion(),
        spawnChild: (file, env) => utilityProcess.fork(file, [], { env, cwd: backendDir, stdio: 'ignore', serviceName: 'Esbozo · servidor local' }),
      });
      runtime.child.once('exit', () => {
        if (runtime && !app.isQuitting) {
          runtime = undefined;
          dialog.showErrorBox('Servidor local detenido', 'El servidor local de Esbozo se detuvo. Las imágenes y decisiones guardadas se conservan. Cerrá la aplicación y comprobá PostgreSQL antes de volver a abrirla.');
          mainWindow?.close();
        }
      });
    }
    if (mainWindow && !mainWindow.isDestroyed()) { mainWindow.focus(); return; }
    const win = new BrowserWindow({ width: 1200, height: 800, minWidth: 900, minHeight: 650, title: 'Esbozo', icon: iconPath,
      webPreferences: { preload: path.join(__dirname, 'preload.cjs'), contextIsolation: true, nodeIntegration: false, sandbox: true },
    });
    mainWindow = win;
    win.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
    win.webContents.on('will-navigate', (event, url) => {
      if (isDev ? new URL(url).origin !== 'http://localhost:5173' : url.split('#')[0] !== pathToFileURL(path.join(__dirname, '../dist/index.html')).href) event.preventDefault();
    });
    win.once('closed', () => { mainWindow = undefined; });
    if (isDev) { await win.loadURL('http://localhost:5173'); win.webContents.openDevTools(); }
    else await win.loadFile(path.join(__dirname, '../dist/index.html'));
  })();
  try { await starting; } finally { starting = undefined; }
}
if (!app.requestSingleInstanceLock()) app.quit();
else {
  app.on('second-instance', () => { if (mainWindow?.isMinimized()) mainWindow.restore(); mainWindow?.focus(); });
  app.whenReady().then(async () => {
    if (process.platform === 'darwin' && app.dock) app.dock.setIcon(iconPath);
    try { await createWindow(); }
    catch (error) { dialog.showErrorBox('No se pudo iniciar Esbozo', error.message); app.quit(); }
  });
  app.on('before-quit', () => { app.isQuitting = true; runtime?.stop(); runtime = undefined; });
  app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
  app.on('activate', () => { if (!BrowserWindow.getAllWindows().length) createWindow().catch(error => dialog.showErrorBox('No se pudo iniciar Esbozo', error.message)); });
}
