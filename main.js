const {app, BrowserWindow, ipcMain} = require('electron')
const path = require('path')
const config = {
  url: 'http://amrubrica.comune.torino.it/'
}
let mainWindow

// Handle IPC events
ipcMain.on('reload', () => {
  if (mainWindow) mainWindow.reload()
})

ipcMain.on('clear-cache', async (event) => {
  if (mainWindow) {
    try {
      // Clear browser cache
      await mainWindow.webContents.session.clearCache()
      
      // Clear Flash-specific storage
      mainWindow.webContents.session.clearStorageData({
        storages: ['appcache', 'filesystem', 'indexeddb', 'localstorage', 'shadercache', 'websql', 'serviceworkers', 'cachestorage']
      })
      
      // Clear Flash player cache
      const flashCachePath = path.join(app.getPath('userData'), 'PepperFlash')
      try {
        const fs = require('fs')
        if (fs.existsSync(flashCachePath)) {
          fs.readdirSync(flashCachePath).forEach(file => {
            fs.unlinkSync(path.join(flashCachePath, file))
          })
        }
      } catch (err) {
        console.error('Error clearing Flash cache:', err)
      }
      
      // Reload the window
      mainWindow.reload()
    } catch (error) {
      console.error('Failed to clear cache:', error)
    }
  }
})

app.on('window-all-closed', function() {
  if (process.platform != 'darwin')
    app.quit()
})

let ppapi_flash_path

if(process.platform  == 'win32'){
  ppapi_flash_path = path.join(__dirname, 'pepflashplayer.dll')
} else if (process.platform == 'linux') {
  ppapi_flash_path = path.join(__dirname, 'libpepflashplayer.so')
} else if (process.platform == 'darwin') {
  ppapi_flash_path = path.join(__dirname, 'PepperFlashPlayer.plugin')
}

app.commandLine.appendSwitch('ignore-certificate-errors', true)
app.commandLine.appendSwitch('ppapi-flash-path', ppapi_flash_path)
app.commandLine.appendSwitch('disable-web-security');

app.on('ready', function() {
  mainWindow = new BrowserWindow({
    'webPreferences': {
      'plugins': true,
      'nodeIntegration': true,
      'contextIsolation': false
    },
    frame: false,
    resizable: true,
    width: 1200,
    height: 800,
    show: false
  })
  
  // Maximize and show the window
  mainWindow.maximize()
  mainWindow.show()
  
  // Load the main window with control buttons and Flash content
  mainWindow.loadURL(`data:text/html,
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { 
          margin: 0; 
          padding: 0; 
          font-family: Arial, sans-serif;
          overflow: hidden;
          background: #f0f0f0;
        }
        #controls {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 0 10px;
          background: #2c3e50;
          -webkit-app-region: drag;
          -webkit-user-select: none;
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          height: 30px;
          z-index: 1000;
        }
        #window-controls {
          display: flex;
          gap: 10px;
          -webkit-app-region: no-drag;
        }
        #window-controls button {
          width: 12px;
          height: 12px;
          border-radius: 50%;
          padding: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 8px;
          line-height: 1;
          color: transparent;
        }
        #window-controls #minimize {
          background: #f1c40f;
        }
        #window-controls #maximize {
          background: #2ecc71;
        }
        #window-controls #close {
          background: #e74c3c;
        }
        button {
          background: #3498db;
          border: none;
          color: white;
          padding: 5px 15px;
          border-radius: 3px;
          cursor: pointer;
          font-size: 14px;
          -webkit-app-region: no-drag;
        }
        button:hover {
          background: #2980b9;
        }
        #flash-container {
          position: fixed;
          top: 30px; /* Leave space for the controls bar */
          left: 0;
          width: 100%;
          height: calc(100% - 30px);
          border: none;
        }
      </style>
    </head>
    <body>
      <div id="controls">
        <div>
          <button id="reload">Reload</button>
          <button id="clear-cache">Clear Cache</button>
        </div>
        <div id="window-controls">
          <button id="minimize">-</button>
          <button id="maximize">□</button>
          <button id="close">×</button>
        </div>
      </div>
      <iframe id="flash-container" src="${config.url}"></iframe>
      <script>
        const { ipcRenderer } = require('electron');
        
        document.getElementById('reload').addEventListener('click', () => {
          document.getElementById('flash-container').src = document.getElementById('flash-container').src;
        });
        
        document.getElementById('clear-cache').addEventListener('click', () => {
          const flashContainer = document.getElementById('flash-container');
          const currentUrl = flashContainer.src;
          
          // Send clear-cache IPC message
          ipcRenderer.send('clear-cache');
          
          // Reload the iframe after a short delay to ensure cache is cleared
          setTimeout(() => {
            flashContainer.src = currentUrl;
          }, 1000);
        });
        
        // Window controls
        document.getElementById('minimize').addEventListener('click', () => {
          const { remote } = require('electron');
          remote.getCurrentWindow().minimize();
        });
        
        document.getElementById('maximize').addEventListener('click', () => {
          const { remote } = require('electron');
          const win = remote.getCurrentWindow();
          if (win.isMaximized()) {
            win.unmaximize();
          } else {
            win.maximize();
          }
        });
        
        document.getElementById('close').addEventListener('click', () => {
          const { remote } = require('electron');
          remote.app.quit();
        });
      </script>
    </body>
    </html>
  `)
  // Open Dev Tools
  // mainWindow.webContents.openDevTools();

  mainWindow.webContents.session.webRequest.onHeadersReceived({ urls: [ "*://*/*" ] },
    (d, c)=>{
      if(d.responseHeaders['X-Frame-Options']){
        delete d.responseHeaders['X-Frame-Options'];
      } else if(d.responseHeaders['x-frame-options']) {
        delete d.responseHeaders['x-frame-options'];
      }

      c({cancel: false, responseHeaders: d.responseHeaders});
    }
  );
})

