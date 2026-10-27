#!/usr/bin/env bash
npm run migrate
# exec makes node the main process, so the SIGTERM Kubernetes sends on a stop or update reaches it.
# Without it bash, as PID 1, ignores the signal and the pod takes the full grace period to stop.
exec node build/src/app.js
