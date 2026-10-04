import { Injectable, type NestMiddleware } from "@nestjs/common";
import { type Request, type Response, type NextFunction } from "express";
import { randomUUID } from "node:crypto";

export interface RequestWithId extends Request {
  requestId?: string;
}

@Injectable()
export class RequestIdMiddleware implements NestMiddleware {
  use(req: RequestWithId, res: Response, next: NextFunction): void {
    const headerValue = req.headers["x-request-id"];
    const requestId =
      typeof headerValue === "string" && headerValue.trim().length > 0
        ? headerValue.trim()
        : randomUUID();

    req.requestId = requestId;
    res.setHeader("X-Request-Id", requestId);
    next();
  }
}
