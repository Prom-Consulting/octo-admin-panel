import { DataTypes, Model, type Optional } from "sequelize";
import { sequelize } from "../../../dbConfig/dbConfig.ts";
import type { OrganizationInfo } from "../../../types";
import jwt from "jsonwebtoken";
import { JWT_REFRESH_SECRET, JWT_SECRET } from "../../../middleware/authUserMiddleware.ts";

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
  first_name: string;
  last_name: string;
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
  declare first_name: string;
  declare last_name: string;
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
    first_name: { type: DataTypes.TEXT, allowNull: false },
    last_name: { type: DataTypes.TEXT, allowNull: false },
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

export const generateAccessTokenForStaff = (
  staff: OrganizationStaffAttributes,
) => {
  return jwt.sign(
    {
      id: staff.id,
      first_name: staff.first_name,
      last_name: staff.last_name,
      email: staff.email,
      role: staff.role,
      organization_id: staff.organization.id,
      organization_name: staff.organization.name
    },
    JWT_SECRET,
    { expiresIn: "15d" }
  );
}

export const generateRefreshTokenForStaff = (staff: OrganizationStaffAttributes) => {
  return jwt.sign(
    {
      id: staff.id,
      email: staff.email,
      organization_id: staff.organization.id,
    },
    JWT_REFRESH_SECRET,
    { expiresIn: "7d" }
  );
};

export default OrganizationStaff;
