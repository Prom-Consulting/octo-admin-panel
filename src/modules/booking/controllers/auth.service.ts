import type { NextFunction, Response, Request } from "express";
import { generateBookingToken } from "../utils/generateToken.ts";
import { getBranchAndOrganization } from "../../../utils /auth/getBranchAndOrganization.ts";

// путь /booking/auth/:organizationId
export const getGuestToken = async (req: Request, res: Response, next: NextFunction) => {
 try {
   const { organizationId } = req.params;

   if (!organizationId) {
     return res.status(400).json({ error: "organizationId required" });
   }

   const { organization } = await getBranchAndOrganization(req, { organization: true });
   const token = generateBookingToken(organization.name, organization.id);

   return res.json({ token });
 } catch (e) {
   console.error("Get Guest Token Error", e);
   next(e);
 }
};

