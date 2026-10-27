import { Server } from "http";

/* Stop serving and exit when Kubernetes asks the pod to stop.
 * The service runs as PID 1 in its container, which gets no default action for SIGTERM, so without
 * a handler every stop and update waits out the whole grace period before the process is killed. */
export function shutdownOnSignals(
  server: Pick<Server, "close" | "closeAllConnections">,
  exit: (code: number) => void = process.exit,
  signals: NodeJS.Signals[] = ["SIGTERM", "SIGINT"],
) {
  signals.forEach((signal) =>
    process.once(signal, () => {
      server.close(() => exit(0));
      // Idle keep-alive connections would otherwise hold close() open.
      server.closeAllConnections();
    }),
  );
}
