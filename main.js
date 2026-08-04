const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');
const { exec } = require('child_process');

function createWindow() {
  const mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    },
    autoHideMenuBar: true,
    title: 'Rawat Samachar Desktop CMS'
  });

  mainWindow.loadFile(path.join(__dirname, 'cms', 'index.html'));
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.stop();
    app.quit();
  }
});

// IPC Handler: Save Article & Auto Publish via Git
ipcMain.handle('publish-article', async (event, articleData) => {
  try {
    const dataDir = path.join(__dirname, 'website', 'data');
    const articlesFile = path.join(dataDir, 'articles.json');

    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }

    let articles = [];
    if (fs.existsSync(articlesFile)) {
      const fileContent = fs.readFileSync(articlesFile, 'utf8');
      try {
        articles = JSON.parse(fileContent);
      } catch (e) {
        articles = [];
      }
    }

    // Prepend new article
    articles.unshift(articleData);

    // Save updated JSON
    fs.writeFileSync(articlesFile, JSON.stringify(articles, null, 2), 'utf8');

    // Execute Git Workflow
    const executeCommand = (cmd) => {
      return new Promise((resolve, reject) => {
        exec(cmd, { cwd: __dirname }, (error, stdout, stderr) => {
          if (error) {
            reject(stderr || error.message);
          } else {
            resolve(stdout);
          }
        });
      });
    };

    await executeCommand('git status');
    await executeCommand('git add .');
    await executeCommand(`git commit -m "Published: ${articleData.title}"`);
    await executeCommand('git push origin main');

    return { success: true, message: 'Article successfully published and pushed to GitHub!' };
  } catch (error) {
    return { success: false, error: error.toString() };
  }
});