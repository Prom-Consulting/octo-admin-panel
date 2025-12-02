import { sequelize } from "./dbConfig/dbConfig";

export const dbConnection = async () => {
  try {
    await sequelize.authenticate();
    console.log("✅ Database connected");
    await sequelize.sync({ alter: true });
    console.log("✅ Database synced");
  } catch (err) {
    console.error("❌ Unable to connect to DB:", err);
  }
};