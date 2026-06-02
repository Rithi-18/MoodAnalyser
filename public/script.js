// Initialize Icons
lucide.createIcons();

// State management
let moodHistory = [];
let chartInstance = null;

const suggestions = {
    Positive: "You're radiating good energy! Keep nurturing whatever is bringing you joy today.",
    Negative: "It sounds like a heavy day. Remember to be kind to yourself. Consider trying the 4-7-8 breathing exercise in the Resources tab.",
    Neutral: "A balanced state of mind. It's a great time to focus on steady, productive tasks or gentle mindfulness."
};

// Application Startup
document.addEventListener('DOMContentLoaded', () => {
    fetchHistory();
});

// Navigation Logic
function switchTab(tabId) {
    document.querySelectorAll('.tab-content').forEach(tab => tab.classList.add('hidden'));
    document.querySelectorAll('.nav-btn').forEach(btn => btn.classList.remove('active'));
    
    document.getElementById(tabId).classList.remove('hidden');
    event.currentTarget.classList.add('active');

    if(tabId === 'dashboard') updateDashboardUI();
    if(tabId === 'analytics') renderChart();
}

// API Calls
async function submitJournal() {
    const textInput = document.getElementById('journal-input');
    const text = textInput.value.trim();
    if (!text) return;

    try {
        const response = await fetch('/api/journal', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text })
        });
        const result = await response.json();

        if (result.success) {
            textInput.value = '';
            
            // Show result
            const resBox = document.getElementById('analysis-result');
            resBox.classList.remove('hidden');
            document.getElementById('result-sentiment').innerText = `Detected Mood: ${result.data.sentiment}`;
            document.getElementById('result-suggestion').innerText = suggestions[result.data.sentiment];
            
            // Refresh Data
            await fetchHistory();
        }
    } catch (error) {
        console.error("Failed to save journal:", error);
    }
}

async function fetchHistory() {
    try {
        const response = await fetch('/api/history');
        const result = await response.json();
        if (result.success) {
            moodHistory = result.data;
            updateDashboardUI();
            if(!document.getElementById('analytics').classList.contains('hidden')) {
                renderChart();
            }
        }
    } catch (error) {
        console.error("Failed to fetch history:", error);
    }
}

// UI Updaters
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
        container.innerHTML = '<p class="log-text">No entries yet. Head over to the Journal tab to start.</p>';
        document.getElementById('dash-current-mood').innerText = 'No Data';
    }
}

// Chart.js Implementation
function renderChart() {
    const ctx = document.getElementById('moodChart').getContext('2d');
    
    // Process data for chart
    const dates = moodHistory.map(log => new Date(log.logged_at).toLocaleDateString()).reverse();
    const scores = moodHistory.map(log => log.score).reverse();

    if (chartInstance) chartInstance.destroy();

    chartInstance = new Chart(ctx, {
        type: 'line',
        data: {
            labels: dates,
            datasets: [{
                label: 'Mood Score over Time',
                data: scores,
                borderColor: '#6366f1',
                backgroundColor: 'rgba(99, 102, 241, 0.1)',
                borderWidth: 3,
                tension: 0.4,
                fill: true,
                pointBackgroundColor: '#4f46e5',
                pointRadius: 4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
                y: { beginAtZero: true, suggestedMin: -5, suggestedMax: 5, 
                     grid: { borderDash: [5, 5], color: '#e2e8f0' } },
                x: { grid: { display: false } }
            }
        }
    });
}