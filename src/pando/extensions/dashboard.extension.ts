import {
  DOWN,
  HALF,
  is,
  SCHEDULE_EXECUTION_TIME,
  SINGLE,
  TServiceParams,
  UP,
} from "@digital-alchemy/core";
import {
  ClockWidgetDTO,
  Colors,
  CountdownWidgetDTO,
  GenericWidgetDTO,
  TextWidgetDTO,
} from "@digital-alchemy/matrix-rendering";
import dayjs, { Dayjs } from "dayjs";

import { SET_MATRIX_WIDGETS } from "../../core/helpers";
import { PANDO_MATRIX_RENDER_OUTCOME } from "../helpers";

/* eslint-disable @typescript-eslint/no-magic-numbers */
const DAYSLIDE = new Map<number, number>([
  [0, 2], // S
  [1, 4], // M
  [2, 4], // T
  [3, 3], // W
  [4, 3], // T
  [5, 2], // F
  [6, 1], // S
]);
/* eslint-enable @typescript-eslint/no-magic-numbers */

function whiteSpaceChunks(inputString: string, chunkSize = 30) {
  const chunks = [];
  let start = 0;
  let end = chunkSize;

  while (start < inputString.length) {
    const chunk = inputString.slice(start, end);
    const lastSpaceIndex = chunk.lastIndexOf(" ");

    if (lastSpaceIndex >= chunkSize - 5) {
      end = start + lastSpaceIndex + 1;
    }

    chunks.push(inputString.slice(start, end).trim());
    start = end;
    end = start + chunkSize;
  }

  return chunks;
}

const FRIDAY = 5;

