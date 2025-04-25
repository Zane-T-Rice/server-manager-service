import { ExpressRouterWrapper } from "../utils/expressRouterWrapper";
import { PrismaClient } from "@prisma/client";
import { HostsController } from "../controllers";

const prisma = new PrismaClient();
const wrappedRouter = new ExpressRouterWrapper();
new HostsController(prisma); // Initialize hostsController singleton

/* POST a new host. */
wrappedRouter.post("/", HostsController.instance.createHost);

/* GET all hosts. */
wrappedRouter.get("/", HostsController.instance.getHosts);

/* GET host by id. */
wrappedRouter.get("/:hostId", HostsController.instance.getHostById);

/* PATCH an existing host. */
wrappedRouter.patch("/:hostId", HostsController.instance.patchHost);

/* DELETE an existing host. */
wrappedRouter.delete("/:hostId", HostsController.instance.deleteHost);

const hostsRouter = wrappedRouter.router;
export { hostsRouter, wrappedRouter as wrappedHostsRouter };
