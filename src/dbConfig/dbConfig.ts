import { cleanEnv, num, str } from "envalid";
import { Sequelize } from "sequelize";

export const env = cleanEnv(process.env, {
  PG_DATABASE: str(),
  PG_USER: str(),
  PG_PASSWORD: str(),
  PG_HOST: str({ default: "localhost" }),
  PG_PORT: num({ default: 5432 }),

  PG_MASTER_DATABASE: str(),
  PG_MASTER_USER: str(),
  PG_MASTER_PASSWORD: str(),
  PG_MASTER_HOST: str({ default: "localhost" }),
  PG_MASTER_PORT: num({ default: 5432 }),
});

export const sequelize = new Sequelize(
  env.PG_DATABASE,
  env.PG_USER,
  env.PG_PASSWORD,
  {
    host: env.PG_HOST,
    port: env.PG_PORT,
    dialect: "postgres",
    logging: process.env.NODE_ENV === "development",
    dialectOptions: { ssl: { require: true, rejectUnauthorized: false } },
  }
);

export const masterDb = new Sequelize(
  env.PG_MASTER_DATABASE,
  env.PG_MASTER_USER,
  env.PG_MASTER_PASSWORD,
  {
    host: env.PG_MASTER_HOST,
    port: env.PG_MASTER_PORT,
    dialect: "postgres",
    dialectOptions: { ssl: { require: true, rejectUnauthorized: false } },
  }
);
