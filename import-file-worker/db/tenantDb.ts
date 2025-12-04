// db/tenantDb.ts
import { Sequelize } from "sequelize";
import { env } from "../../src/dbConfig/dbConfig.ts";

const dbCache = new Map<string, Sequelize>();
const modelCache = new Map<string, Map<string, any>>();

export const getTenantDb = (dbName: string): Sequelize => {
  if (!dbCache.has(dbName)) {
    const sequelize = new Sequelize(
      dbName,
      env.PG_MASTER_USER,
      env.PG_MASTER_PASSWORD,
      {
        host: env.PG_MASTER_HOST,
        port: Number(env.PG_MASTER_PORT),
        dialect: "postgres",
        dialectOptions: { ssl: { require: true, rejectUnauthorized: false } },
        logging: false,
      }
    );

    console.log(`✅ Sequelize connection created for tenant: ${dbName}`);
    dbCache.set(dbName, sequelize);
  }
  return dbCache.get(dbName)!;
};

export const getTenantModel = <T>(
  sequelize: Sequelize,
  modelName: string,
  initFn: (sequelize: Sequelize) => T
): T => {
  const dbName = sequelize.getDatabaseName();

  if (!modelCache.has(dbName)) {
    modelCache.set(dbName, new Map());
  }

  const dbModels = modelCache.get(dbName)!;

  if (!dbModels.has(modelName)) {
    const model = initFn(sequelize);
    dbModels.set(modelName, model);
  }

  return dbModels.get(modelName)!;
};

export const testTenantConnection = async (sequelize: Sequelize) => {
  try {
    await sequelize.authenticate();
    console.log("🔌 Connected successfully!");
  } catch (err) {
    console.error("❌ Connection error:", err);
  }
};
