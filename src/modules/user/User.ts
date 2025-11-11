import { DataTypes, Model, type Optional } from "sequelize";
import { sequelize } from "../../dbConfig/dbConfig.ts";
import crypto from "crypto";
import { envConfig } from "../../../config/envConfig.ts";
import jwt from "jsonwebtoken";

export interface UserAttributes {
  id: number;
  first_name: string;
  last_name?: string;
  role: string;
  email: string;
  password: string;
  token?: string;
  isActive: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

export type UserCreationAttributes = Optional<
  UserAttributes,
  "id" | "last_name" | "createdAt" | "updatedAt"
>;

export class User
  extends Model<UserAttributes, UserCreationAttributes>
  implements UserAttributes
{
  declare id: number;
  declare first_name: string;
  declare last_name: string;
  declare role: string;
  declare email: string;
  declare password: string;
  declare token: string;
  declare isActive: boolean;
  declare readonly createdAt: Date;
  declare readonly updatedAt: Date;
}

User.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    first_name: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    last_name: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    role: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    email: {
      type: DataTypes.STRING(128),
      allowNull: false,
      unique: true,
    },
    password: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    token: {
      type: DataTypes.STRING(128),
      allowNull: false,
      defaultValue: () => crypto.randomBytes(32).toString("hex"),
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    },
  },
  {
    tableName: "users",
    sequelize,
    timestamps: true,
    indexes: [{ unique: true, fields: ["email"] }],
  }
);

export const JWT_SECRET = envConfig.JWT_SECRET || "default_fallback_secret";
export const JWT_REFRESH_SECRET = envConfig.JWT_REFRESH_SECRET || "default_fallback_secret";

export const generateAccessTokenForUser = (user: UserCreationAttributes, organizationName: string) => {
  return jwt.sign(
    {
      id: user.id,
      email: user.email,
      role: user.role,
      first_name: user.first_name,
      last_name: user.last_name,
      organization_name: organizationName,
    },
    JWT_SECRET,
    { expiresIn: "15m" }
  );
};

export const generateRefreshTokenForUser = (user: UserCreationAttributes) => {
  return jwt.sign(
    {
      id: user.id,
      email: user.email,
    },
    JWT_REFRESH_SECRET,
    { expiresIn: "7d" }
  );
};

export default User;
