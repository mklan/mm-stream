import { Request, Response, NextFunction } from "express";
import { getFullPath, insideRoot } from "../services/server-config";

const validateRootPath = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const filePath = getFullPath(req.query.path as string);

  if (!insideRoot(filePath)) {
    res.send("path is not inside the configured media folder!");
    return;
  }
  next();
};

export default validateRootPath;
