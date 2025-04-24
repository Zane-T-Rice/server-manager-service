import { ExpressRouterWrapper } from "../utils/expressRouterWrapper";
import { Permissions } from "../constants";
import { PrismaClient } from "@prisma/client";
import { HostsController } from "../controllers";

const prisma = new PrismaClient();
const wrappedRouter = new ExpressRouterWrapper();
new HostsController(prisma); // Initialize hostsController singleton

/* POST a new host. */
wrappedRouter.post("/", HostsController.instance.createHost, Permissions.WRITE);

/* GET all hosts. */
wrappedRouter.get("/", HostsController.instance.getHosts, Permissions.READ);

/* GET host by id. */
wrappedRouter.get(
  "/:hostId",
  HostsController.instance.getHostById,
  Permissions.READ
);

/* PATCH an existing host. */
wrappedRouter.patch(
  "/:hostId",
  HostsController.instance.patchHost,
  Permissions.WRITE
);

/* DELETE an existing host. */
wrappedRouter.delete(
  "/:hostId",
  HostsController.instance.deleteHost,
  Permissions.WRITE
);

const hostsRouter = wrappedRouter.router;
export { hostsRouter, wrappedRouter as wrappedHostsRouter };
