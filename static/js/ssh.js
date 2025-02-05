let sshSockets = {};

async function toggleSSH(routerName) {
    const sanitizedRouterName = routerName.replace(/\s+/g, '_');
    const sshBtn = document.getElementById(`sshBtn${sanitizedRouterName}`);
    const networkCard = document.querySelector(`#networkCard${sanitizedRouterName}`);
    const outputDiv = networkCard.querySelector(`#sshOutput${sanitizedRouterName}`);
    const commandInput = networkCard.querySelector(`#sshCommandInput${sanitizedRouterName}`);
    const sendCommandBtn = networkCard.querySelector(`#sendSSHCommandBtn${sanitizedRouterName}`);
    const usernameInput = networkCard.querySelector(`#sshUsernameInput${sanitizedRouterName}`);
    const passwordInput = networkCard.querySelector(`#sshPasswordInput${sanitizedRouterName}`);
    const downloadLogBtn = networkCard.querySelector(`#downloadSSHLogBtn${sanitizedRouterName}`);

    const sendCommandHandler = function() {
        const command = commandInput.value.trim();
        console.log("sendSSHCommandBtn clicked, command: ", command);
        if (command) {
            sshSockets[sanitizedRouterName].emit('ssh_command', { command: command});
            commandInput.value = '';
        } else {
            sshSockets[sanitizedRouterName].emit('ssh_command', { command: '' });
            commandInput.value = '';
        }
        commandInput.focus(); // Refocus the textbox for the next command
    };

    const handleEnterKey = function(event) {
        if (event.key === 'Enter') {
            sendCommandHandler();
        }
    };

    if (sshSockets[sanitizedRouterName]) {
        console.log("Disconnect from SSH:", sanitizedRouterName);
        // Disconnect SSH
        sshSockets[sanitizedRouterName].emit('ssh_command', { command: 'exit\r\n' });
        sshSockets[sanitizedRouterName].close();
        delete sshSockets[sanitizedRouterName];
        sshBtn.innerHTML = '<i class="fas fa-terminal"></i>';
        sshBtn.classList.remove('btn-success');
        sshBtn.classList.add('btn-info');
        outputDiv.innerHTML += '<br>Disconnected<br>';
        sendCommandBtn.removeEventListener('click', sendCommandHandler);
        commandInput.removeEventListener('keydown', handleEnterKey);
        commandInput.disabled = true;
        sendCommandBtn.disabled = true;
        commandInput.style.display = 'none';
        sendCommandBtn.style.display = 'none';
        usernameInput.disabled = false;
        passwordInput.disabled = false;
        usernameInput.style.display = 'block';
        passwordInput.style.display = 'block';
        downloadLogBtn.style.display = 'none';
    } else {
        // Connect SSH
        const socket = io({
            transports: ['websocket']
        });

        socket.on('ssh_output', function(data) {
            console.log("ssh_output event received:", data);
            if (data.namespace) {
                const namespace = data.namespace;
                const sshSocket = io(namespace, {
                    transports: ['websocket']
                });

                sshSockets[sanitizedRouterName] = sshSocket;

                sshSocket.on('ssh_output', function(data) {
                    console.log("sshSocket ssh_output event received:", data);
                    const formattedMessage = data.message.replace(/\n/g, '');
                    outputDiv.innerHTML += formattedMessage;
                    outputDiv.scrollTop = outputDiv.scrollHeight;
                });

                sendCommandBtn.addEventListener('click', sendCommandHandler);
                commandInput.addEventListener('keydown', handleEnterKey);

                sshSocket.on('connect', function() {
                    console.log("sshSocket connected.");
                    sshBtn.innerHTML = '<i class="fas fa-times"></i>';
                    sshBtn.classList.remove('btn-info');
                    sshBtn.classList.add('btn-success');
                    commandInput.disabled = false;
                    sendCommandBtn.disabled = false;
                    commandInput.style.display = 'block';
                    sendCommandBtn.style.display = 'block';
                    usernameInput.disabled = true;
                    passwordInput.disabled = true;
                    usernameInput.style.display = 'none';
                    passwordInput.style.display = 'none';
                    commandInput.focus(); // Focus the textbox for the first command
                });

                sshSocket.on('disconnect', function() {
                    console.log("sshSocket disconnected.");
                    sendCommandBtn.removeEventListener('click', sendCommandHandler);
                    commandInput.removeEventListener('keydown', handleEnterKey);
                    sshSockets[sanitizedRouterName].close();
                    delete sshSockets[sanitizedRouterName];
                    sshBtn.innerHTML = '<i class="fas fa-terminal"></i>';
                    sshBtn.classList.remove('btn-success');
                    sshBtn.classList.add('btn-info');
                    commandInput.disabled = true;
                    sendCommandBtn.disabled = true;
                    commandInput.style.display = 'none';
                    sendCommandBtn.style.display = 'none';
                    usernameInput.disabled = false;
                    passwordInput.disabled = false;
                    usernameInput.style.display = 'block';
                    passwordInput.style.display = 'block';
                });

                sshSocket.on('error', function(error) {
                    console.error("sshSocket error:", error);
                });
                
            } else {
                const formattedMessage = data.message.replace(/\n/g, '<br>').replace(/\x1b\[[0-9;]*m/g, '');
                outputDiv.innerHTML += formattedMessage + '<br>';
                outputDiv.scrollTop = outputDiv.scrollHeight;
                if (outputDiv.innerText.trim()) {
                    downloadLogBtn.style.display = 'block';
                }
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

        const username = usernameInput.value.trim() || 'root';
        const password = passwordInput.value.trim() || 'root';

        outputDiv.setAttribute('style', 'display: block;');
        outputDiv.innerHTML = 'Connecting...<br>';
        socket.emit('start_ssh', { router_name: routerName, username: username, password: password });
    }
}

function downloadSSHLog(routerName) {
    const sanitizedRouterName = routerName.replace(/\s+/g, '_');
    const networkCard = document.querySelector(`#networkCard${sanitizedRouterName}`);
    const outputDiv = networkCard.querySelector(`#sshOutput${sanitizedRouterName}`);
    const logContent = outputDiv.innerText;
    const blob = new Blob([logContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${sanitizedRouterName}_ssh_log.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}
