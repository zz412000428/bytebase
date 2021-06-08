import { PrincipalId, VCSId } from "./id";
import { Principal } from "./principal";

export type VCSType = "GITLAB_SELF_HOST";

export interface VCSConfig {
  type: VCSType;
  name: string;
  instanceURL: string;
  applicationId: string;
  secret: string;
}

export type VCS = {
  id: VCSId;

  // Standard fields
  creator: Principal;
  createdTs: number;
  updater: Principal;
  updatedTs: number;

  // Domain specific fields
  name: string;
  uuid: string;
  type: VCSType;
  instanceURL: string;
  apiURL: string;
  applicationId: string;
  secret: string;
  accessToken: string;
};

export type VCSCreate = {
  // Standard fields
  creatorId: PrincipalId;

  // Domain specific fields
  name: string;
  type: VCSType;
  instanceURL: string;
  applicationId: string;
  secret: string;
};

export type VCSPatch = {
  // Standard fields
  updaterId: PrincipalId;

  // Domain specific fields
  accessToken: string;
};

export function isValidApplicationIdOrSecret(str: string): boolean {
  return /^[a-zA-Z0-9_]{64}$/.test(str);
}

export function redirectURL(vcs: VCS): string {
  return `https://bytebase.com/auth/${vcs.uuid}/callback`;
}