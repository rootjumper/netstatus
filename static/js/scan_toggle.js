var scanning = false;

function startScan() {
    scanning = true;
    document.getElementById('init-button').style.display = 'none';
    document.getElementById('stop-button').style.display = 'block';
    document.getElementById('init-progress').style.display = 'block';
    document.getElementById('init-info').style.display = 'block';
    socket.emit('init_network');
}

function stopScan() {
    scanning = false;
    document.getElementById('init-button').style.display = 'block';
    document.getElementById('stop-button').style.display = 'none';
    document.getElementById('init-progress').style.display = 'none';
    document.getElementById('init-info').style.display = 'none';
    socket.emit('stop_scan');
}

function toggleScan() {
    scanning = !scanning;
    if (scanning) {
        startScan();
    } else {
        stopScan();
    }
}
