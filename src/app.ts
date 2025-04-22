import * as dotenv from "dotenv";
import * as fs from "fs";
import * as swaggerUI from "swagger-ui-dist";
import {
  appErrorHandler,
  errorHandler,
  isServerMiddleware,
  proxyMiddleware,
} from "./middlewares";
import { auth, requiredScopes } from "express-oauth2-jwt-bearer";
import cors from "cors";
import {
  environmentVariablesRouter,
  filesRouter,
  portsRouter,
  serversRouter,
  volumesRouter,
} from "./routes";
import express from "express";
import path from "path";
import { Permissions, Routes } from "./constants";
import pino from "pino-http";
import { PrismaClient } from "@prisma/client";
import { randomUUID } from "crypto";

dotenv.config();

const prisma = new PrismaClient();
const app = express();

// This makes it very clear which logs are related to the same request.
// Allow the caller to set this header to increase tracability across
// services.
app.use((req, res, next) => {
  req.headers["server-manager-service-trace-id"] =
    req.headers["server-manager-service-trace-id"] ?? randomUUID();
  res.appendHeader(
    "server-manager-service-trace-id",
    req.headers["server-manager-service-trace-id"]
  );
  next();
});

// Logger
app.use(
  pino({
    level: process.env.LOG_LEVEL || "info",
    redact: [`req.headers["authorization"]`],
    customReceivedMessage: function () {
      return "request received";
    },
  })
);

// Support broswer clients which do preflight checks for any fetch
// to a url that does not match the origin.
app.use(
  cors({
    origin: process.env.WEBSITE_DOMAIN,
  })
);

// Swagger
// Use a workaround for swagger-ui-dist not being able to set custom swagger URL
// The swaggerPath accounts for running using ts-node (start:dev) versus tsc (start).
const swaggerPath = fs.existsSync(path.join(__dirname, "../swagger"))
  ? path.join(__dirname, "../swagger")
  : path.join(__dirname, "../../swagger");
app.use("/swagger-files", express.static(swaggerPath));
const swaggerRoutePath = "/swagger";
const swaggerUIFSPath = swaggerUI.getAbsoluteFSPath();
const indexContent = fs
  .readFileSync(path.join(swaggerUIFSPath, "swagger-initializer.js"))
  .toString()
  .replace(
    /https:\/\/petstore.swagger.io\/.*\/swagger.(json|yaml)/,
    `${process.env.HOST}/swagger-files/serverManagerService.yaml`
  );
app.get(`${swaggerRoutePath}/swagger-initializer.js`, (req, res) => {
  res.send(indexContent);
});
app.use(swaggerRoutePath, express.static(swaggerUIFSPath));

// Verify incoming Bearer token.
app.use(
  auth({
    audience: process.env.AUDIENCE,
    issuerBaseURL: process.env.ISSUER,
    tokenSigningAlg: process.env.TOKEN_SIGNING_ALG,
  })
);

// Proxy to correct host for routes that need host affinity.
// For paths beginning with Routes.PROXY, this host must be the correct host
// or an error will be thrown. This prevents infinite proxy recursion.
app.use(
  `(${Routes.PROXY})?/servers/:id/(update|restart)`,
  requiredScopes(Permissions.READ)
  // errorHandler(proxyMiddleware(prisma))
);

// Parse the request.
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Log the request body now that it has been successfully parsed.
// Rewrite request url to strip off any leading /proxy.
app.use((req, res, next) => {
  req.log.info(req.body, "request body");
  req.url = req.originalUrl.startsWith(Routes.PROXY)
    ? req.originalUrl.substring(Routes.PROXY.length)
    : req.originalUrl;
  next();
});

// For routes that have a server id in the params, make sure the server is real.
app.use(
  "/servers/:id",
  requiredScopes(Permissions.READ),
  errorHandler(isServerMiddleware(prisma))
);

// REST APIs
app.use("/servers", serversRouter);
app.use("/servers", portsRouter);
app.use("/servers", environmentVariablesRouter);
app.use("/servers", volumesRouter);
app.use("/servers", filesRouter);

// error handler
app.use(appErrorHandler);

app.listen(process.env.PORT);

export default app;
