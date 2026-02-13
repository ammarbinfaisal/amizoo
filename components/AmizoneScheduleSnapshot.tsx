"use client";

import { ScheduledClasses } from "@/lib/types";
import { format } from "date-fns";
import { formatAmizoneTime } from "@/lib/date-utils";

function splitFacultyLines(facultyRaw: string): { primary: string; secondary: string[] } {
  const normalize = (s: string) => s.replace(/,(?!\s)/g, ", ").replace(/\s+/g, " ").trim();

  const lines = facultyRaw
    .split(/\r?\n/g)
    .map((l) => l.trim())
    .filter(Boolean);

  if (lines.length > 1) {
    const [first, ...rest] = lines;
    return { primary: normalize(first), secondary: rest.map(normalize).filter(Boolean) };
  }

  const faculty = normalize(facultyRaw);
  const match = faculty.match(/^(.*?)(\s+Group\/Sec\b.*)$/i);
  if (match) {
    return { primary: match[1].trim(), secondary: [match[2].trim()].filter(Boolean) };
  }

  return { primary: faculty, secondary: [] };
}

function attendanceDotColor(attendance: string) {
  switch (attendance) {
    case "PRESENT":
      return "#5cb85c";
    case "ABSENT":
      return "#d9534f";
    case "PENDING":
      return "#337ab7";
    default:
      return "#337ab7";
  }
}

