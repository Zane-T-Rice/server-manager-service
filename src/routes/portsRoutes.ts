import { ExpressRouterWrapper } from "../utils/expressRouterWrapper";
import { PrismaClient } from "@prisma/client";
import { PortsController } from "../controllers";

const prisma = new PrismaClient();
const wrappedRouter = new ExpressRouterWrapper();
new PortsController(prisma); // Initialize PortsController singleton

/* POST a new port. */
wrappedRouter.post("/", PortsController.instance.createPort);

/* GET all ports. */
wrappedRouter.get("/", PortsController.instance.getPorts);

/* GET port by id. */
wrappedRouter.get("/:id", PortsController.instance.getPortById);

/* PATCH a new port. */
wrappedRouter.patch("/:id", PortsController.instance.patchPort);

/* DELETE an existing port. */
wrappedRouter.delete("/:id", PortsController.instance.deletePort);

const portsRouter = wrappedRouter.router;
export { portsRouter, wrappedRouter as wrappedPortsRouter };
