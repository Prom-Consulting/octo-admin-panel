import { DataTypes, Model, type Optional } from "sequelize";
import { sequelize } from "../../../dbConfig/dbConfig.ts";
import { nanoid } from "nanoid";

export interface ClientAttributes {
  id: number;
  source_id: string; // telegram_id создан через календарь/месенджер или сам через онлайн запись на сайте. 	manual/calendar/phone
  first_name: string;
  last_name?: string | null;
  password: string;
  custom_name?: string | null; // связан с интеграцией
  username?: string | null; // связан с интеграцией
  phone_number: string;
  is_active: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

export type ClientCreationAttributes = Optional<
  ClientAttributes,
  "id" | "createdAt" | "updatedAt" | "last_name" | "custom_name" | "username"
>;

export class Client
  extends Model<ClientAttributes, ClientCreationAttributes>
  implements ClientAttributes
{
  declare id: number;
  declare source_id: string;
  declare first_name: string;
  declare password: string;
  declare last_name: string;
  declare custom_name: string;
  declare phone_number: string;
  declare is_active: boolean;
  declare readonly createdAt: Date;
  declare readonly updatedAt: Date;
}

Client.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    source_id: {
      type: DataTypes.TEXT,
      allowNull: false,
      unique: true,
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
  },
  {
    sequelize,
    tableName: "clients",
    timestamps: true,
    indexes: [{ unique: true, fields: ["source_id", "phone_number"] }],
  }
);

const generateClientId = async (source: string) => `${source}_${Date.now()}_${nanoid(6)}`;

export default Client;
