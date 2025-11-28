import { DataTypes, Model, type Optional } from "sequelize";
import { sequelize } from "../../../dbConfig/dbConfig.ts";

export const IMPORT_STATUSES = [
  "PENDING",
  "VALIDATING",
  "IMPORTING_CLIENTS",
  "CREATING_STAFF",
  "CREATING_WORKING_DATES",
  "CREATING_SERVICES",
  "IMPORTING_ASSIGNMENTS",
  "SUCCESS",
  "FAILED"
] as const;

export type ImportStatus = typeof IMPORT_STATUSES[number];

export interface ImportJobAttributes {
  id: string;
  user_id: number;
  branch_id: number;
  organization_id: number;
  file_name: string;
  file_id: string;
  status: ImportStatus;
  completed_at?: Date | null;
  error_message?: string | null;
  total_rows?: number | null;
  processed_rows: number | null;
  clients_imported: number | null;
  staff_imported: number | null;
  services_imported: number | null;
  assignments_imported: number | null;
  current_stage?: string | null;
}

export type ImportJobCreationAttributes = Optional<ImportJobAttributes,
| "id"
| "completed_at"
| "error_message"
| "total_rows"
| "processed_rows"
| "clients_imported"
| "staff_imported"
| "services_imported"
| "assignments_imported"
| "current_stage"
>;

export class ImportJob
  extends Model<ImportJobAttributes, ImportJobCreationAttributes>
  implements ImportJobAttributes
{
  declare id: string;
  declare user_id: number;
  declare branch_id: number;
  declare organization_id: number;
  declare file_name: string;
  declare file_id: string;
  declare status: ImportStatus;
  declare completed_at: Date | null;
  declare error_message: string | null;
  declare total_rows: number | null;
  declare processed_rows: number;
  declare clients_imported: number;
  declare staff_imported: number;
  declare services_imported: number;
  declare assignments_imported: number;
  declare current_stage: string | null;
}

ImportJob.init(
  {
    id: { type: DataTypes.STRING(36), primaryKey: true, },
    user_id: { type: DataTypes.INTEGER, allowNull: false, },
    branch_id: { type: DataTypes.INTEGER, allowNull: false, },
    organization_id: { type: DataTypes.INTEGER, allowNull: false, },
    file_name: { type: DataTypes.TEXT, allowNull: false, },
    file_id: { type: DataTypes.TEXT, allowNull: false, },
    status: {
      type: DataTypes.ENUM(...IMPORT_STATUSES),
      defaultValue: "PENDING",
      allowNull: false,
    },
    completed_at: { type: DataTypes.DATE, allowNull: true, },
    error_message: { type: DataTypes.TEXT, allowNull: true, },
    total_rows: { type: DataTypes.INTEGER, allowNull: true, },
    processed_rows: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      allowNull: true,
    },
    clients_imported: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      allowNull: true,
    },
    staff_imported: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      allowNull: true,
    },
    services_imported: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      allowNull: true,
    },
    assignments_imported: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      allowNull: true,
    },
    current_stage: { type: DataTypes.STRING, allowNull: true, },
  },
  {
    sequelize,
    tableName: "import_jobs",
    timestamps: false,
    indexes: [
      { fields: ["user_id"] },
      { fields: ["branch_id"] },
      { fields: ["status"] },
      { fields: ["createdAt"] },
    ],
  }
);

export default ImportJob;