document.getElementById('add-network-form').addEventListener('submit', function(event) {
    event.preventDefault();

    const networkName = document.getElementById('network-name').value;
    const networkIP = document.getElementById('network-ip').value;

    const data = {
        name: networkName,
        ip: networkIP
    };

    fetch('/add_network', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            alert('Network added successfully!');
            document.getElementById('add-network-form').reset();
            $('#addNetworkForm').collapse('hide');
        } else {
            alert('Error adding network');
        }
    })
    .catch(error => {
        console.error('Error:', error);
        alert('Error adding network');
    });
});
