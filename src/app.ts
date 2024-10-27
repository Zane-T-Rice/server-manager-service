import * as dotenv from "dotenv";
import * as path from "path";
import express, { NextFunction, Request, Response } from "express";
import { InternalServerError } from "./errors";
import logger from "morgan";
import { serversRouter } from "./routes/servers";
dotenv.config();

const app = express();

app.use(logger("dev"));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(express.static(path.join(__dirname, "public")));

app.use("/servers", serversRouter);

// error handler
// eslint-disable-next-line @typescript-eslint/no-unused-vars
app.use(function (err: Error, req: Request, res: Response, next: NextFunction) {
  console.error(err);

  if (err.name === "NotFoundError") {
    res.status(404).json(err);
  } else if (err.name == "InternalServerError") {
    res.status(500).json(err);
  } else {
    res.status(500).json(new InternalServerError());
  }
});

app.listen(process.env.PORT, () => {});

export default app;
