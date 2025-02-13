<template>
  <BBTable
    class="mt-2"
    :columnList="columnList"
    :sectionDataSource="dataSource"
    :compactSection="true"
    :showHeader="true"
    :rowClickable="false"
  >
    <template v-slot:header>
      <BBTableHeaderCell
        :leftPadding="4"
        class="w-auto table-cell"
        :title="columnList[0].title"
      />
      <template v-if="hasAdminFeature">
        <BBTableHeaderCell
          class="w-8 table-cell"
          :title="columnList[1].title"
        />
        <BBTableHeaderCell
          class="w-72 table-cell"
          :title="columnList[2].title"
        />
        <BBTableHeaderCell
          class="w-auto table-cell"
          :title="columnList[3].title"
        />
      </template>
      <template v-else>
        <BBTableHeaderCell
          class="w-72 table-cell"
          :title="columnList[1].title"
        />
        <BBTableHeaderCell
          class="w-auto table-cell"
          :title="columnList[2].title"
        />
      </template>
    </template>
    <template v-slot:body="{ rowData: member }">
      <BBTableCell :leftPadding="4" class="table-cell">
        <div class="flex flex-row items-center space-x-2">
          <template v-if="'INVITED' == member.principal.status">
            <span
              class="
                inline-flex
                items-center
                px-2
                py-0.5
                rounded-lg
                text-xs
                font-semibold
                bg-main
                text-main-text
              "
            >
              Invited
            </span>
            <span class="textlabel">
              {{ member.principal.email }}
            </span>
          </template>
          <template v-else>
            <PrincipalAvatar :principal="member.principal" />
            <div class="flex flex-col">
              <div class="flex flex-row items-center space-x-2">
                <router-link
                  :to="`/u/${member.principal.id}`"
                  class="normal-link"
                  >{{ member.principal.name }}
                </router-link>
                <span
                  v-if="currentUser.id == member.principal.id"
                  class="
                    inline-flex
                    items-center
                    px-2
                    py-0.5
                    rounded-lg
                    text-xs
                    font-semibold
                    bg-green-100
                    text-green-800
                  "
                >
                  You
                </span>
              </div>
              <span class="textlabel">
                {{ member.principal.email }}
              </span>
            </div>
          </template>
        </div>
      </BBTableCell>
      <BBTableCell v-if="hasAdminFeature" class="">
        <ProjectRoleSelect
          :selectedRole="member.role"
          :disabled="!allowChangeRole(member.role)"
          @change-role="
            (role) => {
              changeRole(member.id, role);
            }
          "
        />
      </BBTableCell>
      <BBTableCell class="table-cell">
        <div class="flex flex-row items-center space-x-1">
          <span>
            {{ humanizeTs(member.updatedTs) }}
          </span>
          <span>by</span>
          <router-link :to="`/u/${member.updater.id}`" class="normal-link"
            >{{ member.updater.name }}
          </router-link>
        </div>
      </BBTableCell>
      <BBTableCell>
        <BBButtonConfirm
          v-if="allowChangeRole(member.role)"
          :requireConfirm="true"
          :okText="'Revoke'"
          :confirmTitle="`Are you sure to revoke '${member.role}' from '${member.principal.name}'`"
          @confirm="deleteRole(member)"
        />
      </BBTableCell>
    </template>
  </BBTable>
</template>

<script lang="ts">
import { computed, PropType, reactive } from "vue";
import { useStore } from "vuex";
import ProjectRoleSelect from "../components/ProjectRoleSelect.vue";
import PrincipalAvatar from "../components/PrincipalAvatar.vue";
import {
  Project,
  ProjectMember,
  ProjectRoleType,
  MemberID,
  ProjectMemberPatch,
} from "../types";
import { BBTableColumn, BBTableSectionDataSource } from "../bbkit/types";
import { isOwner, isProjectOwner } from "../utils";

interface LocalState {}

export default {
  name: "ProjectMemberTable",
  components: { ProjectRoleSelect, PrincipalAvatar },
  props: {
    project: {
      required: true,
      type: Object as PropType<Project>,
    },
  },
  setup(props, ctx) {
    const store = useStore();

    const currentUser = computed(() => store.getters["auth/currentUser"]());

    const hasAdminFeature = computed(() =>
      store.getters["plan/feature"]("bb.admin")
    );

    const state = reactive<LocalState>({});

    const dataSource = computed(
      (): BBTableSectionDataSource<ProjectMember>[] => {
        const ownerList: ProjectMember[] = [];
        const developerList: ProjectMember[] = [];
        for (const member of props.project.memberList) {
          if (member.role == "OWNER") {
            ownerList.push(member);
          }

          if (member.role == "DEVELOPER") {
            developerList.push(member);
          }
        }

        const dataSource: BBTableSectionDataSource<ProjectMember>[] = [];
        if (hasAdminFeature.value) {
          dataSource.push({
            title: "Owner",
            list: ownerList,
          });

          dataSource.push({
            title: "Developer",
            list: developerList,
          });
        } else {
          ownerList.push(...developerList);

          dataSource.push({
            title: "Member",
            list: ownerList,
          });
        }
        return dataSource;
      }
    );

    const columnList = computed((): BBTableColumn[] => {
      return hasAdminFeature.value
        ? [
            {
              title: "Account",
            },
            {
              title: "Role",
            },
            {
              title: "Granted Time",
            },
            {
              title: "",
            },
          ]
        : [
            {
              title: "Account",
            },
            {
              title: "Granted Time",
            },
            {
              title: "",
            },
          ];
    });

    // To prevent user accidentally removing roles and lock the project permanently, we take following measures:
    // 1. Disallow removing the last OWNER.
    // 2. Allow workspace OWNER to change roles. This helps when the project OWNER is no longer available and
    //    other project members can ask the workspace OWNER to assign new project OWNER.
    const allowChangeRole = (role: ProjectRoleType) => {
      if (props.project.rowStatus == "ARCHIVED") {
        return false;
      }

      if (role == "OWNER" && dataSource.value[0].list.length <= 1) {
        return false;
      }

      if (isOwner(currentUser.value.role)) {
        return true;
      }

      for (const member of props.project.memberList) {
        if (member.principal.id == currentUser.value.id) {
          if (isProjectOwner(member.role)) {
            return true;
          }
        }
      }

      return false;
    };

    const changeRole = (id: MemberID, role: ProjectRoleType) => {
      const projectMemberPatch: ProjectMemberPatch = {
        role,
      };
      store.dispatch("project/patchMember", {
        projectID: props.project.id,
        memberID: id,
        projectMemberPatch,
      });
    };

    const deleteRole = (member: ProjectMember) => {
      store.dispatch("project/deleteMember", member).then(() => {
        store.dispatch("notification/pushNotification", {
          module: "bytebase",
          style: "INFO",
          title: `Successfully revoked ${member.principal.name} access from the project.`,
        });
      });
    };

    return {
      state,
      currentUser,
      hasAdminFeature,
      columnList,
      dataSource,
      allowChangeRole,
      changeRole,
      deleteRole,
    };
  },
};
</script>
