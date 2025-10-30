import { DataTypes, Model, type Optional } from "sequelize";
import { sequelize } from "../../dbConfig/dbConfig.ts";
import type { ClientInfo, Employee, PaymentMethod, ServiceInfo } from "../../types";

export const ASSIGNMENT_STATUSES = ["new", "scheduled", "completed", "canceled"] as const;
export type AssignmentStatus = typeof ASSIGNMENT_STATUSES[number];

export const ASSIGMENT_PAID = ["paid", "unpaid", "refund"];
export type AssignmentPaid = typeof ASSIGMENT_PAID[number];

export const ASSIGMENT_PAID_METHOD = ["cash", "card", "transfer", "gift_certificate", "other"];
export type AssignmentPaidMethod = typeof  ASSIGMENT_PAID_METHOD[number];

export interface AssignmentAttributes {
  id: number;
  chat_id?: string | null;
  branch_id: number;
  organization_id: number;
  gift_certificate_id: number | null;
  client_id: number;
  client_snapshot: ClientInfo;
  service_id: number;
  service_snapshot: ServiceInfo;
  assignment_date: Date;
  start_time: string;
  end_time: string;
  manager_id: number | null;
  manager_snapshot: Employee | null;
  employee_id: number;
  employee_snapshot: Employee;
  timezone: string;
  status: AssignmentStatus;
  additional_services?: ServiceInfo[] | null;
  notes?: string | null;
  source: string;
  discount?: number | null;
  final_price: number;
  total_duration: number;
  payment_method?: PaymentMethod | null;
  paid: AssignmentPaid;
  createdAt?: Date;
  updatedAt?: Date;
}

export type AssignmentCreationAttributes = Optional<
  AssignmentAttributes,
  "id"
  | "createdAt"
  | "manager_id"
  | "manager_snapshot"
  | "updatedAt"
  | "discount"
  | "paid"
  | "additional_services"
  | "notes"
  | "payment_method"
  | "chat_id"
  | "gift_certificate_id"
>;

export class Assignment
  extends Model<AssignmentAttributes, AssignmentCreationAttributes>
  implements AssignmentAttributes
{
  declare id: number;
  declare chat_id: string | null;
  declare branch_id: number;
  declare gift_certificate_id: number | null;
  declare organization_id: number;
  declare client_id: number;
  declare client_snapshot: ClientInfo;
  declare manager_id: number | null;
  declare manager_snapshot: Employee | null;
  declare employee_id: number;
  declare employee_snapshot: Employee;
  declare service_id: number;
  declare service_snapshot: ServiceInfo;
  declare timezone: string;
  declare assignment_date: Date;
  declare start_time: string;
  declare end_time: string;
  declare status: AssignmentStatus;
  declare additional_services: ServiceInfo[] | null;
  declare notes: string | null;
  declare source: string;
  declare discount: number | null;
  declare final_price: number;
  declare total_duration: number;
  declare payment_method?: PaymentMethod | null;
  declare paid: AssignmentPaid;
  declare readonly createdAt: Date;
  declare readonly updatedAt: Date;
}

Assignment.init(
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    organization_id: { type: DataTypes.INTEGER, allowNull: false },
    client_id: { type: DataTypes.INTEGER, allowNull: false },
    manager_id: { type: DataTypes.INTEGER, allowNull: true },
    employee_id: { type: DataTypes.INTEGER, allowNull: false },
    service_id: { type: DataTypes.INTEGER, allowNull: false },
    branch_id: { type: DataTypes.INTEGER, allowNull: false },
    chat_id: { type: DataTypes.STRING, allowNull: true },
    gift_certificate_id: { type: DataTypes.INTEGER, allowNull: true },
    manager_snapshot: { type: DataTypes.JSONB, allowNull: true },
    employee_snapshot: { type: DataTypes.JSONB, allowNull: true },
    service_snapshot: { type: DataTypes.JSONB, allowNull: false },
    client_snapshot: {type: DataTypes.JSONB, allowNull: false },
    assignment_date: { type: DataTypes.DATE, allowNull: false },
    start_time: { type: DataTypes.STRING, allowNull: false },
    end_time: { type: DataTypes.STRING, allowNull: false },
    status: {
      type: DataTypes.ENUM(...ASSIGNMENT_STATUSES),
      defaultValue: "new",
    },
    additional_services: {
      type: DataTypes.JSONB,
      allowNull: true,
      defaultValue: [],
    },
    notes: { type: DataTypes.STRING, allowNull: true },
    source: { type: DataTypes.STRING, allowNull: false },
    discount: { type: DataTypes.DECIMAL(5, 2), allowNull: true, defaultValue: 0 },
    final_price: {
      type: DataTypes.BIGINT,
      allowNull: false,
      get() {
        const rawValue = this.getDataValue("final_price");
        return rawValue === null ? null : Number(rawValue);
      },
    },
    total_duration: { type: DataTypes.INTEGER, allowNull: false },
    payment_method: { type: DataTypes.JSONB, allowNull: true },
    paid: {
      type: DataTypes.ENUM(...ASSIGMENT_PAID),
      defaultValue: "unpaid",
    },
    timezone: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: "UTC",
    },
  },
  {
    sequelize,
    tableName: "assignments",
    timestamps: true,
  }
);

// Assignment.belongsTo(Client, { as: "assigment", foreignKey: "manager_id" });
// Client.hasMany(Assignment, { as: "clientAssigment", foreignKey: "client_id" });

export default Assignment;