lucide.createIcons();

// --- STATE ---
let currentUser = null;
let moodHistory = [];
let isLoginMode = true;

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
            
            const timeOfDay = new Date().getHours() < 12 ? 'morning' : new Date().getHours() < 18 ? 'afternoon' : 'evening';
            document.getElementById('greeting-name').innerText = `Good ${timeOfDay}, ${username.split(' ')[0]}`;
            
            showView('app-screen');
            fetchHistory(); 
        } else {
            errorText.innerText = result.error || "Authentication failed.";
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

// --- DATA FETCHING & DYNAMIC LOGIC ---
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
            await fetchHistory(); // Fetch new data
            
            // Update AI Analysis tab specifically with the new entry
            if(moodHistory.length > 0) {
                const latest = moodHistory[0];
                document.getElementById('analysis-title').innerText = `Primary Emotion: ${latest.sentiment}`;
                document.getElementById('analysis-desc').innerText = `Our AI detected a ${latest.sentiment.toLowerCase()} emotional state based on your entry: "${latest.journal_text.substring(0, 50)}..."`;
                document.getElementById('sentiment-score-text').innerText = latest.sentiment;
                document.getElementById('sentiment-score-text').className = `text-center mt-4 ${latest.sentiment === 'Positive' ? 'text-green' : latest.sentiment === 'Negative' ? 'text-rose' : 'text-teal'}`;
            }
            switchTab('tab-analysis');
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
            calculateDynamicStats();
            updateJournalHistory();
            if(!document.getElementById('tab-dashboard').classList.contains('hidden')) updateDashboard();
            if(!document.getElementById('tab-reports').classList.contains('hidden')) updateReports();
        }
    } catch (error) {
        console.error("History Error:", error);
    }
}

function calculateDynamicStats() {
    document.getElementById('date-subtitle').innerText = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });
    document.getElementById('dash-entries').innerText = moodHistory.length;
    document.getElementById('dash-insights').innerText = moodHistory.length;
    document.getElementById('sidebar-streak').innerText = `${moodHistory.length} entries total`;

    if (moodHistory.length === 0) {
        document.getElementById('dash-mood-score').innerText = "0.0";
        document.getElementById('dash-stress-level').innerText = "0%";
        document.getElementById('dash-stress-gauge').innerHTML = `0%<br><span>STRESS</span>`;
        return;
    }

    // Dynamic Mood Score Calculation (Scale of 1-10 based on sentiment score)
    let totalScore = 0;
    let negativeCount = 0;
    
    moodHistory.forEach(log => {
        // Map backend score (-2 to +2) to a 1-10 scale
        const mappedScore = (log.score + 3) * 2; 
        totalScore += (mappedScore > 10 ? 10 : mappedScore);
        
        if (log.sentiment === 'Negative') negativeCount++;
    });

    const avgMood = (totalScore / moodHistory.length).toFixed(1);
    document.getElementById('dash-mood-score').innerText = avgMood;

    // Dynamic Stress Calculation (Percentage based on negative sentiment ratio)
    let stressPercentage = Math.round((negativeCount / moodHistory.length) * 100);
    if(stressPercentage < 10) stressPercentage = 10; // Baseline formatting
    
    document.getElementById('dash-stress-level').innerText = `${stressPercentage}%`;
    document.getElementById('dash-stress-gauge').innerHTML = `${stressPercentage}%<br><span>STRESS</span>`;
    
    let stressText = stressPercentage > 60 ? "High" : stressPercentage > 30 ? "Moderate" : "Low";
    document.getElementById('dash-stress-text').innerText = stressText;
}

// --- UI RENDERERS ---
function updateJournalHistory() {
    const container = document.getElementById('journal-history');
    if (moodHistory.length === 0) {
        container.innerHTML = '<p class="text-muted mt-4">No entries yet. Write your first journal above!</p>';
        return;
    }

    container.innerHTML = moodHistory.map(log => {
        const mappedScore = (log.score + 3) * 2;
        return `
        <div class="journal-entry">
            <div class="journal-entry-header">
                <div style="display: flex; gap: 15px; align-items: center;">
                    <div class="score-badge">${mappedScore}/10</div>
                    <div>
                        <h4 class="font-bold ${log.sentiment === 'Negative' ? 'text-rose' : 'text-green'}">${log.sentiment}</h4>
                        <p class="text-muted text-sm">${new Date(log.logged_at).toLocaleString()}</p>
                    </div>
                </div>
            </div>
            <p class="mt-2 text-sm">${log.journal_text}</p>
        </div>
    `}).join('');
}

function updateDashboard() {
    const dates = moodHistory.map(log => new Date(log.logged_at).toLocaleDateString(undefined, {weekday: 'short'})).reverse().slice(-7);
    const scores = moodHistory.map(log => (log.score + 3) * 2).reverse().slice(-7); // Scale 1-10

    if (dashChart) dashChart.destroy();
    
    const ctx = document.getElementById('dashboardChart').getContext('2d');
    dashChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: dates.length ? dates : ['No Data'],
            datasets: [{
                data: scores.length ? scores : [0],
                borderColor: '#6366f1',
                backgroundColor: 'rgba(99, 102, 241, 0.1)',
                borderWidth: 3,
                tension: 0.4,
                fill: true,
                pointBackgroundColor: '#ffffff',
                pointBorderColor: '#6366f1',
                pointRadius: 5
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
                y: { min: 0, max: 10 },
                x: { grid: { display: false } }
            }
        }
    });
}

function updateReports() {
    const dates = moodHistory.map(log => new Date(log.logged_at).toLocaleDateString(undefined, {month: 'short', day: 'numeric'})).reverse();
    const scores = moodHistory.map(log => (log.score + 3) * 2).reverse();

    if (repLineChart) repLineChart.destroy();
    repLineChart = new Chart(document.getElementById('reportsLineChart').getContext('2d'), {
        type: 'line',
        data: {
            labels: dates.length ? dates : ['No Data'],
            datasets: [{
                data: scores.length ? scores : [0],
                borderColor: '#6366f1',
                borderWidth: 2,
                tension: 0.4,
                pointBackgroundColor: '#fff',
                pointBorderColor: '#6366f1',
            }]
        },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { min: 0, max: 10 }, x: { grid: { display: false } } } }
    });

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
            labels: ['Positive', 'Negative', 'Neutral'],
            datasets: [{
                data: moodHistory.length ? [pos, neg, neu] : [1,1,1],
                backgroundColor: ['#22c55e', '#f43f5e', '#2dd4bf'],
                borderWidth: 0,
                cutout: '75%'
            }]
        },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } } }
    });
}