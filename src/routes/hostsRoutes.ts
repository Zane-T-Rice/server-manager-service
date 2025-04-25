import { ExpressRouterWrapper } from "../utils/expressRouterWrapper";
import { Permissions } from "../constants";
import { PrismaClient } from "@prisma/client";
import { HostsController } from "../controllers";

const prisma = new PrismaClient();
const wrappedRouter = new ExpressRouterWrapper();
new HostsController(prisma); // Initialize hostsController singleton

/* POST a new host. */
wrappedRouter.post("/", HostsController.instance.createHost, Permissions.ADMIN);

/* GET all hosts. */
wrappedRouter.get("/", HostsController.instance.getHosts, Permissions.ADMIN);

/* GET host by id. */
wrappedRouter.get(
  "/:hostId",
  HostsController.instance.getHostById,
  Permissions.ADMIN
);

/* PATCH an existing host. */
wrappedRouter.patch(
  "/:hostId",
  HostsController.instance.patchHost,
  Permissions.ADMIN
);

/* DELETE an existing host. */
wrappedRouter.delete(
  "/:hostId",
  HostsController.instance.deleteHost,
  Permissions.ADMIN
);

const hostsRouter = wrappedRouter.router;
export { hostsRouter, wrappedRouter as wrappedHostsRouter };
