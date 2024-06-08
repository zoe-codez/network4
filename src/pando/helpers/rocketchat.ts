export type RocketChatUrl = {
  ignoreParse: boolean;
  meta: object;
  url: string;
};

type PlainText = { type: "PLAIN_TEXT"; value: string };
type Link = {
  type: "LINK";
  value: {
    label: [PlainText];
    src: PlainText;
  };
};
type ParagraphTypes = PlainText | Link;
type Paragraph = { type: "PARAGRAPH"; value: ParagraphTypes[] };

type ChatMdSubTypes = Paragraph;

export type RocketChatMD = {
  type: string;
  value: ChatMdSubTypes[];
};

export type RocketChatMessageUser = {
  _i: string;
  name: string;
  username: string;
};

type RocketChatMessageAttachment = {
  attachments: RocketChatMessageAttachment[];
  author_avatar: string;
  author_name: string;
  md: RocketChatMD[];
  message_link: string;
  text: string;
  ts: Date;
};

export type RocketChatMessage = {
  _id: string;
  _updatedAt: Date;
  attachments?: RocketChatMessageAttachment[];
  md: RocketChatMD[];
  mentions: [];
  msg: string;
  replies?: string[];
  rid: string;
  tconnt?: number;
  tlm?: Date;
  ts: Date;
  u: RocketChatMessageUser;
  urls: RocketChatUrl[];
};
