import express, { type Request, type Response, type NextFunction } from "express";
import { DateTime } from "luxon";
import { Op, type WhereOptions } from "sequelize";
import { WorkingDates, type WorkingDatesAttributes } from "./WorkingDates.ts";
import getDayRange from "../../utils /getDayRange.ts";
import Branch from "../organization/Branch.ts";
import OrganizationStaff from "./OrganizationStaff.ts";

const WorkingDatesServiceRoute = express.Router();

WorkingDatesServiceRoute.get("/", async (req: Request, res:Response, next: NextFunction) => {
  try {
    const { staffId, branchId } = req.query;
    const date = req.query.date as string;

    const where: WhereOptions<WorkingDatesAttributes> = {};

    if (staffId) {
      where.staff_id = Number(staffId);
    }

    const branch = await Branch.findByPk(Number(branchId));

    if (!branch) {
      return res.status(404).json({error: "Branch not found"});
    }

    if (date) {
      const tz = branch.timezone || "UTC";
      const { startOfDay, endOfDay } = getDayRange(date, date, tz);

      where.work_date = { [Op.between]: [startOfDay, endOfDay] };
    }

    const schedule = await WorkingDates.findAll({ where });
    return res.send(schedule);
  } catch (e) {
    next(e);
  }
});

WorkingDatesServiceRoute.post("/:staffId", async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { staffId, branchId } = req.params;
      const { workDate, startTime, endTime } = req.body;

      if (!staffId) {
        return res.status(400).send({ error: "Staff ID required" });
      }

      const branch = await Branch.findByPk(Number(branchId));

      if (!branch) {
        return res.status(404).json({error: "Branch not found"});
      }

      if (!workDate) {
        return res.status(400).send({ error: "Date of work is mandatory" });
      }

      const staff = await OrganizationStaff.findByPk(staffId);

      if (!staff) {
        return res.status(400).send({ error: "Staff not found" });
      }

      const existingWorkDate = await WorkingDates.findOne({
        where: { staff_id: staffId, work_date: workDate }
      });

      if (existingWorkDate) {
        return res.status(400).send({ error: "The employee is already working on this date." });
      }

      const tz = branch.timezone || "UTC";
      const startDateTime = DateTime.fromISO(`${workDate}T${startTime}`, { zone: tz });
      const endDateTime = DateTime.fromISO(`${workDate}T${endTime}`, { zone: tz });

      if (endDateTime <= startDateTime) {
        return res.status(400).send({ error: "End time cannot be earlier than start time" });
      }

      const workDateUTC = startDateTime.startOf("day").toUTC().toJSDate();
      const startTimeUTC = startDateTime.toUTC().toFormat("HH:mm");
      const endTimeUTC = endDateTime.toUTC().toFormat("HH:mm");

      const workingDate = await WorkingDates.create({
        staff_id: Number(staffId),
        work_date: workDateUTC,
        start_time: startTimeUTC,
        end_time: endTimeUTC,
        branch_id: branch.id,
        timezone: tz,
      });

      res.send(workingDate);
    } catch (e) {
      next(e);
    }
  }
);

WorkingDatesServiceRoute.patch("/:id", async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const { branchId } = req.query;
      const { workDate, startTime, endTime, isDayOff } = req.body;

      if (!id) {
        return res.status(400).send({ error: "Work date ID required" });
      }

      const workingDate = await WorkingDates.findByPk(Number(id));
      if (!workingDate) {
        return res.status(404).send({ error: "Staff working day not found" });
      }

      const branch = await Branch.findByPk(Number(branchId));

      if (!branch) {
        return res.status(404).json({error: "Branch not found"});
      }

      const tz = branch.timezone || workingDate.timezone || "UTC";
      const updates: Partial<typeof workingDate> = {};

      if (isDayOff) {
        updates.start_time = null;
        updates.end_time = null;
        updates.is_day_off = true;
      } else {
        updates.is_day_off = false;

        const currentWorkDate = DateTime.fromJSDate(workingDate.work_date, { zone: "UTC" }).setZone(tz);
        const newWorkDate = workDate
          ? DateTime.fromISO(workDate, { zone: tz })
          : currentWorkDate;

        let startDateTime: DateTime = DateTime.fromISO(`${newWorkDate.toISODate()}T${workingDate.start_time}`, { zone: tz });
        let endDateTime: DateTime = DateTime.fromISO(`${newWorkDate.toISODate()}T${workingDate.end_time}`, { zone: tz });

        if (startTime) {
          startDateTime = DateTime.fromISO(`${newWorkDate.toISODate()}T${startTime}`, { zone: tz });
        }

        if (endTime) {
          endDateTime = DateTime.fromISO(`${newWorkDate.toISODate()}T${endTime}`, { zone: tz });
        }

        if (endDateTime <= startDateTime) {
          return res.status(400).send({ error: "End time cannot be earlier than start time" });
        }

        updates.start_time = startDateTime.toUTC().toFormat("HH:mm");
        updates.end_time = endDateTime.toUTC().toFormat("HH:mm");

        if (workDate) {
          updates.work_date = newWorkDate.startOf("day").toUTC().toJSDate();
        }
      }

      await workingDate.update(updates);
      res.send(workingDate);
    } catch (e) {
      next(e);
    }
  }
);

WorkingDatesServiceRoute.delete("/:id", async (req: Request, res:Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(404).send({ error: "Work date ID required" });
    }

    const workDate = await WorkingDates.findByPk(id);

    if (!workDate) {
      return res.status(404).send({ error: "Work date not found" });
    }

    await workDate.destroy();
    res.send({message: "Work date deleted"});
  } catch (e) {
    next(e);
  }
});

export default WorkingDatesServiceRoute;