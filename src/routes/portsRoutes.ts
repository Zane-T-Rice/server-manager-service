import { ExpressRouterWrapper } from "../utils/expressRouterWrapper";
import { Permissions } from "../constants/permissions";
import { PortsController } from "../controllers";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const wrappedRouter = new ExpressRouterWrapper();
new PortsController(prisma); // Initialize PortsController singleton

/* POST a new port. */
wrappedRouter.post(
  "/:serverId/ports",
  PortsController.instance.createPort,
  Permissions.WRITE
);

/* GET all ports. */
wrappedRouter.get(
  "/:serverId/ports",
  PortsController.instance.getPorts,
  Permissions.READ
);

/* GET port by id. */
wrappedRouter.get(
  "/:serverId/ports/:id",
  PortsController.instance.getPortById,
  Permissions.READ
);

/* PATCH a new port. */
wrappedRouter.patch(
  "/:serverId/ports/:id",
  PortsController.instance.patchPort,
  Permissions.WRITE
);

/* DELETE an existing port. */
wrappedRouter.delete(
  "/:serverId/ports/:id",
  PortsController.instance.deletePort,
  Permissions.WRITE
);

const portsRouter = wrappedRouter.router;
export { portsRouter, wrappedRouter as wrappedPortsRouter };
