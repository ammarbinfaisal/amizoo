"use client";

import { ScheduledClasses } from "@/lib/types";
import { format } from "date-fns";

function formatRange(startIso: string, endIso: string) {
  const start = new Date(startIso);
  const end = new Date(endIso);
  return `${format(start, "HH:mm")} \u2013 ${format(end, "HH:mm")}`;
}

export function AmizoneScheduleSnapshot({ date, schedule }: { date: Date; schedule: ScheduledClasses }) {
  const dayLabel = format(date, "EEEE");
  const dateLabel = format(date, "MMMM d, yyyy");

  const classes = [...schedule.classes].sort(
    (a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
  );

  return (
    <div className="amizone-schedule-snapshot" aria-hidden>
      <style>{`
        .amizone-schedule-snapshot {
          width: 1148px;
          background: #ffffff;
          font-family: system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif;
          color: #333;
        }

        /* Bootstrap-ish panel framing (matches the Amizone widget look in the reference). */
        .amizone-schedule-snapshot .panel {
          margin: 0;
          background: #fff;
          border: 1px solid #dddddd;
          border-radius: 4px;
          overflow: hidden;
        }
        .amizone-schedule-snapshot .panel-heading {
          padding: 18px 22px;
          border-bottom: 1px solid #dddddd;
          background: #f5f5f5;
        }
        .amizone-schedule-snapshot .panel-title {
          margin: 0;
          font-size: 32px;
          font-weight: 700;
          color: #2c3e50;
        }
        .amizone-schedule-snapshot .panel-body {
          padding: 18px 22px 24px;
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
          width: 44px;
          height: 38px;
          border: 1px solid #d8d8d8;
          background: #ffffff;
          color: #2b7a97;
          border-radius: 2px;
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
          gap: 8px;
        }
        .amizone-schedule-snapshot .dateTitle {
          text-align: center;
          font-size: 34px;
          font-weight: 500;
          color: #111827;
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
          table-layout: auto;
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
          padding: 8px 14px;
        }
        .amizone-schedule-snapshot .fc-list-heading {
          border-bottom-width: 1px;
        }
        .amizone-schedule-snapshot .fc-list-heading td {
          font-size: 22px;
          font-weight: 700;
          color: #111827;
          padding: 14px 14px 10px;
          background: #ffffff;
        }
        .amizone-schedule-snapshot .fc-list-item-time {
          white-space: normal !important;
          color: rgb(16, 120, 149);
          width: 1px;
          white-space: nowrap;
        }
        .amizone-schedule-snapshot .fc-list-item-marker {
          white-space: normal !important;
          width: 1px;
          white-space: nowrap;
        }
        .amizone-schedule-snapshot .fc-ltr .fc-list-item-marker {
          padding-right: 0;
        }
        .amizone-schedule-snapshot .fc-event-dot {
          display: inline-block;
          width: 10px;
          height: 10px;
          border-radius: 5px;
          background-color: rgb(58, 135, 173);
        }
        .amizone-schedule-snapshot .fc-list-item-title {
          color: rgb(92, 0, 108);
        }
        .amizone-schedule-snapshot .fc-list-item-title a {
          text-decoration: none;
          color: inherit;
        }

        /* Amizone overrides captured in style_analyser.json. */
        .amizone-schedule-snapshot .class-schedule-color {
          color: rgb(49, 112, 143) !important;
        }
        .amizone-schedule-snapshot .class-schedule-color td {
          border-color: rgb(165, 236, 251) !important;
        }
        .amizone-schedule-snapshot .fc-list-item.class-schedule-color .fc-list-item-time {
          color: rgb(16, 120, 149);
        }

        .amizone-schedule-snapshot .titleLines {
          margin-top: 6px;
          display: grid;
          gap: 4px;
          font-size: 18px;
          line-height: 1.2;
          font-weight: 400;
        }
        .amizone-schedule-snapshot .titleLines .small {
          font-size: 17px;
          font-weight: 500;
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
              <div className="btn" aria-hidden>
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M15.41 7.41 14 6l-6 6 6 6 1.41-1.41L10.83 12z" />
                </svg>
              </div>
              <div className="btn" aria-hidden>
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="m8.59 16.59 1.41 1.41 6-6-6-6-1.41 1.41L13.17 12z" />
                </svg>
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
                        const courseName = cls.course.name.includes(" - ") ? cls.course.name.split(" - ")[1] : cls.course.name;

                        return (
                          <tr
                            key={`${cls.startTime}-${cls.endTime}-${idx}`}
                            className={`fc-list-item class-schedule-color ${isCancelled ? "StrikeOutClass" : ""}`}
                          >
                            <td className="fc-list-item-time fc-widget-content">{formatRange(cls.startTime, cls.endTime)}</td>
                            <td className="fc-list-item-marker fc-widget-content">
                              <span className="fc-event-dot" />
                            </td>
                            <td className="fc-list-item-title fc-widget-content">
                              <a href="#" onClick={(e) => e.preventDefault()}>
                                {courseName}
                              </a>
                              <div className="titleLines">
                                <div className="small">{cls.faculty}</div>
                                <div className="small">{cls.room}</div>
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
