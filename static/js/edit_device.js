document.querySelectorAll('.edit-icon').forEach(icon => {
    icon.addEventListener('click', function() {
        const sanitized_name = this.id.replace('editIcon', '');
        const label = document.getElementById(`deviceNameLabel${sanitized_name}`);
        const input = document.getElementById(`deviceNameInput${sanitized_name}`);
        label.style.display = 'none';
        input.style.display = 'inline-block';
        input.focus();
    });
});

document.querySelectorAll('.rename-device-input').forEach(input => {
    input.addEventListener('blur', function() {
        const sanitized_name = this.id.replace('deviceNameInput', '');
        const label = document.getElementById(`deviceNameLabel${sanitized_name}`);
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
    });

    input.addEventListener('keypress', function(event) {
        if (event.key === 'Enter') {
            this.blur();
        }
    });
});
