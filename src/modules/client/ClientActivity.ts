import { DataTypes, Model, type Optional } from "sequelize";
import { sequelize } from "../../dbConfig/dbConfig.ts";
import Client from "./Client.ts";
import Branch from "../organization/Branch.ts";

export interface ClientActivityAttributes {
  id: number;
  client_id: number;
  branch_id: number;
  service_id: number;
  createdAt?: Date;
  updatedAt?: Date;
}

export type ClientActivityCreationAttributes = Optional<ClientActivityAttributes,
"id" | "createdAt" | "updatedAt"
>;

export class ClientActivity
  extends Model<ClientActivityAttributes, ClientActivityCreationAttributes>
  implements ClientActivityAttributes
{
  declare id: number;
  declare client_id: number;
  declare branch_id: number;
  declare service_id: number;
  declare readonly createdAt: Date;
  declare readonly updatedAt: Date;
}

ClientActivity.init({
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  client_id: { type: DataTypes.INTEGER, allowNull: false },
  branch_id: { type: DataTypes.INTEGER, allowNull: false },
    service_id: { type: DataTypes.INTEGER, allowNull: false },
},
  {
    sequelize,
    tableName: "client_activity",
    timestamps: true,
  });

ClientActivity.belongsTo(Client, { as:"client", foreignKey: "client_id" });
Client.hasMany(ClientActivity, {as: "clientActivity", foreignKey: "client_id"});

ClientActivity.belongsTo(Branch, { as: "branch", foreignKey: "branch_id" });

Branch.hasMany(ClientActivity, { as: "activities", foreignKey: "branch_id"});

export default ClientActivity;