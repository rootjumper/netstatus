from gevent import monkey
monkey.patch_all()

import threading
import subprocess
import telnetlib3
import json
import platform
import os
import time
import ping3
import logging
from flask import Flask, request, render_template, jsonify, send_file, redirect, url_for
from flask_socketio import SocketIO, emit, join_room, leave_room, close_room, rooms, disconnect
from werkzeug.utils import secure_filename
import paramiko
from datetime import datetime

# Configure logging
logging.basicConfig(level=logging.ERROR)

app = Flask(__name__)
socketio = SocketIO(app, cors_allowed_origins="*")

# Dictionary to store Telnet session for each user (using socket session id)
telnet_sessions = {}

# Dictionary to store SSH session for each user (using socket session id)
ssh_sessions = {}

# Example of network subnets with ports
default_subnets = {
    'Wi-Fi Router 1': {'ip': '192.168.10.1', 'port': 80},  # replace with actual IP and port for Router 1
    'Wi-Fi Router 2': {'ip': '192.168.11.1', 'port': 80},  # replace with actual IP and port for Router 2
    'Wi-Fi Router 3': {'ip': '192.168.12.1', 'port': 80},  # replace with actual IP and port for Router 3
}

# Path to the network.conf file
network_conf_path = 'network.conf'

# Lock for synchronizing access to network.conf
subnet_lock = threading.Lock()

# Save updated subnets to network.conf
def save_subnets(subnets):
    try:
        with subnet_lock:
            with open(network_conf_path, 'w') as conf_file:
                json.dump({"subnets": subnets}, conf_file, indent=4)
        logging.info(f"Subnets saved to {network_conf_path}: {subnets}")
    except Exception as e:
        logging.error(f"Error saving to network.conf: {e}")
        
# Load subnets from network.conf if it exists
def load_subnets():
    try:
        with subnet_lock:
            with open(network_conf_path, 'r') as conf_file:
                network_config = json.load(conf_file)
                subnets = network_config.get('subnets', {})
                logging.info(f"Subnets loaded from {network_conf_path}: {subnets}")
                return subnets
    except Exception as e:
        logging.error(f"Error loading network.conf: {e}")
        return default_subnets  # Return default if there's an error

# Load the subnets at the start
subnets = load_subnets()

# Sample structure for storing network status and logs
statuses = {}

# Lock for synchronizing ping operations
ping_lock = threading.Lock()

# Function to ping an IP and return the response time
def ping_ip(ip):
    try:
        with ping_lock:
            response_time = ping3.ping(ip, 1)
        if response_time is not None and response_time is not False:
            logging.info(f"Ping to {ip} successful, response time: {response_time * 1000} ms")
            return response_time * 1000  # Convert to milliseconds
        else:
            logging.warning(f"Ping to {ip} failed")
            return None
    except Exception as e:
        logging.error(f"Error pinging {ip}: {e}")
        return None

# Function to ping an IP with up to 3 retries if failed
def ping_ip_with_retries(ip, max_retries=3):
    for attempt in range(max_retries):
        response_time = ping_ip(ip)
        if response_time is not None:
            return response_time  # Success
    return None  # Failed after retries

# Variable to control scanning
scanning = True

# Variable to control the ping interval (default to 60 seconds)
ping_interval = 60

# Function to periodically ping devices
def periodic_ping():
    global scanning, ping_interval
    while scanning:
        start_time = time.time()
        get_network_status(load_subnets_flag=False)
        elapsed = time.time() - start_time
        sleep_time = max(0, ping_interval - elapsed)
        time.sleep(sleep_time)

# Function to start the periodic ping thread
def start_periodic_ping():
    ping_thread = threading.Thread(target=periodic_ping)
    ping_thread.daemon = True
    ping_thread.start()

