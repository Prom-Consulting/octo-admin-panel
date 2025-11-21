import { clientActivityEvents, ClientActivityEventType } from "./clientActivityEvents.ts";
import axios from "axios";
import { octoApi } from "../../constants/urls.ts";

export const setupClientActivityListeners = () => {
  clientActivityEvents.onActivityEvent(
    ClientActivityEventType.ASSIGNMENT_CREATE,
    async ({ assignment, token, organizationPerson }) => {
     try {
       console.log("Activity CREATED:");
       const url = organizationPerson ? "client-activity" : "booking/client/activity";

       await axios.post(
         `${octoApi}${url}?branchId=${assignment.branch_id}`,
         {
           data: {
             id: assignment.id,
             branch_id: assignment.branch_id,
             date: assignment.assignment_date,
             timezone: assignment.timezone,
             paid_status: "success",
             client: {
               id: assignment.client_id,
               ...assignment.client_snapshot,
             },
             total_price: assignment.final_price,
             main_service: {
               id: assignment.service_id,
               duration: assignment.service_snapshot.duration,
               name: assignment.service_snapshot.name,
               price: assignment.service_snapshot.price,
             },
             additional_services: assignment.additional_services,
             status: assignment.status,
           },
           source: "calendar",
           source_type: "assignment"
         },
         {
           headers: {
             authorization: `Bearer ${token}`,
             "Content-Type": "application/json",
           },
         }
       );
       console.log(
         `✅ Client activity successfully created: ${assignment.client_snapshot.first_name}`
       );
     } catch (e) {
       if (axios.isAxiosError(e)) {
         console.error({
           success: false,
           message: e.response?.data?.message || e.message,
           data: e.response?.data || null,
           url: e.config?.url,
           method: e.config?.method,
         });
       } else {
         console.error("❌ Error create client activity on calendar:", e);
       }
     }

    }
  );

  clientActivityEvents.onActivityEvent(
    ClientActivityEventType.ASSIGNMENT_UPDATE,
    async ({ assignment, token }) => {
      try {
        console.log("Activity UPDATED:", assignment.id);

        await axios.put(
          `${octoApi}client-activity/${assignment.id}?branchId=${assignment.branch_id}`,
          {
              id: assignment.id,
              branch_id: assignment.branch_id,
              date: assignment.assignment_date,
              timezone: assignment.timezone,
              paid_status:
                assignment.paid === "paid"
                  ? "success"
                  : assignment.paid === "refund"
                    ? "refund"
                    : null,

              client: {
                id: assignment.client_id,
                ...assignment.client_snapshot,
              },
              total_price: assignment.final_price,
              main_service: {
                id: assignment.service_id,
                duration: assignment.service_snapshot.duration,
                name: assignment.service_snapshot.name,
                price: assignment.service_snapshot.price,
              },
              additional_services: assignment.additional_services,
              status: assignment.status,
          },
          {
            headers: {
              authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
          }
        );

        console.log(`🔄 Client activity updated [${assignment.id}]`);

      } catch (e) {
        if (axios.isAxiosError(e)) {
          console.error({
            success: false,
            message: e.response?.data?.message || e.message,
            data: e.response?.data || null,
            url: e.config?.url,
            method: e.config?.method,
          });
        } else {
          console.error("❌ Error updating client activity:", e);
        }
      }
    }
  );
}