import { ExpressRouterWrapper } from "../utils/expressRouterWrapper";
import { PrismaClient } from "@prisma/client";
import { ServersController } from "../controllers";

const prisma = new PrismaClient();
const wrappedRouter = new ExpressRouterWrapper();
new ServersController(prisma); // Initialize ServersController singleton

/* POST a new server. */
wrappedRouter.post("/", ServersController.instance.createServer);

/* POST restart an existing server. */
wrappedRouter.post("/:id/restart", ServersController.instance.restartServer);

/* GET all servers. */
wrappedRouter.get("/", ServersController.instance.getServers);

/* GET server by id. */
wrappedRouter.get("/:id", ServersController.instance.getServerById);

/* PATCH a new server. */
wrappedRouter.patch("/:id", ServersController.instance.patchServer);

/* DELETE an existing server. */
wrappedRouter.delete("/:id", ServersController.instance.deleteServer);

const serversRouter = wrappedRouter.router;
export { serversRouter, wrappedRouter as wrappedServersRouter };
