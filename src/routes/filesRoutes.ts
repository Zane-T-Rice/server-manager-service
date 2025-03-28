import { ExpressRouterWrapper } from "../utils/expressRouterWrapper";
import { FilesController } from "../controllers";
import { Permissions } from "../constants/permissions";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const wrappedRouter = new ExpressRouterWrapper();
new FilesController(prisma); // Initialize FilesController singleton

/* POST a new File. */
wrappedRouter.post(
  "/:serverId/files",
  FilesController.instance.createFile,
  Permissions.WRITE
);

/* GET all Files. */
wrappedRouter.get(
  "/:serverId/files",
  FilesController.instance.getFiles,
  Permissions.READ
);

/* GET File by id. */
wrappedRouter.get(
  "/:serverId/files/:id",
  FilesController.instance.getFileById,
  Permissions.READ
);

/* PATCH a new File. */
wrappedRouter.patch(
  "/:serverId/files/:id",
  FilesController.instance.patchFile,
  Permissions.WRITE
);

/* DELETE an existing File. */
wrappedRouter.delete(
  "/:serverId/files/:id",
  FilesController.instance.deleteFile,
  Permissions.WRITE
);

const filesRouter = wrappedRouter.router;
export { filesRouter, wrappedRouter as wrappedFilesRouter };
