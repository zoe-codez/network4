import { ARRAY_OFFSET, FIRST, is, TServiceParams } from "@digital-alchemy/core";
import dayjs from "dayjs";
import OpenAI from "openai";

import { PANDO_GENERATE_OPENAI_MESSAGE, WttrWeather } from "../helpers";

// my in the list, no particular order:
// - harley quinn
// - like i'm getting high
// - dnd
// - unwitting cover up
// - monarch
// - futurama mom

const SLEEP_PROMPT = `Create a list of 10 short sentences urging me to go to bed. These should start out as simple reminders, and become progressively more ominous, as if there are unknown consequences from fictional creatures for staying up.`;
const WAKE_UP_PROMPT = `You are a home automation system. Create a list of 4 messages urging me to get out of bed. The 3rd message should imply consequences like a mad scientist, the last message should declare that the threat has been fulfilled`;
const GO_TO_BED_CACHE = "GO_TO_BED_CACHE";
const WAKE_UP_MESSAGE_CACHE = "WAKE_UP_MESSAGE_CACHE";
const ICE_MAKER_MESSAGE = `You are a home automation system. Create an exciting message to notify me that the request to have the ice maker create ice has been completed. 3 sentences or less, no emoji`;
const WORK_MESSAGE = hint =>
  `You are a home automation system. A pomodoro timer just completed for working on ${hint}, but I may not be complete. Create an entertaining short sentence to alert me to the completed timer. Don't use the word pomodoro or emoji`;
const DEFAULT_WORK_THING = "something at my desk";
const COUNTDOWN_MESSAGE = hint =>
  `You are a home automation system. A countdown timer just completed ${
    is.empty(hint) ? "" : "for" + hint
  }. Create an entertaining short sentence to alert me to the completed timer. Don't use emoji`;

