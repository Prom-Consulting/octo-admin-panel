import { clientActivityEvents, ClientActivityEventType } from "./clientActivityEvents.ts";

export const setupClientActivityListeners = () => {
  clientActivityEvents.onActivityEvent(
    ClientActivityEventType.ASSIGNMENT_CREATE,
    async ({ activity }) => {
      console.log("Activity CREATED:", activity);

    }
  );

  clientActivityEvents.onActivityEvent(
    ClientActivityEventType.ASSIGNMENT_UPDATE,
    async ({ activity }) => {
      console.log("Activity UPDATED:", activity);
    }
  );
}