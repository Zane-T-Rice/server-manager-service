import { ExpressRouterWrapper } from "../utils/expressRouterWrapper";
import { Permissions } from "../constants/permissions";
import { PrismaClient } from "@prisma/client";
import { VolumesController } from "../controllers";

const prisma = new PrismaClient();
const wrappedRouter = new ExpressRouterWrapper();
new VolumesController(prisma); // Initialize volumesController singleton

/* POST a new volume. */
wrappedRouter.post(
  "/:serverId/volumes",
  VolumesController.instance.createVolume,
  Permissions.WRITE
);

/* GET all volumes. */
wrappedRouter.get(
  "/:serverId/volumes",
  VolumesController.instance.getVolumes,
  Permissions.READ
);

/* GET volume by id. */
wrappedRouter.get(
  "/:serverId/volumes/:id",
  VolumesController.instance.getVolumeById,
  Permissions.READ
);

/* PATCH a new volume. */
wrappedRouter.patch(
  "/:serverId/volumes/:id",
  VolumesController.instance.patchVolume,
  Permissions.WRITE
);

/* DELETE an existing volume. */
wrappedRouter.delete(
  "/:serverId/volumes/:id",
  VolumesController.instance.deleteVolume,
  Permissions.WRITE
);

const volumesRouter = wrappedRouter.router;
export { volumesRouter, wrappedRouter as wrappedVolumesRouter };
