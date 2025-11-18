import { DataTypes, Model, type Optional } from "sequelize";
import { sequelize } from "../../../dbConfig/dbConfig.ts";
import Branch from "../../organization/models/Branch.ts";
import { type ClientInfo, PAYMENT_STATUS, type PaymentStatus, type ServiceInfo } from "../../../types";
import { ASSIGNMENT_STATUSES, type AssignmentStatus } from "../../assignments/models/Assignment.ts";

export interface ClientActivityAttributes {
  id: number;
  client_source_id: string;
  client_snapshot: ClientInfo;
  branch_id: number;
  main_service: ServiceInfo;
  additional_services?: ServiceInfo[];
  paid_status: PaymentStatus | null;
  status: AssignmentStatus;
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
  declare client_source_id: string;
  declare branch_id: number;
  declare client_snapshot: ClientInfo;
  declare main_service: ServiceInfo;
  declare additional_services?: ServiceInfo[];
  declare total_price: number;
  declare date: Date;
  declare paid_status: PaymentStatus | null;
  declare status: AssignmentStatus;
  declare timezone: string;
  declare readonly createdAt: Date;
  declare readonly updatedAt: Date;
}

ClientActivity.init(
  {
    id: {
      type: DataTypes.BIGINT,
      autoIncrement: true,
      primaryKey: true,
    },
    client_source_id: { type: DataTypes.TEXT, allowNull: false },
    client_snapshot: { type: DataTypes.JSONB, allowNull: false },
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
    paid_status: { type: DataTypes.ENUM(...PAYMENT_STATUS), allowNull: true },
    status: { type: DataTypes.ENUM(...ASSIGNMENT_STATUSES), defaultValue: "new" }
  },
  {
    sequelize,
    tableName: "client_activity",
    timestamps: true,
  }
);

ClientActivity.belongsTo(Branch, { as: "branch", foreignKey: "branch_id" });
Branch.hasMany(ClientActivity, { as: "activities", foreignKey: "branch_id" });

export default ClientActivity;