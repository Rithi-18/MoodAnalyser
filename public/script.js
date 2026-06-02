lucide.createIcons();

// --- STATE ---
let currentUser = null;
let moodHistory = [];
let isLoginMode = true;

// Chart Instances
let dashChart, repLineChart, repDoughnutChart;

// --- VIEW NAVIGATION ---
function showView(viewId) {
    document.querySelectorAll('.view-section').forEach(el => el.classList.add('hidden'));
    document.getElementById(viewId).classList.remove('hidden');
}

function switchTab(tabId) {
    document.querySelectorAll('.app-tab').forEach(t => t.classList.add('hidden'));
    document.querySelectorAll('.nav-btn:not(.logout)').forEach(b => b.classList.remove('active'));
    
    document.getElementById(tabId).classList.remove('hidden');
    event.currentTarget.classList.add('active');

    if(tabId === 'tab-dashboard') updateDashboard();
    if(tabId === 'tab-reports') updateReports();
}

function selectMood(el, mood) {
    document.querySelectorAll('.mood-btn').forEach(btn => btn.classList.remove('selected'));
    el.classList.add('selected');
}

// --- AUTHENTICATION ---
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
            currentUser = { id: result.userId, username: username };
            
            // Set Dynamic User Names
            document.getElementById('user-avatar').innerText = username.charAt(0).toUpperCase();
            document.getElementById('display-username').innerText = username;
            document.getElementById('greeting-name').innerText = `Good morning, ${username.split(' ')[0]}`;
            
            showView('app-screen');
            fetchHistory(); 
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
    currentUser = null;
    document.getElementById('username').value = '';
    document.getElementById('password').value = '';
    showView('landing-page');
}

// --- DATA FETCHING ---
async function submitJournal() {
    const text = document.getElementById('journal-input').value.trim();
    if (!text) return;

    try {
        const response = await fetch('/api/journal', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId: currentUser.id, text })
        });
        const result = await response.json();

        if (result.success) {
            document.getElementById('journal-input').value = '';
            switchTab('tab-analysis'); // Redirect to analysis
            fetchHistory();
        }
    } catch (error) {
        console.error("Journal Error:", error);
    }
}

async function fetchHistory() {
    try {
        const response = await fetch(`/api/history/${currentUser.id}`);
        const result = await response.json();
        if (result.success) {
            moodHistory = result.data;
            updateDashboard();
            updateJournalHistory();
        }
    } catch (error) {
        console.error("History Error:", error);
    }
}

// --- UI UPDATERS ---
function updateJournalHistory() {
    const container = document.getElementById('journal-history');
    if (moodHistory.length === 0) {
        container.innerHTML = '<p class="text-muted mt-4">No entries yet.</p>';
        return;
    }

    container.innerHTML = moodHistory.map(log => `
        <div class="journal-entry">
            <div class="journal-entry-header">
                <div style="display: flex; gap: 15px; align-items: center;">
                    <div class="score-badge">${log.score > 0 ? '+' : ''}${log.score}</div>
                    <div>
                        <h4 class="font-bold">${log.sentiment}</h4>
                        <p class="text-muted text-sm">${new Date(log.logged_at).toLocaleString()}</p>
                    </div>
                </div>
            </div>
            <p class="mt-2 text-sm">${log.journal_text}</p>
        </div>
    `).join('');
}

function updateDashboard() {
    const dates = moodHistory.map(log => new Date(log.logged_at).toLocaleDateString(undefined, {weekday: 'short'})).reverse();
    const scores = moodHistory.map(log => log.score).reverse();

    if (dashChart) dashChart.destroy();
    
    const ctx = document.getElementById('dashboardChart').getContext('2d');
    dashChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: dates.length ? dates : ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
            datasets: [{
                data: scores.length ? scores : [0,0,0,0,0],
                borderColor: '#6366f1',
                backgroundColor: 'rgba(99, 102, 241, 0.1)',
                borderWidth: 2,
                tension: 0.4,
                fill: true,
                pointBackgroundColor: '#ffffff',
                pointBorderColor: '#6366f1',
                pointBorderWidth: 2,
                pointRadius: 4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
                y: { display: false, min: -5, max: 5 },
                x: { grid: { display: false }, border: {display: false} }
            }
        }
    });
}

function updateReports() {
    // Line Chart
    const dates = moodHistory.map(log => new Date(log.logged_at).toLocaleDateString(undefined, {weekday: 'short'})).reverse();
    const scores = moodHistory.map(log => log.score).reverse();

    if (repLineChart) repLineChart.destroy();
    repLineChart = new Chart(document.getElementById('reportsLineChart').getContext('2d'), {
        type: 'line',
        data: {
            labels: dates.length ? dates : ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
            datasets: [{
                data: scores.length ? scores : [0,0,0,0,0],
                borderColor: '#6366f1',
                borderWidth: 2,
                tension: 0.4,
                pointBackgroundColor: '#fff',
                pointBorderColor: '#6366f1',
            }]
        },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { display: false }, x: { grid: { display: false } } } }
    });

    // Doughnut Chart
    let pos = 0, neg = 0, neu = 0;
    moodHistory.forEach(log => {
        if(log.sentiment === 'Positive') pos++;
        else if (log.sentiment === 'Negative') neg++;
        else neu++;
    });

    if (repDoughnutChart) repDoughnutChart.destroy();
    repDoughnutChart = new Chart(document.getElementById('reportsDoughnutChart').getContext('2d'), {
        type: 'doughnut',
        data: {
            labels: ['Contentment', 'Anxiety', 'Neutral'],
            datasets: [{
                data: moodHistory.length ? [pos, neg, neu] : [1,1,1],
                backgroundColor: ['#6366f1', '#f59e0b', '#2dd4bf'],
                borderWidth: 0,
                cutout: '75%'
            }]
        },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } } }
    });
}