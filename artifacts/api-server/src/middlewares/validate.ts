import type { NextFunction, Request, Response } from "express";

/**
 * Minimal structural type for the Zod schemas generated in @workspace/api-zod,
 * so we don't need a direct zod dependency here.
 */
interface BodySchema {
  safeParse(data: unknown):
    | { success: true; data: unknown }
    | {
        success: false;
        error: { issues: Array<{ path: Array<string | number>; message: string }> };
      };
}

/**
 * Validates req.body against a generated Zod schema from @workspace/api-zod.
 * On success, replaces req.body with the parsed value (strips unknown keys).
 * On failure, responds 400 with field-level details.
 */
export function validateBody(schema: BodySchema) {
  return (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.body ?? {});
    if (!result.success) {
      return res.status(400).json({
        error: "Invalid request body",
        details: result.error.issues.map(
          (i) => `${i.path.join(".") || "body"}: ${i.message}`,
        ),
      });
    }
    req.body = result.data;
    return next();
  };
}
