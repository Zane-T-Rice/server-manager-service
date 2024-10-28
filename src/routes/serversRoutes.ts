import { ExpressRouterWrapper } from "../utils/expressRouterWrapper";
import { PrismaClient } from "@prisma/client";
import { ServersController } from "../controllers";

const prisma = new PrismaClient();
const wrappedRouter = new ExpressRouterWrapper();
const serversController = new ServersController(prisma);

/* POST a new server. */
wrappedRouter.post("/", serversController.createServer);

/* POST restart an existing server. */
wrappedRouter.post("/:id/restart", serversController.createServer);

/* GET all servers. */
wrappedRouter.get("/", serversController.createServer);

/* GET server by id. */
wrappedRouter.get("/:id", serversController.createServer);

/* PATCH a new server. */
wrappedRouter.patch("/:id", serversController.createServer);

/* DELETE an existing server. */
wrappedRouter.delete("/:id", serversController.createServer);

const serversRouter = wrappedRouter.router;
export { serversRouter, wrappedRouter };
