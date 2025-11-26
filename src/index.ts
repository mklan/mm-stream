import express, { Request, Response } from "express";
import cors from "cors";
import ms from "mediaserver";

import validateRootPath from "./middlewares/validateRootPath";
import getContent from "./services/directory-service";
import { port, getFullPath } from "./services/server-config";

const app = express();

app.use(cors());
app.use("/stream", validateRootPath);
app.use("/list", validateRootPath);

app.get("/stream", (req: Request, res: Response) => {
  ms.pipe(req, res, getFullPath(req.query.path as string));
});

app.get("/list", async (req: Request, res: Response) => {
  try {
    const entries = await getContent(req.query.path as string);
    res.send(entries);
  } catch (e) {
    console.log(e);
  }
});

app.listen(port, () => console.log(`listening on port ${port}!`));
