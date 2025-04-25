import { ExpressRouterWrapper } from "../utils/expressRouterWrapper";
import { Permissions } from "../constants";
import { PortsController } from "../controllers";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const wrappedRouter = new ExpressRouterWrapper();
new PortsController(prisma); // Initialize PortsController singleton

/* POST a new port. */
wrappedRouter.post("/", PortsController.instance.createPort, Permissions.ADMIN);

/* GET all ports. */
wrappedRouter.get("/", PortsController.instance.getPorts, Permissions.ADMIN);

/* GET port by id. */
wrappedRouter.get(
  "/:portId",
  PortsController.instance.getPortById,
  Permissions.ADMIN
);

/* PATCH an existing port. */
wrappedRouter.patch(
  "/:portId",
  PortsController.instance.patchPort,
  Permissions.ADMIN
);

/* DELETE an existing port. */
wrappedRouter.delete(
  "/:portId",
  PortsController.instance.deletePort,
  Permissions.ADMIN
);

const portsRouter = wrappedRouter.router;
export { portsRouter, wrappedRouter as wrappedPortsRouter };
