import * as child_process from "child_process";
import * as fs from "node:fs";
import { ServersService } from "../../src/services";
import { PrismaClient, Server } from "@prisma/client";
import { Request, Response } from "express";
import { handleDatabaseErrors } from "../../src/utils";
import { ephemeralContainerRun } from "../../src/utils";
jest.mock("node:fs");
jest.mock("child_process");
jest.mock("@prisma/client", () => {
  return {
    PrismaClient: jest.fn().mockImplementation(() => {
      return {
        server: {
          create: jest.fn(),
          findMany: jest.fn(),
          findUniqueOrThrow: jest.fn(),
          update: jest.fn(),
          delete: jest.fn(),
        },
      };
    }),
  };
});
jest.mock("../../src/utils/handleDatabaseErrors", () => {
  return {
    handleDatabaseErrors: jest.fn().mockRejectedValue(new Error()),
  };
});
jest.mock("../../src/utils/ephemeralContainerRun", () => {
  return {
    ephemeralContainerRun: jest.fn(),
  };
});

describe("ServersService", () => {
  const hostId = "hostId";
  const body = {
    applicationName: "appName",
    containerName: "containerName",
    isInResponseChain: false,
    isUpdatable: false,
  };
  const mockServerRecord = {
    id: "serverid",
    ...body,
  } as Server;
  const req: Request = {
    body,
    query: {},
    params: { hostId, serverId: mockServerRecord.id },
  } as unknown as Request;
  const res: Response = { json: jest.fn() } as unknown as Response;
  const serversService = new ServersService();
  beforeEach(() => {
    jest.clearAllMocks();

    (child_process.exec as unknown as jest.Mock).mockImplementation(
      (_, callback) => {
        callback(null, { stdout: "" });
      }
    );

    jest
      .spyOn(serversService.prisma.server, "create")
      .mockResolvedValue(mockServerRecord);
    jest
      .spyOn(serversService.prisma.server, "findMany")
      .mockResolvedValue([mockServerRecord]);
    jest
      .spyOn(serversService.prisma.server, "findUniqueOrThrow")
      .mockResolvedValue(mockServerRecord);
    jest
      .spyOn(serversService.prisma.server, "update")
      .mockResolvedValue(mockServerRecord);
    jest
      .spyOn(serversService.prisma.server, "delete")
      .mockResolvedValue(mockServerRecord);

    (fs.writeFileSync as unknown as jest.Mock).mockImplementation(() => true);
  });

  it("should use passed in prisma client if no prisma client is set", () => {
    // @ts-expect-error to make testing easier
    ServersService.instance.prisma = undefined;
    const prisma = new PrismaClient();
    const serversService2 = new ServersService(prisma);
    expect(serversService2.prisma).toEqual(prisma);
  });

  it("should use existing prisma client even if another is passed in", () => {
    const currentPrisma = ServersService.instance.prisma;
    const prisma = new PrismaClient();
    const serversService2 = new ServersService(prisma);
    expect(serversService2.prisma).toEqual(currentPrisma);
  });

  describe("POST /", () => {
    it("should create a new server record and return the new record", async () => {
      await serversService.createServer(req, res);
      expect(serversService.prisma.server.create).toHaveBeenCalledWith({
        data: { ...body, hostId },
        select: ServersService.defaultServerSelect,
      });
      expect(res.json).toHaveBeenCalledWith(mockServerRecord);
    });
    it("should handle any database errors", async () => {
      expect.assertions(4);
      jest
        .spyOn(serversService.prisma.server, "create")
        .mockRejectedValue(new Error());
      try {
        await serversService.createServer(req, res);
      } catch (e) {
        expect(e).toBeInstanceOf(Error);
      }
      expect(serversService.prisma.server.create).toHaveBeenCalledWith({
        data: { ...body, hostId },
        select: ServersService.defaultServerSelect,
      });
      expect(handleDatabaseErrors).toHaveBeenCalledWith(
        expect.any(Error),
        "server",
        []
      );
      expect(res.json).not.toHaveBeenCalled();
    });
  });

  describe("POST /:id/restart", () => {
    it("Should restart server", async () => {
      await serversService.restartServer(req, res);
      expect(
        serversService.prisma.server.findUniqueOrThrow
      ).toHaveBeenCalledWith({
        where: { id: mockServerRecord.id, hostId },
        select: ServersService.defaultServerSelect,
      });
      expect(child_process.exec as unknown as jest.Mock).toHaveBeenCalledWith(
        `docker restart ${mockServerRecord.containerName}`,
        expect.any(Function)
      );
    });
    it("Should restart server using an ephemeral container", async () => {
      const mockServerRecordIsInResponseChain = {
        ...mockServerRecord,
        isInResponseChain: true,
      };
      jest
        .spyOn(serversService.prisma.server, "findUniqueOrThrow")
        .mockResolvedValueOnce(mockServerRecordIsInResponseChain);
      await serversService.restartServer(req, res);
      expect(
        serversService.prisma.server.findUniqueOrThrow
      ).toHaveBeenCalledWith({
        where: {
          id: mockServerRecordIsInResponseChain.id,
          hostId,
        },
        select: ServersService.defaultServerSelect,
      });
      expect(ephemeralContainerRun).toHaveBeenCalledWith(
        req,
        res,
        [`docker restart ${mockServerRecordIsInResponseChain.containerName}`],
        mockServerRecordIsInResponseChain
      );
    });
    it("should handle any database errors", async () => {
      expect.assertions(4);
      jest
        .spyOn(serversService.prisma.server, "findUniqueOrThrow")
        .mockRejectedValue(new Error());
      try {
        await serversService.restartServer(req, res);
      } catch (e) {
        expect(e).toBeInstanceOf(Error);
      }
      expect(
        serversService.prisma.server.findUniqueOrThrow
      ).toHaveBeenCalledWith({
        where: { id: mockServerRecord.id, hostId },
        select: ServersService.defaultServerSelect,
      });
      expect(handleDatabaseErrors).toHaveBeenCalledWith(
        expect.any(Error),
        "server",
        [mockServerRecord.id]
      );
      expect(ephemeralContainerRun).not.toHaveBeenCalled();
    });
  });

  describe("POST /:id/stop", () => {
    it("Should stop server", async () => {
      await serversService.stopServer(req, res);
      expect(
        serversService.prisma.server.findUniqueOrThrow
      ).toHaveBeenCalledWith({
        where: { id: mockServerRecord.id, hostId },
        select: ServersService.defaultServerSelect,
      });
      expect(child_process.exec as unknown as jest.Mock).toHaveBeenCalledWith(
        `docker stop ${mockServerRecord.containerName}`,
        expect.any(Function)
      );
    });
    it("Should stop server using an ephemeral container", async () => {
      const mockServerRecordIsInResponseChain = {
        ...mockServerRecord,
        isInResponseChain: true,
      };
      jest
        .spyOn(serversService.prisma.server, "findUniqueOrThrow")
        .mockResolvedValueOnce(mockServerRecordIsInResponseChain);
      await serversService.stopServer(req, res);
      expect(
        serversService.prisma.server.findUniqueOrThrow
      ).toHaveBeenCalledWith({
        where: {
          id: mockServerRecordIsInResponseChain.id,
          hostId,
        },
        select: ServersService.defaultServerSelect,
      });
      expect(ephemeralContainerRun).toHaveBeenCalledWith(
        req,
        res,
        [`docker stop ${mockServerRecordIsInResponseChain.containerName}`],
        mockServerRecordIsInResponseChain
      );
    });
    it("should handle any database errors", async () => {
      expect.assertions(4);
      jest
        .spyOn(serversService.prisma.server, "findUniqueOrThrow")
        .mockRejectedValue(new Error());
      try {
        await serversService.stopServer(req, res);
      } catch (e) {
        expect(e).toBeInstanceOf(Error);
      }
      expect(
        serversService.prisma.server.findUniqueOrThrow
      ).toHaveBeenCalledWith({
        where: { id: mockServerRecord.id, hostId },
        select: ServersService.defaultServerSelect,
      });
      expect(handleDatabaseErrors).toHaveBeenCalledWith(
        expect.any(Error),
        "server",
        [mockServerRecord.id]
      );
      expect(ephemeralContainerRun).not.toHaveBeenCalled();
    });
  });

  describe("POST /:id/update", () => {
    const mockCompleteServerRecord = {
      ...mockServerRecord,
      isInResponseChain: false,
      isUpdatable: true,
      ports: [
        {
          id: "c237d998-f514-4640-b150-478bf9362bca",
          number: 3000,
          protocol: "udp",
        },
        {
          id: "32de6034-59f3-44ea-bd1c-8a3393260ca6",
          number: 3000,
          protocol: "tcp",
        },
      ],
      volumes: [
        {
          id: "b3e2148d-1e5a-4895-ae4b-0c9c3628699b",
          hostPath: "/path/to/server-manager-service/prisma/db",
          containerPath: "/server-manager-service/prisma/db",
        },
        {
          id: "3122939b-5838-4b47-9ec5-5e942520bc15",
          hostPath: "/var/run/docker.sock",
          containerPath: "/var/run/docker.sock",
        },
      ],
      environmentVariables: [
        {
          id: "cf1f3fe1-cc09-4a9c-8a69-8f25a1883e8c",
          name: "ENV",
          value: "local",
        },
      ],
      files: [
        {
          id: "4cda33aa-4d2f-49a2-b152-39f8c85db042",
          content:
            "IyEvdXNyL2Jpbi9lbnYgYmFzaAoKIyBNaWdyYXRlIGRhdGFiYXNlIHRvIG1ha2Ugc3VyZSBpdCBpcyBpbiBzeW5jIHdpdGggbGF0ZXN0IHNjaGVtYS4KUFJJU01BX0VOR0lORVNfRElSPSQobml4IGV2YWwgbml4cGtncyNwcmlzbWEtZW5naW5lcy5vdXRQYXRoIC0tZXh0cmEtZXhwZXJpbWVudGFsLWZlYXR1cmVzIG5peC1jb21tYW5kIC0tZXh0cmEtZXhwZXJpbWVudGFsLWZlYXR1cmVzIGZsYWtlcyAgfCBzZWQgJ3MvXi4vLycgfCBzZWQgJ3MvLiQvLycpCmV4cG9ydCBQUklTTUFfUVVFUllfRU5HSU5FX0xJQlJBUlk9IiRQUklTTUFfRU5HSU5FU19ESVIvbGliL2xpYnF1ZXJ5X2VuZ2luZS5ub2RlIgpleHBvcnQgUFJJU01BX1FVRVJZX0VOR0lORV9CSU5BUlk9IiRQUklTTUFfRU5HSU5FU19ESVIvYmluL3F1ZXJ5LWVuZ2luZSIKZXhwb3J0IFBSSVNNQV9TQ0hFTUFfRU5HSU5FX0JJTkFSWT0iJFBSSVNNQV9FTkdJTkVTX0RJUi9iaW4vc2NoZW1hLWVuZ2luZSIKbnB4IHByaXNtYSBtaWdyYXRlIGRlcGxveQoKIyBTdGFydCBzZXJ2ZXItbWFuYWdlci1zZXJ2aWNlCm5wbSBydW4gc3RhcnQK",
          name: "start-server-manager-service-server.sh",
        },
        {
          id: "661142ef-1090-46ba-a649-741690f2bc3f",
          content:
            "RlJPTSBuaXhvcy9uaXgKCiMgVGhpcyBpcyB0aGUgc3VmZml4IG9mIHdoaWNoZXZlciBmaWxlIGluIGVudmlyb25tZW50cy8gdGhhdCB5b3Ugd2FudCB0byB1c2UuCiMgT3ZlcnJpZGUgRU5WIGZvciBkZXBsb3ltZW50cyB0byBub24tbG9jYWwgZW52aXJvbm1lbnRzIHdpdGggLS1idWlsZC1hcmcgRU5WPXN1ZmZpeC4KRU5WIEVOVj1sb2NhbApBUkcgRU5WCgojIEluc3RhbGwgZGVwZW5kZW5jaWVzClJVTiBuaXgtY2hhbm5lbCAtLXVwZGF0ZQpSVU4gbml4LWVudiAtaUEgbml4cGtncy5naXQgbml4cGtncy5ub2RlanMgbml4cGtncy5ub2RlUGFja2FnZXNfbGF0ZXN0LnBucG0gbml4cGtncy5ub2RlUGFja2FnZXNfbGF0ZXN0LnZlcmNlbCBuaXhwa2dzLm5vZGVQYWNrYWdlc19sYXRlc3QucHJpc21hIG5peHBrZ3Mub3BlbnNzbCBuaXhwa2dzLmdudXNlZCBuaXhwa2dzLmRvY2tlcgoKIyBJbnN0YWxsIGxhdGVzdCBzZXJ2ZXItbWFuYWdlci1zZXJ2aWNlClJVTiBnaXQgY2xvbmUgaHR0cHM6Ly9naXRodWIuY29tL1phbmUtVC1SaWNlL3NlcnZlci1tYW5hZ2VyLXNlcnZpY2UuZ2l0CldPUktESVIgL3NlcnZlci1tYW5hZ2VyLXNlcnZpY2UKUlVOIGNwIGVudmlyb25tZW50cy8uZW52LiRFTlYgLmVudgpSVU4gbnBtIGluc3RhbGwKCkVYUE9TRSAzMDAwL3VkcApFWFBPU0UgMzAwMC90Y3AKCkNPUFkgLi9zdGFydC1zZXJ2ZXItbWFuYWdlci1zZXJ2aWNlLXNlcnZlci5zaCAvc3RhcnQtc2VydmVyLW1hbmFnZXItc2VydmljZS1zZXJ2ZXIuc2gKRU5UUllQT0lOVCBbImJhc2giLCAiL3N0YXJ0LXNlcnZlci1tYW5hZ2VyLXNlcnZpY2Utc2VydmVyLnNoIl0K",
          name: "Dockerfile",
        },
      ],
    };

    const updateBuildStepExpectations = async () => {
      expect(
        serversService.prisma.server.findUniqueOrThrow
      ).toHaveBeenCalledWith({
        where: {
          id: mockServerRecord.id,
          hostId,
          isUpdatable: true,
        },
        select: ServersService.completeServerSelect,
      });
      expect(
        child_process.exec as unknown as jest.Mock
      ).toHaveBeenNthCalledWith(
        1,
        expect.stringMatching(/mkdir .*-.*-.*-.*-.*/),
        expect.any(Function)
      );
      expect(fs.writeFileSync as unknown as jest.Mock).toHaveBeenCalledWith(
        expect.stringMatching(
          /.*-.*-.*-.*-.*\/start-server-manager-service-server.sh/
        ),
        Buffer.from(
          mockCompleteServerRecord.files[0].content,
          "base64"
        ).toString("utf-8")
      );
      expect(
        child_process.exec as unknown as jest.Mock
      ).toHaveBeenNthCalledWith(
        2,
        expect.stringMatching(
          /cd .*-.*-.*-.*-.* && docker build -t containerName --no-cache --build-arg 'ENV=local' ./
        ),
        expect.any(Function)
      );
      expect(
        child_process.exec as unknown as jest.Mock
      ).toHaveBeenNthCalledWith(
        3,
        expect.stringMatching(/rm -rf .*-.*-.*-.*-.*/),
        expect.any(Function)
      );
    };
    it("Should update server", async () => {
      // Return a complete server
      jest
        .spyOn(serversService.prisma.server, "findUniqueOrThrow")
        .mockResolvedValue(mockCompleteServerRecord);
      await serversService.updateServer(req, res);
      updateBuildStepExpectations();
      expect(
        child_process.exec as unknown as jest.Mock
      ).toHaveBeenNthCalledWith(
        4,
        [
          "docker pull alpine:latest",
          "docker stop containerName",
          "docker rm containerName",
          "docker run --name=containerName -d --restart always --network=server-manager-service-network -p '3000:3000/udp' -p '3000:3000/tcp' -v '/path/to/server-manager-service/prisma/db:/server-manager-service/prisma/db' -v '/var/run/docker.sock:/var/run/docker.sock' --env 'ENV=local' containerName",
        ].join(";"),
        expect.any(Function)
      );
    });
    it("Should update server using an ephemeral container", async () => {
      const mockCompleteServerRecordIsInResponseChain = {
        ...mockCompleteServerRecord,
        isInResponseChain: true,
      };
      // Return a complete server
      jest
        .spyOn(serversService.prisma.server, "findUniqueOrThrow")
        .mockResolvedValue(mockCompleteServerRecordIsInResponseChain);
      await serversService.updateServer(req, res);
      updateBuildStepExpectations();
      expect(ephemeralContainerRun).toHaveBeenCalledWith(
        req,
        res,
        [
          "docker pull alpine:latest",
          "docker stop containerName",
          "docker rm containerName",
          "docker run --name=containerName -d --restart always --network=server-manager-service-network -p '3000:3000/udp' -p '3000:3000/tcp' -v '/path/to/server-manager-service/prisma/db:/server-manager-service/prisma/db' -v '/var/run/docker.sock:/var/run/docker.sock' --env 'ENV=local' containerName",
        ],
        { ...mockServerRecord, isInResponseChain: true, isUpdatable: true }
      );
    });
    it("should handle any database errors", async () => {
      expect.assertions(4);
      jest
        .spyOn(serversService.prisma.server, "findUniqueOrThrow")
        .mockRejectedValue(new Error());
      try {
        await serversService.updateServer(req, res);
      } catch (e) {
        expect(e).toBeInstanceOf(Error);
      }
      expect(
        serversService.prisma.server.findUniqueOrThrow
      ).toHaveBeenCalledWith({
        where: {
          id: mockServerRecord.id,
          hostId,
          isUpdatable: true,
        },
        select: ServersService.completeServerSelect,
      });
      expect(handleDatabaseErrors).toHaveBeenCalledWith(
        expect.any(Error),
        "server",
        [mockServerRecord.id]
      );
      expect(ephemeralContainerRun).not.toHaveBeenCalled();
    });
  });

  describe("stringToBoolean", () => {
    it('should return true for "true"', () => {
      expect(serversService.stringToBoolean("true")).toBe(true);
    });
    it('should return false for "false"', () => {
      expect(serversService.stringToBoolean("false")).toBe(false);
    });
    it('should return undefined for "badbooleantext"', () => {
      expect(serversService.stringToBoolean("badbooleantext")).toBeUndefined();
    });
    it("should return undefined for undefined", () => {
      expect(serversService.stringToBoolean(undefined)).toBeUndefined();
    });
    it("should return undefined for null", () => {
      expect(serversService.stringToBoolean(null)).toBeUndefined();
    });
  });

  describe("GET /", () => {
    it("Should return list of servers", async () => {
      await serversService.getServers(req, res);
      expect(serversService.prisma.server.findMany).toHaveBeenCalled();
      expect(res.json).toHaveBeenCalledWith([mockServerRecord]);
    });
    it("Should return list of servers that are updatable", async () => {
      const isUpdatableRequest: Request = {
        ...req,
        query: {
          isUpdatable: "true",
        },
      } as unknown as Request;
      await serversService.getServers(isUpdatableRequest, res);
      expect(serversService.prisma.server.findMany).toHaveBeenCalledWith({
        select: ServersService.defaultServerSelect,
        where: { hostId, isUpdatable: true },
      });
      expect(res.json).toHaveBeenCalledWith([mockServerRecord]);
    });
    it("should handle any database errors", async () => {
      expect.assertions(4);
      jest
        .spyOn(serversService.prisma.server, "findMany")
        .mockRejectedValue(new Error());
      try {
        await serversService.getServers(req, res);
      } catch (e) {
        expect(e).toBeInstanceOf(Error);
      }
      expect(serversService.prisma.server.findMany).toHaveBeenCalled();
      expect(handleDatabaseErrors).toHaveBeenCalledWith(
        expect.any(Error),
        "server",
        []
      );
      expect(res.json).not.toHaveBeenCalled();
    });
  });

  describe("GET /:id", () => {
    it("Should return server", async () => {
      await serversService.getServerById(req, res);
      expect(
        serversService.prisma.server.findUniqueOrThrow
      ).toHaveBeenCalledWith({
        where: { id: mockServerRecord.id, hostId },
        select: ServersService.defaultServerSelect,
      });
      expect(res.json).toHaveBeenCalledWith(mockServerRecord);
    });
    it("should handle any database errors", async () => {
      expect.assertions(4);
      jest
        .spyOn(serversService.prisma.server, "findUniqueOrThrow")
        .mockRejectedValue(new Error());
      try {
        await serversService.getServerById(req, res);
      } catch (e) {
        expect(e).toBeInstanceOf(Error);
      }
      expect(
        serversService.prisma.server.findUniqueOrThrow
      ).toHaveBeenCalledWith({
        where: { id: mockServerRecord.id, hostId },
        select: ServersService.defaultServerSelect,
      });
      expect(handleDatabaseErrors).toHaveBeenCalledWith(
        expect.any(Error),
        "server",
        [mockServerRecord.id]
      );
      expect(res.json).not.toHaveBeenCalled();
    });
  });

  describe("PATCH /:id", () => {
    it("Should patch server", async () => {
      await serversService.patchServer(req, res);
      expect(serversService.prisma.server.update).toHaveBeenCalledWith({
        data: { ...body, hostId },
        where: { id: mockServerRecord.id, hostId },
        select: ServersService.defaultServerSelect,
      });
      expect(res.json).toHaveBeenCalledWith(mockServerRecord);
    });
    it("should handle any database errors", async () => {
      expect.assertions(4);
      jest
        .spyOn(serversService.prisma.server, "update")
        .mockRejectedValue(new Error());
      try {
        await serversService.patchServer(req, res);
      } catch (e) {
        expect(e).toBeInstanceOf(Error);
      }
      expect(serversService.prisma.server.update).toHaveBeenCalledWith({
        data: { ...body, hostId },
        where: { id: mockServerRecord.id, hostId },
        select: ServersService.defaultServerSelect,
      });
      expect(handleDatabaseErrors).toHaveBeenCalledWith(
        expect.any(Error),
        "server",
        [mockServerRecord.id]
      );
      expect(res.json).not.toHaveBeenCalled();
    });
  });

  describe("DELETE /:id", () => {
    it("Should delete server", async () => {
      await serversService.deleteServer(req, res);
      expect(serversService.prisma.server.delete).toHaveBeenCalledWith({
        where: { id: mockServerRecord.id, hostId },
        select: ServersService.defaultServerSelect,
      });
      expect(res.json).toHaveBeenCalledWith(mockServerRecord);
    });
    it("should handle any database errors", async () => {
      expect.assertions(4);
      jest
        .spyOn(serversService.prisma.server, "delete")
        .mockRejectedValue(new Error());
      try {
        await serversService.deleteServer(req, res);
      } catch (e) {
        expect(e).toBeInstanceOf(Error);
      }
      expect(serversService.prisma.server.delete).toHaveBeenCalledWith({
        where: { id: mockServerRecord.id, hostId },
        select: ServersService.defaultServerSelect,
      });
      expect(handleDatabaseErrors).toHaveBeenCalledWith(
        expect.any(Error),
        "server",
        [mockServerRecord.id]
      );
      expect(res.json).not.toHaveBeenCalled();
    });
  });
});
