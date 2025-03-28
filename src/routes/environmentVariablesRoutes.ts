import { EnvironmentVariablesController } from "../controllers";
import { ExpressRouterWrapper } from "../utils/expressRouterWrapper";
import { Permissions } from "../constants/permissions";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const wrappedRouter = new ExpressRouterWrapper();
new EnvironmentVariablesController(prisma); // Initialize EnvironmentVariablesController singleton

/* POST a new environment variable. */
wrappedRouter.post(
  "/:serverId/environmentVariables",
  EnvironmentVariablesController.instance.createEnvironmentVariable,
  Permissions.WRITE
);

/* GET all environment variables. */
wrappedRouter.get(
  "/:serverId/environmentVariables",
  EnvironmentVariablesController.instance.getEnvironmentVariables,
  Permissions.READ
);

/* GET environment variable by id. */
wrappedRouter.get(
  "/:serverId/environmentVariables/:id",
  EnvironmentVariablesController.instance.getEnvironmentVariableById,
  Permissions.READ
);

/* PATCH a new environment variable. */
wrappedRouter.patch(
  "/:serverId/environmentVariables/:id",
  EnvironmentVariablesController.instance.patchEnvironmentVariable,
  Permissions.WRITE
);

/* DELETE an existing environment variable. */
wrappedRouter.delete(
  "/:serverId/environmentVariables/:id",
  EnvironmentVariablesController.instance.deleteEnvironmentVariable,
  Permissions.WRITE
);

const environmentVariablesRouter = wrappedRouter.router;
export {
  environmentVariablesRouter,
  wrappedRouter as wrappedEnvironmentVariablesRouter,
};
