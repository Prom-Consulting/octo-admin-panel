import { DataTypes, Model, type Optional } from "sequelize";
import { sequelize } from "../../../dbConfig/dbConfig.ts";
import User from "../../user/User.ts";

export interface OrganizationAttributes {
  id: number;
  name: string;
  user_id: number;
  branches: number;
  paidDate: Date;
  isActive: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

export type OrganizationCreationAttributes = Optional<
  OrganizationAttributes,
  "id" | "createdAt" | "updatedAt"
>;

export class Organization
  extends Model<OrganizationAttributes, OrganizationCreationAttributes>
  implements OrganizationAttributes
{
  declare id: number;
  declare user_id: number;
  declare name: string;
  declare branches: number;
  declare paidDate: Date;
  declare isActive: boolean;
  declare readonly createdAt: Date;
  declare readonly updatedAt: Date;
}
Organization.init(
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    user_id: { type: DataTypes.INTEGER, allowNull: false },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
    },
    branches: { type: DataTypes.STRING, allowNull: false },
    paidDate: { type: DataTypes.DATE, allowNull: false },
    isActive: { type: DataTypes.BOOLEAN, defaultValue: true },
  },
  {
    sequelize,
    tableName: "organizations",
    timestamps: true,
  }
);

Organization.belongsTo(User, { as: "user", foreignKey: "user_id" });
User.hasMany(Organization, { as: "organization", foreignKey: "user_id" });

export default Organization;
