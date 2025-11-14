import crypto from "crypto";
import type { BranchInfo } from "../modules/staff/models/OrganizationStaff.ts";
import Branch from "../modules/organization/models/Branch.ts";

export async function generatePassword(length = 8) {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*";
  const bytes = crypto.randomBytes(length);
  let password = "";

  for (let i = 0; i < length; i++) {
    // @ts-ignore
    password += chars[bytes[i] % chars.length];
  }

  return password;
}

// Вспомогательная функция для валидации филиалов
export async function validateBranches(
  branches: BranchInfo[],
  organizationId: number
): Promise<{ isValid: boolean; message?: string; validBranches?: BranchInfo[] }> {
  if (!Array.isArray(branches) || branches.length === 0) {
    return {
      isValid: false,
      message: "At least one branch is required",
    };
  }

  // Проверяем структуру каждого филиала
  for (const branch of branches) {
    if (!branch.id || !branch.name || !branch.address) {
      return {
        isValid: false,
        message: "Each branch must have id, name, and address",
      };
    }
  }

  // Получаем ID филиалов из запроса
  const branchIds = branches.map((b) => b.id);

  // Проверяем существование филиалов в БД
  const existingBranches = await Branch.findAll({
    where: {
      id: branchIds,
      organization_id: organizationId, // филиалы должны принадлежать этой организации
    },
    attributes: ["id", "name", "address"],
  });

  if (existingBranches.length !== branchIds.length) {
    const existingIds = existingBranches.map((b) => b.id);
    const missingIds = branchIds.filter((id) => !existingIds.includes(id));

    return {
      isValid: false,
      message: `Branches with IDs ${missingIds.join(", ")} not found or do not belong to this organization`,
    };
  }

  // Формируем валидированные данные филиалов
  const validBranches = existingBranches.map((branch) => ({
    id: branch.id,
    name: branch.name,
    address: branch.address,
  }));

  return {
    isValid: true,
    validBranches,
  };
}

