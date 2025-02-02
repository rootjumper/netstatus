import threading
import subprocess
import telnetlib
import json
import platform
import os
import time
import ping3
from flask import Flask, render_template, jsonify
from flask_socketio import SocketIO, emit

app = Flask(__name__)
socketio = SocketIO(app)

# Dictionary to store Telnet session for each user (using socket session id)
telnet_sessions = {}


# Example of network subnets
default_subnets = {
    'Wi-Fi Router 1': '192.168.10.1',  # replace with actual IP for Router 1
    'Wi-Fi Router 2': '192.168.11.1',  # replace with actual IP for Router 2
    'Wi-Fi Router 3': '192.168.12.1',  # replace with actual IP for Router 3
}

# Path to the network.conf file
network_conf_path = 'network.conf'

# Load subnets from network.conf if it exists
def load_subnets():
    if os.path.exists(network_conf_path):
        try:
            with open(network_conf_path, 'r') as conf_file:
                network_config = json.load(conf_file)
                subnets = network_config.get('subnets', {})
                return subnets
        except Exception as e:
            print(f"Error loading network.conf: {e}")
            return default_subnets  # Return default if there's an error
    else:
        return default_subnets  # Return default if the file doesn't exist

# Load the subnets at the start
subnets = load_subnets()

# Sample structure for storing network status and logs
statuses = {}

# Function to ping an IP and return the response time
def ping_ip(ip):
    try:
        response_time = ping3.ping(ip)
        if response_time is not None:
            return response_time * 1000  # Convert to milliseconds
        else:
            return None
    except Exception as e:
        return None

# Function to generate and update the network status
def get_network_status():
    for name, ip in subnets.items():
        response_time = ping_ip(ip)
        status = "Up" if response_time is not None else "Down"
        
        # Define the 'up_since' time: if the status is "Up", set the current time as 'up_since'
        up_since_time = time.strftime("%Y-%m-%d %H:%M:%S") if status == "Up" else "N/A"

        # If the device is already in the statuses dictionary, update its existing data
        if name in statuses:
            statuses[name]['status'] = status
            statuses[name]['up_since'] = up_since_time
        else:
            statuses[name] = {
                "status": status,
                "up_since": up_since_time,
                "ping_logs": []
            }

        # Add a new ping log entry (with timestamp, IP, response time, and status)
        if response_time is not None:
            statuses[name]["ping_logs"].append({
                "timestamp": time.strftime("%Y-%m-%d %H:%M:%S"),
                "ip": ip,
                "status": status,
                "response_time": round(response_time, 2)
            })
        else:
            statuses[name]["ping_logs"].append({
                "timestamp": time.strftime("%Y-%m-%d %H:%M:%S"),
                "ip": ip,
                "status": "Down",
                "response_time": "N/A"
            })

# Endpoint to return the network status as JSON
@app.route("/get_status")
def get_status():
    get_network_status()  # Update the status
    return jsonify(statuses)

