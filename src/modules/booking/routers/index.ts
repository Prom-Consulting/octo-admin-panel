import { Router } from "express";
import AssignmentsBookingServiceRoute from "./assigments.service.ts";
import BookingOrganizationRoute from "./organization.service.ts";
import BookingBranchRoute from "./branch.service.ts";
import { getGuestToken } from "../controllers/auth.service.ts";
import BookingStaffRoute from "./staf.service.ts";
import BookingWorkingDatesService from "./workingDates.service.ts";

const BookingRoute = Router();

BookingRoute.use("/organizations", BookingOrganizationRoute);
BookingRoute.get("/auth/:organizationId", getGuestToken);
BookingRoute.use("/branches", BookingBranchRoute);
BookingRoute.use("/assignments", AssignmentsBookingServiceRoute);
BookingRoute.use("/staff", BookingStaffRoute);
BookingRoute.use("/working-dates", BookingWorkingDatesService);

/**
 * @openapi
 * tags:
 *   - name: Booking staff and temporary token
 *     description: Общий роут для всех клиентов
 */

/**
 * @openapi
 * /booking/auth/{organizationId}:
 *   get:
 *     summary: Получение гостевого токена
 *     description:
 *       Генерирует одноразовый токен
 *       Токен используется для доступа к тенантной базы данных
 *     tags:
 *       - Booking staff and temporary token
 *     parameters:
 *       - in: path
 *         name: organizationId
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID организации, для которой запрашивается гостевой токен
 *     responses:
 *       200:
 *         description: Guest token generated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 token:
 *                   type: string
 *                   example: "eyJhbGciOiJIUzI1NiIsInR5cCI..."
 *       400:
 *         description: organizationId отсутствует
 *         content:
 *           application/json:
 *             example:
 *               error: "organizationId required"
 *       404:
 *         description: Организация не найдена
 *       500:
 *         description: Server error
 */

export default BookingRoute;