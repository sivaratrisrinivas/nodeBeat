const express = require('express');
const { Network, Alchemy } = require("alchemy-sdk");
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.static('public')); // Serve static files

// Alchemy SDK configuration
const settings = {
    apiKey: "B-iUhVcxvwH_bxr2vpAHxYy6Skh7XS6C",
    network: Network.ETH_SEPOLIA,
};

const alchemy = new Alchemy(settings);

const METRIC_MAP = {
    peers: 'nethermind_network_peers',
    rpcRequests: 'nethermind_json_rpc_requests',
    rpcErrors: 'nethermind_json_rpc_errors',
    cpuUsage: 'nethermind_cpu_usage',
    memoryUsage: 'nethermind_memory_usage'
};

async function fetchPrometheusMetrics() {
    try {
        const response = await axios.get(`${rpcUrl}/metrics`);
        return response.data;
    } catch (error) {
        console.error('Metrics fetch error:', error);
        return null;
    }
}

function parseMetrics(rawData, metrics) {
    return rawData.split('\n').reduce((acc, line) => {
        metrics.forEach(metric => {
            if (line.startsWith(metric)) {
                const value = line.match(/ (\d+\.?\d*)$/);
                acc[metric] = value ? parseFloat(value[1]) : 0;
            }
        });
        return acc;
    }, {});
}

// Fetch node stats with error handling
async function fetchNodeStats() {
    try {
        const [blockNumber, pendingTxs, gasPrice] = await Promise.all([
            alchemy.core.getBlockNumber(),
            alchemy.core.getBlockWithTransactions("pending"),
            alchemy.core.getGasPrice()
        ]);

        return {
            syncStatus: false, // Public nodes are always synced
            peerCount: 50, // Simulated peer count
            blockNumber: blockNumber,
            rpcRequests: Math.floor(Math.random() * 1000), // Simulated RPC requests
            rpcErrors: Math.floor(Math.random() * 10), // Simulated RPC errors
            cpuUsage: Math.floor(Math.random() * 60 + 20), // Simulated CPU usage between 20-80%
            memoryMB: Math.floor(Math.random() * 1000 + 500), // Simulated memory usage between 500-1500MB
            pendingTxCount: pendingTxs?.transactions?.length || 0,
            gasPrice: parseInt(gasPrice) / 1e9 // Convert to Gwei
        };
    } catch (error) {
        console.error('Error fetching node stats:', error);
        // Return default values on error
        return {
            syncStatus: false,
            peerCount: 0,
            blockNumber: 0,
            rpcRequests: 0,
            rpcErrors: 0,
            cpuUsage: 0,
            memoryMB: 0,
            pendingTxCount: 0,
            gasPrice: 0
        };
    }
}

// Single endpoint for all stats
app.get('/node-stats', async (req, res) => {
    try {
        const stats = await fetchNodeStats();
        res.json(stats);
    } catch (error) {
        res.status(500).json({
            error: 'Error fetching node stats',
            message: error.message
        });
    }
});

app.get('/advanced-metrics', async (req, res) => {
    try {
        const stats = await fetchNodeStats();
        res.json(stats);
    } catch (error) {
        res.status(500).json({
            error: 'Metrics collection failed',
            message: error.message
        });
    }
});

// Remove the kill-port section and replace with simple listen
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));