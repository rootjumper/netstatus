function fetchNetworkStatus() {
    fetch("/get_status")
        .then(response => {
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            return response.json();
        })
        .then(data => {
            console.log('Received data:', data);
            if (data && typeof data === 'object') {
                updateNetworkUI(data);
            } else {
                console.error('Invalid data format:', data);
            }
        })
        .catch(error => console.error("Error fetching network status:", error));
}

function updateNetworkUI(statuses) {
    if (!statuses || typeof statuses !== 'object') {
        console.error('Invalid statuses data:', statuses);
        return;
    }

    Object.keys(statuses).forEach(name => {
        const data = statuses[name];
        const sanitized_name = name.replace(/ /g, "_");
        const networkCard = document.querySelector(`#networkCard${sanitized_name}`);

        if (networkCard) {
            const nameElement = networkCard.querySelector('.network-name');
            const pingLogContainer = networkCard.querySelector('.ping-log-container');
            const statusDot = networkCard.querySelector('.status-dot');
            const statusBadge = networkCard.querySelector('.status-badge');
            const upsince = networkCard.querySelector('.status-upsince');

            if (statusDot && statusBadge) {
                const latestPingLog = data.ping_logs[data.ping_logs.length - 1];
                if (latestPingLog) {
                    const status = latestPingLog.status;
                    const responseTime = latestPingLog.response_time;
                    const statusClass = status === 'Up' ? 'bg-success' : 'bg-danger';
                    const dotClass = status === 'Up' ? 'text-success' : 'text-danger';

                    statusDot.classList.remove('text-success', 'text-danger');
                    statusDot.classList.add(dotClass);
                    statusBadge.classList.remove('bg-success', 'bg-danger');
                    statusBadge.classList.add(statusClass);
                    statusBadge.textContent = status;

                    upsince.innerHTML = `<strong>Up Since:</strong> ${latestPingLog.timestamp}`;

                    const statusText = networkCard.querySelector('.status-text');
                    if (statusText) {
                        statusText.textContent = `${status} | ${responseTime}ms`;
                    }
                }
            }

            if (nameElement) nameElement.textContent = name;

            if (pingLogContainer) {
                pingLogContainer.innerHTML = data.ping_logs.map(log => `
                    <div class="ping-log-bar ${log.status === 'Up' ? 'success' : 'danger'}">
                        <div class="tooltip">
                            <strong>Timestamp:</strong> ${log.timestamp}<br>
                            <strong>Status:</strong> ${log.status}<br>
                            <strong>Response Time:</strong> ${log.response_time} ms
                        </div>
                    </div>
                `).join('');

                // Add click event to the new ping-log-bar entries
                pingLogContainer.querySelectorAll('.ping-log-bar').forEach(bar => {
                    bar.addEventListener('click', function() {
                        const tooltipContent = this.querySelector('.tooltip').innerHTML;
                        const infoWindow = document.getElementById('info-window');
                        const infoWindowContent = document.getElementById('info-window-content');
                        if (infoWindow && infoWindowContent) {
                            infoWindowContent.innerHTML = tooltipContent;
                            infoWindow.style.display = 'block';
                        } else {
                            console.error('Info window elements not found');
                        }
                    });
                });
            } else {
                console.error(`ping-log-container not found for ${name}`);
            }
        }
    });
}

fetchNetworkStatus();

let pingInterval = 60000;
let countdownValue = pingInterval / 1000;

const intervalInput = document.getElementById('interval-input');
if (intervalInput) {
    intervalInput.addEventListener('change', function() {
        pingInterval = parseInt(intervalInput.value, 10);
        countdownValue = pingInterval / 1000;
        clearInterval(pingIntervalId);
        pingIntervalId = setInterval(fetchNetworkStatus, pingInterval);
    });
}

const configButton = document.getElementById('config-button');
const intervalConfig = document.getElementById('interval-config');
if (configButton && intervalConfig) {
    configButton.addEventListener('click', function() {
        intervalConfig.style.display = intervalConfig.style.display === 'none' ? 'block' : 'none';
    });
}

const countdownTimer = document.getElementById('countdown-value');
function updateCountdown() {
    if (countdownValue > 0) {
        countdownValue--;
        countdownTimer.textContent = countdownValue;
    } else {
        countdownValue = pingInterval / 1000;
    }
}
setInterval(updateCountdown, 1000);

fetchNetworkStatus();
let pingIntervalId = setInterval(fetchNetworkStatus, pingInterval);
