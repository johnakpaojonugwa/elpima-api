import { AppError } from "../utils/AppError.js";

/**
 * Zod validation middleware factory
 * @param {import("zod").ZodSchema} schema
 * @param {"body"|"query"|"params"} [source="body"]
 */
export function validate(schema, source = "body") {
  return (request, _response, nextFunction) => {
    const result = schema.safeParse(request[source]);

    if (!result.success) {
      const formattedErrors = result.error.errors.map((validationIssue) => ({
        field: validationIssue.path.join("."),
        message: validationIssue.message,
      }));

      return nextFunction(
        new AppError(
          422,
          `Validation failed for ${source}`,
          "validation_error",
          formattedErrors
        )
      );
    }

    // Replace the request source with sanitized/parsed data (casts types if coerced)
    request[source] = result.data;
    nextFunction();
  };
}
