import type { NextFunction, Request, Response } from "express";
import { validationResult, type ValidationChain } from "express-validator";
import { AppError } from "../utils/AppError";

/** Runs express-validator chains and turns the first failure into a 400. */
export function validate(chains: ValidationChain[]) {
  return async (req: Request, _res: Response, next: NextFunction) => {
    for (const chain of chains) {
      await chain.run(req);
    }
    const result = validationResult(req);
    if (!result.isEmpty()) {
      const first = result.array({ onlyFirstError: true })[0];
      throw new AppError(first.msg as string, 400, "VALIDATION_ERROR");
    }
    next();
  };
}
