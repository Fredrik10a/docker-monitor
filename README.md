# Docker Monitor

🚀 Docker Monitor is a Node.js application that helps identify restarting apps in a Docker environment and reverts them to the previous image.

## Key Features 🛠️

- Monitors Docker containers for restarts
- Automatically reverts containers to the previous image when restarts occur

## Getting started

```
yarn install
cd docker-monitor && docker-compose up -d
```

`docker-monitor\app\index.js` toggle the `throw new Error('Simulated crash');` to deploy a working vs failing app image.
