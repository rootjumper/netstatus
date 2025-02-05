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
            const statusBadge = networkCard.querySelector('.status-badge');
            const upsince = networkCard.querySelector('.status-upsince');
            const uptimeInfo = networkCard.querySelector('.uptime-info');
            const pingLogInfo = networkCard.querySelector('.ping-log-info');

            if (statusBadge) {
                const latestPingLog = data.ping_logs[data.ping_logs.length - 1];
                if (latestPingLog) {
                    const status = latestPingLog.status;
                    const responseTime = latestPingLog.response_time;
                    const statusClass = status === 'Up' ? 'bg-success' : 'bg-danger';
                    const dotClass = status === 'Up' ? 'text-success' : 'text-danger';

                    statusBadge.classList.remove('bg-success', 'bg-danger');
                    statusBadge.classList.add(statusClass);
                    statusBadge.textContent = status;

                    upsince.innerHTML = `<strong>Last Seen:</strong> ${latestPingLog.timestamp}`;

                    const statusText = networkCard.querySelector('.status-text');
                    if (statusText) {
                        statusText.textContent = `${status} | ${responseTime}ms`;
                    }
                }
            }

            if (nameElement) nameElement.textContent = name;

            if (pingLogContainer) {
                const maxPingLogs = 56; // Maximum number of ping logs to display
                const pingLogs = data.ping_logs.slice(-maxPingLogs); // Get the last 'maxPingLogs' entries

                pingLogContainer.innerHTML = pingLogs.map((log, index) => {
                    const timeDiff = (new Date() - new Date(log.timestamp)) / 1000;
                    let timeAgo;
                    if (timeDiff < 60) {
                        timeAgo = `${Math.round(timeDiff)} seconds ago`;
                    } else if (timeDiff < 3600) {
                        timeAgo = `${Math.round(timeDiff / 60)} minutes ago`;
                    } else if (timeDiff < 86400) {
                        timeAgo = `${Math.round(timeDiff / 3600)} hours ago`;
                    } else {
                        timeAgo = `${Math.round(timeDiff / 86400)} days ago`;
                    }

                    return `
                        <div class="ping-log-bar ${log.status === 'Up' ? 'success' : 'danger'}" style="order: ${maxPingLogs - index}">
                            <div class="tooltip">
                                <strong>Timestamp:</strong> ${log.timestamp}<br>
                                <strong>Status:</strong> ${log.status}<br>
                                <strong>Response Time:</strong> ${log.response_time} ms<br>
                                <strong>Time Ago:</strong> ${timeAgo}
                            </div>
                        </div>
                    `;
                }).join('');

                // Add mouse events to the new ping-log-bar entries
                pingLogContainer.querySelectorAll('.ping-log-bar').forEach(bar => {
                    bar.addEventListener('mouseover', function(event) {
                        const tooltipContent = this.querySelector('.tooltip').innerHTML;
                        const infoWindow = document.getElementById('info-window');
                        const infoWindowContent = document.getElementById('info-window-content');
                        if (infoWindow && infoWindowContent) {
                            infoWindowContent.innerHTML = tooltipContent;
                            infoWindow.style.display = 'block';
                            infoWindow.style.left = event.pageX + 'px';
                            infoWindow.style.top = (bar.getBoundingClientRect().bottom + window.scrollY + 10) + 'px'; // Adjust position to be below the bar
                        } else {
                            console.error('Info window elements not found');
                        }
                    });

                    bar.addEventListener('mouseout', function() {
                        const infoWindow = document.getElementById('info-window');
                        if (infoWindow) {
                            infoWindow.style.display = 'none';
                        }
                    });

                    bar.addEventListener('mousemove', function(event) {
                        const infoWindow = document.getElementById('info-window');
                        if (infoWindow) {
                            infoWindow.style.left = event.pageX + 'px';
                            infoWindow.style.top = (bar.getBoundingClientRect().bottom + window.scrollY + 10 + (infoWindow.offsetHeight / 2)) + 'px'; // Adjust position to be below the bar
                        }
                    });
                });
            } else {
                console.error(`ping-log-container not found for ${name}`);
            }

            const uptimePercentage = calculateUptimePercentage(data.ping_logs);
            if (uptimeInfo) {
                uptimeInfo.innerHTML = `<strong>Uptime:</strong> ${uptimePercentage}%`;
            }

            if (pingLogInfo) {
                const firstLog = data.ping_logs[0];
                const timeDiff = (new Date() - new Date(firstLog.timestamp)) / 1000;
                let timeAgo;
                if (timeDiff < 60) {
                    timeAgo = `${Math.round(timeDiff)} seconds ago`;
                } else if (timeDiff < 3600) {
                    timeAgo = `${Math.round(timeDiff / 60)} minutes ago`;
                } else if (timeDiff < 86400) {
                    timeAgo = `${Math.round(timeDiff / 3600)} hours ago`;
                } else {
                    timeAgo = `${Math.round(timeDiff / 86400)} days ago`;
                }

                pingLogInfo.innerHTML = `
                    <div class="time-ago">${timeAgo}</div>
                    <div class="uptime-percentage"><strong>Uptime:</strong> ${uptimePercentage}%</div>
                    <div class="now">Now</div>
                `;
            }
        }
    });
}

function calculateUptimePercentage(pingLogs) {
    if (pingLogs.length === 0) return "0.00";
    const totalLogs = pingLogs.length;
    const upLogs = pingLogs.filter(log => log.status === 'Up').length;
    return ((upLogs / totalLogs) * 100).toFixed(2);
}

function savePingInterval(interval) {
    localStorage.setItem('pingInterval', interval);
}

function loadPingInterval() {
    const savedInterval = localStorage.getItem('pingInterval');
    console.log('Loaded ping interval from localStorage:', savedInterval);
    return savedInterval ? parseInt(savedInterval, 10) : 60000;
}

let pingInterval = loadPingInterval();
console.log('Initial ping interval:', pingInterval);
let countdownValue = pingInterval / 1000;

const intervalInput = document.getElementById('interval-input');
if (intervalInput) {
    intervalInput.value = pingInterval;
    intervalInput.addEventListener('change', function() {
        pingInterval = parseInt(intervalInput.value, 10);
        countdownValue = pingInterval / 1000;
        savePingInterval(pingInterval);
        clearInterval(pingIntervalId);
        pingIntervalId = setInterval(fetchNetworkStatus, pingInterval);
        console.log('Updated ping interval:', pingInterval);
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
        fetchNetworkStatus(); // Fetch network status when countdown reaches zero
    }
}
setInterval(updateCountdown, 1000);

fetchNetworkStatus();
let pingIntervalId = setInterval(fetchNetworkStatus, pingInterval);
