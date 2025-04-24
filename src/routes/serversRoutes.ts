import { ExpressRouterWrapper } from "../utils/expressRouterWrapper";
import { Permissions } from "../constants";
import { PrismaClient } from "@prisma/client";
import { ServersController } from "../controllers";
import { isHostMiddleware } from "../middlewares";

const prisma = new PrismaClient();
const wrappedRouter = new ExpressRouterWrapper();
new ServersController(prisma); // Initialize ServersController singleton

/* POST a new server. */
wrappedRouter.post(
  "/",
  [isHostMiddleware(prisma, true), ServersController.instance.createServer],
  Permissions.WRITE
);

/* POST restart an existing server. */
wrappedRouter.post(
  "/:serverId/restart",
  ServersController.instance.restartServer,
  Permissions.REBOOT
);

/* POST update an existing server. */
wrappedRouter.post(
  "/:serverId/update",
  ServersController.instance.updateServer,
  Permissions.UPDATE
);

/* GET all servers. */
wrappedRouter.get("/", ServersController.instance.getServers, Permissions.READ);

/* GET server by id. */
wrappedRouter.get(
  "/:serverId",
  ServersController.instance.getServerById,
  Permissions.READ
);

/* PATCH an existing server. */
wrappedRouter.patch(
  "/:serverId",
  [isHostMiddleware(prisma, false), ServersController.instance.patchServer],
  Permissions.WRITE
);

/* DELETE an existing server. */
wrappedRouter.delete(
  "/:serverId",
  ServersController.instance.deleteServer,
  Permissions.WRITE
);

const serversRouter = wrappedRouter.router;
export { serversRouter, wrappedRouter as wrappedServersRouter };
