const { spawn } = require('child_process');

function startTunnel() {
    console.log('Starting localtunnel...');
    const lt = spawn('npx', ['localtunnel', '--port', '3000', '--subdomain', 'sachand-stock-manager'], {
        shell: true
    });

    lt.stdout.on('data', (data) => {
        console.log(`[LT]: ${data.toString().trim()}`);
    });

    lt.stderr.on('data', (data) => {
        console.error(`[LT ERROR]: ${data.toString().trim()}`);
    });

    lt.on('close', (code) => {
        console.log(`Localtunnel exited with code ${code}. Restarting in 5 seconds...`);
        setTimeout(startTunnel, 5000);
    });
}

startTunnel();
