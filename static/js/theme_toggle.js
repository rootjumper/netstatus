const themeToggleBtn = document.getElementById('theme-toggle-btn');
if (themeToggleBtn) {
    themeToggleBtn.addEventListener('click', function() {
        const body = document.body;
        body.classList.toggle('dark-theme');
        body.classList.toggle('light-theme');
        body.classList.toggle('black-yellow-theme');

        // Toggle light theme class for cards and buttons
        document.querySelectorAll('.card').forEach(card => {
            card.classList.toggle('light-theme');
            card.classList.toggle('black-yellow-theme');
        });
        document.querySelectorAll('.btn').forEach(btn => {
            btn.classList.toggle('btn-light-theme');
            btn.classList.toggle('btn-black-yellow-theme');
        });
        document.querySelectorAll('.status-box').forEach(box => {
            box.classList.toggle('light-theme');
            box.classList.toggle('black-yellow-theme');
        });
        document.querySelectorAll('.status-dot').forEach(dot => {
            dot.classList.toggle('light-theme');
            dot.classList.toggle('black-yellow-theme');
        });
        document.querySelectorAll('.status-badge').forEach(badge => {
            badge.classList.toggle('light-theme');
            badge.classList.toggle('black-yellow-theme');
        });
        document.querySelectorAll('.network-card').forEach(card => {
            card.classList.toggle('light-theme');
            card.classList.toggle('black-yellow-theme');
        });
    });
}
