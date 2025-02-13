<template>
  <div class="space-y-4">
    <div class="space-y-2">
      <div
        v-for="(user, index) in state.userList"
        :key="index"
        class="flex justify-between py-0.5 select-none"
      >
        <p id="add_or_invite_members_helper" class="sr-only">
          Add or invite by email address
        </p>
        <div class="flex flex-row space-x-4">
          <div class="flex-grow">
            <input
              type="email"
              name="add_or_invite_members"
              autocomplete="off"
              class="w-36 sm:w-64 textfield lowercase"
              placeholder="foo@example.com"
              v-model="user.email"
              @blur="validateUser(user, index)"
              @input="clearValidationError(index)"
              aria-describedby="add_or_invite_members_helper"
            />
            <p
              v-if="state.errorList[index]"
              class="mt-2 text-sm text-error"
              id="email-error"
            >
              {{ state.errorList[index] }}
            </p>
          </div>
          <div v-if="hasAdminFeature" class="sm:hidden w-36">
            <RoleSelect
              :selectedRole="user.role"
              @change-role="
                (role) => {
                  user.role = role;
                }
              "
            />
          </div>
          <div
            v-if="hasAdminFeature"
            class="hidden sm:flex sm:flex-row space-x-4"
            :class="state.errorList[index] ? '-mt-7' : ''"
          >
            <div class="radio">
              <input
                :name="`add_or_invite_role${index}`"
                tabindex="-1"
                type="radio"
                class="btn"
                value="OWNER"
                v-model="user.role"
              />
              <label class="label"> Owner </label>
            </div>
            <div class="radio">
              <input
                :name="`add_or_invite_role${index}`"
                tabindex="-1"
                type="radio"
                class="btn"
                value="DBA"
                v-model="user.role"
              />
              <label class="label"> DBA </label>
            </div>
            <div class="radio">
              <input
                :name="`add_or_invite_role${index}`"
                tabindex="-1"
                type="radio"
                class="btn"
                value="DEVELOPER"
                v-model="user.role"
              />
              <label class="label"> Developer </label>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div class="flex justify-between">
      <span class="flex items-center">
        <button type="button" class="btn-secondary" @click.prevent="addUser">
          + Add More
        </button>
      </span>

      <button
        type="button"
        class="btn-primary"
        :disabled="!hasValidUserOnly()"
        @click.prevent="addOrInvite"
      >
        <svg
          v-if="isAdd"
          class="h-5 w-5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M12 6v6m0 0v6m0-6h6m-6 0H6"
          ></path>
        </svg>
        <svg
          v-else
          class="mr-2 h-5 w-5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
          ></path>
        </svg>
        {{ isAdd ? "Add" : "Send Invites" }}
      </button>
    </div>
  </div>
</template>

<script lang="ts">
import { computed, reactive } from "vue";
import { useStore } from "vuex";
import RoleSelect from "./RoleSelect.vue";
import {
  Principal,
  PrincipalCreate,
  MemberCreate,
  RoleType,
  UNKNOWN_ID,
} from "../types";
import { isOwner, isValidEmail } from "../utils";

type User = {
  email: string;
  role: RoleType;
};

interface LocalState {
  userList: User[];
  errorList: string[];
}

export default {
  name: "MemberAddOrInvite",
  components: { RoleSelect },
  props: {},
  setup(props, ctx) {
    const store = useStore();

    const currentUser = computed(() => store.getters["auth/currentUser"]());

    const isAdd = computed(() => {
      return isOwner(currentUser.value.role);
    });

    const hasAdminFeature = computed(() =>
      store.getters["plan/feature"]("bb.admin")
    );

    const state = reactive<LocalState>({
      userList: [],
      errorList: [],
    });

    for (let i = 0; i < 3; i++) {
      state.userList.push({
        email: "",
        role: "DEVELOPER",
      });
      state.errorList.push("");
    }

    const validateUserInternal = (user: User): string => {
      if (user.email) {
        if (!isValidEmail(user.email)) {
          return "Invalid email address";
        } else {
          const member = store.getters["member/memberByEmail"](user.email);
          if (member.id != UNKNOWN_ID) {
            return "Already a member";
          }
        }
      }
      return "";
    };

    const validateUser = (user: User, index: number): boolean => {
      state.errorList[index] = validateUserInternal(user);
      return state.errorList[index].length == 0;
    };

    const clearValidationError = (index: number) => {
      state.errorList[index] = "";
    };

    const addUser = () => {
      state.userList.push({
        email: "",
        role: "DEVELOPER",
      });
      state.errorList.push("");
    };

    const hasValidUserOnly = () => {
      let hasEmailInput = false;
      let hasError = false;
      state.userList.forEach((user) => {
        if (user.email) {
          hasEmailInput = true;
          if (validateUserInternal(user).length > 0) {
            hasError = true;
            return;
          }
        }
      });
      return !hasError && hasEmailInput;
    };

    const addOrInvite = () => {
      for (const user of state.userList) {
        if (isValidEmail(user.email)) {
          // Needs to assign to a local variable as user will change after createPrincipal but before createdMember
          let role = user.role;
          // If admin feature is NOT enabled, then we set every user to OWNER role.
          if (!hasAdminFeature.value) {
            role = "OWNER";
          }
          // Note "principal/createPrincipal" would return the existing principal.
          // This could happen if another client has just created the principal
          // with this email.
          const newPrincipal: PrincipalCreate = {
            name: user.email.split("@")[0],
            email: user.email,
          };
          store
            .dispatch("principal/createPrincipal", newPrincipal)
            .then((principal: Principal) => {
              const newMember: MemberCreate = {
                principalID: principal.id,
                status: isAdd.value ? "ACTIVE" : "INVITED",
                role,
              };
              // Note "principal/createdMember" would return the existing role mapping.
              // This could happen if another client has just created the role mapping with
              // this principal.
              store.dispatch("member/createdMember", newMember);
            });

          store.dispatch("uistate/saveIntroStateByKey", {
            key: "member.addOrInvite",
            newState: true,
          });
        }
      }
      state.userList.forEach((item) => {
        item.email = "";
        item.role = "DEVELOPER";
      });
      state.errorList = [""];
    };

    return {
      state,
      isAdd,
      hasAdminFeature,
      validateUser,
      clearValidationError,
      addUser,
      hasValidUserOnly,
      addOrInvite,
    };
  },
};
</script>
