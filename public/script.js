const METRIC_CONFIG = {
    peers: {
        label: 'Network Peers',
        warning: 10,
        danger: 5,
        icon: 'fas fa-network-wired'
    },
    rpcRequests: {
        label: 'RPC Requests',
        format: 'number',
        icon: 'fas fa-exchange-alt'
    },
    rpcErrors: {
        label: 'RPC Errors',
        format: 'number',
        icon: 'fas fa-exclamation-triangle'
    },
    cpuUsage: {
        label: 'CPU Usage',
        format: 'percentage',
        warning: 80,
        danger: 95,
        icon: 'fas fa-microchip'
    },
    memoryMB: {
        label: 'Memory Usage',
        format: 'MB',
        warning: 2048,
        danger: 3072,
        icon: 'fas fa-memory'
    },
    pendingTxCount: {
        label: 'Pending Transactions',
        format: 'number',
        icon: 'fas fa-clock'
    },
    gasPrice: {
        label: 'Gas Price (Gwei)',
        format: 'number',
        warning: 50,
        danger: 100,
        icon: 'fas fa-gas-pump'
    }
};

// Throttle function
function throttle(func, limit) {
    let inThrottle;
    return function (...args) {
        if (!inThrottle) {
            func.apply(this, args);
            inThrottle = true;
            setTimeout(() => inThrottle = false, limit);
        }
    };
}

// Cache DOM elements
const metricsGrid = document.getElementById('metrics-grid');
const syncStatus = document.getElementById('sync-status');
const peerCount = document.getElementById('peer-count');
const blockNumber = document.getElementById('block-number');

// Virtual DOM for metrics grid
let virtualMetricsGrid = new Map();

// Update value without animation
function updateValue(element, newValue) {
    if (!element || element.textContent === newValue.toString()) return;
    element.textContent = newValue;
}

// Create metric card
function createMetricCard(metric, value) {
    const config = METRIC_CONFIG[metric];
    const card = document.createElement('div');
    card.className = 'metric-card';
    card.dataset.metric = metric;

    const valueFormatted = config.format === 'percentage' ?
        `${value.toFixed(1)}%` :
        config.format === 'MB' ?
            `${value.toFixed(1)} MB` :
            value.toLocaleString();

    card.innerHTML = `
        <h3><i class="${config.icon}"></i> ${config.label}</h3>
        <div class="value" data-value="${value}">${valueFormatted}</div>
        ${config.warning ? '<span class="status-dot"></span>' : ''}
    `;

    if (config.warning) {
        const statusDot = card.querySelector('.status-dot');
        statusDot.className = 'status-dot';
        if (value >= config.danger) {
            statusDot.classList.add('danger');
        } else if (value >= config.warning) {
            statusDot.classList.add('warning');
        }
    }

    return card;
}

// Update metric card
function updateMetricCard(card, value) {
    const valueElement = card.querySelector('.value');
    const currentValue = valueElement.dataset.value;

    if (currentValue === value.toString()) return false;

    const config = METRIC_CONFIG[card.dataset.metric];
    const valueFormatted = config.format === 'percentage' ?
        `${value.toFixed(1)}%` :
        config.format === 'MB' ?
            `${value.toFixed(1)} MB` :
            value.toLocaleString();

    valueElement.textContent = valueFormatted;
    valueElement.dataset.value = value;

    if (config.warning) {
        const statusDot = card.querySelector('.status-dot');
        const newClass = value >= config.danger ? 'danger' :
            value >= config.warning ? 'warning' : '';

        if (statusDot.className !== `status-dot ${newClass}`) {
            statusDot.className = `status-dot ${newClass}`;
        }
    }

    return true;
}

// Fetch and update stats
async function fetchNodeStats() {
    try {
        const response = await fetch('/node-stats');
        const data = await response.json();

        // Update basic stats
        updateValue(syncStatus, data.syncStatus === false ? 'Synced' : 'Syncing');
        updateValue(peerCount, data.peerCount);
        updateValue(blockNumber, data.blockNumber);

        let hasChanges = false;

        // Update metrics grid using virtual DOM
        Object.entries(METRIC_CONFIG).forEach(([key, _]) => {
            if (data[key] === undefined) return;

            let card = virtualMetricsGrid.get(key);
            if (!card) {
                card = createMetricCard(key, data[key]);
                virtualMetricsGrid.set(key, card);
                hasChanges = true;
            } else if (updateMetricCard(card, data[key])) {
                hasChanges = true;
            }
        });

        // Only update DOM if necessary
        if (hasChanges) {
            const fragment = document.createDocumentFragment();
            virtualMetricsGrid.forEach(card => {
                fragment.appendChild(card.cloneNode(true));
            });
            metricsGrid.replaceChildren(fragment);
        }

    } catch (error) {
        console.error('Error fetching node stats:', error);
    }
}

// Use throttled version for updates
const throttledFetch = throttle(fetchNodeStats, 3000);

// Start fetching data
setInterval(throttledFetch, 5000);
throttledFetch(); // Initial fetch