export function AmizoneScheduleSnapshot({ date, schedule }: { date: Date; schedule: ScheduledClasses }) {
  const dayLabel = format(date, "EEEE");
  const dateLabel = format(date, "MMMM d, yyyy");

  const classes = [...schedule.classes].sort((a, b) => a.startTime.localeCompare(b.startTime));

  return (
    <div className="amizone-schedule-snapshot" aria-hidden>
      <style>{`
        .amizone-schedule-snapshot {
          width: 100%;
          background: #ffffff;
          font-family: "Helvetica Neue", Helvetica, Arial, sans-serif;
          color: #333;
          box-sizing: border-box;
        }

        .amizone-schedule-snapshot,
        .amizone-schedule-snapshot * {
          box-sizing: border-box;
          border-color: #dddddd;
        }

        /* Bootstrap-ish panel framing (matches the Amizone widget look in the reference). */
        .amizone-schedule-snapshot .panel {
          margin: 0;
          background: #fff;
          border: 1px solid #bce8f1;
          border-radius: 4px;
          overflow: hidden;
          width: 100%;
        }
        .amizone-schedule-snapshot .panel-heading {
          padding: 16px 20px;
          border-bottom: 1px solid #dddddd;
          background: #f5f5f5;
        }
        .amizone-schedule-snapshot .panel-title {
          margin: 0;
          font-size: 28px;
          font-weight: 700;
          color: #2c3e50;
        }
        .amizone-schedule-snapshot .panel-body {
          padding: 16px 20px 22px;
        }

        .amizone-schedule-snapshot .toolbarRow {
          display: grid;
          grid-template-columns: auto 1fr auto;
          align-items: center;
          gap: 12px;
          padding: 6px 0 14px;
        }
        .amizone-schedule-snapshot .btn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 46px;
          height: 34px;
          border: 1px solid #cccccc;
          background: linear-gradient(to bottom, #ffffff 0%, #e0e0e0 100%);
          color: #337ab7;
          border-radius: 0;
          font-size: 18px;
          line-height: 1;
          user-select: none;
        }
        .amizone-schedule-snapshot .btn svg {
          width: 18px;
          height: 18px;
          fill: currentColor;
        }
        .amizone-schedule-snapshot .btnGroup {
          display: inline-flex;
          gap: 10px;
          align-items: center;
        }
        .amizone-schedule-snapshot .btnSet {
          display: inline-flex;
        }
        .amizone-schedule-snapshot .btnSet .btn + .btn {
          margin-left: -1px; /* collapse borders like Bootstrap btn-group */
        }
        .amizone-schedule-snapshot .dateTitle {
          text-align: center;
          font-size: 32px;
          font-weight: 700;
          color: #000000;
        }

        /* FullCalendar list-view essentials (derived from style_analyser.json). */
        .amizone-schedule-snapshot .fc {
          direction: ltr;
          text-align: left;
          font-size: 1em;
        }
        .amizone-schedule-snapshot .fc table {
          width: 100%;
          table-layout: fixed;
          border-collapse: collapse;
          border-spacing: 0;
          font-size: 1em;
        }
        .amizone-schedule-snapshot .fc .fc-list-table {
          width: 100% !important;
          table-layout: fixed;
          border: 1px solid #dddddd;
        }
        .amizone-schedule-snapshot .fc th,
        .amizone-schedule-snapshot .fc td {
          border-style: solid;
          border-width: 1px;
          padding: 0;
          vertical-align: top;
          border-color: #dddddd;
        }
        .amizone-schedule-snapshot .fc-list-table td {
          border-width: 1px 0 0;
          padding: 12px 14px;
        }
        .amizone-schedule-snapshot .fc-list-heading {
          border-bottom-width: 1px;
        }
        .amizone-schedule-snapshot .fc-list-heading td {
          font-size: 20px;
          font-weight: 700;
          color: #000000;
          padding: 12px 14px;
          background: #ffffff;
        }
        .amizone-schedule-snapshot .fc-list-item-time {
          white-space: normal !important;
          color: #31708f;
          width: 86px;
          white-space: nowrap;
          padding-right: 0;
        }
        .amizone-schedule-snapshot .fc-timeStack {
          display: grid;
          grid-template-rows: auto auto auto;
          justify-items: center;
          align-content: center;
          gap: 2px;
          line-height: 1.05;
          font-size: 18px;
        }
        .amizone-schedule-snapshot .fc-timeSep {
          font-size: 18px;
          line-height: 1;
        }
        .amizone-schedule-snapshot .fc-list-item-marker {
          white-space: normal !important;
          width: 34px;
          white-space: nowrap;
        }
        .amizone-schedule-snapshot .fc-ltr .fc-list-item-marker {
          padding-right: 0;
        }
        .amizone-schedule-snapshot .fc-event-dot {
          display: inline-block;
          width: 12px;
          height: 12px;
          border-radius: 50%;
          border: 1px solid rgba(0, 0, 0, 0.12);
          background-color: #337ab7;
        }
        .amizone-schedule-snapshot .fc-list-item-title {
          color: #5c006c;
          font-size: 18px;
          font-weight: 400;
          width: auto;
          overflow-wrap: anywhere;
        }
        .amizone-schedule-snapshot .fc-list-item-title a {
          text-decoration: none;
          color: inherit;
        }
        .amizone-schedule-snapshot .fc-view-container,
        .amizone-schedule-snapshot .fc-scroller,
        .amizone-schedule-snapshot #calendar {
          width: 100%;
        }

        /* Amizone overrides captured in style_analyser.json. */
        .amizone-schedule-snapshot .class-schedule-color {
          color: rgb(49, 112, 143) !important;
        }
        .amizone-schedule-snapshot .class-schedule-color td {
          border-color: rgb(165, 236, 251) !important;
        }
        .amizone-schedule-snapshot .fc-list-item.class-schedule-color .fc-list-item-time {
          color: #31708f;
        }

        .amizone-schedule-snapshot .titleLines {
          margin-top: 4px;
          display: grid;
          gap: 4px;
          font-size: 18px;
          line-height: 1.25;
          font-weight: 400;
        }
        .amizone-schedule-snapshot .titleLines .facultyPrimary {
          color: #000000;
          font-weight: 700;
        }
        .amizone-schedule-snapshot .titleLines .metaLine {
          color: #5c006c;
          font-weight: 400;
        }
        .amizone-schedule-snapshot .StrikeOutClass td {
          opacity: 0.75;
          text-decoration: line-through;
        }
      `}</style>

      <div className="panel panel-default">
        <div className="panel-heading">
          <h3 className="panel-title">My Classes</h3>
        </div>
        <div className="panel-body">
          <div className="toolbarRow">
            <div className="btnGroup">
              <div className="btnSet">
                <div className="btn" aria-hidden>
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M15 5 6 12l9 7V5z" />
                  </svg>
                </div>
                <div className="btn" aria-hidden>
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <path d="m9 5 9 7-9 7V5z" />
                  </svg>
                </div>
              </div>
              <div className="btn" aria-hidden>
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M7 2h2v2h6V2h2v2h3a2 2 0 0 1 2 2v16a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h4V2zm14 8H3v12h18V10zM3 8h18V6H3v2z" />
                </svg>
              </div>
            </div>
            <div className="dateTitle">{dateLabel}</div>
            <div />
          </div>

          <div id="calendar" className="fc fc-unthemed fc-ltr">
            <div className="fc-view-container">
              <div className="fc-scroller">
                <table className="fc-list-table">
                  <tbody>
                    <tr className="fc-list-heading">
                      <td colSpan={3}>{dayLabel}</td>
                    </tr>

                    {classes.length === 0 ? (
                      <tr className="fc-list-item">
                        <td className="fc-list-item-time fc-widget-content" />
                        <td className="fc-list-item-marker fc-widget-content" />
                        <td className="fc-list-item-title fc-widget-content">
                          <span className="small">No classes scheduled.</span>
                        </td>
                      </tr>
                    ) : (
                      classes.map((cls, idx) => {
                        const isCancelled = Boolean(cls.cancelled);
                        const courseName = cls.course.name;
                        const start = formatAmizoneTime(cls.startTime);
                        const end = formatAmizoneTime(cls.endTime);
                        const dot = attendanceDotColor(cls.attendance);
                        const faculty = splitFacultyLines(cls.faculty);
                        const roomLines = cls.room
                          .split(/\r?\n/g)
                          .map((l) => l.trim())
                          .filter(Boolean);

                        return (
                          <tr
                            key={`${cls.startTime}-${cls.endTime}-${idx}`}
                            className={`fc-list-item class-schedule-color ${isCancelled ? "StrikeOutClass" : ""}`}
                          >
                            <td className="fc-list-item-time fc-widget-content">
                              <div className="fc-timeStack" aria-hidden>
                                <div>{start}</div>
                                <div className="fc-timeSep">-</div>
                                <div>{end}</div>
                              </div>
                            </td>
                            <td className="fc-list-item-marker fc-widget-content">
                              <span className="fc-event-dot" style={{ backgroundColor: dot }} />
                            </td>
                            <td className="fc-list-item-title fc-widget-content">
                              <a href="#" onClick={(e) => e.preventDefault()}>
                                {courseName}
                              </a>
                              <div className="titleLines">
                                <div className="facultyPrimary">{faculty.primary}</div>
                                {faculty.secondary.map((line, i) => (
                                  <div key={i} className="metaLine">
                                    {line}
                                  </div>
                                ))}
                                {roomLines.map((line, i) => (
                                  <div key={`room-${i}`} className="metaLine">
                                    {line}
                                  </div>
                                ))}
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
