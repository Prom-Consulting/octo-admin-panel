import { DataTypes, Model, type Optional } from "sequelize";
import { sequelize } from "../../dbConfig/dbConfig.ts";
import OrganizationStaff from "./OrganizationStaff.ts";
import Branch from "../organization/Branch.ts";

export interface WorkingDatesAttributes {
  id: number;
  staff_id: number;
  branch_id: number;
  work_date: Date;
  start_time: string | null; // null = выходной
  end_time: string | null;   // null = выходной
  timezone: string;
  is_day_off: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

export type WorkingDatesCreationAttributes = Optional<
  WorkingDatesAttributes,
  "id" | "start_time" | "end_time" | "is_day_off" | "createdAt" | "updatedAt"
>;

export class WorkingDates
  extends Model<WorkingDatesAttributes, WorkingDatesCreationAttributes>
  implements WorkingDatesAttributes
{
  declare id: number;
  declare staff_id: number;
  declare branch_id: number;
  declare work_date: Date;
  declare start_time: string | null;
  declare end_time: string | null;
  declare is_day_off: boolean;
  declare timezone: string;
  declare readonly createdAt: Date;
  declare readonly updatedAt: Date;
}

WorkingDates.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    branch_id: { type: DataTypes.INTEGER, allowNull: false },
    staff_id: { type: DataTypes.INTEGER, allowNull: false },
    work_date: {type: DataTypes.DATE, allowNull: false},
    start_time: { type: DataTypes.STRING, allowNull: true },
    end_time: { type: DataTypes.STRING, allowNull: true },
    timezone: { type: DataTypes.STRING, allowNull: false },
    is_day_off: { type: DataTypes.BOOLEAN, defaultValue: false },
  },
  {
    tableName: "working_dates",
    sequelize,
    timestamps: true,
  }
);

OrganizationStaff.hasMany(WorkingDates, {
  foreignKey: "staff_id",
  as: "working_dates",
  onDelete: "CASCADE",
});

WorkingDates.belongsTo(OrganizationStaff, {
  foreignKey: "staff_id",
  as: "staff",
});

Branch.hasMany(WorkingDates, {
  foreignKey: "branch_id",
  as: "working_dates",
});

WorkingDates.belongsTo(Branch, {
  foreignKey: "branch_id",
  as: "branch",
});

export default WorkingDates;
