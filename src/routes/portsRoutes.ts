import { ExpressRouterWrapper } from "../utils/expressRouterWrapper";
import { Permissions } from "../constants";
import { PortsController } from "../controllers";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const wrappedRouter = new ExpressRouterWrapper();
new PortsController(prisma); // Initialize PortsController singleton

/* POST a new port. */
wrappedRouter.post("/", PortsController.instance.createPort, Permissions.WRITE);

/* GET all ports. */
wrappedRouter.get("/", PortsController.instance.getPorts, Permissions.READ);

/* GET port by id. */
wrappedRouter.get(
  "/:portId",
  PortsController.instance.getPortById,
  Permissions.READ
);

/* PATCH an existing port. */
wrappedRouter.patch(
  "/:portId",
  PortsController.instance.patchPort,
  Permissions.WRITE
);

/* DELETE an existing port. */
wrappedRouter.delete(
  "/:portId",
  PortsController.instance.deletePort,
  Permissions.WRITE
);

const portsRouter = wrappedRouter.router;
export { portsRouter, wrappedRouter as wrappedPortsRouter };
