lucide.createIcons();

let moodHistory = [];
let chartInstance = null;
let currentUserId = null;
let isLoginMode = true;

const suggestions = {
    Positive: "You're radiating good energy! Keep nurturing whatever is bringing you joy today.",
    Negative: "It sounds like a heavy day. Remember to be kind to yourself. Take a slow, deep breath.",
    Neutral: "A balanced state of mind. It's a great time to focus on steady, productive tasks."
};

// --- AUTHENTICATION LOGIC ---
function switchAuthMode(isLogin) {
    isLoginMode = isLogin;
    document.getElementById('tab-login').classList.toggle('active', isLogin);
    document.getElementById('tab-register').classList.toggle('active', !isLogin);
    document.getElementById('auth-btn').innerText = isLogin ? 'Log In' : 'Sign Up';
    document.getElementById('auth-error').classList.add('hidden');
}

async function handleAuth() {
    const username = document.getElementById('username').value.trim();
    const password = document.getElementById('password').value.trim();
    const errorText = document.getElementById('auth-error');

    if (!username || !password) {
        errorText.innerText = "Please fill in all fields.";
        errorText.classList.remove('hidden');
        return;
    }

    const endpoint = isLoginMode ? '/api/login' : '/api/register';
    
    try {
        const response = await fetch(endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });
        const result = await response.json();

        if (result.success) {
            currentUserId = result.userId;
            document.getElementById('auth-screen').classList.add('hidden');
            document.getElementById('app-screen').classList.remove('hidden');
            fetchHistory(); // Load data specifically for this user
        } else {
            errorText.innerText = result.error;
            errorText.classList.remove('hidden');
        }
    } catch (err) {
        errorText.innerText = "Server error. Please try again.";
        errorText.classList.remove('hidden');
    }
}

function logout() {
    currentUserId = null;
    document.getElementById('username').value = '';
    document.getElementById('password').value = '';
    document.getElementById('app-screen').classList.add('hidden');
    document.getElementById('auth-screen').classList.remove('hidden');
}

// --- APP LOGIC ---
function switchTab(tabId) {
    document.querySelectorAll('.tab-content').forEach(t => t.classList.add('hidden'));
    document.querySelectorAll('.nav-btn:not(.logout)').forEach(b => b.classList.remove('active'));
    
    document.getElementById(tabId).classList.remove('hidden');
    event.currentTarget.classList.add('active');

    if(tabId === 'dashboard') updateDashboardUI();
    if(tabId === 'analytics') renderChart();
}

async function submitJournal() {
    const textInput = document.getElementById('journal-input');
    const text = textInput.value.trim();
    if (!text) return;

    try {
        const response = await fetch('/api/journal', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId: currentUserId, text })
        });
        const result = await response.json();

        if (result.success) {
            textInput.value = '';
            document.getElementById('analysis-result').classList.remove('hidden');
            document.getElementById('result-sentiment').innerText = `Analysis Saved!`;
            document.getElementById('result-suggestion').innerText = "Check your Analytics tab to see how this affects your overall trend.";
            await fetchHistory();
        }
    } catch (error) {
        console.error("Failed to save journal:", error);
    }
}

async function fetchHistory() {
    try {
        const response = await fetch(`/api/history/${currentUserId}`);
        const result = await response.json();
        if (result.success) {
            moodHistory = result.data;
            updateDashboardUI();
            if(!document.getElementById('analytics').classList.contains('hidden')) renderChart();
        }
    } catch (error) {
        console.error("Failed to fetch history:", error);
    }
}

function updateDashboardUI() {
    const container = document.getElementById('recent-logs-container');
    document.getElementById('dash-entry-count').innerText = moodHistory.length;
    
    if (moodHistory.length > 0) {
        document.getElementById('dash-current-mood').innerText = moodHistory[0].sentiment;
        container.innerHTML = moodHistory.slice(0, 5).map(log => `
            <div class="log-item">
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <span class="log-badge badge-${log.sentiment}">${log.sentiment}</span>
                    <span class="log-date">${new Date(log.logged_at).toLocaleDateString()}</span>
                </div>
                <p class="log-text">${log.journal_text}</p>
            </div>
        `).join('');
    } else {
        container.innerHTML = '<p class="log-text">No entries yet. Head over to the Journal tab.</p>';
        document.getElementById('dash-current-mood').innerText = 'N/A';
    }
}

function renderChart() {
    const ctx = document.getElementById('moodChart').getContext('2d');
    const dates = moodHistory.map(log => new Date(log.logged_at).toLocaleDateString()).reverse();
    const scores = moodHistory.map(log => log.score).reverse();

    if (chartInstance) chartInstance.destroy();

    chartInstance = new Chart(ctx, {
        type: 'line',
        data: {
            labels: dates.length ? dates : ['No Data'],
            datasets: [{
                label: 'Mood Progression',
                data: scores.length ? scores : [0],
                borderColor: '#6366f1',
                backgroundColor: 'rgba(99, 102, 241, 0.1)',
                borderWidth: 3,
                tension: 0.4,
                fill: true,
                pointBackgroundColor: '#4f46e5',
                pointRadius: 5
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
                y: { beginAtZero: true, suggestedMin: -3, suggestedMax: 3 }
            }
        }
    });
}