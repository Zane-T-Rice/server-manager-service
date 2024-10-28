import * as dotenv from "dotenv";
import * as path from "path";
import { appErrorHandler } from "./middlewares/appErrorHandler";
import express from "express";
import logger from "morgan";
import { serversRouter } from "./routes/serversRoutes";
dotenv.config();

const app = express();

app.use(logger("dev"));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(express.static(path.join(__dirname, "public")));

app.use("/servers", serversRouter);

// error handler

app.use(appErrorHandler);

app.listen(process.env.PORT, () => {});

export default app;
