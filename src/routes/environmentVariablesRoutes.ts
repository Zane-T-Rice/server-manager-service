import { EnvironmentVariablesController } from "../controllers";
import { ExpressRouterWrapper } from "../utils/expressRouterWrapper";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const wrappedRouter = new ExpressRouterWrapper();
new EnvironmentVariablesController(prisma); // Initialize EnvironmentVariablesController singleton

/* POST a new environment variable. */
wrappedRouter.post(
  "/:serverId/environmentVariables",
  EnvironmentVariablesController.instance.createEnvironmentVariable
);

/* GET all environment variables. */
wrappedRouter.get(
  "/:serverId/environmentVariables",
  EnvironmentVariablesController.instance.getEnvironmentVariables
);

/* GET environment variable by id. */
wrappedRouter.get(
  "/:serverId/environmentVariables/:id",
  EnvironmentVariablesController.instance.getEnvironmentVariableById
);

/* PATCH a new environment variable. */
wrappedRouter.patch(
  "/:serverId/environmentVariables/:id",
  EnvironmentVariablesController.instance.patchEnvironmentVariable
);

/* DELETE an existing environment variable. */
wrappedRouter.delete(
  "/:serverId/environmentVariables/:id",
  EnvironmentVariablesController.instance.deleteEnvironmentVariable
);

const environmentVariablesRouter = wrappedRouter.router;
export {
  environmentVariablesRouter,
  wrappedRouter as wrappedEnvironmentVariablesRouter,
};
