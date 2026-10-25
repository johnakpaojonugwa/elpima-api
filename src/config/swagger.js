import swaggerJsdoc from "swagger-jsdoc";
import swaggerUi from "swagger-ui-express";
import { env } from "./env.js";

const options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "Elpima Surgicals Limited — Catalog & WhatsApp Quote API",
      version: "1.0.0",
      description:
        "High-performance REST API for B2B Surgical Equipment Catalog and WhatsApp Quotation Platform.",
      contact: {
        name: "Elpima Surgicals Technical Team",
        email: env.COMPANY_EMAIL,
      },
    },
    servers: [
      {
        url: `http://localhost:${env.PORT}`,
        description: "Local development server",
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
          description: "Enter your Bearer JWT token",
        },
      },
      schemas: {
        StandardSuccess: {
          type: "object",
          properties: {
            success: { type: "boolean", example: true },
            message: { type: "string", example: "Operation completed successfully" },
            data: { type: "object" },
          },
        },
        StandardError: {
          type: "object",
          properties: {
            success: { type: "boolean", example: false },
            error: {
              type: "object",
              properties: {
                message: { type: "string", example: "Invalid request payload" },
                kind: { type: "string", example: "validation_error" },
                correlationId: { type: "string", example: "3fa85f64-5717-4562-b3fc-2c963f66afa6" },
                details: { type: "object" },
              },
            },
          },
        },
      },
    },
  },
  apis: ["./src/routes/*.js", "./src/modules/**/route.js"],
};

export const swaggerSpec = swaggerJsdoc(options);

export function setupSwagger(app) {
  app.use("/api/v1/docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));
  app.get("/api/v1/docs/openapi.json", (_request, response) => {
    response.setHeader("Content-Type", "application/json");
    response.send(swaggerSpec);
  });
}
