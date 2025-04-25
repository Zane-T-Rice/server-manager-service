import { EnvironmentVariablesController } from "../controllers";
import { ExpressRouterWrapper } from "../utils/expressRouterWrapper";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const wrappedRouter = new ExpressRouterWrapper();
new EnvironmentVariablesController(prisma); // Initialize EnvironmentVariablesController singleton

/* POST a new environment variable. */
wrappedRouter.post(
  "/",
  EnvironmentVariablesController.instance.createEnvironmentVariable
);

/* GET all environment variables. */
wrappedRouter.get(
  "/",
  EnvironmentVariablesController.instance.getEnvironmentVariables
);

/* GET environment variable by id. */
wrappedRouter.get(
  "/:environmentVariableId",
  EnvironmentVariablesController.instance.getEnvironmentVariableById
);

/* PATCH an existing environment variable. */
wrappedRouter.patch(
  "/:environmentVariableId",
  EnvironmentVariablesController.instance.patchEnvironmentVariable
);

/* DELETE an existing environment variable. */
wrappedRouter.delete(
  "/:environmentVariableId",
  EnvironmentVariablesController.instance.deleteEnvironmentVariable
);

const environmentVariablesRouter = wrappedRouter.router;
export {
  environmentVariablesRouter,
  wrappedRouter as wrappedEnvironmentVariablesRouter,
};
