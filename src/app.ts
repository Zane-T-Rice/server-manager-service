import * as dotenv from "dotenv";
import * as fs from "fs";
import * as swaggerUI from "swagger-ui-dist";
import {
  environmentVariablesRouter,
  filesRouter,
  portsRouter,
  serversRouter,
  volumesRouter,
} from "./routes";
import { appErrorHandler } from "./middlewares/appErrorHandler";
import express from "express";
import path from "path";
import pino from "pino-http";
import { randomUUID } from "crypto";
dotenv.config();

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
  })
);

// Parse the request.
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Log the request body now that it has been successfully parsed.
app.use((req, res, next) => {
  req.log.info(req.body);
  next();
});

// REST APis
app.use("/servers", serversRouter);
app.use("/servers", portsRouter);
app.use("/servers", environmentVariablesRouter);
app.use("/servers", volumesRouter);
app.use("/servers", filesRouter);

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
    `http://${process.env.HOST}:${process.env.PORT}/swagger-files/serverManagerService.yaml`
  );
app.get(`${swaggerRoutePath}/swagger-initializer.js`, (req, res) => {
  res.send(indexContent);
});
app.use(swaggerRoutePath, express.static(swaggerUIFSPath));

// error handler
app.use(appErrorHandler);

app.listen(process.env.PORT);

export default app;
