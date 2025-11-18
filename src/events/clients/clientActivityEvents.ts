import { EventEmitter } from "node:events";
import type { ClientActivityAttributes } from "../../modules/client/models/ClientActivity.ts";

export enum ClientActivityEventType {
  ASSIGNMENT_CREATE = "assignment:create",
  ASSIGNMENT_UPDATE = "assignment:update",
}

export interface ClientActivityEventPayload {
  activity: ClientActivityAttributes;
}

class ClientActivityEventEmitter extends EventEmitter {
  emitAssignmentCreated(data: ClientActivityEventPayload) {
    this.emit(ClientActivityEventType.ASSIGNMENT_CREATE, data);
  }

  emitAssignmentUpdated(data: ClientActivityEventPayload) {
    this.emit(ClientActivityEventType.ASSIGNMENT_UPDATE, data);
  }

  onActivityEvent(
    event: ClientActivityEventType,
    listener: (payload: ClientActivityEventPayload) => void | Promise<void>
  ) {
    this.on(event, listener);
  }
}

export const clientActivityEvents = new ClientActivityEventEmitter();
