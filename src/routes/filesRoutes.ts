import { ExpressRouterWrapper } from "../utils/expressRouterWrapper";
import { FilesController } from "../controllers";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const wrappedRouter = new ExpressRouterWrapper();
new FilesController(prisma); // Initialize FilesController singleton

/* POST a new File. */
wrappedRouter.post("/", FilesController.instance.createFile);

/* GET all Files. */
wrappedRouter.get("/", FilesController.instance.getFiles);

/* GET File by id. */
wrappedRouter.get("/:fileId", FilesController.instance.getFileById);

/* PATCH an existing File. */
wrappedRouter.patch("/:fileId", FilesController.instance.patchFile);

/* DELETE an existing File. */
wrappedRouter.delete("/:fileId", FilesController.instance.deleteFile);

const filesRouter = wrappedRouter.router;
export { filesRouter, wrappedRouter as wrappedFilesRouter };
