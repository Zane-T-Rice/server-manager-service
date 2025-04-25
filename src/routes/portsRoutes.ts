import { ExpressRouterWrapper } from "../utils/expressRouterWrapper";
import { PortsController } from "../controllers";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const wrappedRouter = new ExpressRouterWrapper();
new PortsController(prisma); // Initialize PortsController singleton

/* POST a new port. */
wrappedRouter.post("/", PortsController.instance.createPort);

/* GET all ports. */
wrappedRouter.get("/", PortsController.instance.getPorts);

/* GET port by id. */
wrappedRouter.get("/:portId", PortsController.instance.getPortById);

/* PATCH an existing port. */
wrappedRouter.patch("/:portId", PortsController.instance.patchPort);

/* DELETE an existing port. */
wrappedRouter.delete("/:portId", PortsController.instance.deletePort);

const portsRouter = wrappedRouter.router;
export { portsRouter, wrappedRouter as wrappedPortsRouter };
