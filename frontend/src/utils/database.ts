import {
  Database,
  DataSourceMember,
  DataSourceType,
  Environment,
  Principal,
} from "../types";
import { isDBAOrOwner } from "./role";
import { isDev } from "./util";

export function allowDatabaseAccess(
  database: Database,
  principal: Principal,
  type: DataSourceType
): boolean {
  // "ADMIN" data source should only be used by the system, thus it shouldn't
  // touch this method at all. If it touches somehow, we will reject it and
  // log a warning
  if (type == "ADMIN") {
    if (isDev()) {
      console.trace(
        "Should not check database access against ADMIN connection"
      );
    } else {
      console.warn("Should not check database access against ADMIN connection");
    }
    return false;
  }

  if (isDBAOrOwner(principal.role)) {
    return true;
  }

  for (const dataSource of database.dataSourceList) {
    if (
      // Returns true if the current user has equal or higher access
      (dataSource.type == type || (dataSource.type == "RW" && type == "RO")) &&
      dataSource.memberList.find((item: DataSourceMember) => {
        return item.principal.id == principal.id;
      })
    ) {
      return true;
    }
  }
  return false;
}

// Sort the list to put prod items first.
export function sortDatabaseList(
  list: Database[],
  environmentList: Environment[]
): Database[] {
  return list.sort((a: Database, b: Database) => {
    var aEnvIndex = -1;
    var bEnvIndex = -1;

    for (var i = 0; i < environmentList.length; i++) {
      if (environmentList[i].id == a.instance.environment.id) {
        aEnvIndex = i;
      }
      if (environmentList[i].id == b.instance.environment.id) {
        bEnvIndex = i;
      }

      if (aEnvIndex != -1 && bEnvIndex != -1) {
        break;
      }
    }
    return bEnvIndex - aEnvIndex;
  });
}

// templateURL corresponds to the "bb.console.url" setting.
// This method replaces {{DB_NAME}} with the actual database name.
export function consoleLink(templateURL: string, databaseName: string): string {
  return templateURL.replace("{{DB_NAME}}", databaseName);
}
