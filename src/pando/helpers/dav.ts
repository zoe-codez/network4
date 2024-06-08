import { Dayjs } from "dayjs";

export interface CalendarObject {
  allDay: boolean;
  categories?: string[];
  description: string;
  end: Dayjs;
  location?: string;
  repeat: string;
  start: Dayjs;
  summary: string;
}
