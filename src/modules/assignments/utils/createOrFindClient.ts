import type { WhereOptions } from "sequelize";
import { Client, type ClientAttributes } from "../../client/models/Client";
import jwt from "jsonwebtoken";
import { envConfig } from "../../../../config/envConfig.ts";
import { octoApi } from "../../../constants/urls.ts";
import axios from "axios";

export const findOrCreateClient = async (
  clientData: any,
  organization: any,
  user: any,
  token?: string,
): Promise<any> => {
  const where: WhereOptions<ClientAttributes> = clientData.id
    ? { id: clientData.id }
    : { phone_number: clientData.phoneNumber };

  let clientDb = await Client.findOne({ where });
  if (clientDb) return clientDb;
  const isOrgPerson =  user && user.role !== "client";

  const url = isOrgPerson
    ? `${octoApi}organization-client/search`
    : `${octoApi}booking/client/search`;

  let finalToken = token;
  if (!finalToken) {
    finalToken = jwt.sign(
      {
        organization_name: organization.name,
        organization_id: organization.id,
      },
      envConfig.ONE_TIME_JWT_SECRET,
      { expiresIn: "15m", header: { kid: "orgClient", alg: "HS256" } }
    );
  }

  try {
    const response = await axios.get(url, {
      params: {
        firstname: clientData.firstname,
        phoneNumber: clientData.phoneNumber,
        ...(clientData.lastname && { lastname: clientData.lastname }),
      },
      headers: {
        authorization: `Bearer ${finalToken}`,
        "Content-Type": "application/json",
      },
    });

    return { clientDb:response.data || null, finalToken: finalToken, isOrgPerson }

  } catch (error) {
    if (axios.isAxiosError(error)) {
      console.error({
        success: false,
        message: error.response?.data?.message || error.message,
        data: error.response?.data || null,
      });
      return null;
    }
    console.error("Failed to search client in external system:", error);
    return null;
  }
};