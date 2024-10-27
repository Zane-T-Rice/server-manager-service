import { exec as exec2 } from "child_process";
import { ExpressRouterWrapper } from "../utils/expressRouterWrapper";
import { handleDatabaseErrors } from "../utils/handleDatabaseErrors";
import { PrismaClient } from "@prisma/client";
import { promisify } from "util";
const exec = promisify(exec2);

const prisma = new PrismaClient();
const wrappedRouter = new ExpressRouterWrapper();

/* POST a new server. */
wrappedRouter.post("/", async function (req, res) {
  const { applicationName, containerName } = req.body;
  const server = await prisma.server
    .create({
      data: { applicationName, containerName },
    })
    .catch((e) => handleDatabaseErrors(e, "server", []));
  res.json(server);
});

/* POST restart an existing server. */
wrappedRouter.post("/:id/restart", async (req, res) => {
  const { id } = req.params;
  const server = await prisma.server
    .findUnique({ where: { id: String(id) } })
    .catch((e) => handleDatabaseErrors(e, "server", [id]));
  await exec(`docker restart '${server?.containerName}'`);
  res.json(server);
});

/* GET all servers. */
wrappedRouter.get("/", async function (req, res) {
  const servers = await prisma.server
    .findMany()
    .catch((e) => handleDatabaseErrors(e, "server", []));
  res.json(servers);
});

/* GET server by id. */
wrappedRouter.get("/:id", async function (req, res) {
  const { id } = req.params;
  const server = await prisma.server
    .findUniqueOrThrow({
      where: { id: String(id) },
    })
    .catch((e) => handleDatabaseErrors(e, "server", [id]));
  res.json(server);
});

/* PATCH a new server. */
wrappedRouter.patch("/:id", async function (req, res) {
  const { id } = req.params;
  const { applicationName, containerName } = req.body;
  const existingServer = await prisma.server.findUnique({
    where: { id: String(id) },
  });
  const server = await prisma.server
    .update({
      data: { ...existingServer, applicationName, containerName },
      where: { id: String(id) },
    })
    .catch((e) => handleDatabaseErrors(e, "server", [id]));
  res.json(server);
});

/* DELETE an existing server. */
wrappedRouter.delete("/:id", async function (req, res) {
  const { id } = req.params;
  const server = await prisma.server
    .delete({
      where: {
        id: String(id),
      },
    })
    .catch((e) => handleDatabaseErrors(e, "server", [id]));
  res.json(server);
});

const serversRouter = wrappedRouter.router;
export { serversRouter };
