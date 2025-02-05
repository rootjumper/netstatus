function copyToClipboard(elementId) {
    const text = document.getElementById(elementId).innerText;
    if (navigator.clipboard) {
        navigator.clipboard.writeText(text).then(() => {
            showToast('Copied to clipboard: ' + text);
        }).catch(err => {
            console.error('Failed to copy: ', err);
        });
    } else {
        const textArea = document.createElement("textarea");
        textArea.value = text;
        document.body.appendChild(textArea);
        textArea.select();
        try {
            document.execCommand('copy');
            showToast('Copied to clipboard: ' + text);
        } catch (err) {
            console.error('Failed to copy: ', err);
        }
        document.body.removeChild(textArea);
    }
}

function showToast(message) {
    const toast = document.getElementById('toast');
    toast.innerText = message;
    toast.classList.add('show');
    setTimeout(() => {
        toast.classList.remove('show');
    }, 5000); // Increase the duration to 5 seconds
}

// Add blockchain names to the toast message
function copyToClipboardWithBlockchain(elementId, blockchain) {
    const text = document.getElementById(elementId).innerText;
    if (navigator.clipboard) {
        navigator.clipboard.writeText(text).then(() => {
            showToast(`${blockchain} address copied to clipboard: ${text}`);
        }).catch(err => {
            console.error('Failed to copy: ', err);
        });
    } else {
        const textArea = document.createElement("textarea");
        textArea.value = text;
        document.body.appendChild(textArea);
        textArea.select();
        try {
            document.execCommand('copy');
            showToast(`${blockchain} address copied to clipboard: ${text}`);
        } catch (err) {
            console.error('Failed to copy: ', err);
        }
        document.body.removeChild(textArea);
    }
}