@app.route('/init_network', methods=['GET'])
def init_network():
    try:
        # Check OS type
        system = platform.system().lower()

        # Run different commands based on the OS
        if system == 'linux' or system == 'darwin':  # For Unix-like systems (Linux, macOS)
            route_output = subprocess.check_output(['route', '-n'], text=True)
        elif system == 'windows':  # For Windows
            route_output = subprocess.check_output(['route', 'print'], text=True)
        else:
            return json.dumps({'error': 'Unsupported Operating System'})

        # Extract subnets from the route command output
        new_subnets = []
        if system == 'linux' or system == 'darwin':
            # Parse the Unix-based route output (e.g., "0.0.0.0" for default route)
            for line in route_output.splitlines():
                columns = line.split()
                if len(columns) > 1 and columns[0] == "0.0.0.0":  # Look for the default route (gateway)
                    gateway = columns[1]  # Typically, the 3rd column is the gateway/subnet
        
                    # Check if the gateway/subnet is already in the new_subnets list
                    if gateway not in new_subnets:
                        new_subnets.append(gateway)  # Add the subnet if not already present

        elif system == 'windows':
            # Parse the Windows route output (look for the network destination and subnet mask columns)
            for line in route_output.splitlines():
                columns = line.split()
                if len(columns) >= 4 and columns[0] == "0.0.0.0":  # Look for default route (0.0.0.0)
                    gateway = columns[2]  # Typically, the 3rd column is the gateway/subnet
        
                    # Check if the gateway/subnet is already in the new_subnets list
                    if gateway not in new_subnets:
                        new_subnets.append(gateway)  # Add the subnet if not already present

        # Load existing subnets from network.conf
        try:
            with open('network.conf', 'r') as conf_file:
                network_config = json.load(conf_file)
                existing_subnets = network_config.get("subnets", {})

            # Find missing subnets (those not already in network.conf)
            missing_subnets = [subnet for subnet in new_subnets if subnet not in existing_subnets.values()]

            # If there are missing subnets, update network.conf
            if missing_subnets:
                for subnet in missing_subnets:
                    new_name = f"Wi-Fi Router {len(network_config['subnets']) + 1}"  # Simple name generator (could be more sophisticated)
        
                    network_config["subnets"][new_name] = subnet  # Add the new subnet to the subnets dictionary
                
                # Save updated config
                with open('network.conf', 'w') as conf_file:
                    json.dump(network_config, conf_file, indent=4)

            subnets = load_subnets()

            return json.dumps({"subnets": network_config["subnets"], "missing": missing_subnets})

        except FileNotFoundError:
            return json.dumps({"error": "network.conf file not found"})

    except subprocess.CalledProcessError as e:
        return json.dumps({'error': str(e)})
    except Exception as e:
        return json.dumps({'error': str(e)})

# Get WebSocket port based on subnet (e.g., 5100 for 192.168.10.x)
def get_websocket_port(ip_address):
    subnet_last_digit = int(ip_address.split('.')[2])
    return 5100 + subnet_last_digit  # Based on x.x.10.x, x.x.11.x, etc.

# Handle WebSocket commands from the frontend
def start_telnet_session(session_id, router_ip):
    try:
        tn = telnetlib.Telnet(router_ip)
        telnet_sessions[session_id] = tn
        
        # Send a welcome message to the client
        socketio.emit('output', {'message': f"Connected to {router_ip}\nType 'exit' to disconnect."}, room=session_id)
        
        while True:
            
            # Wait for a command from the client
            command = socketio.receive(session_id)
            
            if command:
                tn.write(command.encode('ascii') + b"\n")
                
                # Get output from the router
                output = tn.read_very_eager().decode('utf-8')
                socketio.emit('output', {'message': output}, room=session_id)
                
            if command.lower() == 'exit':
                tn.close()
                del telnet_sessions[session_id]
                socketio.emit('output', {'message': "Disconnected from router."}, room=session_id)
                break
    except Exception as e:
        socketio.emit('output', {'message': f"Error: {str(e)}"}, room=session_id)

@app.route('/start_telnet/<router_name>')
def start_telnet(router_name):
    """Start a Telnet session."""
    router_ips = load_subnets()
    router_ip = router_ips.get(router_name)
    # router_ip = None
    # for router in router_ips:
    #     if router[0] == router_name:
    #         router_ip = router[1]
    #         break
    
    if not router_ip:
        return jsonify({"error": "Router " + router_name + " not found"}), 404
    
    # Determine WebSocket port based on the router's IP subnet
    websocket_port = get_websocket_port(router_ip)
    
    # Start the Telnet session in a background thread
    session_id = f"session_{router_name}"
    threading.Thread(target=start_telnet_session, args=(session_id, router_ip)).start()
    
    return jsonify({"message": f"Telnet session started for {router_name}", "websocket_port": websocket_port}), 200

@app.route('/get_subnets')
def get_subnets():
    """Return list of available routers and their IPs."""
    return jsonify(load_subnets())

@app.route("/")
def index():
    get_network_status()
    return render_template("index.html", statuses=statuses, subnets=subnets)

if __name__ == "__main__":
    app.run(debug=True)
