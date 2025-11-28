import { Request, Response, NextFunction } from "express";
import { getFullPath, insideRoot } from "../services/server-config";

const validateRootPath = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const pathParam = req.query.path;
  
  if (typeof pathParam !== "string" && typeof pathParam !== "undefined") {
    res.status(400).json({ error: "Invalid path parameter" });
    return;
  }

  const filePath = getFullPath(pathParam as string | undefined);

  if (!insideRoot(filePath)) {
    res.status(403).json({ error: "Access denied: path is outside the configured media folder" });
    return;
  }
  next();
};

export default validateRootPath;