# Function to scan a subnet for active clients
def scan_subnet(subnet, session_id, scanned_subnets):
    global scanning
    if subnet in scanned_subnets:
        logging.info(f"Subnet {subnet} already scanned. Skipping...")
        return []

    active_clients = []
    base_ip = ".".join(subnet.split(".")[:3]) + "."
    total_ips = 254
    for i in range(1, 255):
        if not scanning:
            break
        ip = base_ip + str(i)
        # Send the current IP being checked and progress to the frontend
        progress = (i / total_ips) * 100
        socketio.emit('scan_update', {'ip': ip, 'progress': progress}, room=session_id)
        response_time = ping_ip(ip)
        if response_time is not None:
            active_clients.append(ip)
            logging.info(f"Found active IP: {ip} with response time: {response_time}ms")
            
            # Load the current subnets from the file
            subnets = load_subnets()
            
            # Check if the IP is already in the subnets
            if ip not in subnets.values():
                # Generate a generic name for the new IP
                new_name = f"Device {len(subnets) + 1}"
                subnets[new_name] = ip
                
                # Save the updated subnets back to the network.conf
                save_subnets(subnets)

    scanned_subnets.add(subnet)
    return active_clients

# Directory for storing daily ping logs
log_directory = os.path.join(app.root_path, 'logs')
if not os.path.exists(log_directory):
    os.makedirs(log_directory)

# Function to save ping logs to a daily log file
def save_ping_logs_to_file(name, log_entry):
    try:
        # Get the current date for the log file name
        current_date = datetime.now().strftime('%Y-%m-%d')
        log_file_path = os.path.join(log_directory, f'ping_logs_{current_date}.json')

        # Read existing logs if the file exists
        if os.path.exists(log_file_path):
            with open(log_file_path, 'r') as log_file:
                daily_logs = json.load(log_file)
        else:
            daily_logs = {}

        # Append the new log entry to the respective device's logs
        if name not in daily_logs:
            daily_logs[name] = []
        daily_logs[name].append(log_entry)

        # Save the updated logs back to the file
        with open(log_file_path, 'w') as log_file:
            json.dump(daily_logs, log_file, indent=4)

    except Exception as e:
        logging.error(f"Error saving ping logs to file: {e}")

# Function to load the log of the day
def load_daily_logs():
    try:
        # Get the current date for the log file name
        current_date = datetime.now().strftime('%Y-%m-%d')
        log_file_path = os.path.join(log_directory, f'ping_logs_{current_date}.json')

        # Read the log file if it exists
        if os.path.exists(log_file_path):
            with open(log_file_path, 'r') as log_file:
                return json.load(log_file)
        else:
            return {}
    except Exception as e:
        logging.error(f"Error loading daily logs: {e}")
        return {}

# Function to generate and update the network status
def get_network_status(load_subnets_flag):
    global subnets, statuses
    if load_subnets_flag:
        subnets = load_subnets()  # Reload the subnets from the configuration file
        # Sync statuses with the new subnets list
        new_statuses = {}
        for name, info in subnets.items():
            if name in statuses:
                new_statuses[name] = statuses[name]
        statuses = new_statuses

    # Load the log of the day
    daily_logs = load_daily_logs()

    # Remove any statuses not in the subnets list
    statuses = {name: status for name, status in statuses.items() if name in subnets}

    for name, info in subnets.items():
        if ':' in info:
            ip = info.split(':')[0]
        else:
            ip = info
        # Use the retry logic here
        response_time = ping_ip_with_retries(ip, max_retries=3)
        status = "Up" if response_time is not None else "Down"
        timestamp = time.strftime("%Y-%m-%d %H:%M:%S")

        log_entry = {
            "timestamp": timestamp,
            "ip": ip,
            "status": status,
            "response_time": round(response_time, 2) if response_time is not None else "N/A"
        }

        # Save the log entry to a daily log file
        save_ping_logs_to_file(name, log_entry)

        # Merge daily logs into statuses
        if name in daily_logs:
            statuses[name] = statuses.get(name, {"ping_logs": []})
            statuses[name]["ping_logs"] = daily_logs[name] + statuses[name]["ping_logs"]

        # Define the 'last_seen' time: if the status is "Up", set the current time as 'last_seen'
        if name in statuses:
            last_seen_time = statuses[name].get('last_seen', "N/A")
        else:
            last_seen_time = "N/A"

        if status == "Up":
            last_seen_time = time.strftime("%Y-%m-%d %H:%M:%S")
        else:
            last_seen_time = "N/A"

        # Update statuses
        statuses[name] = statuses.get(name, {})
        statuses[name].update({
            "status": status,
            "last_seen": last_seen_time,
            "ping_logs": statuses[name].get("ping_logs", []) + [log_entry]
        })

        # Cap the ping logs to a maximum of 200 items
        if len(statuses[name]["ping_logs"]) > 200:
            statuses[name]["ping_logs"] = statuses[name]["ping_logs"][-200:]

