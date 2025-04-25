import { ExpressRouterWrapper } from "../utils/expressRouterWrapper";
import { FilesController } from "../controllers";
import { Permissions } from "../constants";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const wrappedRouter = new ExpressRouterWrapper();
new FilesController(prisma); // Initialize FilesController singleton

/* POST a new File. */
wrappedRouter.post("/", FilesController.instance.createFile, Permissions.ADMIN);

/* GET all Files. */
wrappedRouter.get("/", FilesController.instance.getFiles, Permissions.ADMIN);

/* GET File by id. */
wrappedRouter.get(
  "/:fileId",
  FilesController.instance.getFileById,
  Permissions.ADMIN
);

/* PATCH an existing File. */
wrappedRouter.patch(
  "/:fileId",
  FilesController.instance.patchFile,
  Permissions.ADMIN
);

/* DELETE an existing File. */
wrappedRouter.delete(
  "/:fileId",
  FilesController.instance.deleteFile,
  Permissions.ADMIN
);

const filesRouter = wrappedRouter.router;
export { filesRouter, wrappedRouter as wrappedFilesRouter };
