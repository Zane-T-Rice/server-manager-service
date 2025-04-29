import { ExpressRouterWrapper } from "../utils/expressRouterWrapper";
import { PrismaClient } from "@prisma/client";
import { ServersController } from "../controllers";

const prisma = new PrismaClient();
const wrappedRouter = new ExpressRouterWrapper();
new ServersController(prisma); // Initialize ServersController singleton

/* POST a new server. */
wrappedRouter.post("/", ServersController.instance.createServer);

/* POST restart an existing server. */
wrappedRouter.post(
  "/:serverId/restart",
  ServersController.instance.restartServer
);

/* POST update an existing server. */
wrappedRouter.post(
  "/:serverId/update",
  ServersController.instance.updateServer
);

/* POST stop an existing server. */
wrappedRouter.post("/:serverId/stop", ServersController.instance.stopServer);

/* GET all servers. */
wrappedRouter.get("/", ServersController.instance.getServers);

/* GET server by id. */
wrappedRouter.get("/:serverId", ServersController.instance.getServerById);

/* PATCH an existing server. */
wrappedRouter.patch("/:serverId", ServersController.instance.patchServer);

/* DELETE an existing server. */
wrappedRouter.delete("/:serverId", ServersController.instance.deleteServer);

const serversRouter = wrappedRouter.router;
export { serversRouter, wrappedRouter as wrappedServersRouter };
