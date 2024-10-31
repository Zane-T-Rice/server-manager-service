import { ExpressRouterWrapper } from "../utils/expressRouterWrapper";
import { PrismaClient } from "@prisma/client";
import { VolumesController } from "../controllers";

const prisma = new PrismaClient();
const wrappedRouter = new ExpressRouterWrapper();
new VolumesController(prisma); // Initialize volumesController singleton

/* POST a new volume. */
wrappedRouter.post(
  "/:serverId/volumes",
  VolumesController.instance.createVolume
);

/* GET all volumes. */
wrappedRouter.get("/:serverId/volumes", VolumesController.instance.getVolumes);

/* GET volume by id. */
wrappedRouter.get(
  "/:serverId/volumes/:id",
  VolumesController.instance.getVolumeById
);

/* PATCH a new volume. */
wrappedRouter.patch(
  "/:serverId/volumes/:id",
  VolumesController.instance.patchVolume
);

/* DELETE an existing volume. */
wrappedRouter.delete(
  "/:serverId/volumes/:id",
  VolumesController.instance.deleteVolume
);

const volumesRouter = wrappedRouter.router;
export { volumesRouter, wrappedRouter as wrappedVolumesRouter };
