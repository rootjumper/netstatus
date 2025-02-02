# Network Status Monitoring (with (TBD)Telnet and (TBD)WebSocket)

This project allows you to monitor the status of various network routers, track their ping logs, and even access a Telnet interface for remote interactions. The app uses Flask, Socket.IO, and WebSockets for real-time communication, as well as dynamic updates for network status monitoring.

## Features

- **Network Status Monitoring**: View the status of multiple Wi-Fi routers, including whether they're up or down.
- **Real-Time Ping Logs**: Track the ping logs for each router, with timestamps and response times.
- **Dynamic Network Updates**: The app checks and updates network status every 10 seconds, displaying the current status for each router.
- **Subnets Management**: Automatically adds missing subnets to the `network.conf` file using the `route -n` (Linux/macOS) or `route print` (Windows) command to detect network configurations.

## Missing Features (TBD)
- **Telnet Interface**: Connect to a router's Telnet interface and interact with it in real-time through the web UI.
- **WebSocket Communication**: WebSocket server provides real-time updates and handles Telnet connections.

## Technologies Used

- **Backend**: Python (Flask, Socket.IO, subprocess)
- **Frontend**: HTML, CSS, JavaScript (Bootstrap, FontAwesome)
- **WebSocket**: `flask-socketio` for real-time communication
- **Telnet**: Python `telnetlib` for Telnet interactions

## Installation

1. **Clone the repository**:
   ```bash
   git clone https://github.com/rootjumper/netstatus.git .

2. **Navigate to the project folder**:
    ```bash
    cd netstatus

3. **Install the required dependencies**:
    ```bash
    pip install -r requirements.txt

4. **Create a network.conf file in the project root if it doesn't already exist. This file should contain subnets in the following format**:
    ```bash
    {
        "subnets": {
            "Wi-Fi Router 1": "192.168.10.1",
            "Wi-Fi Router 2": "192.168.11.1",
            "Wi-Fi Router 3": "192.168.12.1",
            "Wi-Fi Router 4": "192.168.0.1"
        }
    }

## Usage

1. **Start the Flask App**:
    ```bash
    python app.py

2. **The application will be available at http://127.0.0.1:5000/. Visit the URL in your browser to view the network status dashboard**.

3. **Network Status Dashboard**:
    View the status of all connected routers.
    Ping logs are updated every 10 seconds with the latest ping results.
    You can interact with each router by clicking on the Telnet button. This will open a small shell window where you can send commands to the router and receive real-time feedback.

4. **(TBD)Telnet Interface**:
    Click Telnet to [Router Name] to open a Telnet session.
    You can type commands in the text box, and the results will be shown in real-time.
    To disconnect, simply click the Disconnect button.

## How It Works
### Backend (Python Flask)

- **app.py**: The backend is built with Flask, which serves the front-end pages and provides the API routes for updating network statuses and Telnet functionality.
    Network Status: The system checks for the current status of routers every 10 seconds using the ping command, and updates the status dynamically in the front-end.
    Telnet Communication: Using WebSockets, the backend communicates with the front-end, allowing real-time Telnet connections to routers.
    Dynamic Subnet Management: The app uses the route -n command (Linux/macOS) or route print (Windows) to detect current network configurations and update the network.conf file as needed.

### Frontend (HTML, CSS, JavaScript)

- **Network Status Page**: Displays the router status in a grid view, along with recent ping logs (up to the last 10 pings).
    Ping Logs: Each router has a collapsible section that displays the latest ping logs, including timestamps, status, and response times.
    Telnet Interface: Each router card has a Telnet button that, when clicked, opens a Telnet interface. This allows the user to type and execute commands via a small shell window.
    WebSockets: The front-end uses JavaScript to open WebSocket connections to the backend, sending and receiving real-time updates for both network status and Telnet commands.

## Troubleshooting

- Ensure your network.conf file is correctly formatted. It should contain an object with a subnets key pointing to a dictionary of router names and their respective IP addresses.
- Make sure the correct dependencies are installed by running pip install -r requirements.txt.
