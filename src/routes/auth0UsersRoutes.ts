import { ExpressRouterWrapper } from "../utils/expressRouterWrapper";
import { Auth0UsersController } from "../controllers";

const wrappedRouter = new ExpressRouterWrapper();
new Auth0UsersController(); // Initialize Auth0UsersController singleton

/* GET Auth0 users and machine-to-machine applications. */
wrappedRouter.get("/", Auth0UsersController.instance.getAuth0Users);

const auth0UsersRouter = wrappedRouter.router;
export { auth0UsersRouter, wrappedRouter as wrappedAuth0UsersRouter };
