import { DataTypes, Model, type Optional } from "sequelize";
import { sequelize } from "../../dbConfig/dbConfig.ts";
import Organization from "./Organization.ts";

export interface BranchAttributes {
  id: number;
  organization_id: number;
  user_id: number;
  name: string;
  phone: string;
  address: string;
  createdAt?: Date;
  updatedAt?: Date;
  isActive: boolean;
  timezone: string;
}

export type BranchCreationAttributes = Optional<BranchAttributes,
  | "id" | "createdAt" | "updatedAt" | "isActive"
>;

export class Branch extends
  Model<BranchAttributes, BranchCreationAttributes> implements BranchAttributes {
  declare id: number;
  declare user_id: number;
  declare organization_id: number;
  declare name: string;
  declare phone: string;
  declare address: string;
  declare isActive: boolean;
  declare timezone: string;
  declare readonly createdAt: Date;
  declare readonly updatedAt: Date;
}

Branch.init({
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    user_id: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 3 },
    organization_id: { type: DataTypes.INTEGER, allowNull: false },
    name: { type: DataTypes.STRING, allowNull: false },
    phone: { type: DataTypes.STRING, allowNull: false },
    address: { type: DataTypes.TEXT, allowNull: false },
    isActive: { type: DataTypes.BOOLEAN, defaultValue: true },
    timezone: { type: DataTypes.STRING, allowNull: false, defaultValue: "Asia/Bishkek" },
  },
  {
    sequelize,
    tableName: "branches",
    timestamps: true,
  });

Branch.belongsTo(Organization, { as: "organization", foreignKey: "organization_id" });

Organization.hasMany(Branch, {
  as: "organizationBranches",
  foreignKey: "organization_id",
});


export default Branch;