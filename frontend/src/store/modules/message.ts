import axios from "axios";
import {
  UserId,
  MessageId,
  Message,
  MessageNew,
  MessageState,
  ResourceObject,
  MessageStatus,
} from "../../types";

function convert(message: ResourceObject, rootGetters: any): Message {
  const creator = rootGetters["principal/principalById"](
    message.attributes.creatorId
  );
  const receiver = rootGetters["principal/principalById"](
    message.attributes.receiverId
  );
  return {
    id: message.id,
    creator,
    receiver,
    ...(message.attributes as Omit<Message, "id" | "creator" | "receiver">),
  };
}

const state: () => MessageState = () => ({
  messageListByUser: new Map(),
});

const getters = {
  messageListByUser: (state: MessageState) => (userId: UserId): Message[] => {
    return state.messageListByUser.get(userId) || [];
  },
};

const actions = {
  async fetchMessageListByUser({ commit, rootGetters }: any, userId: UserId) {
    const messageList = (
      await axios.get(`/api/message?user=${userId}`)
    ).data.data.map((message: ResourceObject) => {
      return convert(message, rootGetters);
    });

    commit("setMessageListByUser", { userId, messageList });
    return messageList;
  },

  async updateStatus(
    { commit, rootGetters }: any,
    {
      messageId,
      updatedStatus,
    }: { messageId: MessageId; updatedStatus: MessageStatus }
  ) {
    const updatedMessage = convert(
      (
        await axios.patch(`/api/message/${messageId}`, {
          data: {
            type: "messagepatch",
            attributes: {
              status: updatedStatus,
            },
          },
        })
      ).data.data,
      rootGetters
    );

    commit("updateMessageById", { messageId, message: updatedMessage });

    return updatedMessage;
  },
};

const mutations = {
  setMessageListByUser(
    state: MessageState,
    {
      userId,
      messageList,
    }: {
      userId: UserId;
      messageList: Message[];
    }
  ) {
    state.messageListByUser.set(userId, messageList);
  },

  updateMessageById(
    state: MessageState,
    {
      messageId,
      message,
    }: {
      messageId: MessageId;
      message: Message;
    }
  ) {
    for (let [_, messageList] of state.messageListByUser) {
      const i = messageList.findIndex((item: Message) => item.id == messageId);
      if (i >= 0) {
        messageList[i] = message;
      }
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