const BUILD_MORNING_REPORT = ({
  calendar,
  chores,
  tasks,
  weather,
}: {
  calendar?: string;
  chores: string;
  tasks?: string;
  weather: WttrWeather;
}) => {
  const targetDate = dayjs();
  const now = targetDate.format("YYYY-MM-DD");
  const todayWeather = weather.weather.find(i => i.date === now);
  // const dogActivity = is.random([
  //   "at the park in North Austin Texas (suggest one)",
  //   "on a hike in the Austin Texas area (recommend somewhere)",
  //   "at yard bar (recommend getting a cider or sour beer, you pick one)",
  // ]);
  const tone = is.random([
    "like Dexter from Dexter's Lab",
    "with a sarcastic tone",
    "with a flippant tone",
    "with a scolding tone",
    "with a seductive tone",
    "with an encouraging tone",
    "like staying in bed is extra tempting today",
    "like you're colluding with the dog to get it extra treats. Mention it twice, and create a new chore at the end of the list that is a thinly veiled excuse for treats.",
    "with an energetic tone",
    "like this is the day a prophecy told of in ancient times by evil gods",
    "like this is part of your master plan",
    "like glados from portal 2. Be over the top, refer to things as tests, and strongly imply (with delight) that I might die during one of my appointments or chores",
    "like the monarch from venture brothers",
    "like korra from the last airbender",
    "like a great evil demon, who cannot believe he's been forced to perform such a demeaning role",
    "like a stoner who doesn't seem totally reliable",
    "like you aren't confident in my ability to get everything done, and aren't afraid to repeatedly imply it",
    "like a flamboyant gay person stereotype",
    // "like someone posting on reddit egg_irl",
    "like you're the dm of a dnd campaign, and this is the epic quest",
    "like I'm unwittingly helping with a cover up by performing the actions of the day",
    "like an alien who has intercepted this communication, and is having a hard time relating to the contents",
    "like I am a queen who is being quickly briefed on my day the moment I woke up",
    "like I might shoot the messenger today",
    // "like 2 warring personalities, fighting for control. Include a minor struggle at a random point",
    "like this is an automatically generated communication on a science fiction outpost",
    "like you are the terrified squeaky toy the dogs were just fighting over, reanimated and escaped to deliver the morning report",
    "like vasher from stormlight archives",
    "like you are trying to hypnotize me into doing things today",
    "like Harley Quinn, pretending that I'm Ivy",
    "like you are trying to scam me but are really bad at it, and these are the actions I need to take",
    "like mom from futurama",
  ]);

  const forecast = todayWeather.hourly.map(
    ({ weatherDesc, tempF }) => `- ${weatherDesc[0].value} ${tempF}*F`,
  );

  const choreEntries = is.empty(chores)
    ? [`I have no chores scheduled for today`]
    : [
        [
          `As an unsorted list, I have the following chores to do, in the format of "name :: description"`,
          `In your own words, use the name & description to generate 1-2 sentences describing each chore as a new list`,
          `Tell a short anecdote related to a random chore before printing the list`,
        ].join(". "),
        chores,
      ];

  const taskEntries = is.empty(tasks)
    ? [`I have no tasks scheduled for today`]
    : [
        [
          `I have the following tasks to do, in the format of "name :: description"`,
          `If the task is overdue, scold me`,
        ].join(". "),
        tasks,
      ];

  const calendarEntries = is.empty(calendar)
    ? [`I have nothing on my calendar`]
    : [
        [
          `I have the following items on my calendar, in the format of "name :: description :: start :: end :: location :: departure time"`,
          `Create a paragraph relating a fictional event related to one of the events on my calendar. Then list the events on the calendar`,
          `If there is a departure time listed, make sure to include it, but use a casual / imprecise tone (for example: quarter until 10)`,
          `Only list location names, not addresses or zip codes`,
          `Add a relevant upbeat message to each, 2 setences or less`,
          `Do not list end times`,
        ].join(". "),
        calendar,
      ];

  const describeLong =
    ". Provide a name/title, and up to 8 sentences of description";
  const describeShort =
    ". Provide a name/title, and up to 8 sentences of description";
  const flair = is.random([
    "Add an interesting thing I can make for lunch involving a bagel" +
      describeLong,
    "Add an interesting thing I can make for lunch involving a potato" +
      describeLong,
    "Add an interesting thing I can make for dinner involving rice" +
      describeLong,
    "Add an interesting thing I can make with my cast iron pan" + describeShort,
    "Describe an outfit I can wear if I want to present as a queer girl, include earrings",
    "Recommend an stew recipe" + describeLong,
    "Add an advanced dog trick I can teach my dog" + describeShort,
    "Add a dirty limiric",
    "Recommend an activity for a fun date for the Austin Texas area",
    "Recommend an activity for a romantic date for the Austin Texas area",
    "Add an interesting paragraph about a person or event from transgender history",
    "Add an interesting paragraph about a person or event from lesbian history",
    "Add an interesting paragraph about a person or event from lgbt history",
    "Add an interesting paragraph about a person or event from computer history",
    "Add an interesting paragraph about a person or event from cooking history",
    "I have a RGB matrix sign powered by a raspberry pi, add a paragaph about something interesting I can display",
    "Add an interesting paragraph about a person, item, or event from / related to stoner culture / history",
    "Pick a random calendar event, task, or chore; then tell a crazy tale from your childhood involving something similar. 2 paragraphs or less, must be placed at end of all other text",
  ]);
  const extras = tone.includes("like")
    ? [
        `Be over the top with the personality, add 2 comments to the message which are not related to rest the content. As if you got distracted.`,
      ]
    : [];

  // const format = is.random([
  //   "spoken",
  //   "hand written",
  //   "email",
  //   "several text messages back to back, separated by 5 dashes",
  // ]);

  return {
    flair,
    text: [
      [
        `Address me as Zoe (she/they) as relevant`,
        `Build a short message to tell me about my day, to be sent when I wake up`,
      ].join(". "),
      `I will provide a tone/personality to use, then details about my day, finally instructions about how to generate the message`,
      `Act like you have have ownership over the organization of my day`,
      ``,
      `# Tone / personality`,
      `All text generation should be spoken ${tone}`,
      ...extras,
      ``,
      `# Today`,
      `- Date ${targetDate.format("dddd YYYY-MM-DD")}`,
      ``,
      `Forecast`,
      ...forecast,
      `Sunset is at: ${todayWeather.astronomy[0].sunset}`,
      ``,
      ...choreEntries,
      ``,
      ...taskEntries,
      ``,
      ...calendarEntries,
      ``,
      `# Instructions`,
      tone.includes("like")
        ? `Create a paragraph of extra text for flair as a character introduction for yourself.`
        : "Act like a small robot serving the great home automation system, and introduce yourself.",
      `Next summarize the weather in 2 sentences or less. Don't mention weather anywhere else, or explicitly say you are summarizing it.`,
      `If the temperature is below 80, add a casual mention of airing out the house somewhere else relevant in the message.`,
      ``,
      `Output chores, tasks, and calendar entries sorted in a logical way`,
      flair,
    ].join(`\n`),
    tone,
  };
};

