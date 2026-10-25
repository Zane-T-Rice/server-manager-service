import { ExpressRouterWrapper } from "../utils/expressRouterWrapper";
import { PrismaClient } from "@prisma/client";
import { UserServerLinksController } from "../controllers";

const prisma = new PrismaClient();
const wrappedRouter = new ExpressRouterWrapper();
new UserServerLinksController(prisma); // Initialize ServersController singleton

/* Get Users Linked to the Server. */
wrappedRouter.get("/", UserServerLinksController.instance.getUserServerLinks);

/* Search Auth0 for users to link. */
wrappedRouter.get(
  "/search",
  UserServerLinksController.instance.searchAuth0Users
);

/* Connect User and Server. */
wrappedRouter.post(
  "/",
  UserServerLinksController.instance.createUserServerLinkByUserId
);

/* Disconnect User and Server. */
wrappedRouter.delete(
  "/:userId",
  UserServerLinksController.instance.deleteUserServerLinkByUserId
);

const userServerLinksRouter = wrappedRouter.router;
export { userServerLinksRouter, wrappedRouter as wrappedUserServerLinksRouter };
