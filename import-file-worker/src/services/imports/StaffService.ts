import type { OrganizationInfo } from "../../../../src/types";
import { type BranchInfo, OrganizationStaff } from "../../../../src/modules/staff/models/OrganizationStaff.ts";

export class StaffService {

  async findOrCreate(firstName: string, lastName: string | null, organization: OrganizationInfo, branch: BranchInfo) {
    const existing = await OrganizationStaff.findOne({
      where: {
        first_name: (firstName || "Не указан").trim(),
        last_name: lastName ? lastName.trim() : null,
        // organization: {
        //   [Op.contains]: { id: organization.id },
        // },
        // branches: {
        //   [Op.contains]: [{ id: branch.id }],
        // },
      },
    });

    if (existing) return existing;

    const newEmployee = await OrganizationStaff.create({
      first_name: (firstName || "Не указан"),
      last_name: lastName || null,
      organization: { id: organization.id, name: organization.name },
      role: "employee",
      is_active: true,
      branches: [{ id: branch.id, name: branch.name, address: branch.address }],
    });

    console.log(`✅ Created new employee: ${newEmployee.first_name}`);
    return newEmployee;
  }
}