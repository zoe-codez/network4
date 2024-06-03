import dayjs from "dayjs";
import advancedFormat from "dayjs/plugin/advancedFormat";
import isBetween from "dayjs/plugin/isBetween";
import timezone from "dayjs/plugin/timezone";
import utc from "dayjs/plugin/utc";
import weekOfYear from "dayjs/plugin/weekOfYear";

export * from "./extensions";
export * from "./helpers";
export * from "./network4-core.module";

// ? both required for `dayjs().format("ww")`
// prints week number as part of the format string
dayjs.extend(weekOfYear);
dayjs.extend(advancedFormat);
dayjs.extend(isBetween);
dayjs.extend(utc);
dayjs.extend(timezone);