@app.route('/add_network', methods=['POST'])
def add_network():
    try:
        data = request.get_json()
        network_name = data.get('name')
        network_ip = data.get('ip')
        network_port = data.get('port', 80)  # Default to port 80 if not provided

        # Load the current subnets from the file
        subnets = load_subnets()

        # Check if the network name already exists
        if network_name in subnets:
            return jsonify({"success": False, "message": "Network already exists."})

        # Add the new network to the subnets dictionary
        subnets[network_name] = {'ip': network_ip, 'port': network_port}

        # Save the updated subnets back to the network.conf
        save_subnets(subnets)

        return jsonify({"success": True})

    except Exception as e:
        return jsonify({"success": False, "message": str(e)})

# Endpoint to return the network status as JSON
@app.route("/get_status")
def get_status():
    load_subnets_flag = request.args.get('reload', 'false').lower() == 'true'
    
    get_network_status(load_subnets_flag)  # Update the status
    
    return jsonify(statuses)

@app.route('/init_network', methods=['GET'])
def init_network():
    global scanning
    scanning = True
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
                logging.info(f"Updated network.conf with new subnets: {missing_subnets}")

            subnets = load_subnets()

            # Scan each subnet for active clients
            active_clients = {}
            session_id = request.args.get('session_id')  # Get the session ID from the request
            for name, subnet in subnets.items():
                if not scanning:
                    break
                active_clients[name] = scan_subnet(subnet, session_id, scanned_subnets)

            return json.dumps({"subnets": network_config["subnets"], "missing": missing_subnets, "active_clients": active_clients})
            scanning = False

        except FileNotFoundError:
            return json.dumps({"error": "network.conf file not found"})
            scanning = False

    except subprocess.CalledProcessError as e:
        return json.dumps({'error': str(e)})
        scanning = False
    except Exception as e:
        return json.dumps({'error': str(e)})
        scanning = False

# Get WebSocket port based on subnet (e.g., 5100 for 192.168.10.x)
def get_websocket_port(ip_address):
    subnet_last_digit = int(ip_address.split('.')[2])
    return 5100 + subnet_last_digit  # Based on x.x.10.x, x.x.11.x, etc.

# Handle WebSocket commands from the frontend
def start_telnet_session(namespace, router_ip, username, password):
    try:
        tn = telnetlib.Telnet(router_ip)
        telnet_sessions[namespace] = tn
        tn.read_until(b"login: ", timeout=5)
        tn.write(username.encode('ascii') + b"\n")
        tn.read_until(b"Password: ", timeout=5)
        tn.write(password.encode('ascii') + b"\n")
        tn.read_until(b"#", timeout=5)
        tn.write(b"\r\n")
        outputLogin = tn.read_until(b"#", timeout=5).decode('utf-8')

        # Send a welcome message to the client
        socketio.emit('output', {'message': f"Connected to {router_ip}\r\nType 'exit' to disconnect. {outputLogin}"}, namespace=namespace)
        
        @socketio.on('telnet_command', namespace=namespace)
        def handle_telnet_command(data):
            command = data.get('command')
            if namespace in telnet_sessions and command:
                tn.write(command.encode('ascii') + b"\n")

                # read echo
                output = tn.read_until(command.encode('ascii') + b"\n", timeout=1).decode('utf-8')

                if command.lower() == 'exit\r\n':
                    tn.close()
                    del telnet_sessions[namespace]
                    #socketio.close_room(namespace=namespace)
                    socketio.emit('disconnect', namespace=namespace)
                    return

                # Add sleep after tn.write to ensure 
                # command starts processing as otherwise we may read '' 
                # which stops reading
                time.sleep(0.5)

                while True:
                    chunk = tn.read_very_eager().decode('utf-8')
                    if not chunk:
                        break
                    output += chunk


                socketio.emit('output', {'message': output}, namespace=namespace)
                

    except Exception as e:
        socketio.emit('output', {'message': f"Error: {str(e)}"}, namespace=namespace)

