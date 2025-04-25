import { ExpressRouterWrapper } from "../utils/expressRouterWrapper";
import { Permissions } from "../constants";
import { PrismaClient } from "@prisma/client";
import { ServersController } from "../controllers";

const prisma = new PrismaClient();
const wrappedRouter = new ExpressRouterWrapper();
new ServersController(prisma); // Initialize ServersController singleton

/* POST a new server. */
wrappedRouter.post(
  "/",
  ServersController.instance.createServer,
  Permissions.ADMIN
);

/* POST restart an existing server. */
wrappedRouter.post(
  "/:serverId/restart",
  ServersController.instance.restartServer,
  Permissions.ADMIN
);

/* POST update an existing server. */
wrappedRouter.post(
  "/:serverId/update",
  ServersController.instance.updateServer,
  Permissions.ADMIN
);

/* GET all servers. */
wrappedRouter.get(
  "/",
  ServersController.instance.getServers,
  Permissions.ADMIN
);

/* GET server by id. */
wrappedRouter.get(
  "/:serverId",
  ServersController.instance.getServerById,
  Permissions.ADMIN
);

/* PATCH an existing server. */
wrappedRouter.patch(
  "/:serverId",
  ServersController.instance.patchServer,
  Permissions.ADMIN
);

/* DELETE an existing server. */
wrappedRouter.delete(
  "/:serverId",
  ServersController.instance.deleteServer,
  Permissions.ADMIN
);

const serversRouter = wrappedRouter.router;
export { serversRouter, wrappedRouter as wrappedServersRouter };
