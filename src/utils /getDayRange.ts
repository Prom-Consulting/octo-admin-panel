import { DateTime } from "luxon";

const getDayRange = (startDate: string, endDate: string, timezone: string) => {
  return {
    endOfDay: DateTime.fromISO(endDate, { zone: timezone })
      .endOf("day")
      .toUTC()
      .toJSDate(),
    startOfDay: DateTime.fromISO(startDate, { zone: timezone })
      .startOf("day")
      .toUTC()
      .toJSDate(),
  }
}

export default getDayRange;