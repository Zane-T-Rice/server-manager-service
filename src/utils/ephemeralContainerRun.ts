import { Request, Response } from "express";
import { exec as exec2 } from "child_process";
import { promisify } from "util";
import { randomUUID } from "crypto";
import shellEscape from "shell-escape";
const exec = promisify(exec2);

export function buildEphemeralContainerRun(commands: string[]) {
  const ephemeralContainerName = `ephemeral-${randomUUID()}`;
  const ephemeralContainerRun = `docker run --name=${ephemeralContainerName} -d --rm -v /var/run/docker.sock:/var/run/docker.sock -t alpine sh -c ${shellEscape([`apk add docker; addgroup \${USER} docker; ${commands.join(";")}`])}`;
  return ephemeralContainerRun;
}

export async function ephemeralContainerRun(
  req: Request,
  res: Response,
  commands: string[],
  responseJSON: object
) {
  const ephemeralContainerRun = buildEphemeralContainerRun(commands);
  req.log.flush(); // Make sure the logs are written out in case the server gets torn down by the commands.

  // Respond with a success message. This service may be torn down by the commands (possibly docker stop).
  res.json(responseJSON);

  await exec(ephemeralContainerRun);
}
