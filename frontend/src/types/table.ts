import { Column } from "./column";
import { Database } from "./database";
import { TableID } from "./id";
import { Principal } from "./principal";

export type TableType = "BASE TABLE" | "VIEW";
export type TableEngineType = "InnoDB";

// Table
export type Table = {
  id: TableID;

  // Related fields
  database: Database;

  // Standard fields
  creator: Principal;
  createdTs: number;
  updater: Principal;
  updatedTs: number;

  // Domain specific fields
  name: string;
  type: TableType;
  engine: TableEngineType;
  collation: string;
  rowCount: number;
  dataSize: number;
  indexSize: number;
  dataFree: number;
  createOptions: string;
  comment: string;
  columnList: Column[];
};
