module.exports = {
    apps: [
        {
            name: "examcell-node-api",
            script: "node",
            args: "dist/index.cjs",
            env: {
                NODE_ENV: "production",
            },
            instances: 1, // Node serves mostly rapid API responses and is single-threaded
            autorestart: true,
            watch: false,
            max_memory_restart: "2G"
        },
        {
            name: "examcell-python-parser",
            script: "uvicorn",
            args: "main:app --host 0.0.0.0 --port 8000 --log-level warning",
            cwd: "./parser-service",
            instances: 1, // Single Uvicorn instance since it handles its own internal ProcessPool of 8 workers
            autorestart: true,
            watch: false,
            max_memory_restart: "4G"
        }
    ]
};
