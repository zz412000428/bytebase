import { Store } from "vuex";
import { IssueBuiltinFieldID } from "../plugins";
import {
  Activity,
  ActivityIssueFieldUpdatePayload,
  ActivityIssueStatusUpdatePayload,
} from "../types";

let store: Store<any>;

export function registerStoreWithActivityUtil(theStore: Store<any>) {
  store = theStore;
}

export function issueActivityActionSentence(activity: Activity): string {
  switch (activity.type) {
    case "bb.issue.create":
      return "created issue";
    case "bb.issue.comment.create":
      return "commented";
    case "bb.issue.field.update": {
      const update = activity.payload as ActivityIssueFieldUpdatePayload;

      let name = "Unknown Field";
      let oldValue = undefined;
      let newValue = undefined;

      switch (update.fieldID) {
        case IssueBuiltinFieldID.ASSIGNEE: {
          if (update.oldValue && update.newValue) {
            const oldName = store.getters["principal/principalByID"](
              update.oldValue
            ).name;

            const newName = store.getters["principal/principalByID"](
              update.newValue
            ).name;

            return `reassigned issue from ${oldName} to ${newName}`;
          } else if (!update.oldValue && update.newValue) {
            const newName = store.getters["principal/principalByID"](
              update.newValue
            ).name;

            return `assigned issue to ${newName}`;
          } else if (update.oldValue && !update.newValue) {
            const oldName = store.getters["principal/principalByID"](
              update.oldValue
            ).name;

            return `unassigned issue from ${oldName}`;
          } else {
            return `invalid assignee update`;
          }
        }
        // We don't display subscriber change for now
        case IssueBuiltinFieldID.SUBSCRIBER_LIST:
          break;
        case IssueBuiltinFieldID.DESCRIPTION:
          // Description could be very long, so we don't display it.
          return "changed description";
        case IssueBuiltinFieldID.NAME:
        case IssueBuiltinFieldID.PROJECT:
        case IssueBuiltinFieldID.SQL:
        case IssueBuiltinFieldID.ROLLBACK_SQL: {
          if (update.fieldID == IssueBuiltinFieldID.NAME) {
            name = "name";
          } else if (update.fieldID == IssueBuiltinFieldID.SQL) {
            name = "SQL";
          } else if (update.fieldID == IssueBuiltinFieldID.ROLLBACK_SQL) {
            name = "Rollback SQL";
          }

          oldValue = update.oldValue;
          newValue = update.newValue;
          if (oldValue && newValue) {
            return `changed ${name} from "${oldValue}" to "${newValue}"`;
          } else if (oldValue) {
            return `unset "${name} from "${oldValue}"`;
          } else if (newValue) {
            return `set ${name} to "${newValue}"`;
          } else {
            return `changed ${name} update`;
          }
        }
      }

      return "updated";
    }
    case "bb.issue.status.update": {
      const update = activity.payload as ActivityIssueStatusUpdatePayload;
      switch (update.newStatus) {
        case "OPEN":
          return "reopened issue";
        case "DONE":
          return "resolved issue";
        case "CANCELED":
          return "canceled issue";
      }
    }
  }
  return "";
}
