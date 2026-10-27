import { shutdownOnSignals } from "../../src/utils";

describe("shutdownOnSignals", () => {
  it("stops the server and exits when the signal arrives", () => {
    const exit = jest.fn();
    const server = {
      close: jest.fn((callback?: () => void) => {
        callback?.();
      }),
      closeAllConnections: jest.fn(),
    };
    shutdownOnSignals(server as never, exit, ["SIGUSR2"]);
    expect(server.close).not.toHaveBeenCalled();

    process.emit("SIGUSR2");

    expect(server.close).toHaveBeenCalledTimes(1);
    expect(server.closeAllConnections).toHaveBeenCalledTimes(1);
    expect(exit).toHaveBeenCalledWith(0);
  });

  it("waits for the server to finish closing before exiting", () => {
    const exit = jest.fn();
    let finish: () => void = () => undefined;
    const server = {
      close: jest.fn((callback?: () => void) => {
        finish = () => callback?.();
      }),
      closeAllConnections: jest.fn(),
    };
    shutdownOnSignals(server as never, exit, ["SIGUSR2"]);
    process.emit("SIGUSR2");
    expect(exit).not.toHaveBeenCalled();
    finish();
    expect(exit).toHaveBeenCalledWith(0);
  });

  it("listens for SIGTERM and SIGINT by default", () => {
    const before = [
      process.listenerCount("SIGTERM"),
      process.listenerCount("SIGINT"),
    ];
    const onceSpy = jest.spyOn(process, "once");
    shutdownOnSignals({
      close: jest.fn(),
      closeAllConnections: jest.fn(),
    } as never);
    expect(onceSpy).toHaveBeenCalledWith("SIGTERM", expect.any(Function));
    expect(onceSpy).toHaveBeenCalledWith("SIGINT", expect.any(Function));
    onceSpy.mockRestore();
    // Do not leave handlers behind that would swallow a real signal sent to the test run.
    process.removeAllListeners("SIGTERM");
    process.removeAllListeners("SIGINT");
    expect(before.length).toBe(2);
  });
});
