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
          font-family: "Open Sans", "Helvetica Neue", Helvetica, Arial, sans-serif;
          color: #393939;
          box-sizing: border-box;
        }

        .amizone-schedule-snapshot .widget-box {
          padding: 0;
          box-shadow: none;
          margin: 3px 0;
          border: 1px solid #CCC;
        }

        .amizone-schedule-snapshot .widget-header {
          box-sizing: content-box;
          position: relative;
          min-height: 38px;
          background: #f7f7f7;
          background-image: linear-gradient(to bottom, #ffffff 0%, #eeeeee 100%);
          color: #669fc7;
          border-bottom: 1px solid #DDD;
          padding-left: 12px;
          display: flex;
          align-items: center;
        }

        .amizone-schedule-snapshot .widget-header h4 {
          margin: 0;
          font-size: 16px;
          font-weight: 400;
        }

        .amizone-schedule-snapshot .widget-main {
          padding: 12px;
        }

        /* FullCalendar Toolbar */
        .amizone-schedule-snapshot .fc-toolbar {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 1em;
        }

        .amizone-schedule-snapshot .fc-center h2 {
          font-size: 24px;
          font-weight: 400;
          margin: 0;
          color: #333;
        }

        /* Ace Buttons */
        .amizone-schedule-snapshot .fc-button {
          background-color: #ffffff !important;
          background-image: linear-gradient(to bottom, #ffffff 0%, #e0e0e0 100%) !important;
          border: 1px solid #cccccc !important;
          color: #337ab7 !important;
          padding: 4px 10px;
          height: 34px;
          cursor: default;
        }

        .amizone-schedule-snapshot .fc-prev-button { border-radius: 4px 0 0 4px !important; }
        .amizone-schedule-snapshot .fc-next-button { border-radius: 0 4px 4px 0 !important; border-left: 0 !important; }

        /* Table Structure & Data Points */
        .amizone-schedule-snapshot .fc-list-table {
          width: 100%;
          border: 1px solid #ddd;
          border-collapse: collapse;
        }

        .amizone-schedule-snapshot .fc-list-heading td {
          background: #F5F5F5;
          padding: 8px 14px;
          border: 1px solid #ddd;
          color: #000;
          font-weight: 700;
          font-size: 14px;
        }

        .amizone-schedule-snapshot .fc-list-item td {
          padding: 8px 14px; 
          border-top: 1px solid #a5ecfb; 
          vertical-align: top;
        }

        .amizone-schedule-snapshot .fc-list-item-time {
          width: 100px;
          color: #31708f;
          font-size: 13px; 
          white-space: nowrap;
        }

        .amizone-schedule-snapshot .fc-list-item-marker {
          width: 30px;
          text-align: center;
        }

        .amizone-schedule-snapshot .fc-event-dot {
          display: inline-block;
          width: 10px;
          height: 10px;
          border-radius: 50%;
          background-color: #3a87ad;
        }

        /* Title & Faculty Content */
        .amizone-schedule-snapshot .fc-list-item-title {
          font-size: 13px; 
          line-height: 1.5;
          color: rgb(92, 0, 108); 
        }

        .amizone-schedule-snapshot .fc-list-item-title a {
          text-decoration: none;
          color: inherit;
        }

        .amizone-schedule-snapshot .faculty-name {
          font-weight: 700; 
          color: rgb(92, 0, 108); 
        }

        .amizone-schedule-snapshot .meta-info {
          display: block;
          color: rgb(92, 0, 108);
        }
      `}</style>

      <div className="widget-box">
        <div className="widget-header">
          <h4>My Classes</h4>
        </div>
        
        <div className="widget-main">
          <div id="calendar" className="fc fc-unthemed fc-ltr">
            <div className="fc-toolbar">
              <div className="fc-left" style={{ display: 'flex', gap: '4px' }}>
                <div className="fc-button-group" style={{ display: 'flex' }}>
                  <button className="fc-button fc-prev-button">‹</button>
                  <button className="fc-button fc-next-button">›</button>
                </div>
                <button className="fc-button" style={{ borderRadius: '4px' }}>📅</button>
              </div>
              <div className="fc-center">
                <h2>{dateLabel}</h2>
              </div>
              <div className="fc-right"></div>
            </div>

            <div className="fc-view-container">
              <table className="fc-list-table">
                <tbody>
                  <tr className="fc-list-heading">
                    <td colSpan={3}>
                      <span className="fc-list-heading-main">{dayLabel}</span>
                    </td>
                  </tr>

                  {classes.map((cls, idx) => {
                    const faculty = splitFacultyLines(cls.faculty);
                    return (
                      <tr key={idx} className="fc-list-item">
                        <td className="fc-list-item-time">
                          {cls.startTime} - {cls.endTime}
                        </td>
                        <td className="fc-list-item-marker">
                          <span className="fc-event-dot" />
                        </td>
                        <td className="fc-list-item-title">
                          <a href="#" onClick={(e) => e.preventDefault()}>
                            {cls.course.name}
                            <br />
                            <b className="faculty-name">{faculty.primary}</b>
                            <br />
                            {faculty.secondary.map((line, i) => (
                              <span key={i} className="meta-info">
                                {line} <br />
                              </span>
                            ))}
                            {cls.room && <span className="meta-info">{cls.room}</span>}
                          </a>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
