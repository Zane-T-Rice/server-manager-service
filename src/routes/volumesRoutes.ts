import { ExpressRouterWrapper } from "../utils/expressRouterWrapper";
import { PrismaClient } from "@prisma/client";
import { VolumesController } from "../controllers";

const prisma = new PrismaClient();
const wrappedRouter = new ExpressRouterWrapper();
new VolumesController(prisma); // Initialize volumesController singleton

/* POST a new volume. */
wrappedRouter.post("/", VolumesController.instance.createVolume);

/* GET all volumes. */
wrappedRouter.get("/", VolumesController.instance.getVolumes);

/* GET volume by id. */
wrappedRouter.get("/:volumeId", VolumesController.instance.getVolumeById);

/* PATCH an existing volume. */
wrappedRouter.patch("/:volumeId", VolumesController.instance.patchVolume);

/* DELETE an existing volume. */
wrappedRouter.delete("/:volumeId", VolumesController.instance.deleteVolume);

const volumesRouter = wrappedRouter.router;
export { volumesRouter, wrappedRouter as wrappedVolumesRouter };