export function Dashboard({
  logger,
  hass,
  pando,
  automation,
  matrix_rendering,
  grocy,
  mqtt,
  network4,
}: TServiceParams) {
  const officeCurrent = hass.entity.byId("select.office_current_scene");
  const weather = hass.entity.byId("weather.forecast_home");
  const climateUpstairs = hass.entity.byId("climate.ecobee_upstairs");
  const { backupState } = pando.entities;
  const temperatureUpstairs = hass.entity.byId("sensor.ecobee_upstairs_temperature");
  const currentLightTemp = hass.entity.byId("sensor.light_temperature");
  const nextEvent = () => {
    // const calc = automation.solar.getCalcSync();
    const now = dayjs();
    const entry =
      ["dawn", "dusk", "solarNoon", "sunrise", "sunset"]
        .sort((a, b) => (dayjs(automation.solar[a]).isAfter(automation.solar[b]) ? UP : DOWN))
        .find(i => now.isBefore(automation.solar[i])) ?? "";
    if (!entry) {
      return undefined;
    }
    return {
      event: entry,
      time: dayjs(automation.solar[entry]).format("hh:mm"),
    };
  };
  // const network3Backups = hass.entity.byId("sensor.network3_backups");
  const isPastSolarNoon = () => dayjs().isAfter(automation.solar.solarNoon);
  const isAfternoon = () => {
    if (!automation.solar.isBetween("solarNoon", "dusk")) {
      return false;
    }
    return automation.time.isBefore("PM5");
  };
  const isDay = () => automation.solar.isBetween("dawn", "dusk");
  const megaMatrix = hass.entity.byId("switch.mega_matrix");
  const windowOpen = hass.entity.byId("switch.windows_open");
  const tentMode = hass.entity.byId("select.tent_mode");

  let cleared = false;
  const inject: GenericWidgetDTO[] = [];
  let working = false;

  async function render(): Promise<void> {
    const end = SCHEDULE_EXECUTION_TIME.startTimer();
    if (pando.entities.pauseMatrixUpdates.is_on) {
      logger.debug(`Matrix updates disabled`);
      PANDO_MATRIX_RENDER_OUTCOME.labels("disabled").inc();
      return;
    }
    if (working) {
      PANDO_MATRIX_RENDER_OUTCOME.labels("working").inc();
      return;
    }
    if (megaMatrix.state === "off") {
      if (cleared === false) {
        cleared = true;
        mqtt.publish(SET_MATRIX_WIDGETS, JSON.stringify([]));
        end();
      }
      PANDO_MATRIX_RENDER_OUTCOME.labels("off").inc();
      return;
    }
    if (cleared) {
      cleared = false;
    }
    working = true;
    matrix_rendering.text.reset();
    let brightness = isAfternoon() ? 70 : 50;
    if (!automation.time.isBetween("PM10", "AM5")) {
      brightness = 25;
    }
    brightness = officeCurrent.state === "off" ? 10 : brightness;

    const notifications = await persistentNotification(brightness);
    await upcomingTodo(brightness);
    await upcomingBattery(brightness);
    await upcomingTasks(brightness);
    await upcomingCalendar(brightness);
    await network4.matrix.setWidgets([
      ...notifications,
      ...backup(brightness),
      ...tentDebugger(brightness),
      {
        brightness,
        font: "8x13",
        format: "hh:mm:ss",
        horizontal: "right",
        type: "clock",
        y: -1,
      } as ClockWidgetDTO,
      {
        brightness,
        font: "tom-thumb",
        format: "MM/DD",
        horizontal: "left",
        type: "clock",
        x: 64 * 8 + 1,
        y: 26,
      } as ClockWidgetDTO,
      {
        brightness,
        font: "tom-thumb",
        format: "ddd",
        horizontal: "left",
        type: "clock",
        x: 64 * 8 + 1,
        y: 20,
      } as ClockWidgetDTO,
      ...temperatureInformation(brightness),
      ...matrix_rendering.text
        .render({
          brightness,
          lineHeight: 2,
          x: 64 * 2 + 1,
        })
        .slice(0, 24),
      ...timerInformation(brightness),
      ...solarInformation(brightness),
      ...inject,
    ] as GenericWidgetDTO[]);
    working = false;
    PANDO_MATRIX_RENDER_OUTCOME.labels("success").inc();
    end();
  }

  function backup(brightness: number) {
    if (is.empty(String(backupState.state)) || backupState.state === "Idle") {
      return [];
    }
    const out = [];
    const last = pando.backup.backupState.last_message;
    if (!is.empty(last)) {
      if (String(backupState.state).startsWith("Backup")) {
        out.push(
          {
            brightness,
            color: Colors.Cyan,
            font: "5x8",
            text: backupState.state,
            type: "text",
            x: 1,
          } as TextWidgetDTO,
          {
            brightness,
            color: Colors.Cyan,
            font: "5x8",
            text: "Orig  " + pando.backup.backupState.original,
            type: "text",
            x: 1,
            y: 8,
          } as TextWidgetDTO,
          {
            brightness,
            color: Colors.Cyan,
            font: "5x8",
            text: "Comp  " + pando.backup.backupState.compressed,
            type: "text",
            x: 1,
            y: 16,
          } as TextWidgetDTO,
          {
            brightness,
            color: Colors.Cyan,
            font: "5x8",
            text: "Dedup " + pando.backup.backupState.deduplicated,
            type: "text",
            x: 1,
            y: 24,
          } as TextWidgetDTO,
        );
        return out;
      }
      out.push({
        brightness,
        color: Colors.Cyan,
        font: "5x8",
        text: last,
        type: "text",
        x: 1,
      } as TextWidgetDTO);
      if (last.startsWith("Sync")) {
        out.push({
          brightness,
          color: Colors.Cyan,
          font: "5x8",
          text: pando.backup.syncMessage || "",
          type: "text",
          x: 1,
          y: 8,
        } as TextWidgetDTO);
      }
    }
    return out;
  }

  async function persistentNotification(brightness: number) {
    const notification = await pando.persistent_notifications.getCurrentNotification();
    if (is.empty(notification) || is.empty(notification[0])) {
      return [];
    }
    const lines = whiteSpaceChunks(notification[0]);
    return lines.map((text, index) => {
      const y = (index % 4) * 8;
      const panel = Math.floor(index / 4);
      const x = 5 + panel * 64;
      return {
        brightness,
        color: Colors.Yellow,
        font: "tom-thumb",
        text,
        type: "text",
        x,
        y,
        // horizontal: "right",
      } as TextWidgetDTO;
    });
  }

  function solarInformation(brightness = 50) {
    const next = nextEvent();
    if (is.undefined(nextEvent) || next.event === "unknown") {
      return [];
    }
    return [
      {
        brightness,
        color: isPastSolarNoon() ? Colors.Orange : Colors.Cyan,
        font: "tom-thumb",
        horizontal: "right",
        text: currentLightTemp.state,
        type: "text",
        vertical: "bottom",
        y: -7,
      } as TextWidgetDTO,
      {
        brightness,
        color: isPastSolarNoon() ? Colors.Orange : Colors.Cyan,
        font: "6x9",
        horizontal: "right",
        text: next.event.split(" ").pop() + " " + next.time,
        type: "text",
        vertical: "bottom",
        y: 1,
      } as TextWidgetDTO,
    ];
  }

  function temperatureInformation(brightness: number) {
    const current = Number(temperatureUpstairs.state);
    const isClose =
      current >= climateUpstairs.attributes.target_temp_high - 0.5 ||
      current <= climateUpstairs.attributes.target_temp_low + 0.5;

    let color: Colors;
    if (windowOpen.state === "on") {
      color = Colors.White;
    } else {
      color = isClose ? Colors.Yellow : Colors.Green;
    }

    const offset = 2;
    const { temperature, templow } = weather.attributes;
    return [
      {
        brightness,
        color: pando.home_automation.shouldCloseWindows() ? Colors.Red : Colors.Blue,
        font: "5x8",
        horizontal: "right",
        text: String(weather?.attributes?.temperature) || "NO_TEMP",
        type: "text",
        x: -64 - 52 + offset,
        y: 1,
      } as TextWidgetDTO,
      {
        brightness,
        color,
        font: "5x8",
        horizontal: "right",
        text: Number(current).toFixed(1) || "????",
        type: "text",
        x: -64 - 30 + offset,
        y: 1,
      } as TextWidgetDTO,
      {
        brightness,
        color: Colors.Aquamarine,
        font: "4x6",
        horizontal: "left",
        text: `${templow}/${temperature}`,
        type: "text",
        x: 64 * 8 + 25,
        y: 26,
      } as TextWidgetDTO,
    ];
  }

  function tentDebugger(brightness: number) {
    if (tentMode.state !== "debug") {
      return [];
    }
    return [
      {
        brightness,
        color: Colors.Aquamarine,
        font: "10x20",
        horizontal: "right",
        text: "Tent Debug",
        type: "text",
        x: -64 * 8,
      } as TextWidgetDTO,
    ];
  }

  function timerColor(ref: Dayjs): Colors {
    const now = dayjs();
    if (ref.isBefore(now.add(15, "minute"))) {
      return Colors.Red;
    }
    if (ref.isBefore(now.add(30, "minute"))) {
      return Colors.Orange;
    }
    if (ref.isBefore(now.add(45, "minute"))) {
      return Colors.Yellow;
    }
    const [tomorrow] = automation.time.shortTime(["TOMORROW"]);
    if (ref.isBefore(tomorrow)) {
      return Colors.Magenta;
    }
    return Colors.White;
  }

  function timerInformation(brightness: number) {
    const target = pando.timer.workTimerTarget || pando.timer.countdownTimerTarget;
    if (!target) {
      return [];
    }
    return [
      {
        brightness,
        color: Colors.Green,
        font: "10x20",
        horizontal: "right",
        target: target.toISOString(),
        type: "countdown",
        x: -64 * 8,
      } as CountdownWidgetDTO,
    ];
  }

  async function upcomingBattery(brightness: number) {
    if (!automation.time.isBetween("PM10", "AM5")) {
      return [];
    }

    const [midnight] = automation.time.refTime(["00:00"]);
    const end = midnight.add(SINGLE, "week");

    const items = [...grocy.aggregator.BATTERY_CACHE]
      .filter(
        ({ next_estimated_charge_time }) =>
          !next_estimated_charge_time || end.isAfter(next_estimated_charge_time),
      )
      .sort((a, b) => {
        if (a.next_estimated_charge_time === b.next_estimated_charge_time) {
          const aLabel = a.userfields.matrixLabel || a.battery.name;
          const bLabel = b.userfields.matrixLabel || b.battery.name;
          return aLabel > bLabel ? UP : DOWN;
        }
        return dayjs(a.next_estimated_charge_time).isAfter(b.next_estimated_charge_time)
          ? UP
          : DOWN;
      });
    matrix_rendering.text.addLine(
      items.map(task => {
        const chargeTime = task.next_estimated_charge_time
          ? new Date(task.next_estimated_charge_time).getTime()
          : midnight.add(SINGLE, "day").toDate().getTime();
        return {
          brightness,
          color: timerColor(dayjs(chargeTime)),
          priority: 0,
          sort: chargeTime,
          text: `${pando.database.dueDatePrefix(dayjs(chargeTime))}Bat: ${
            task.userfields.matrixLabel || task.battery.name
          }`.slice(0, 21),
        };
      }),
      {
        brightness: brightness * 0.66,
        color: Colors.Aquamarine,
        x: -1,
        yEnd: 6,
        yStart: 2,
      },
    );
    return [];
  }

  async function upcomingCalendar(brightness: number) {
    if (!isDay()) {
      return [];
    }
    const day = dayjs().day();
    let addQuantity: number;
    switch (day) {
      case 6:
      case 0:
        addQuantity = 1;
        break;
      case 5:
        addQuantity = 3;
        break;
      default:
        addQuantity = FRIDAY - day;
    }
    const cutoff = dayjs().add(addQuantity, "day").subtract(SINGLE, "minute");
    const [dimCutoff] = automation.time.refTime(["48:00:00"]);

    const events = await hass.fetch.calendarSearch({
      calendar: ["calendar.personal"],
      end: cutoff.toDate(),
      start: new Date(),
    });
    const eventText = events.map(({ start, summary }) => ({
      brightness: dimCutoff.isBefore(start) ? HALF * brightness : brightness,
      color: timerColor(start),
      priority: 0,
      sort: start.toDate().getTime(),
      text: `${pando.database.formatDate(start)}${summary}`,
    }));
    matrix_rendering.text.addLine(eventText, {
      brightness,
      color: Colors.Blue,
      x: -1,
      yEnd: 6,
      yStart: 2,
    });
    return [];
  }

  async function upcomingTasks(brightness: number) {
    if (!automation.time.isBetween("PM10", "AM5")) {
      return [];
    }

    const [midnight] = automation.time.refTime(["00:00"]);
    const end = midnight.add(DAYSLIDE.get(new Date().getDay()), "day");

    const items = [...grocy.aggregator.TASKS_CACHE]
      .filter(
        ({ userfields, due_date }) =>
          due_date && end.isAfter(due_date) && userfields?.matrixDisplay === "1",
      )
      .sort((a, b) => {
        if (a.due_date === b.due_date) {
          const aLabel = a.userfields.matrixLabel || a.name;
          const bLabel = b.userfields.matrixLabel || b.name;
          return aLabel > bLabel ? UP : DOWN;
        }
        return dayjs(a.due_date).isAfter(b.due_date) ? UP : DOWN;
      });
    matrix_rendering.text.addLine(
      items.map(task => ({
        brightness,
        color: timerColor(dayjs(task.due_date)),
        priority: 0,
        sort: new Date(task.due_date).getTime(),
        text: `${pando.database.dueDatePrefix(dayjs(task.due_date))}${
          task.userfields.matrixLabel || task.name
        }`.slice(0, 21),
      })),
      {
        brightness: brightness * 0.66,
        color: Colors.Green,
        x: -1,
        yEnd: 6,
        yStart: 2,
      },
    );
    return [];
  }

  async function upcomingTodo(brightness: number) {
    if (!automation.time.isBetween("PM10", "AM5")) {
      return [];
    }

    const [midnight] = automation.time.refTime(["00:00"]);
    const end = midnight.add(DAYSLIDE.get(new Date().getDay()), "day");

    const items = [...grocy.aggregator.CHORES_CACHE]
      .filter(
        ({ userfields, next_estimated_execution_time }) =>
          next_estimated_execution_time &&
          end.isAfter(next_estimated_execution_time) &&
          userfields?.matrixDisplay === "1",
      )
      .sort((a, b) => {
        if (a.next_estimated_execution_time === b.next_estimated_execution_time) {
          const aLabel = a.userfields.matrixLabel || a.chore_name;
          const bLabel = b.userfields.matrixLabel || b.chore_name;
          return aLabel > bLabel ? UP : DOWN;
        }
        return dayjs(a.next_estimated_execution_time).isAfter(b.next_estimated_execution_time)
          ? UP
          : DOWN;
      });
    matrix_rendering.text.addLine(
      items.map(todoItem => ({
        brightness,
        color: timerColor(dayjs(todoItem.next_estimated_execution_time)),
        priority: 0,
        sort: new Date(todoItem.next_estimated_execution_time).getTime(),
        text: `${pando.database.dueDatePrefix(dayjs(todoItem.next_estimated_execution_time))}${
          todoItem.userfields.matrixLabel || todoItem.chore_name
        }`.slice(0, 21),
      })),
      {
        brightness: brightness * 0.66,
        color: Colors.Yellow,
        x: -1,
        yEnd: 6,
        yStart: 2,
      },
    );
    return [];
  }
  return { render };
}
