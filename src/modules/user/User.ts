import { DataTypes, Model, type Optional } from "sequelize";
import { sequelize } from "../../dbConfig/dbConfig.ts";
import crypto from "crypto";

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

export default User;
