import * as dotenv from "dotenv";
import * as fs from "fs";
import * as swaggerUI from "swagger-ui-dist";
import {
  environmentVariablesRouter,
  portsRouter,
  serversRouter,
  volumesRouter,
} from "./routes";
import { appErrorHandler } from "./middlewares/appErrorHandler";
import express from "express";
import logger from "morgan";
import path from "path";
dotenv.config();

const app = express();
app.use(logger("dev"));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Swagger
// Use a workaround for swagger-ui-dist not being able to set custom swagger URL
app.use("/swagger-files", express.static(path.join(__dirname, "../swagger")));
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

// REST APis
app.use("/servers", serversRouter);
app.use("/servers", portsRouter);
app.use("/servers", environmentVariablesRouter);
app.use("/servers", volumesRouter);

// error handler
app.use(appErrorHandler);

app.listen(process.env.PORT, () => {});

export default app;
