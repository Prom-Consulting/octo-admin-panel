import express, { type Request, type Response, type NextFunction } from "express";
import { DateTime } from "luxon";
import { Op, type WhereOptions } from "sequelize";
import { WorkingDates, type WorkingDatesAttributes } from "./WorkingDates.ts";
import getDayRange from "../../utils /getDayRange.ts";
import Branch from "../organization/models/Branch.ts";
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

    if (!branchId) return res.status(404).send("branchId query is required");

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
    console.log("Get working dates error", e);
    next(e);
  }
});

WorkingDatesServiceRoute.post("/:staffId", async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { staffId } = req.params;
      const { branchId } = req.query;
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

      const tz = branch.timezone || "UTC";
      const requestedWorkDateUTC = DateTime.fromISO(workDate, { zone: tz }).startOf("day").toUTC().toJSDate();

      const existingWorkDate = await WorkingDates.findOne({
        where: {
          staff_id: staffId,
          work_date: requestedWorkDateUTC,
        }
      });

      if (existingWorkDate) {
        return res.status(400).send({ error: "The employee is already working on this date." });
      }

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
      console.log("Create working dates error",e);
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
      console.log("Edit working dates error", e);
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
    console.log("Delete working dates error", e);
    next(e);
  }
});

export default WorkingDatesServiceRoute;

/**
 * @swagger
 * tags:
 *   name: WorkingDates
 *   description: Управление рабочими днями сотрудников
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     WorkingDate:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *           example: 1
 *         staff_id:
 *           type: integer
 *           example: 5
 *         branch_id:
 *           type: integer
 *           example: 2
 *         work_date:
 *           type: string
 *           format: date-time
 *           example: "2025-10-21T00:00:00.000Z"
 *         start_time:
 *           type: string
 *           example: "09:00"
 *         end_time:
 *           type: string
 *           example: "18:00"
 *         timezone:
 *           type: string
 *           example: "Asia/Bishkek"
 *         is_day_off:
 *           type: boolean
 *           example: false
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 */

/**
 * @swagger
 * /working-dates:
 *   get:
 *     summary: Получить расписание сотрудников
 *     tags: [WorkingDates]
 *     parameters:
 *       - in: query
 *         name: staffId
 *         schema:
 *           type: integer
 *         description: ID сотрудника
 *       - in: query
 *         name: branchId
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID филиала
 *       - in: query
 *         name: date
 *         schema:
 *           type: string
 *           format: date
 *         description: Дата для фильтрации
 *     responses:
 *       200:
 *         description: Успешно
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/WorkingDate'
 *       404:
 *         description: Филиал не найден
 */

/**
 * @swagger
 * /working-dates/{staffId}:
 *   post:
 *     summary: Создать рабочий день сотрудника
 *     tags: [WorkingDates]
 *     parameters:
 *       - in: path
 *         name: staffId
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID сотрудника
 *       - in: query
 *         name: branchId
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID филиала
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - workDate
 *               - startTime
 *               - endTime
 *             properties:
 *               workDate:
 *                 type: string
 *                 format: date
 *                 example: "2025-10-22"
 *               startTime:
 *                 type: string
 *                 example: "09:00"
 *               endTime:
 *                 type: string
 *                 example: "18:00"
 *     responses:
 *       200:
 *         description: Рабочий день успешно создан
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/WorkingDate'
 *       400:
 *         description: Ошибка валидации или дубликат даты
 *       404:
 *         description: Сотрудник или филиал не найден
 */

/**
 * @swagger
 * /working-dates/{id}:
 *   patch:
 *     summary: Обновить данные рабочего дня
 *     tags: [WorkingDates]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID рабочего дня
 *       - in: query
 *         name: branchId
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID филиала
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               workDate:
 *                 type: string
 *                 format: date
 *                 example: "2025-10-23"
 *               startTime:
 *                 type: string
 *                 example: "10:00"
 *               endTime:
 *                 type: string
 *                 example: "19:00"
 *               isDayOff:
 *                 type: boolean
 *                 example: false
 *     responses:
 *       200:
 *         description: Успешно обновлено
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/WorkingDate'
 *       400:
 *         description: Некорректные данные
 *       404:
 *         description: Рабочий день или филиал не найден
 */

/**
 * @swagger
 * /working-dates/{id}:
 *   delete:
 *     summary: Удалить рабочий день
 *     tags: [WorkingDates]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID рабочего дня
 *     responses:
 *       200:
 *         description: Рабочий день удален
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Work date deleted
 *       404:
 *         description: Рабочий день не найден
 */
