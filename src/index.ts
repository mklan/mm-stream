import express, { Request, Response, NextFunction } from "express";
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
  const filePath = req.query.path as string | undefined;
  ms.pipe(req, res, getFullPath(filePath));
});

app.get("/list", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const requestedPath = req.query.path as string | undefined;
    const entries = await getContent(requestedPath);
    res.json(entries);
  } catch (error) {
    next(error);
  }
});

// Error handling middleware
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error("Error:", err.message);
  res.status(500).json({ error: "Internal server error" });
});

// Export app for testing
export { app };

// Only start server if this file is run directly
if (require.main === module) {
  app.listen(port, () => console.log(`listening on port ${port}!`));
}
