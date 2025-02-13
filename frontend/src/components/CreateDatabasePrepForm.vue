<template>
  <div class="mx-4 space-y-6 divide-y divide-block-border">
    <div class="grid gap-y-6 gap-x-4 grid-cols-4">
      <div class="col-span-2 col-start-2 w-64">
        <label for="name" class="textlabel">
          New database name <span class="text-red-600">*</span>
        </label>
        <input
          required
          id="name"
          name="name"
          type="text"
          class="textfield mt-1 w-full"
          v-model="state.databaseName"
        />
        <span v-if="isReservedName" class="text-red-600"
          >{{ state.databaseName }} is a reserved name</span
        >
      </div>

      <div class="col-span-2 col-start-2 w-64">
        <label for="project" class="textlabel">
          Project <span style="color: red">*</span>
        </label>
        <ProjectSelect
          class="mt-1"
          id="project"
          name="project"
          :disabled="!allowEditProject"
          :selectedID="state.projectID"
          @select-project-id="selectProject"
        />
      </div>

      <div class="col-span-2 col-start-2 w-64">
        <label for="environment" class="textlabel">
          Environment <span style="color: red">*</span>
        </label>
        <EnvironmentSelect
          class="mt-1 w-full"
          id="environment"
          name="environment"
          :disabled="!allowEditEnvironment"
          :selectedID="state.environmentID"
          @select-environment-id="selectEnvironment"
        />
      </div>

      <div class="col-span-2 col-start-2 w-64">
        <div class="flex flex-row items-center space-x-1">
          <InstanceEngineIcon
            v-if="state.instanceID"
            :instance="selectedInstance"
          />
          <label for="instance" class="textlabel">
            Instance <span class="text-red-600">*</span>
          </label>
        </div>
        <div class="flex flex-row space-x-2 items-center">
          <InstanceSelect
            class="mt-1"
            id="instance"
            name="instance"
            :disabled="!allowEditInstance"
            :selectedID="state.instanceID"
            :environmentID="state.environmentID"
            @select-instance-id="selectInstance"
          />
        </div>
      </div>

      <template
        v-if="
          selectedInstance.engine != 'CLICKHOUSE' &&
          selectedInstance.engine != 'SNOWFLAKE'
        "
      >
        <div class="col-span-2 col-start-2 w-64">
          <label for="charset" class="textlabel">
            {{
              selectedInstance.engine == "POSTGRES"
                ? "Encoding"
                : "Character set"
            }}</label
          >
          <input
            id="charset"
            name="charset"
            type="text"
            class="textfield mt-1 w-full"
            :placeholder="defaultCharset(selectedInstance.engine)"
            v-model="state.characterSet"
          />
        </div>

        <div class="col-span-2 col-start-2 w-64">
          <label for="collation" class="textlabel"> Collation </label>
          <input
            id="collation"
            name="collation"
            type="text"
            class="textfield mt-1 w-full"
            :placeholder="
              defaultCollation(selectedInstance.engine) || 'default'
            "
            v-model="state.collation"
          />
        </div>
      </template>

      <div v-if="showAssigneeSelect" class="col-span-2 col-start-2 w-64">
        <label for="user" class="textlabel">
          Assignee <span class="text-red-600">*</span>
        </label>
        <!-- DBA and Owner always have all access, so we only need to grant to developer -->
        <MemberSelect
          class="mt-1"
          id="user"
          name="user"
          :allowedRoleList="['OWNER', 'DBA']"
          :selectedID="state.assigneeID"
          :placeholder="'Select assignee'"
          @select-principal-id="selectAssignee"
        />
      </div>
    </div>
    <!-- Create button group -->
    <div class="pt-4 flex justify-end">
      <button
        type="button"
        class="btn-normal py-2 px-4"
        @click.prevent="cancel"
      >
        Cancel
      </button>
      <button
        class="btn-primary ml-3 inline-flex justify-center py-2 px-4"
        :disabled="!allowCreate"
        @click.prevent="create"
      >
        Create
      </button>
    </div>
  </div>
</template>

<script lang="ts">
import {
  computed,
  reactive,
  onMounted,
  onUnmounted,
  PropType,
  watchEffect,
} from "vue";
import { useStore } from "vuex";
import { useRouter } from "vue-router";
import isEmpty from "lodash-es/isEmpty";
import InstanceSelect from "../components/InstanceSelect.vue";
import EnvironmentSelect from "../components/EnvironmentSelect.vue";
import ProjectSelect from "../components/ProjectSelect.vue";
import MemberSelect from "../components/MemberSelect.vue";
import InstanceEngineIcon from "../components/InstanceEngineIcon.vue";
import {
  EnvironmentID,
  InstanceID,
  ProjectID,
  IssueCreate,
  SYSTEM_BOT_ID,
  PrincipalID,
  Backup,
  StageCreate,
  defaultCharset,
  defaultCollation,
  unknown,
} from "../types";
import { isDBAOrOwner, issueSlug } from "../utils";

interface LocalState {
  projectID?: ProjectID;
  environmentID?: EnvironmentID;
  instanceID?: InstanceID;
  databaseName?: string;
  characterSet: string;
  collation: string;
  assigneeID?: PrincipalID;
}

