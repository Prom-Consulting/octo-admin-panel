import { Router } from "express";
import { createAssignment } from "../../assignments/controllers/assignment.controller.ts";

const AssignmentsBookingServiceRoute = Router();

AssignmentsBookingServiceRoute.post("/", createAssignment);

/**
 * @swagger
 * tags:
 *   - name: Booking assignments
 *     description: Создание записи клиента на странице booking
 */

/**
 * @swagger
 * /booking/assignments:
 *   post:
 *     summary: Создать новое назначение. Сотрудник может только свои
 *     description: Создаёт новую запись клиента.
 *     tags: [Booking assignments]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateAssignmentDto'
 *     responses:
 *       200:
 *         description: Назначение успешно создано.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/Assignment'
 *                 message:
 *                   type: string
 *                   example: "Assignment created successfully"
 *       404:
 *         description: Не найдены организация, филиал, клиент или сотрудник.
 *       409:
 *         description: Конфликт по времени — сотрудник уже занят на выбранное время.
 *       400:
 *         description: Ошибка валидации входных данных.
 *       500:
 *         description: Внутренняя ошибка сервера.
 */

export default AssignmentsBookingServiceRoute;