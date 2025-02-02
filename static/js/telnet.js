async function startTelnet(routerName) {
    const response = await fetch(`/start_telnet/${routerName}`);
    const data = await response.json();
    
    if (data.error) {
        alert(data.error);
        return;
    }

    // const websocketPort = data.websocket_port;
    // const socket = new WebSocket(`ws://localhost:${websocketPort}`);
    
    const socket = io({
        transports: ['websocket']
    });
    
    // Handle init network response
    socket.on('output', function(data) {
        console.log('output:', data);
        if (data.error) {
            
        } else {
            console.log("Updated Subnets:", data.subnets)
        }
    });
// Handle init network response
    socket.on('telnet_started', function(data) {
        console.log('telnet_started:', data);
        if (data.error) {
            
        } else {
            console.log("Updated Subnets:", data.subnets)
        }
    });

    const outputDiv = document.getElementById('output');
    const commandInput = document.getElementById('commandInput');
    const sendCommandBtn = document.getElementById('sendCommandBtn');
    const disconnectBtn = document.getElementById('disconnectBtn');

    socket.onmessage = function(event) {
        console.log('onmessage:', event.data);
        const data = JSON.parse(event.data);
        if (data.message) {
            outputDiv.textContent += data.message + '\n';
            outputDiv.scrollTop = outputDiv.scrollHeight;
        }
    };

    sendCommandBtn.addEventListener('click', function() {
        const command = commandInput.value.trim();
        if (command) {
            socket.send(JSON.stringify({ command: command }));
            commandInput.value = '';
        }
    });

    disconnectBtn.addEventListener('click', function() {
        socket.send(JSON.stringify({ command: 'exit' }));
        socket.close();
    });

    socket.onopen = function() {
        console.log("WebSocket connected.");
    };

    socket.onerror = function(error) {
        console.error("WebSocket Error: ", error);
    };

    socket.onclose = function() {
        console.log("WebSocket connection closed.");
    };
}
