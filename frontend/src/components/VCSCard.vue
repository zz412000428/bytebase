<template>
  <div
    class="divide-y divide-block-border border border-block-border rounded-sm"
  >
    <div class="flex py-2 px-4 justify-between">
      <div class="flex flex-row space-x-2 items-center">
        <template v-if="vcs.type.startsWith('GITLAB')">
          <img class="h-6 w-auto" src="../assets/gitlab-logo.svg" />
        </template>
        <h3 class="text-lg leading-6 font-medium text-main">
          {{ vcs.name }}
        </h3>
      </div>
      <button
        type="button"
        class="btn-normal py-2 px-4"
        @click.prevent="editVCS"
      >
        Edit
      </button>
    </div>
    <div class="border-t border-block-border">
      <dl class="divide-y divide-block-border">
        <div class="grid grid-cols-4 gap-4 px-4 py-2 items-center">
          <dt class="text-sm font-medium text-control-light">Instance URL</dt>
          <dd class="mt-1 flex text-sm text-main col-span-2">
            {{ vcs.instanceURL }}
          </dd>
        </div>
        <div class="grid grid-cols-4 gap-4 px-4 py-2 items-center">
          <dt class="text-sm font-medium text-control-light">Application ID</dt>
          <dd class="mt-1 flex text-sm text-main col-span-2">
            {{ vcs.applicationID }}
          </dd>
        </div>
        <div class="grid grid-cols-4 gap-4 px-4 py-2 items-center">
          <dt class="text-sm font-medium text-control-light">Created</dt>
          <dd class="mt-1 flex text-sm text-main col-span-2">
            {{ humanizeTs(vcs.createdTs) }}
          </dd>
        </div>
      </dl>
    </div>
  </div>
</template>

<script lang="ts">
import { reactive, PropType } from "vue";
import { useRouter } from "vue-router";
import { VCS, redirectURL } from "../types";
import { vcsSlug } from "../utils";

interface LocalState {}

export default {
  name: "VCSCard",
  components: {},
  props: {
    vcs: {
      required: true,
      type: Object as PropType<VCS>,
    },
  },
  setup(props, ctx) {
    const router = useRouter();

    const state = reactive<LocalState>({});

    const editVCS = () => {
      router.push({
        name: "setting.workspace.version-control.detail",
        params: {
          vcsSlug: vcsSlug(props.vcs),
        },
      });
    };

    return {
      state,
      redirectURL,
      editVCS,
    };
  },
};
</script>
