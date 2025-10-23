import swaggerJsdoc from "swagger-jsdoc";
import swaggerUi from "swagger-ui-express";
import { type Express } from "express";
import YAML from "yamljs";
import path from "path";

const options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "AKTAN UI API",
      version: "1.0.0",
      description: "Документация API для создания организации клиента",
    },
    servers: [
      {
        url: "http://localhost:8000",
      },
      {
        url: "scattered-ermentrude-promconsulting-23cbccde.koyeb.app/",
      },
    ],
  },
  // Пути к файлам, где описаны эндпоинты (js/ts с JSDoc-комментами)
  apis: [path.join(__dirname, "./src/modules/*/*.ts")],
};

const swaggerSpec = swaggerJsdoc(options);

export function setupSwagger(app: Express) {
  app.use("/aktanUI-swagger", swaggerUi.serve, swaggerUi.setup(swaggerSpec));
}