@socketio.on('start_telnet')
def start_telnet(data):
    router_name = data.get('router_name')
    username = data.get('username', 'root')  # Default to 'root' if not provided
    password = data.get('password', 'root')  # Default to 'root' if not provided
    router_ips = load_subnets()
    router_ip = router_ips.get(router_name)
    
    if not router_ip:
        emit('output', {'message': "Router not found"}, room=request.sid)
        return
    
    websocket_port = get_websocket_port(router_ip)
    namespace = f"/telnet_{websocket_port}"

    # send first message that we get connection for this telnet
    threading.Thread(target=start_telnet_session, args=(namespace, router_ip, username, password)).start()
    emit('output', {'message': f"Starting Telnet session for {router_name}", 'namespace': namespace}, room=request.sid)
    #emit('output', {'message': f"Telnet session started for {router_name}", 'namespace': namespace}, room=request.sid)

# Function to start SSH session
def start_ssh_session(namespace, router_ip, username, password):
    try:
        ssh = paramiko.SSHClient()
        ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
        ssh.connect(router_ip, username=username, password=password)
        ssh_sessions[namespace] = ssh

        stdin, stdout, stderr = ssh_sessions[namespace].exec_command('\n');
        output = stdout.read().decode('utf-8') + stderr.read().decode('utf-8')
        
        # Send a welcome message to the client
        socketio.emit('ssh_output', {'message': f"Connected to {router_ip}\r\nType 'exit' to disconnect."}, namespace=namespace)
        
        @socketio.on('ssh_command', namespace=namespace)
        def handle_ssh_command(data):
            command = data.get('command')
            if namespace in ssh_sessions and command:
                stdin, stdout, stderr = ssh_sessions[namespace].exec_command(command)
                output = stdout.read().decode('utf-8') + stderr.read().decode('utf-8')

                if command.lower() == 'exit':
                    ssh_sessions[namespace].close()
                    del ssh_sessions[namespace]
                    socketio.emit('disconnect', namespace=namespace)
                    return

                socketio.emit('ssh_output', {'message': output}, namespace=namespace)

    except Exception as e:
        socketio.emit('ssh_output', {'message': f"Error: {str(e)}"}, namespace=namespace)

@socketio.on('start_ssh')
def start_ssh(data):
    router_name = data.get('router_name')
    username = data.get('username', 'root')
    password = data.get('password', 'root')
    router_ips = load_subnets()
    router_ip = router_ips.get(router_name)
    
    if not router_ip:
        emit('ssh_output', {'message': "Router not found"}, room=request.sid)
        return
    
    websocket_port = get_websocket_port(router_ip)
    namespace = f"/ssh_{websocket_port}"

    threading.Thread(target=start_ssh_session, args=(namespace, router_ip, username, password)).start()
    emit('ssh_output', {'message': f"Starting SSH session for {router_name}", 'namespace': namespace}, room=request.sid)

@app.route('/get_subnets')
def get_subnets():
    """Return list of available routers and their IPs and ports."""
    return jsonify(load_subnets())

