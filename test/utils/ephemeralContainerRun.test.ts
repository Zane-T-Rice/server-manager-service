import * as child_process from "child_process";
import { Request, Response } from "express";
import { ephemeralContainerRun } from "../../src/utils";
jest.mock("child_process");

describe("ephemeralContainerRun", () => {
  const body = {
    applicationName: "appName",
    containerName: "containerName",
    isUpdatable: false,
  };
  const mockServerRecord = {
    id: "serverid",
    ...body,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
  const req: Request = {
    body,
    query: {},
    params: { id: mockServerRecord.id },
    log: {
      info: jest.fn(),
      flush: jest.fn(),
    },
  } as unknown as Request;
  const res: Response = { json: jest.fn() } as unknown as Response;

  beforeEach(() => {
    jest.clearAllMocks();

    (child_process.exec as unknown as jest.Mock).mockImplementation(
      (_, callback) => {
        callback(null, { stdout: "" });
      }
    );
  });

  it("should send a success response and then run the provided commands", async () => {
    await ephemeralContainerRun(
      req,
      res,
      ["this", "is", "another", "command"],
      mockServerRecord
    );
    expect(child_process.exec as unknown as jest.Mock).toHaveBeenCalledWith(
      expect.stringMatching(
        /docker run --name=ephemeral-.*-.*-.*-.*-.* -d --rm -v \/var\/run\/docker.sock:\/var\/run\/docker.sock -t alpine sh -c 'apk add docker; addgroup \${USER} docker; this;is;another;command'/
      ),
      expect.any(Function)
    );
  });
});
