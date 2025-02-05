const socket = io({
    transports: ['websocket']
});


// Init network button click event
const initButton = document.getElementById('init-button');
const initProgress = document.getElementById('init-progress');
const initProgressBar = document.getElementById('init-progress-bar');
const initInfo = document.getElementById('init-info');
const initInfoText = document.getElementById('init-info-text');

socket.on('output', function(data) {
    console.log('outputss:', data);
    const outputDiv = document.getElementById('output');
    outputDiv.textContent += data.message + '\n';
    outputDiv.scrollTop = outputDiv.scrollHeight;
});

// Handle scan update event
socket.on('scan_update', function(data) {
    const ip = data.ip;
    const progress = data.progress;
    initInfoText.textContent = `Checking IP: ${ip} (${Math.round(progress)}%)`;
    initProgressBar.style.width = `${progress}%`;
});

// Handle init network response
socket.on('init_network_response', function(data) {
    if (data.error) {
        initInfoText.textContent = `Initialization failed: ${data.error}`;
    } else {
        console.log("Updated Subnets:", data.subnets);
        initInfoText.textContent = 'Initialization complete!';
    }
});
