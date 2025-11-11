import { DataTypes, Model, type Optional } from "sequelize";
import { sequelize } from "../../dbConfig/dbConfig.ts";
import jwt from "jsonwebtoken";
import { JWT_REFRESH_SECRET, JWT_SECRET } from "../../middleware/authUserMiddleware.ts";

export interface AdminModelAttributes {
  id: number;
  first_name: string;
  last_name?: string | null;
  role: "admin";
  email: string;
  token: string | null;
  password: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export type AdminModelCreationAttributes = Optional<
  AdminModelAttributes,
  "id" | "createdAt" | "updatedAt" | "token" | "last_name"
>;

export class AdminModel
  extends Model<AdminModelAttributes, AdminModelCreationAttributes>
  implements AdminModelAttributes
{
  declare id: number;
  declare role: "admin";
  declare first_name: string;
  declare last_name: string | null;
  declare password: string;
  declare email: string;
  declare token: string;
  declare readonly createdAt: Date;
  declare readonly updatedAt: Date;
}

AdminModel.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    first_name: { type: DataTypes.STRING, allowNull: false },
    last_name: { type: DataTypes.STRING, allowNull: true },
    email: { type: DataTypes.STRING, allowNull: false },
    password: { type: DataTypes.STRING(255), allowNull: false, },
    role: { type: DataTypes.ENUM("admin"), allowNull: true, },
    token: { type: DataTypes.TEXT, allowNull: true, }
  },
  {
    tableName: "admin",
    sequelize,
    timestamps: true,
    indexes: [{ unique: true, fields: ["email"] }],
  }
);

export const generateAccessTokenForAdmin = (admin: AdminModelAttributes) => {
  return jwt.sign(
    {
      id: admin.id,
      email: admin.email,
      role: admin.role,
      first_name: admin.first_name,
      last_name: admin.last_name,
    },
    JWT_SECRET,
    { expiresIn: "15m" }
  );
};

export const generateRefreshTokenForAdmin = (admin: AdminModelAttributes) => {
  return jwt.sign(
    {
      id: admin.id,
      email: admin.email,
    },
    JWT_REFRESH_SECRET,
    { expiresIn: "7d" }
  );
};

export default AdminModel;
