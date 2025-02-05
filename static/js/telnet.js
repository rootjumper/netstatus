let telnetSockets = {};

async function toggleTelnet(routerName) {
    const sanitizedRouterName = routerName.replace(/\s+/g, '_');
    const telnetBtn = document.getElementById(`telnetBtn${sanitizedRouterName}`);
    const networkCard = document.querySelector(`#networkCard${sanitizedRouterName}`);
    const outputDiv = networkCard.querySelector('#output');
    const commandInput = networkCard.querySelector('#commandInput');
    const sendCommandBtn = networkCard.querySelector('#sendCommandBtn');

    const sendCommandHandler = function() {
        const command = commandInput.value.trim();
        console.log("sendCommandBtn clicked, command: ", command);
        if (command) {
            telnetSockets[sanitizedRouterName].emit('telnet_command', { command: command + '\r' });
            commandInput.value = '';
        } else {
            telnetSockets[sanitizedRouterName].emit('telnet_command', { command: '\r' });
            commandInput.value = '';
        }
    };

    if (telnetSockets[sanitizedRouterName]) {
        console.log("Disconnect from telnet:", sanitizedRouterName);
        // Disconnect Telnet
        telnetSockets[sanitizedRouterName].emit('telnet_command', { command: 'exit\r\n' });
        telnetSockets[sanitizedRouterName].close();
        delete telnetSockets[sanitizedRouterName];
        telnetBtn.innerHTML = '<i class="fas fa-terminal"></i>';
        telnetBtn.classList.remove('btn-success');
        telnetBtn.classList.add('btn-info');
        outputDiv.innerHTML += '<br>Disconnected<br>';
        sendCommandBtn.removeEventListener('click', sendCommandHandler);
        commandInput.disabled = true;
        sendCommandBtn.disabled = true;
    } else {
        // Connect Telnet
        const socket = io({
            transports: ['websocket']
        });

        socket.on('output', function(data) {
            console.log("output event received:", data);
            if (data.namespace) {
                const namespace = data.namespace;
                const telnetSocket = io(namespace, {
                    transports: ['websocket']
                });

                telnetSockets[sanitizedRouterName] = telnetSocket;

                telnetSocket.on('output', function(data) {
                    console.log("telnetSocket output event received:", data);
                    const formattedMessage = data.message.replace(/\n/g, '');
                    outputDiv.innerHTML += formattedMessage;
                    outputDiv.scrollTop = outputDiv.scrollHeight;
                });

                sendCommandBtn.addEventListener('click', sendCommandHandler);

                telnetSocket.on('connect', function() {
                    console.log("telnetSocket connected.");
                    telnetBtn.innerHTML = '<i class="fas fa-times"></i>';
                    telnetBtn.classList.remove('btn-info');
                    telnetBtn.classList.add('btn-success');
                    commandInput.disabled = false;
                    sendCommandBtn.disabled = false;
                });

                telnetSocket.on('disconnect', function() {
                    console.log("telnetSocket disconnected.");
                    sendCommandBtn.removeEventListener('click', sendCommandHandler);
                    telnetSockets[sanitizedRouterName].close();
                    delete telnetSockets[sanitizedRouterName];
                    telnetBtn.innerHTML = '<i class="fas fa-terminal"></i>';
                    telnetBtn.classList.remove('btn-success');
                    telnetBtn.classList.add('btn-info');
                    commandInput.disabled = true;
                    sendCommandBtn.disabled = true;
                });

                telnetSocket.on('error', function(error) {
                    console.error("telnetSocket error:", error);
                });
                
            } else {
                const formattedMessage = data.message.replace(/\n/g, '<br>').replace(/\x1b\[[0-9;]*m/g, '');
                outputDiv.innerHTML += formattedMessage + '<br>';
                outputDiv.scrollTop = outputDiv.scrollHeight;
            }
        });

        socket.on('connect', function() {
            console.log("socket connected.");
        });

        socket.on('disconnect', function() {
            console.log("socket disconnected.");
        });

        socket.on('error', function(error) {
            console.error("socket error:", error);
        });

        outputDiv.setAttribute('style', 'display: block;');
        outputDiv.innerHTML = 'Connecting...<br>';
        socket.emit('start_telnet', { router_name: routerName });
    }
}
