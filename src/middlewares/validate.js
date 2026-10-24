import { AppError } from "../utils/AppError.js";

/**
 * Zod validation middleware factory
 * @param {import("zod").ZodSchema} schema
 * @param {"body"|"query"|"params"} [source="body"]
 */
export function validate(schema, source = "body") {
  return (req, _res, next) => {
    const result = schema.safeParse(req[source]);

    if (!result.success) {
      const formattedErrors = result.error.errors.map((err) => ({
        field: err.path.join("."),
        message: err.message,
      }));

      return next(
        new AppError(
          422,
          `Validation failed for ${source}`,
          "validation_error",
          formattedErrors
        )
      );
    }

    // Replace the request source with sanitized/parsed data (casts types if coerced)
    req[source] = result.data;
    next();
  };
}
