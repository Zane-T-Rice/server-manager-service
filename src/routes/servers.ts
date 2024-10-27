import express from "express";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const router = express.Router();

/* POST a new server. */
router.post("/", async function (req, res, next) {
  const { applicationName, containerName } = req.body;
  const server = await prisma.server.create({
    data: { applicationName, containerName },
  });
  res.json(server);
});

/* GET all servers. */
router.get("/", async function (req, res, next) {
  const servers = await prisma.server.findMany();
  res.json(servers);
});

/* GET server by id. */
router.get("/:id", async function (req, res, next) {
  const { id } = req.params;
  const servers = await prisma.server.findUnique({ where: { id: String(id) } });
  res.json(servers);
});

/* PATCH a new server. */
router.patch("/:id", async function (req, res, next) {
  const { id } = req.params;
  const { applicationName, containerName } = req.body;
  const existingServer = await prisma.server.findUnique({
    where: { id: String(id) },
  });
  const server = await prisma.server.update({
    data: { ...existingServer, applicationName, containerName },
    where: { id: String(id) },
  });
  res.json(server);
});

/* DELETE an existing server. */
router.delete("/:id", async function (req, res, next) {
  const { id } = req.params;
  const server = await prisma.server.delete({
    where: {
      id: String(id),
    },
  });
  res.json(server);
});

export default router;
