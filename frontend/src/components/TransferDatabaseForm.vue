<template>
  <div class="px-4 space-y-6 w-208">
    <div v-if="projectID != DEFAULT_PROJECT_ID" class="textlabel">
      <div v-if="state.transferSource == 'DEFAULT'" class="textinfolabel mb-2">
        Bytebase periodically syncs the instance schema. Newly synced databases
        are first placed in this default project.
      </div>
      <div class="radio-set-row">
        <div class="flex flex-row">
          <div class="radio">
            <input
              tabindex="-1"
              type="radio"
              class="btn"
              value="DEFAULT"
              v-model="state.transferSource"
            />
            <label class="label"> From Default project </label>
          </div>
        </div>
        <div class="radio">
          <input
            tabindex="-1"
            type="radio"
            class="btn"
            value="OTHER"
            v-model="state.transferSource"
          />
          <label class="label"> From other projects </label>
        </div>
      </div>
    </div>

    <DatabaseTable
      :mode="'ALL_SHORT'"
      :bordered="true"
      :customClick="true"
      :databaseList="databaseList"
      @select-database="selectDatabase"
    />

    <!-- Update button group -->
    <div class="pt-4 border-t border-block-border flex justify-end">
      <button
        type="button"
        class="btn-normal py-2 px-4"
        @click.prevent="cancel"
      >
        Cancel
      </button>
    </div>

    <BBAlert
      v-if="state.showModal"
      :style="'INFO'"
      :okText="'Transfer'"
      :title="`Are you sure to transfer '${selectedDatabaseName}' into our project?`"
      @ok="
        () => {
          state.showModal = false;
          transferDatabase();
        }
      "
      @cancel="state.showModal = false"
    >
    </BBAlert>
  </div>
</template>

<script lang="ts">
import { computed, PropType, reactive, watchEffect } from "vue";
import { useStore } from "vuex";
import { cloneDeep } from "lodash";
import DatabaseTable from "../components/DatabaseTable.vue";
import { Database, ProjectID, DEFAULT_PROJECT_ID } from "../types";
import { sortDatabaseList } from "../utils";

type TransferSource = "DEFAULT" | "OTHER";

interface LocalState {
  selectedDatabase?: Database;
  transferSource: TransferSource;
  showModal: boolean;
}

export default {
  name: "TransferDatabaseForm",
  emits: ["submit", "dismiss"],
  props: {
    projectID: {
      required: true,
      type: Number as PropType<ProjectID>,
    },
  },
  components: {
    DatabaseTable,
  },
  setup(props, { emit }) {
    const store = useStore();

    const state = reactive<LocalState>({
      transferSource:
        props.projectID == DEFAULT_PROJECT_ID ? "OTHER" : "DEFAULT",
      showModal: false,
    });

    const currentUser = computed(() => store.getters["auth/currentUser"]());

    const prepareDatabaseListForDefaultProject = () => {
      store.dispatch(
        "database/fetchDatabaseListByProjectID",
        DEFAULT_PROJECT_ID
      );
    };

    watchEffect(prepareDatabaseListForDefaultProject);

    const environmentList = computed(() => {
      return store.getters["environment/environmentList"](["NORMAL"]);
    });

    const databaseList = computed(() => {
      var list;
      if (state.transferSource == "DEFAULT") {
        list = cloneDeep(
          store.getters["database/databaseListByProjectID"](DEFAULT_PROJECT_ID)
        );
      } else {
        list = cloneDeep(
          store.getters["database/databaseListByPrincipalID"](
            currentUser.value.id
          )
        ).filter((item: Database) => item.project.id != props.projectID);
      }

      return sortDatabaseList(list, environmentList.value);
    });

    const selectedDatabaseName = computed(() => {
      return state.selectedDatabase?.name;
    });

    const selectDatabase = (database: Database) => {
      state.selectedDatabase = database;
      state.showModal = true;
    };

    const transferDatabase = () => {
      store
        .dispatch("database/transferProject", {
          databaseID: state.selectedDatabase!.id,
          projectID: props.projectID,
        })
        .then((updatedDatabase) => {
          store.dispatch("notification/pushNotification", {
            module: "bytebase",
            style: "SUCCESS",
            title: `Successfully transferred '${updatedDatabase.name}' to project '${updatedDatabase.project.name}'.`,
          });
          emit("dismiss");
        });
    };

    const cancel = () => {
      emit("dismiss");
    };

    return {
      DEFAULT_PROJECT_ID,
      state,
      databaseList,
      selectedDatabaseName,
      selectDatabase,
      transferDatabase,
      cancel,
    };
  },
};
</script>
