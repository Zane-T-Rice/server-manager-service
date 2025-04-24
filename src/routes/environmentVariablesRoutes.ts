import { EnvironmentVariablesController } from "../controllers";
import { ExpressRouterWrapper } from "../utils/expressRouterWrapper";
import { Permissions } from "../constants";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const wrappedRouter = new ExpressRouterWrapper();
new EnvironmentVariablesController(prisma); // Initialize EnvironmentVariablesController singleton

/* POST a new environment variable. */
wrappedRouter.post(
  "/",
  EnvironmentVariablesController.instance.createEnvironmentVariable,
  Permissions.WRITE
);

/* GET all environment variables. */
wrappedRouter.get(
  "/",
  EnvironmentVariablesController.instance.getEnvironmentVariables,
  Permissions.READ
);

/* GET environment variable by id. */
wrappedRouter.get(
  "/:environmentVariableId",
  EnvironmentVariablesController.instance.getEnvironmentVariableById,
  Permissions.READ
);

/* PATCH an existing environment variable. */
wrappedRouter.patch(
  "/:environmentVariableId",
  EnvironmentVariablesController.instance.patchEnvironmentVariable,
  Permissions.WRITE
);

/* DELETE an existing environment variable. */
wrappedRouter.delete(
  "/:environmentVariableId",
  EnvironmentVariablesController.instance.deleteEnvironmentVariable,
  Permissions.WRITE
);

const environmentVariablesRouter = wrappedRouter.router;
export {
  environmentVariablesRouter,
  wrappedRouter as wrappedEnvironmentVariablesRouter,
};
