document.querySelectorAll('.edit-icon').forEach(icon => {
    icon.addEventListener('click', function() {
        const sanitized_name = this.id.replace('editIcon', '');
        const label = document.getElementById(`deviceNameLabel${sanitized_name}`);
        const input = document.getElementById(`deviceNameInput${sanitized_name}`);
        const editIcon = document.getElementById(`editIcon${sanitized_name}`);
        input.value = label.textContent; // Use the current name as the input value
        label.style.display = 'none';
        input.style.display = 'inline-block';
        editIcon.style.display = 'none'; // Hide the edit button
        input.focus();
    });
});

document.querySelectorAll('.rename-device-input').forEach(input => {
    input.addEventListener('blur', function() {
        const sanitized_name = this.id.replace('deviceNameInput', '');
        const label = document.getElementById(`deviceNameLabel${sanitized_name}`);
        const editIcon = document.getElementById(`editIcon${sanitized_name}`);
        label.style.display = 'inline-block';
        this.style.display = 'none';
        editIcon.style.display = 'inline-block'; // Show the edit button
    });

    input.addEventListener('keypress', function(event) {
        if (event.key === 'Enter') {
            const sanitized_name = this.id.replace('deviceNameInput', '');
            const label = document.getElementById(`deviceNameLabel${sanitized_name}`);
            const editIcon = document.getElementById(`editIcon${sanitized_name}`);
            const newName = this.value;
            const oldName = label.textContent;

            if (newName !== oldName) {
                fetch('/rename_device', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ old_name: oldName, new_name: newName }),
                })
                .then(response => response.json())
                .then(data => {
                    if (data.success) {
                        label.textContent = newName;
                    } else {
                        alert('Error: ' + data.message);
                        this.value = oldName;
                    }
                })
                .catch(error => {
                    console.error('Error:', error);
                    this.value = oldName;
                });
            }

            label.style.display = 'inline-block';
            this.style.display = 'none';
            editIcon.style.display = 'inline-block'; // Show the edit button
        }
    });
});

// Initialize Bootstrap tooltips
document.addEventListener('DOMContentLoaded', function () {
    var tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
    var tooltipList = tooltipTriggerList.map(function (tooltipTriggerEl) {
        return new bootstrap.Tooltip(tooltipTriggerEl);
    });
});
