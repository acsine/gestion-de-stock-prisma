const { app, BrowserWindow } = require('electron');
const { spawn } = require('child_process');
const path = require('path');
const http = require('http');

let mainWindow = null;
let nextProcess = null;
const PORT = 3000; // Port par défaut de Next.js local

function findFreePort(startPort, callback) {
  const server = http.createServer();
  server.listen(startPort, '127.0.0.1', () => {
    server.once('close', () => {
      callback(startPort);
    });
    server.close();
  });
  server.on('error', () => {
    findFreePort(startPort + 1, callback);
  });
}

function startNextServer(port) {
  console.log(`Démarrage du serveur Next.js sur le port ${port}...`);
  
  // Utiliser node pour lancer le serveur Next.js en production
  const nextBin = path.join(__dirname, 'node_modules', 'next', 'dist', 'bin', 'next');
  
  nextProcess = spawn('node', [nextBin, 'start', '-p', port.toString()], {
    cwd: __dirname,
    shell: true,
    env: {
      ...process.env,
      PORT: port.toString()
    }
  });

  nextProcess.stdout.on('data', (data) => {
    console.log(`[Next.js STDOUT]: ${data}`);
  });

  nextProcess.stderr.on('data', (data) => {
    console.error(`[Next.js STDERR]: ${data}`);
  });

  nextProcess.on('close', (code) => {
    console.log(`Le serveur Next.js s'est arrêté avec le code : ${code}`);
  });
}

function checkServerReady(port, callback) {
  const req = http.request({
    host: '127.0.0.1',
    port: port,
    path: '/api/setup/config', // endpoint simple
    method: 'GET',
    timeout: 1000
  }, (res) => {
    if (res.statusCode === 200) {
      callback(true);
    } else {
      setTimeout(() => checkServerReady(port, callback), 500);
    }
  });

  req.on('error', () => {
    setTimeout(() => checkServerReady(port, callback), 500);
  });

  req.end();
}

function createWindow(port) {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    icon: path.join(__dirname, 'icon.png'),
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true
    },
    autoHideMenuBar: true // Cacher la barre de menu classique
  });

  mainWindow.loadURL(`http://127.0.0.1:${port}`);

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  findFreePort(PORT, (port) => {
    startNextServer(port);
    checkServerReady(port, () => {
      createWindow(port);
    });
  });
});

app.on('window-all-closed', () => {
  // Tuer le processus Next.js en arrière-plan lors de la fermeture d'Electron
  if (nextProcess) {
    console.log("Fermeture du serveur Next.js...");
    if (process.platform === 'win32') {
      spawn("taskkill", ["/pid", nextProcess.pid, '/f', '/t']);
    } else {
      nextProcess.kill('SIGINT');
    }
  }
  app.quit();
});
