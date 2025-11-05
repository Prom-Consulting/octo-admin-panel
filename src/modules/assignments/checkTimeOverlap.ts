import Assignment from "./Assignment.ts";
import { Op } from "sequelize";

export const checkTimeOverlap = async (
  employeeId: number,
  branchId: number,
  assignmentDate: Date,
  startTime: string,
  endTime: string
): Promise<boolean> => {
  const overlap = await Assignment.findOne({
    where: {
      employee_id: employeeId,
      branch_id: branchId,
      assignment_date: assignmentDate,
      status: { [Op.notIn]: ["canceled", "completed"] },
      [Op.and]: [
        { start_time: { [Op.lt]: endTime } },
        { end_time: { [Op.gt]: startTime } },
      ],
    }
  });
  return !!overlap;
};