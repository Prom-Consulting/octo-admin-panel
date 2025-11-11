import { DataTypes, Model, type Optional } from "sequelize";
import { sequelize } from "../../dbConfig/dbConfig.ts";
import Client from "./Client.ts";
import Branch from "../organization/model/Branch.ts";

export interface ClientActivityAttributes {
  id: number;
  client_id: number;
  branch_id: number;
  main_service: { id: number; name: string; price: number };
  additional_services?: { id: number; name: string; price: number }[];
  total_price: number;
  date: Date;
  timezone: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export type ClientActivityCreationAttributes = Optional<
  ClientActivityAttributes,
  "id" | "createdAt" | "updatedAt" | "additional_services"
>;

export class ClientActivity
  extends Model<ClientActivityAttributes, ClientActivityCreationAttributes>
  implements ClientActivityAttributes
{
  declare id: number;
  declare client_id: number;
  declare branch_id: number;
  declare main_service: { id: number; name: string; price: number };
  declare additional_services?: { id: number; name: string; price: number }[];
  declare total_price: number;
  declare date: Date;
  declare timezone: string;
  declare readonly createdAt: Date;
  declare readonly updatedAt: Date;
}

ClientActivity.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    client_id: { type: DataTypes.INTEGER, allowNull: false },
    branch_id: { type: DataTypes.INTEGER, allowNull: false },
    main_service: {
      type: DataTypes.JSONB,
      allowNull: false,
    },
    additional_services: {
      type: DataTypes.JSONB,
      allowNull: true,
      defaultValue: [],
    },
    total_price: { type: DataTypes.INTEGER, allowNull: false },
    date: { type: DataTypes.DATE, allowNull: false },
    timezone: { type: DataTypes.STRING, allowNull: false },
  },
  {
    sequelize,
    tableName: "client_activity",
    timestamps: true,
  }
);

ClientActivity.belongsTo(Client, { as: "client", foreignKey: "client_id" });
Client.hasMany(ClientActivity, {
  as: "clientActivity",
  foreignKey: "client_id",
});

ClientActivity.belongsTo(Branch, { as: "branch", foreignKey: "branch_id" });
Branch.hasMany(ClientActivity, {
  as: "activities",
  foreignKey: "branch_id",
});

export default ClientActivity;