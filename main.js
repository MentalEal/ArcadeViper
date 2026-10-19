const path = require("path");
const { app, BrowserWindow, Menu } = require("electron");

function createWindow() {
  const mainWindow = new BrowserWindow({
    width: 760,
    height: 920,
    minWidth: 680,
    minHeight: 860,
    autoHideMenuBar: true,
    backgroundColor: "#101418",
    title: "Arcade Viper",
    icon: path.join(__dirname, "assets", "icon.png"),
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true
    }
  });

  Menu.setApplicationMenu(null);
  mainWindow.loadFile(path.join(__dirname, "renderer", "index.html"));
}

app.whenReady().then(() => {
  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});
