import type { Request } from "express";
import { HttpError } from "../middleware/errorHandler.js";

export function paramId(req: Request, name = "id"): string {
  const value = req.params[name];
  const id = Array.isArray(value) ? value[0] : value;
  if (!id) throw new HttpError(400, "Falta el identificador.", "BAD_REQUEST");
  return id;
}
