import axios from "axios";
import {
  Member,
  MemberID,
  MemberCreate,
  MemberPatch,
  MemberState,
  ResourceObject,
  PrincipalID,
  unknown,
  empty,
  EMPTY_ID,
  Principal,
  RoleType,
} from "../../types";

function convert(
  member: ResourceObject,
  includedList: ResourceObject[],
  rootGetters: any
): Member {
  const principal = member.attributes.principal as Principal;
  principal.role = member.attributes.role as RoleType;

  return {
    ...(member.attributes as Omit<Member, "id" | "principal">),
    id: parseInt(member.id),
    principal,
  };
}

const state: () => MemberState = () => ({
  memberList: [],
});

const getters = {
  memberList: (state: MemberState) => (): Member[] => {
    return state.memberList;
  },

  memberByPrincipalID:
    (state: MemberState) =>
    (id: PrincipalID): Member => {
      if (id == EMPTY_ID) {
        return empty("MEMBER") as Member;
      }

      return (
        state.memberList.find((item) => item.principal.id == id) ||
        (unknown("MEMBER") as Member)
      );
    },

  memberByEmail:
    (state: MemberState) =>
    (email: string): Member => {
      return (
        state.memberList.find((item) => item.principal.email == email) ||
        (unknown("MEMBER") as Member)
      );
    },
};

const actions = {
  async fetchMemberList({ commit, rootGetters }: any) {
    const data = (await axios.get(`/api/member`)).data;
    const memberList = data.data.map((member: ResourceObject) => {
      return convert(member, data.included, rootGetters);
    });

    commit("setMemberList", memberList);
    return memberList;
  },

  // Returns existing member if the principalID has already been created.
  async createdMember({ commit, rootGetters }: any, newMember: MemberCreate) {
    const data = (
      await axios.post(`/api/member`, {
        data: {
          type: "MemberCreate",
          attributes: newMember,
        },
      })
    ).data;
    const createdMember = convert(data.data, data.included, rootGetters);

    commit("appendMember", createdMember);

    return createdMember;
  },

  async patchMember(
    { commit, rootGetters }: any,
    { id, memberPatch }: { id: MemberID; memberPatch: MemberPatch }
  ) {
    const data = (
      await axios.patch(`/api/member/${id}`, {
        data: {
          type: "memberPatch",
          attributes: memberPatch,
        },
      })
    ).data;
    const updatedMember = convert(data.data, data.included, rootGetters);

    commit("replaceMemberInList", updatedMember);

    return updatedMember;
  },

  async deleteMemberByID(
    { state, commit }: { state: MemberState; commit: any },
    id: MemberID
  ) {
    await axios.delete(`/api/member/${id}`);

    const newList = state.memberList.filter((item: Member) => {
      return item.id != id;
    });

    commit("setMemberList", newList);
  },
};

const mutations = {
  setMemberList(state: MemberState, memberList: Member[]) {
    state.memberList = memberList;
  },

  appendMember(state: MemberState, newMember: Member) {
    state.memberList.push(newMember);
  },

  replaceMemberInList(state: MemberState, updatedMember: Member) {
    const i = state.memberList.findIndex(
      (item: Member) => item.id == updatedMember.id
    );
    if (i != -1) {
      state.memberList[i] = updatedMember;
    }
  },
};

export default {
  namespaced: true,
  state,
  getters,
  actions,
  mutations,
};
