import {
  INCREMENT,
  InternalError,
  is,
  NONE,
  SINGLE,
  TServiceParams,
} from "@digital-alchemy/core";
import {
  CategoryFlags,
  PrismaClient,
  RecurPeriod,
  TimerFlags,
  ToDoCategory,
  TodoItems,
  TodoType,
} from "@prisma/client";
import dayjs, { Dayjs, ManipulateType, OpUnitType } from "dayjs";

const INJECTED_TASKS_CATEGORY_ID = 7;
const PAD_SIZE = 4;

export type InjectedTask = Pick<
  TodoItems,
  "title" | "description" | "title_short" | "next_duedate"
>;
const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const day = 24;
/* eslint-disable @typescript-eslint/no-magic-numbers */
const DAYSLIDE = new Map<number, number>([
  [0, 2], // S
  [1, 7], // M
  [2, 6], // T
  [3, 5], // W
  [4, 3], // T
  [5, 2], // F
  [6, 1], // S
]);
/* eslint-enable @typescript-eslint/no-magic-numbers */

export function Database({
  config,
  lifecycle,
  context,
  automation,
}: TServiceParams) {
  lifecycle.onPostConfig(() => {
    out.client = new PrismaClient({
      datasources: { db: { url: config.pando.PRISMA_URL } },
    });
  });

  const out = {
    async categoryCount(category: ToDoCategory | number): Promise<number> {
      category = is.object(category) ? category.id : category;
      return await out.client.todoItems.count({
        where: { active: true, category_id: category },
      });
    },

    client: undefined as PrismaClient,

    dueDatePrefix(due: Dayjs): string {
      const now = dayjs();
      const hours = now.diff(due, "hour");
      if (due.isBefore(now)) {
        if (hours >= day) {
          return `${Math.floor(hours / day)}D`.padEnd(PAD_SIZE, " ");
        }
        return `${hours}H`.padEnd(PAD_SIZE, " ");
      }
      return this.formatDate(due);
    },

    formatDate(date: Dayjs): string {
      const [midnight] = automation.time.refTime(["00"]);
      const d = date.toDate();
      if (
        date.isAfter(midnight.add(SINGLE, "day").subtract(SINGLE, "minute"))
      ) {
        return days[d.getDay()] + " ";
      }
      const out = date.format("hh:mmA");
      return out === "12:00AM" ? "" : out + " ";
    },

    async history(todo_id: number) {
      return await out.client.toDoHistory.findMany({
        where: { todo_id },
      });
    },

    async injectTask(data: InjectedTask): Promise<TodoItems> {
      return await out.client.todoItems.create({
        data: {
          ...data,
          active: true,
          category_id: INJECTED_TASKS_CATEGORY_ID,
          last_complete: dayjs().subtract(SINGLE, "day").toDate(),
          recur_interval: NONE,
          recur_period: RecurPeriod.NONE,
          type: TodoType.REQUIRED,
        },
      });
    },

    async listAllTodo(): Promise<TodoItems[]> {
      return await out.client.todoItems.findMany({
        where: {
          Category: { active: true },
          active: true,
        },
      });
    },

    async listWithFlag(flags: TimerFlags): Promise<TodoItems[]> {
      return await out.client.todoItems.findMany({
        where: {
          Category: { active: true },
          active: true,
          flags: { has: flags },
        },
      });
    },

    /**
     * It's fine if this doesn't get done today, but it's still a priority
     *
     * ## Logic v1
     * Just move it to tomorrow
     *
     * ## Enhancement ideas
     *
     * - do touch if that's more reasonable
     * - smarter punt sizes
     */
    async punt({
      next_duedate,
      punt_counter,
      id,
    }: TodoItems): Promise<TodoItems> {
      return await out.client.todoItems.update({
        data: {
          next_duedate: dayjs(next_duedate).add(SINGLE, "day").toDate(),
          punt_counter: punt_counter + INCREMENT,
        },
        where: { id },
      });
    },

    /**
     * Update the todo to consider the current task done
     *
     * ## No recur
     *
     * Deactivate
     *
     * ## Casual / required
     *
     * Move due date out relative to current due date
     *
     * ## Sliding
     *
     * Move due date out relative to right now
     */
    async touch({
      recur_interval,
      recur_period,
      type,
      id,
      next_duedate,
    }: TodoItems): Promise<TodoItems> {
      const data = { last_complete: new Date() } as Partial<TodoItems>;

      if (recur_period === "NONE") {
        data.active = false;
      } else if (["CASUAL", "REQUIRED"].includes(type)) {
        const diff = Math.floor(
          dayjs().diff(next_duedate, recur_period.toLowerCase() as OpUnitType),
        );
        data.next_duedate = dayjs(next_duedate)
          .add(
            diff + recur_interval,
            recur_period.toLowerCase() as ManipulateType,
          )
          .toDate();
      } else if (type === "SLIDING") {
        data.next_duedate = dayjs()
          .add(recur_interval, recur_period.toLowerCase() as ManipulateType)
          .toDate();
      } else {
        throw new InternalError(
          context,
          "BAD_TYPE",
          `${type} isn't a valid type`,
        );
      }
      await out.client.toDoHistory.create({
        data: {
          completed: new Date(),
          duedate: next_duedate,
          todo_id: id,
        },
      });
      return await out.client.todoItems.update({
        data,
        where: { id },
      });
    },

    async upcomingTodo() {
      const [midnight] = automation.time.refTime(["00:00"]);
      return await out.client.todoItems.findMany({
        include: { Category: true },
        where: {
          Category: {
            active: true,
            flags: { has: CategoryFlags.MATRIX_DISPLAY },
          },
          active: true,
          next_duedate: {
            lt: midnight.add(DAYSLIDE.get(new Date().getDay()), "day").toDate(),
          },
        },
      });
    },
  };
  return out;
}
