import { ExpressRouterWrapper } from "../utils/expressRouterWrapper";
import { PrismaClient } from "@prisma/client";
import { UserServersController } from "../controllers";

const prisma = new PrismaClient();
const wrappedRouter = new ExpressRouterWrapper();
new UserServersController(prisma); // Initialize ServersController singleton

/* POST update an existing server owned by this user. */
wrappedRouter.post(
  "/:serverId/update",
  UserServersController.instance.updateServer
);

/* POST stop an existing server owned by this user. */
wrappedRouter.post(
  "/:serverId/stop",
  UserServersController.instance.stopServer
);

/* GET all servers for the user. */
wrappedRouter.get("/", UserServersController.instance.getServers);

/* GET server owned by this user by id. */
wrappedRouter.get("/:serverId", UserServersController.instance.getServerById);

/* DELETE an existing server owned by this user. */
// At the moment, this is not useful because there is no user scoped create.
// wrappedRouter.delete("/:serverId", UserServersController.instance.deleteServer);

const userServersRouter = wrappedRouter.router;
export { userServersRouter, wrappedRouter as wrappedUserServersRouter };
