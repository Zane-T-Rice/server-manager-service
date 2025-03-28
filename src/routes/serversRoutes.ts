import { ExpressRouterWrapper } from "../utils/expressRouterWrapper";
import { Permissions } from "../constants/permissions";
import { PrismaClient } from "@prisma/client";
import { ServersController } from "../controllers";

const prisma = new PrismaClient();
const wrappedRouter = new ExpressRouterWrapper();
new ServersController(prisma); // Initialize ServersController singleton

/* POST a new server. */
wrappedRouter.post(
  "/",
  ServersController.instance.createServer,
  Permissions.WRITE
);

/* POST restart an existing server. */
wrappedRouter.post(
  "/:id/restart",
  ServersController.instance.restartServer,
  Permissions.REBOOT
);

/* POST restart an existing server. */
wrappedRouter.post(
  "/:id/update",
  ServersController.instance.updateServer,
  Permissions.UPDATE
);

/* GET all servers. */
wrappedRouter.get("/", ServersController.instance.getServers, Permissions.READ);

/* GET server by id. */
wrappedRouter.get(
  "/:id",
  ServersController.instance.getServerById,
  Permissions.READ
);

/* PATCH a new server. */
wrappedRouter.patch(
  "/:id",
  ServersController.instance.patchServer,
  Permissions.WRITE
);

/* DELETE an existing server. */
wrappedRouter.delete(
  "/:id",
  ServersController.instance.deleteServer,
  Permissions.WRITE
);

const serversRouter = wrappedRouter.router;
export { serversRouter, wrappedRouter as wrappedServersRouter };
