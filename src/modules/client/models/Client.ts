import { DataTypes, Model, type Optional } from "sequelize";
import { sequelize } from "../../../dbConfig/dbConfig.ts";
import { nanoid } from "nanoid";
import { envConfig } from "../../../../config/envConfig.ts";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";

export interface ClientAttributes {
  id: string; // telegram_id создан через календарь/месенджер или сам через онлайн запись на сайте. 	manual/calendar/phone
  first_name: string;
  last_name?: string | null;
  password: string;
  custom_name?: string | null; // связан с интеграцией
  username?: string | null; // связан с интеграцией
  phone_number: string;
  token: string | null;
  is_active: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

export type ClientCreationAttributes = Optional<
  ClientAttributes,
"createdAt" | "updatedAt" | "last_name" | "custom_name" | "username" | "token"
>;

export const ACCESS_SECRET = envConfig.CLIENT_JWT_ACCESS_SECRET;
export const REFRESH_SECRET = envConfig.CLIENT_JWT_REFRESH_SECRET;

export class Client
  extends Model<ClientAttributes, ClientCreationAttributes>
  implements ClientAttributes
{
  declare id: string;
  declare first_name: string;
  declare password: string;
  declare last_name: string;
  declare custom_name: string;
  declare phone_number: string;
  declare is_active: boolean;
  declare token: string | null;
  declare readonly createdAt: Date;
  declare readonly updatedAt: Date;
}

Client.init(
  {
    id: {
      type: DataTypes.TEXT,
      allowNull: false,
      primaryKey: true,
    },
    first_name: { type: DataTypes.STRING, allowNull: false },
    last_name: { type: DataTypes.STRING, allowNull: true },
    custom_name: { type: DataTypes.STRING, allowNull: true },
    phone_number: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    password: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    is_active: { type: DataTypes.BOOLEAN, defaultValue: true },
    token: { type: DataTypes.TEXT, allowNull: true },
  },
  {
    sequelize,
    tableName: "clients",
    timestamps: true,
    indexes: [{ unique: true, fields: ["phone_number"] }],
  }
);

export const generateClientId = (source: string) => `${source}_${Date.now()}_${nanoid(16)}`;

export const hashClientPassword = (password: string) => bcrypt.hash(password, 10);

export const clientPasswordVerification= (password: string, passwordDb: string) => {
  return bcrypt.compare(password, passwordDb);
}

export const generateAccessToken = (client: ClientAttributes) => {
  if (!client.is_active) return null;

  return jwt.sign({
    id: client.id,
    first_name: client.first_name,
    last_name: client.last_name || null,
    phone_number: client.phone_number,
  }, ACCESS_SECRET, { expiresIn: "3d", header: { kid: "client", alg: "HS256" } });
};

export const generateRefreshToken = (id: string) => {
  return jwt.sign({ id }, REFRESH_SECRET, { expiresIn: "7d" });
};

export const verifyAccessToken = (token: string) => {
  return jwt.verify(token, ACCESS_SECRET);
};

export const verifyRefreshToken = (token: string) => {
  return jwt.verify(token, REFRESH_SECRET);
};

export default Client;
