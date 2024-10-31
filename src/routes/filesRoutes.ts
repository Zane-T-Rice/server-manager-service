import { ExpressRouterWrapper } from "../utils/expressRouterWrapper";
import { PrismaClient } from "@prisma/client";
import { FilesController } from "../controllers";

const prisma = new PrismaClient();
const wrappedRouter = new ExpressRouterWrapper();
new FilesController(prisma); // Initialize FilesController singleton

/* POST a new File. */
wrappedRouter.post("/:serverId/files", FilesController.instance.createFile);

/* GET all Files. */
wrappedRouter.get("/:serverId/files", FilesController.instance.getFiles);

/* GET File by id. */
wrappedRouter.get("/:serverId/files/:id", FilesController.instance.getFileById);

/* PATCH a new File. */
wrappedRouter.patch("/:serverId/files/:id", FilesController.instance.patchFile);

/* DELETE an existing File. */
wrappedRouter.delete(
  "/:serverId/files/:id",
  FilesController.instance.deleteFile
);

const filesRouter = wrappedRouter.router;
export { filesRouter, wrappedRouter as wrappedFilesRouter };
