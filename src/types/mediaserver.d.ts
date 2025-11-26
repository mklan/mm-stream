declare module "mediaserver" {
  import { Request, Response } from "express";

  function pipe(req: Request, res: Response, path: string): void;

  export = { pipe };
}
