import express from "express";
import { getListStaff } from "../../staff/controllers/staff.controller.ts";

const BookingStaffRoute = express.Router();

BookingStaffRoute.get("/", getListStaff);

export default BookingStaffRoute;

/**
 * @openapi
 * /booking/staff:
 *   get:
 *     summary: Получить список сотрудников организации
 *     description: organizationId обязателен если нет branchId и наоборот.
 *     tags: [Booking staff and temporary token]
 *     parameters:
 *       - in: query
 *         name: organizationId
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: role
 *         required: false
 *         schema:
 *           type: string
 *           enum: [manager, employee]
 *       - in: query
 *         name: branchId
 *         required: false
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Успешное получение списка сотрудников
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 count:
 *                   type: integer
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/OrganizationStaff'
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 */