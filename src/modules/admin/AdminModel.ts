import { DataTypes, Model, type Optional } from "sequelize";
import { sequelize } from "../../dbConfig/dbConfig.ts";

export interface AdminModelAttributes {
  id: number;
  role: "admin";
  username: string;
  password: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export type AdminModelCreationAttributes = Optional<
  AdminModelAttributes,
  "id" | "createdAt" | "updatedAt"
>;

export class AdminModel
  extends Model<AdminModelAttributes, AdminModelCreationAttributes>
  implements AdminModelAttributes
{
  declare id: number;
  declare username: string;
  declare role: "admin";
  declare password: string;
  declare readonly createdAt: Date;
  declare readonly updatedAt: Date;
}

AdminModel.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    username: {
      type: new DataTypes.STRING(128),
      allowNull: false,
      unique: true,
    },
    password: {
      type: new DataTypes.STRING(255),
      allowNull: false,
    },
    role: {
      type: DataTypes.ENUM("admin"),
      allowNull: true,
    },
  },
  {
    tableName: "admin",
    sequelize,
    timestamps: true,
    indexes: [{ unique: true, fields: ["username"] }],
  }
);

export default AdminModel;