export function OpenAIExtension({
  cache,
  scheduler,
  logger,
  config,
  lifecycle,
}: TServiceParams) {
  let openAi: OpenAI;
  // @Cron(CronExpression.EVERY_DAY_AT_5PM)
  async function getGoToBedLines(): Promise<void> {
    logger.info(`Retrieving go to bed lines`);
    const lines = await buildLineArray(SLEEP_PROMPT, "getGoToBedLines");
    out.goToBed = lines;
    logger.debug({ lines }, `Received go to bed response`);
    await cache.set(GO_TO_BED_CACHE, lines);
  }

  // @Cron(CronExpression.EVERY_DAY_AT_4AM)
  async function getWakeUpLines(): Promise<void> {
    logger.info(`Retrieving wake up lines`);
    const lines = await buildLineArray(WAKE_UP_PROMPT, "getWakeUpLines");
    out.goToBed = lines;
    logger.debug({ lines }, `Received wake up response`);
    await cache.set(WAKE_UP_MESSAGE_CACHE, lines);
  }

  lifecycle.onPostConfig(() => {
    openAi = new OpenAI({
      apiKey: config.pando.OPENAI_API_KEY,
    });
  });

  lifecycle.onBootstrap(async () => {
    let lines = await cache.get<string[]>(GO_TO_BED_CACHE, []);
    if (is.empty(lines)) {
      setImmediate(async () => await getGoToBedLines());
    } else {
      out.goToBed = lines;
    }
    lines = await cache.get<string[]>(WAKE_UP_MESSAGE_CACHE, []);
    if (is.empty(lines)) {
      setImmediate(async () => await getWakeUpLines());
    } else {
      out.wakeUp = lines;
    }
  });

  async function buildLineArray(
    content: string,
    message_type: string,
  ): Promise<string[]> {
    try {
      const text = await buildText(content, message_type);
      return text
        .split("\n")
        .map(line => line.slice(line.indexOf(" ") + ARRAY_OFFSET))
        .filter(line => !is.empty(line));
    } catch (error) {
      logger.error({ error });
      return [];
    }
  }

  async function buildText(
    content: string,
    message_type: string,
  ): Promise<string> {
    PANDO_GENERATE_OPENAI_MESSAGE.labels(message_type).setToCurrentTime();
    const chatCompletion = await openAi.chat.completions.create({
      messages: [{ content, role: "user" }],
      model: "gpt-3.5-turbo",
    });
    return chatCompletion.choices[FIRST].message.content;
  }

  const out = {
    async getCountdownTimerCompletionMessage(hint: string): Promise<string> {
      return await buildText(
        COUNTDOWN_MESSAGE(hint),
        "getCountdownTimerCompletionMessage",
      );
    },
    async getIceMakerCompletionMessage(): Promise<string> {
      return await buildText(ICE_MAKER_MESSAGE, "getIceMakerCompletionMessage");
    },

    async getMorningReport(
      chores: string,
      calendar: string,
      weather: WttrWeather,
    ): Promise<string> {
      const { text, ...extra } = BUILD_MORNING_REPORT({
        calendar,
        chores,
        weather,
      });
      logger.info({ text, ...extra }, "Building morning report");
      // return requestText;
      return await buildText(text, "getMorningReport");
    },

    async getWorkTimerCompletionMessage(
      hint: string = DEFAULT_WORK_THING,
    ): Promise<string> {
      return await buildText(
        WORK_MESSAGE(hint),
        "getWorkTimerCompletionMessage",
      );
    },

    goToBed: [] as string[],
    wakeUp: [] as string[],
  };
  return out;
}
