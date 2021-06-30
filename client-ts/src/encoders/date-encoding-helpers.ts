
export type DateResolution = "year" | "month" | "day" | "hour" | "minute" | "second" | "millisecond"

export const utcDateWithResolution: (date: Date, resolution: DateResolution) => number =
  (date, resolution) => {
    const DP = datePart.bind(null, date)
    switch (resolution) {
      case "year": return Date.UTC(DP("year"), 0, 0, 0, 0, 0, 0)
      case "month": return Date.UTC(DP("year"), DP("month"), 0, 0, 0, 0, 0)
      case "day": return Date.UTC(DP("year"), DP("month"), DP("day"), 0, 0, 0, 0)
      case "hour": return Date.UTC(DP("year"), DP("month"), DP("day"), DP("hour"), 0, 0, 0)
      case "minute": return Date.UTC(DP("year"), DP("month"), DP("day"), DP("hour"), DP("minute"), 0, 0)
      case "second": return Date.UTC(DP("year"), DP("month"), DP("day"), DP("hour"), DP("minute"), DP("second"), 0)
      case "millisecond": return Date.UTC(DP("year"), DP("month"), DP("day"), DP("hour"), DP("minute"), DP("second"), DP("millisecond"))
    }
  }

function datePart(date: Date, component: DateResolution) {
  switch (component) {
    case "year": return date.getUTCFullYear()
    case "month": return date.getUTCMonth()
    case "day": return date.getUTCDay()
    case "hour": return date.getUTCHours()
    case "minute": return date.getUTCMinutes()
    case "second": return date.getUTCSeconds()
    case "millisecond": return date.getUTCMilliseconds()
  }
}