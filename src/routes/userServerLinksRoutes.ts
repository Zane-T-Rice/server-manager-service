import { ExpressRouterWrapper } from "../utils/expressRouterWrapper";
import { PrismaClient } from "@prisma/client";
import { UserServerLinksController } from "../controllers";

const prisma = new PrismaClient();
const wrappedRouter = new ExpressRouterWrapper();
new UserServerLinksController(prisma); // Initialize ServersController singleton

/* PATCH a link betwen User and Server of request. */
wrappedRouter.patch(
  "/:userId",
  UserServerLinksController.instance.patchUserServerLinkByUserId
);

/* DELETE a link betwen User and Server of request. */
wrappedRouter.delete(
  "/:userId",
  UserServerLinksController.instance.deleteUserServerLinkByUserId
);

const userServerLinksRouter = wrappedRouter.router;
export { userServerLinksRouter, wrappedRouter as wrappedUserServerLinksRouter };
