import { DataTypes, Model, type Optional } from "sequelize";
import { sequelize } from "../../dbConfig/dbConfig.ts";
import type { OrganizationInfo } from "../../types";
import jwt from "jsonwebtoken";
import { envConfig } from "../../../config/envConfig.ts";

export interface BranchInfo {
  id: number;
  name: string;
  address: string;
  // добавьте другие нужные поля филиала
}

export interface OrganizationStaffAttributes {
  id: number;
  organization: OrganizationInfo;
  branches: BranchInfo[]; // массив филиалов где работает сотрудник

  username?: string | null;
  firstname: string;
  lastname: string;
  password: string;
  email: string;
  token?: string | null;

  role: "manager" | "employee";
  customRole: string | null;
  specialty?: string | null;
  description?: string | null;
  is_active: boolean;

  photo_url?: string | null;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface StaffToken {
  email: string;
  role: string;
  organizationId: number;
  organizationName: string;
}

export type OrganizationStaffCreationAttributes = Optional<
  OrganizationStaffAttributes,
  | "id"
  | "username"
  | "token"
  | "specialty"
  | "description"
  | "photo_url"
  | "createdAt"
  | "updatedAt"
  | "branches" // можно создать без филиалов
>;

export class OrganizationStaff
  extends Model<OrganizationStaffAttributes, OrganizationStaffCreationAttributes>
  implements OrganizationStaffAttributes
{
  declare id: number;
  declare organization: OrganizationInfo;
  declare branches: BranchInfo[];
  declare firstname: string;
  declare lastname: string;
  declare username: string | null;
  declare password: string;
  declare email: string;
  declare token: string | null;
  declare role: "manager" | "employee";
  declare customRole: string | null;
  declare specialty: string | null;
  declare description: string | null;
  declare is_active: boolean;
  declare photo_url: string | null;
  declare readonly createdAt: Date;
  declare readonly updatedAt: Date;
}

OrganizationStaff.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    organization: { type: DataTypes.JSONB, allowNull: true },
    branches: {
      type: DataTypes.JSONB,
      allowNull: false,
      defaultValue: [], // по умолчанию пустой массив
    },
    firstname: { type: DataTypes.TEXT, allowNull: false },
    lastname: { type: DataTypes.TEXT, allowNull: false },
    username: { type: DataTypes.TEXT, allowNull: true },
    password: { type: DataTypes.TEXT, allowNull: false },
    token: { type: DataTypes.TEXT, allowNull: true },
    email: {
      type: DataTypes.TEXT,
      allowNull: false,
      unique: true,
    },
    role: {
      type: DataTypes.ENUM("manager", "employee"),
      allowNull: false,
      defaultValue: "employee",
    },
    customRole: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    specialty: { type: DataTypes.TEXT, allowNull: true },
    description: { type: DataTypes.TEXT, allowNull: true },
    is_active: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
      allowNull: false,
    },
    photo_url: { type: DataTypes.STRING(255), allowNull: true },
  },
  {
    tableName: "staff",
    sequelize,
    timestamps: true,
    indexes: [
      { unique: true, fields: ["email"] },
      {
        // индекс для быстрого поиска по филиалам (GIN для JSONB)
        fields: ["branches"],
        using: "GIN",
      },
    ],
    // defaultScope: {
    //   attributes: { exclude: ["password", "email"] },
    // },
  }
);

// для проверки ролей
OrganizationStaff.addScope("managers", {
  where: { role: "manager" },
});

OrganizationStaff.addScope("employees", {
  where: { role: "employee" },
});

// дополнительный scope для поиска по конкретному филиалу
OrganizationStaff.addScope("byBranch", (branchId: number) => ({
  where: sequelize.literal(`branches @> '[{"id": ${branchId}}]'`),
}));

export const generateToken = ({ email, role, organizationId, organizationName }: StaffToken) => {
  return jwt.sign(
    { email, role, organizationId, organizationName },
    envConfig.JWT_SECRET || "default_secret",
    { expiresIn: "30d" }
  );
}

export default OrganizationStaff;