@app.route('/rename_device', methods=['POST'])
def rename_device():
    try:
        data = request.get_json()
        old_name = data.get('old_name')
        new_name = data.get('new_name')

        # Load the current subnets from the file
        subnets = load_subnets()

        # Check if the old name exists
        if old_name not in subnets:
            return jsonify({"success": False, "message": "Device not found."})

        # Check if the new name already exists
        if new_name in subnets:
            return jsonify({"success": False, "message": "New name already exists."})

        # Rename the device in subnets while keeping the same position
        new_subnets = {}
        for key, value in subnets.items():
            if key == old_name:
                new_subnets[new_name] = value
            else:
                new_subnets[key] = value

        # Rename the device in statuses
        if old_name in statuses:
            statuses[new_name] = statuses.pop(old_name)

        # Save the updated subnets back to the network.conf
        save_subnets(new_subnets)

        return jsonify({"success": True})

    except Exception as e:
        return jsonify({"success": False, "message": str(e)})

@app.route('/download_network_conf')
def download_network_conf():
    """Endpoint to download the network.conf file."""
    return send_file(network_conf_path, as_attachment=True)

# Allowed extensions for file upload
ALLOWED_EXTENSIONS = {'conf'}

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

@app.route('/upload_network_conf', methods=['POST'])
def upload_network_conf():
    if 'file' not in request.files:
        return jsonify({"success": False, "message": "No file part"})
    file = request.files['file']
    if file.filename == '':
        return jsonify({"success": False, "message": "No selected file"})
    if file and allowed_file(file.filename):
        filename = secure_filename(file.filename)
        file.save(os.path.join(app.root_path, filename))
        return jsonify({"success": True})
    return jsonify({"success": False, "message": "File not allowed"})

@app.route('/set_ping_interval', methods=['POST'])
def set_ping_interval():
    global ping_interval
    try:
        data = request.get_json()
        interval = data.get('interval')
        if interval and isinstance(interval, int) and interval > 0:
            ping_interval = interval
            return jsonify({"success": True, "interval": ping_interval})
        else:
            return jsonify({"success": False, "message": "Invalid interval"})
    except Exception as e:
        return jsonify({"success": False, "message": str(e)})

@app.route("/")
def index():
    get_network_status(load_subnets_flag=True)
    return render_template("index.html", statuses=statuses, subnets=subnets)

@socketio.on('init_network')
def handle_init_network():
    global scanning
    scanning = True
    scanned_subnets = set()  # Reset scanned subnets for a new scan
    try:
        session_id = request.sid  # Get the session ID for the current client
        # Check OS type
        system = platform.system().lower()

        # Run different commands based on the OS
        if system == 'linux' or system == 'darwin':  # For Unix-like systems (Linux, macOS)
            route_output = subprocess.check_output(['route', '-n'], text=True)
        elif system == 'windows':  # For Windows
            route_output = subprocess.check_output(['route', 'print'], text=True)
        else:
            emit('init_network_response', {'error': 'Unsupported Operating System'}, room=session_id)
            scanning = False
            return

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
                logging.info(f"Updated network.conf with new subnets: {missing_subnets}")

            subnets = load_subnets()

            # Scan each subnet for active clients
            active_clients = {}
            for name, subnet in subnets.items():
                if not scanning:
                    break
                active_clients[name] = scan_subnet(subnet, session_id, scanned_subnets)

            emit('init_network_response', {"subnets": network_config["subnets"], "missing": missing_subnets, "active_clients": active_clients}, room=session_id)
            scanning = False

        except FileNotFoundError:
            emit('init_network_response', {"error": "network.conf file not found"}, room=session_id)
            scanning = False

    except subprocess.CalledProcessError as e:
        emit('init_network_response', {'error': str(e)}, room=session_id)
        scanning = False
    except Exception as e:
        emit('init_network_response', {'error': str(e)}, room=session_id)
        scanning = False

@socketio.on('stop_scan')
def handle_stop_scan():
    global scanning
    scanning = False

if __name__ == "__main__":
    start_periodic_ping()
    socketio.run(app, host='0.0.0.0', port=5000, debug=True)