export default {
  name: "CreateDatabasePrepForm",
  emits: ["dismiss"],
  props: {
    projectID: {
      type: Number as PropType<ProjectID>,
    },
    environmentID: {
      type: Number as PropType<EnvironmentID>,
    },
    instanceID: {
      type: Number as PropType<InstanceID>,
    },
    // If specified, then we are creating a database from the backup.
    backup: {
      type: Object as PropType<Backup>,
    },
  },
  components: {
    InstanceSelect,
    EnvironmentSelect,
    ProjectSelect,
    MemberSelect,
    InstanceEngineIcon,
  },
  setup(props, { emit }) {
    const store = useStore();
    const router = useRouter();

    const currentUser = computed(() => store.getters["auth/currentUser"]());

    const keyboardHandler = (e: KeyboardEvent) => {
      if (e.code == "Escape") {
        cancel();
      }
    };

    onMounted(() => {
      document.addEventListener("keydown", keyboardHandler);
    });

    onUnmounted(() => {
      document.removeEventListener("keydown", keyboardHandler);
    });

    // Refresh the instance list
    const prepareInstanceList = () => {
      store.dispatch("instance/fetchInstanceList");
    };

    watchEffect(prepareInstanceList);

    const showAssigneeSelect = computed(() => {
      return !isDBAOrOwner(currentUser.value.role);
    });

    const state = reactive<LocalState>({
      projectID: props.projectID,
      environmentID: props.environmentID,
      instanceID: props.instanceID,
      characterSet: "",
      collation: "",
      assigneeID: showAssigneeSelect.value ? undefined : SYSTEM_BOT_ID,
    });

    const isReservedName = computed(() => {
      return state.databaseName?.toLowerCase() == "bytebase";
    });

    const allowCreate = computed(() => {
      return (
        !isEmpty(state.databaseName) &&
        !isReservedName.value &&
        state.projectID &&
        state.environmentID &&
        state.instanceID &&
        state.assigneeID
      );
    });

    // If project has been specified, then we disallow changing it.
    const allowEditProject = computed(() => {
      return !props.projectID;
    });

    // If environment has been specified, then we disallow changing it.
    const allowEditEnvironment = computed(() => {
      return !props.environmentID;
    });

    // If instance has been specified, then we disallow changing it.
    const allowEditInstance = computed(() => {
      return !props.instanceID;
    });

    const selectedInstance = computed(() => {
      return state.instanceID
        ? store.getters["instance/instanceByID"](state.instanceID)
        : unknown("INSTANCE");
    });

    const selectProject = (projectID: ProjectID) => {
      state.projectID = projectID;
    };

    const selectEnvironment = (environmentID: EnvironmentID) => {
      state.environmentID = environmentID;
    };

    const selectInstance = (instanceID: InstanceID) => {
      state.instanceID = instanceID;
    };

    const selectAssignee = (assigneeID: PrincipalID) => {
      state.assigneeID = assigneeID;
    };

    const cancel = () => {
      emit("dismiss");
    };

    const create = async () => {
      const stageList: StageCreate[] = [
        {
          name: "Create database",
          environmentID: state.environmentID!,
          taskList: [
            {
              name: `Create database '${state.databaseName}'`,
              // If current user is DBA or Owner, then the created task will start automatically,
              // otherwise, it will require approval.
              status: isDBAOrOwner(currentUser.value.role)
                ? "PENDING"
                : "PENDING_APPROVAL",
              type: "bb.task.database.create",
              instanceID: state.instanceID!,
              // statement is derived by backend.
              statement: ``,
              rollbackStatement: "",
              databaseName: state.databaseName,
              characterSet:
                state.characterSet ||
                defaultCharset(selectedInstance.value.engine),
              collation:
                state.collation ||
                defaultCollation(selectedInstance.value.engine),
            },
          ],
        },
      ];

      // If backup is specified, then we add an additional stage to restore the backup to the newly created database.
      if (props.backup) {
        stageList.push({
          name: "Restore backup",
          environmentID: state.environmentID!,
          taskList: [
            {
              name: `Restore backup '${props.backup.name}'`,
              // Use "PENDING" here since we consider the required approval has already been granted in the first stage.
              status: "PENDING",
              type: "bb.task.database.restore",
              instanceID: state.instanceID!,
              statement: "",
              rollbackStatement: "",
              databaseName: state.databaseName,
              backupID: props.backup.id,
            },
          ],
        });
      }
      const newIssue: IssueCreate = props.backup
        ? {
            name: `Create database '${state.databaseName}' from backup '${props.backup.name}'`,
            type: "bb.issue.database.create",
            description: `Creating database from backup '${props.backup.name}'`,
            assigneeID: state.assigneeID!,
            projectID: state.projectID!,
            pipeline: {
              stageList,
              name: `Pipeline - Create database '${state.databaseName}' from backup '${props.backup.name}'`,
            },
            payload: {},
          }
        : {
            name: `Create database '${state.databaseName}'`,
            type: "bb.issue.database.create",
            description: "",
            assigneeID: state.assigneeID!,
            projectID: state.projectID!,
            pipeline: {
              stageList,
              name: `Pipeline - Create database ${state.databaseName}`,
            },
            payload: {},
          };
      store.dispatch("issue/createIssue", newIssue).then((createdIssue) => {
        router.push(`/issue/${issueSlug(createdIssue.name, createdIssue.id)}`);
      });
    };

    return {
      defaultCharset,
      defaultCollation,
      state,
      isReservedName,
      allowCreate,
      allowEditProject,
      allowEditEnvironment,
      allowEditInstance,
      selectedInstance,
      showAssigneeSelect,
      selectProject,
      selectEnvironment,
      selectInstance,
      selectAssignee,
      cancel,
      create,
    };
  },
};
</script>
