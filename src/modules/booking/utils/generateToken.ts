import jwt from "jsonwebtoken";
import { envConfig } from "../../../../config/envConfig.ts";

export const generateBookingToken = (organizationName: string, organizationId: string) => jwt.sign(
  {
    organization_name: organizationName,
    organization_id: organizationId,
  },
  envConfig.ONE_TIME_JWT_SECRET,
  { expiresIn: "15m", header: { kid: "orgClient", alg: "HS256" } }
);