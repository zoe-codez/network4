export type SetChatTimer = {
  end?: string;
  msg: string;
  rid: string;
  tmid: string;
};

export type SendChatReply = {
  rid: string;
  text: string;
  tmid: string;
};
