import * as dotenv from "dotenv";
import * as path from "path";
import express, { NextFunction, Request, Response } from "express";
import createError from "http-errors";
import logger from "morgan";
import serversRouter from "./routes/servers";
dotenv.config();

const app = express();

app.use(logger("dev"));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(express.static(path.join(__dirname, "public")));

app.use("/servers", serversRouter);

// catch 404 and forward to error handler
app.use(function (req, res, next) {
  next(createError(404));
});

// error handler
app.use(function (err: Error, req: Request, res: Response, next: NextFunction) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get("env") === "development" ? err : {};

  // render the error page
  res.status(500).send();
});

app.listen(process.env.PORT, () => {});

export default app;
