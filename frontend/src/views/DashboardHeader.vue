<template>
  <div class="flex items-center justify-between h-16">
    <div class="flex items-center">
      <div class="flex-shrink-0 w-44">
        <router-link
          to="/"
          class="select-none"
          active-class=""
          exact-active-class=""
          ><img class="h-12 w-auto" src="../assets/logo-full.svg" alt="Bytebase"
        /></router-link>
      </div>
      <div class="hidden sm:block">
        <div class="ml-6 flex items-baseline space-x-1">
          <router-link to="/project" class="bar-link px-2 py-2 rounded-md"
            >Projects</router-link
          >

          <router-link to="/db" class="bar-link px-2 py-2 rounded-md"
            >Databases</router-link
          >

          <router-link
            v-if="showDBAItem"
            to="/instance"
            class="bar-link px-2 py-2 rounded-md"
            >Instances</router-link
          >

          <router-link to="/environment" class="bar-link px-2 py-2 rounded-md"
            >Environments</router-link
          >
          <router-link
            to="/setting/general"
            class="bar-link px-2 py-2 rounded-md"
            >Settings</router-link
          >
        </div>
      </div>
    </div>
    <div>
      <div class="flex items-center space-x-3">
        <div
          v-if="showSwitchPlan"
          class="
            hidden
            md:flex
            sm:flex-row
            items-center
            space-x-2
            text-sm
            font-medium
          "
        >
          <span class="hidden lg:block font-normal text-accent">Plan</span>
          <div
            v-if="currentPlan != 0"
            class="bar-link"
            @click.prevent="switchToFree"
          >
            Free
          </div>
          <div v-else class="underline">Free</div>
          <div
            v-if="currentPlan != 1"
            class="bar-link"
            @click.prevent="switchToTeam"
          >
            Team
          </div>
          <div v-else class="underline">Team</div>
          <!-- <div
            v-if="currentPlan != 2"
            class="bar-link"
            @click.prevent="switchToEnterprise"
          >
            Enterprise
          </div>
          <div v-else class="underline">Enterprise</div> -->
        </div>
        <div
          v-if="!isRelease"
          class="
            hidden
            md:flex
            sm:flex-row
            items-center
            space-x-2
            text-sm
            font-medium
          "
        >
          <span class="hidden lg:block font-normal text-accent">Role</span>
          <div
            v-if="currentUser.role != 'OWNER'"
            class="bar-link"
            @click.prevent="switchToOwner"
          >
            Owner
          </div>
          <div v-else class="underline">Owner</div>
          <div
            v-if="currentUser.role != 'DBA'"
            class="bar-link"
            @click.prevent="switchToDBA"
          >
            DBA
          </div>
          <div v-else class="underline">DBA</div>
          <div
            v-if="currentUser.role != 'DEVELOPER'"
            class="bar-link"
            @click.prevent="switchToDeveloper"
          >
            Developer
          </div>
          <div v-else class="underline">Developer</div>
        </div>
        <router-link to="/inbox" exact-active-class="">
          <span
            v-if="inboxSummary.hasUnread"
            class="
              absolute
              rounded-full
              ml-4
              -mt-1
              h-2.5
              w-2.5
              bg-accent
              opacity-75
            "
          ></span>
          <svg
            class="w-6 h-6"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
            ></path>
          </svg>
        </router-link>
        <div class="ml-2">
          <ProfileDropdown />
        </div>
        <div class="ml-2 -mr-2 flex sm:hidden">
          <!-- Mobile menu button -->
          <button
            @click.prevent="state.showMobileMenu = !state.showMobileMenu"
            class="icon-link inline-flex items-center justify-center rounded-md"
          >
            <span class="sr-only">Open main menu</span>
            <!--
              Heroicon name: menu

              Menu open: "hidden", Menu closed: "block"
            -->
            <svg
              class="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z"
              ></path>
            </svg>
          </button>
        </div>
      </div>
    </div>
  </div>

  <!--
      Mobile menu, toggle classes based on menu state.

      Open: "block", closed: "hidden"
    -->
  <div v-if="state.showMobileMenu" class="block md:hidden">
    <router-link to="/project" class="bar-link rounded-md block px-3 py-2"
      >Projects</router-link
    >

    <router-link to="/db" class="bar-link rounded-md block px-3 py-2"
      >Databases</router-link
    >

    <router-link
      v-if="showDBAItem"
      to="/instance"
      class="bar-link rounded-md block px-3 py-2"
      >Instances</router-link
    >

    <router-link to="/environment" class="bar-link rounded-md block px-3 py-2"
      >Environments</router-link
    >

    <router-link
      to="/setting/general"
      class="bar-link rounded-md block px-3 py-2"
      >Settings</router-link
    >
  </div>
</template>

<script lang="ts">
import { computed, reactive, watchEffect } from "vue";
import { useStore } from "vuex";
import ProfileDropdown from "../components/ProfileDropdown.vue";
import { InboxSummary, PlanType, UNKNOWN_ID } from "../types";
import { isDBAOrOwner, isDev, isOwner } from "../utils";

interface LocalState {
  showMobileMenu: boolean;
}

export default {
  name: "DashboardHeader",
  components: { ProfileDropdown },
  setup(props, ctx) {
    const store = useStore();

    const state = reactive<LocalState>({
      showMobileMenu: false,
    });

    const currentUser = computed(() => store.getters["auth/currentUser"]());

    const currentPlan = computed(() => store.getters["plan/currentPlan"]());

    const showDBAItem = computed((): boolean => {
      return (
        !store.getters["plan/feature"]("bb.dba-workflow") ||
        isDBAOrOwner(currentUser.value.role)
      );
    });

    const showSwitchPlan = computed((): boolean => {
      return isDev();
    });

    const prepareInboxSummary = () => {
      // It will also be called when user logout
      if (currentUser.value.id != UNKNOWN_ID) {
        store.dispatch("inbox/fetchInboxSummaryByUser", currentUser.value.id);
      }
    };

    watchEffect(prepareInboxSummary);

    const inboxSummary = computed((): InboxSummary => {
      return store.getters["inbox/inboxSummaryByUser"](currentUser.value.id);
    });

    const switchToOwner = () => {
      store.dispatch("auth/login", {
        email: "demo@example.com",
        password: "1024",
      });
    };

    const switchToDBA = () => {
      store.dispatch("auth/login", {
        email: "jerry@example.com",
        password: "2048",
      });
    };

    const switchToDeveloper = () => {
      store.dispatch("auth/login", {
        email: "tom@example.com",
        password: "4096",
      });
    };

    const switchToFree = () => {
      store.dispatch("plan/changePlan", PlanType.FREE);
    };

    const switchToTeam = () => {
      store.dispatch("plan/changePlan", PlanType.TEAM);
    };

    const switchToEnterprise = () => {
      store.dispatch("plan/changePlan", PlanType.ENTERPRISE);
    };

    return {
      state,
      currentUser,
      currentPlan,
      showDBAItem,
      showSwitchPlan,
      inboxSummary,
      switchToOwner,
      switchToDBA,
      switchToDeveloper,
      switchToFree,
      switchToTeam,
      switchToEnterprise,
    };
  },
};
</script>
