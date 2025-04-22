// Adds a couple basic servers for testing during development.
// These should be able to be updated/restarted.
import * as dotenv from "dotenv";
import { PrismaClient } from "@prisma/client";
import { ServersService } from "../../src/services/serversService";
import { FilesService } from "../../src/services/filesService";
import { File, Server } from "../../node_modules/prisma/prisma-client";
dotenv.config();

type CastServer = Server & { files: File[] };
type PartialServer = Partial<Server & { files: Partial<File>[] }>;

const prisma = new PrismaClient();
const servers: PartialServer[] = [
  {
    applicationName: "min-app",
    containerName: "min-container",
    isInResponseChain: false,
    isUpdatable: true,
    hostUrl: "http://localhost:3000",
    files: [
      {
        name: "Dockerfile",
        content:
          "IyBJIGhhdmUgZm91bmQgdGhpcyB1c2VmdWwgYXMgYSBkdW1teSBzZXJ2ZXIgZm9yIHRlc3RpbmcgZHVyaW5nIGRldmVsb3BtZW50LgpGUk9NIGFscGluZQpSVU4gYXBrIGFkZCBiYXNoCkNPUFkgLi9zdGFydC1taW4uc2ggL3N0YXJ0LW1pbi5zaApFTlRSWVBPSU5UIFsiYmFzaCIsICIvc3RhcnQtbWluLnNoIl0K",
      },
      {
        name: "start-min.sh",
        content: "d2hpbGUgdHJ1ZTtkbyBzbGVlcCAzMDsgZG9uZQ==",
      },
    ],
  },
  {
    applicationName: "min-app-2",
    containerName: "min-container-2",
    isInResponseChain: false,
    isUpdatable: true,
    hostUrl: "http://localhost:3200",
    files: [
      {
        name: "Dockerfile",
        content:
          "IyBJIGhhdmUgZm91bmQgdGhpcyB1c2VmdWwgYXMgYSBkdW1teSBzZXJ2ZXIgZm9yIHRlc3RpbmcgZHVyaW5nIGRldmVsb3BtZW50LgpGUk9NIGFscGluZQpSVU4gYXBrIGFkZCBiYXNoCkNPUFkgLi9zdGFydC1taW4uc2ggL3N0YXJ0LW1pbi5zaApFTlRSWVBPSU5UIFsiYmFzaCIsICIvc3RhcnQtbWluLnNoIl0K",
      },
      {
        name: "start-min.sh",
        content: "d2hpbGUgdHJ1ZTtkbyBzbGVlcCAzMDsgZG9uZQ==",
      },
    ],
  },
];

const seed = async () => {
  const promises = servers.map(async (server) => {
    const {
      applicationName,
      containerName,
      isInResponseChain,
      isUpdatable,
      hostUrl,
      files,
    } = server as CastServer;
    const dbServer = await prisma.server.create({
      data: {
        applicationName,
        containerName,
        isInResponseChain,
        isUpdatable,
        hostUrl,
      },
      select: ServersService.defaultServerSelect,
    });

    await Promise.all(
      files.map(async (file) => {
        const { content, name } = file;
        await prisma.file.create({
          data: {
            serverId: dbServer.id,
            content,
            name,
          },
          select: FilesService.defaultFileSelect,
        });
      })
    );
  });
  await Promise.all(promises);
};

seed();
