import express from "express";
import {
  createWorkingDates,
  deleteWorkingDates,
  getWorkingDates,
  updateWorkingDates,
} from "../controllers/workingDates.controller.ts";
import { authenticateToken, authorizeRoles } from "../../../middleware/authUserMiddleware.ts";
import { checkBranchMiddleware } from "../../../middleware/checkOrganizationMiddleware.ts";

const WorkingDatesServiceRoute = express.Router();

WorkingDatesServiceRoute.use(authenticateToken,);

WorkingDatesServiceRoute.get("/",
  checkBranchMiddleware,
  getWorkingDates
);

WorkingDatesServiceRoute.use( authorizeRoles( "manager", "owner")); //middleware

WorkingDatesServiceRoute.post("/:staffId",
  checkBranchMiddleware,
  createWorkingDates
);

WorkingDatesServiceRoute.patch("/:id",
  checkBranchMiddleware,
  updateWorkingDates
);

WorkingDatesServiceRoute.delete("/:id",
  checkBranchMiddleware,
  deleteWorkingDates
);

export default WorkingDatesServiceRoute;

/**
 * @swagger
 * tags:
 *   name: WorkingDates
 *   description: Управление рабочими днями сотрудников. Только для owner и manager
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
 *     summary: Получить расписание сотрудников. Если войдет сотрудник то он может получить лишь свое расписание
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
