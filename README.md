# Network Status Monitoring

This project provides a web-based interface to monitor the status of various network devices. It uses Flask for the backend, Socket.IO for real-time updates, and Bootstrap for the frontend styling.

## Overview

![Network Status](netstatus.png)

## Features

- **Network Status Monitoring**: View the status of multiple Wi-Fi routers, including whether they're up or down.
- **Real-Time Ping Logs**: Track the ping logs for each router, with timestamps and response times.
- **Dynamic Network Updates**: The app checks and updates network status at a configurable interval, displaying the current status for each router.
- **Configurable Ping Interval**: Set the ping interval dynamically through the web UI (default is 60 seconds).
- **Countdown Timer**: View the remaining time until the next ping update.
- **Subnets Management**: Automatically adds missing subnets to the `network.conf` file using the `route -n` (Linux/macOS) or `route print` (Windows) command to detect network configurations.
- **Scanning Subnets for Devices**: Scans each subnet for active devices and logs the active IPs found during the scan.
- **Stop Scanning**: Ability to stop the subnet scanning process at any time.
- **Logging**: Logs active IPs found during the subnet scan.

## Missing Features (TBD)
- **Telnet Interface**: Telnet server provides remote command execution capabilities.

## Technologies Used

- **Backend**: Python (Flask, Socket.IO, subprocess)
- **Frontend**: HTML, CSS, JavaScript (Bootstrap, FontAwesome)
- **WebSocket**: `flask-socketio` for real-time communication
- **Telnet**: Python `telnetlib` for Telnet interactions

## Installation

1. Clone the repository:
    ```sh
    git clone https://github.com/yourusername/netstatus.git
    cd netstatus
    ```

2. Create a virtual environment and activate it:
    ```sh
    python3 -m venv venv
    source venv/bin/activate  # On Windows use `venv\Scripts\activate`
    ```

3. Install the required packages:
    ```sh
    pip install -r requirements.txt
    ```

4. Run the application:
    ```sh
    python app.py
    ```

5. Open your web browser and navigate to `http://localhost:5000`.

## Configuration

### Network Configuration

The network devices are configured in the `network.conf` file. This file contains a JSON object with the subnets to be monitored. The application will automatically update this file when new devices are added.

### Themes

The application supports multiple themes:
- Light Theme
- Dark Theme
- Black-Yellow Theme

You can toggle between themes using the "Toggle Theme" button in the web interface.

## Usage

### Adding a New Network Device

1. Click the "Add Network" button.
2. Fill in the network name and IP address.
3. Click "Add Network" to save the new device.

### Renaming a Network Device

1. Click the edit icon next to the device name.
2. Enter the new name and press Enter.

### Viewing Ping Logs

Hover over the ping log bars to view detailed information about each ping, including timestamp, status, response time, and time ago.

### Telnet Support (TBD)

The application will support Telnet for remote device management. This feature is currently under development.

## Contributing

Contributions are welcome! Please fork the repository and submit a pull request with your changes.

## License

This project is licensed under the MIT License. See the `LICENSE` file for details.
