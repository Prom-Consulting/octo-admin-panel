import type { WhereOptions } from "sequelize";
import { Client, type ClientAttributes } from "../../client/models/Client";
import { octoApi } from "../../../constants/urls.ts";
import axios from "axios";
import { generateBookingToken } from "../../booking/utils/generateToken.ts";

export const findOrCreateClient = async (
  clientData: any,
  organization: any,
  user: any,
  token?: string | null,
): Promise<any> => {
  const where: WhereOptions<ClientAttributes> = clientData.id
    ? { id: clientData.id }
    : { phone_number: clientData.phoneNumber };

  let clientDb = await Client.findOne({ where });
  if (clientDb) return clientDb;
  const isOrgPerson = !!user;

  const url = isOrgPerson
    ? `${octoApi}organization-client/search`
    : `${octoApi}booking/client/search`;

  let finalToken = token;
  if (!finalToken) {
    finalToken = generateBookingToken(organization.name, organization.id);
  }

  try {
    const response = await axios.get(url, {
      params: {
        firstname: clientData.firstname,
        phoneNumber: clientData.phoneNumber.replace(/\D+/g, ""),
        ...(clientData.lastname && { lastname: clientData.lastname }),
      },
      headers: {
        authorization: `Bearer ${finalToken}`,
        "Content-Type": "application/json",
      },
    });

    return { clientDb:response.data || null, token: finalToken, isOrgPerson }

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