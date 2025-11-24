import { EventEmitter } from "node:events";
import type { AssignmentAttributes } from "../../modules/assignments/models/Assignment.ts";

export enum ClientActivityEventType {
  ASSIGNMENT_CREATE = "assignment:create",
  ASSIGNMENT_UPDATE = "assignment:update",
}

export interface ClientActivityEventPayload {
  assignment: AssignmentAttributes;
  token?: string | null;
  organizationPerson?: boolean;
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
