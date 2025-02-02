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
            const pingLogContainer = networkCard.querySelector('.accordion-body');
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

                    upsince.textContent.innerHTML = `<strong>Up Since:</strong>` + latestPingLog.timestamp;

                    const statusText = networkCard.querySelector('.status-text');
                    if (statusText) {
                        statusText.textContent = `${status} | ${responseTime}ms`;
                    }
                }
            }

            if (nameElement) nameElement.textContent = name;

            if (pingLogContainer) {
                pingLogContainer.innerHTML = data.ping_logs.reverse().map(log => `
                    <div class="ping-log-item d-flex justify-content-between align-items-center border rounded-3">
                        <div class="d-flex align-items-center">
                            <i class="fas fa-clock fa-lg me-2"></i>
                            <strong>${log.timestamp}</strong>
                        </div>
                        <span class="badge ${log.status === 'Up' ? 'bg-success' : 'bg-danger'}">${log.status}</span>
                        <span class="badge ${log.status === 'Up' ? 'bg-success' : 'bg-danger'}"> ${log.response_time}</span>
                    </div>
                `).join('');
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
