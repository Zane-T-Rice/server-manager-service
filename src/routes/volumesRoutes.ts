import { ExpressRouterWrapper } from "../utils/expressRouterWrapper";
import { Permissions } from "../constants";
import { PrismaClient } from "@prisma/client";
import { VolumesController } from "../controllers";

const prisma = new PrismaClient();
const wrappedRouter = new ExpressRouterWrapper();
new VolumesController(prisma); // Initialize volumesController singleton

/* POST a new volume. */
wrappedRouter.post(
  "/",
  VolumesController.instance.createVolume,
  Permissions.ADMIN
);

/* GET all volumes. */
wrappedRouter.get(
  "/",
  VolumesController.instance.getVolumes,
  Permissions.ADMIN
);

/* GET volume by id. */
wrappedRouter.get(
  "/:volumeId",
  VolumesController.instance.getVolumeById,
  Permissions.ADMIN
);

/* PATCH an existing volume. */
wrappedRouter.patch(
  "/:volumeId",
  VolumesController.instance.patchVolume,
  Permissions.ADMIN
);

/* DELETE an existing volume. */
wrappedRouter.delete(
  "/:volumeId",
  VolumesController.instance.deleteVolume,
  Permissions.ADMIN
);

const volumesRouter = wrappedRouter.router;
export { volumesRouter, wrappedRouter as wrappedVolumesRouter };
