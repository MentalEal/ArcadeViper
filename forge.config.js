module.exports = {
  packagerConfig: {
    asar: true,
    executableName: "ArcadeViper",
    icon: "./assets/icon"
  },
  makers: [
    {
      name: "@electron-forge/maker-squirrel",
      config: {
        name: "arcade_viper",
        setupExe: "Arcade-Viper-Setup.exe",
        setupIcon: "./assets/icon.ico"
      }
    }
  ]
};
