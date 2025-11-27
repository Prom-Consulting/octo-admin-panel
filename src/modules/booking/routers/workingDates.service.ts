import express from "express";
import { getWorkingDates } from "../../staff/controllers/workingDates.controller.ts";

const BookingWorkingDatesService = express.Router();

BookingWorkingDatesService.get("/", getWorkingDates);

/**
 * @openapi
 * /booking/working-dates:
 *   get:
 *     summary: Получение рабочих дат (графика) сотрудников. Общий для всех клиентов
 *     description: |
 *       Возвращает рабочие даты (график) сотрудников для конкретного филиала.
 *       Можно фильтровать по сотруднику и дате.
 *     tags:
 *       - Booking working dates
 *     security:
 *       - bearerAuth: []
 *
 *     parameters:
 *       - in: query
 *         name: branchId
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID филиала. Обязательный параметр.
 *
 *       - in: query
 *         name: staffId
 *         required: false
 *         schema:
 *           type: integer
 *         description: Фильтр по ID сотрудника. Необязательный параметр.
 *
 *       - in: query
 *         name: date
 *         required: false
 *         schema:
 *           type: string
 *           format: date
 *         description: |
 *           Дата в формате YYYY-MM-DD.
 *           Если передана, возвращаются записи только за этот день.
 *
 *     responses:
 *       200:
 *         description: Успешное получение списка рабочих дат
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 count:
 *                   type: integer
 *                   description: Количество найденных записей
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: integer
 *                       branch_id:
 *                         type: integer
 *                       staff_id:
 *                         type: integer
 *                         nullable: true
 *                       work_date:
 *                         type: string
 *                         format: date-time
 *                         description: Рабочая дата (с учётом таймзоны филиала)
 *                       staff:
 *                         type: object
 *                         nullable: true
 *                         description: Сотрудник, к которому относится запись
 *                         properties:
 *                           id:
 *                             type: integer
 *                           first_name:
 *                             type: string
 *                           last_name:
 *                             type: string
 *                           role:
 *                             type: string
 *
 *       400:
 *         description: Не указан обязательный параметр branchId
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *
 *       404:
 *         description: Филиал с указанным branchId не найден
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *
 *       500:
 *         description: Внутренняя ошибка сервера
 */

export default BookingWorkingDatesService;