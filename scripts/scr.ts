'use strict';
const currentDateObject = new Date();
const currentYear = currentDateObject.getFullYear().toString();
const defaultTimeZone = 'America/Los_Angeles';
const monthDict = {"Jan": "01", "Feb": "02", "Mar": "03", "Apr": "05", "May": "05", "Jun": "06", "Jul": "07", 
	"Aug": "08", "Sep": "09", "Oct":"10", "Nov": "11", "Dec": "12"};
const dateDict = {"M": "MO," , "T" : "TU,", "W": "WE,", "R": "TH,", "F": "FR,"};
const dateIntDict = {"T" : 1, "W" : 2, "R": 3, "F": 4}
const getFinalExamMatches = (stripped: string) => {
  const fReg = /Final\sExam:\s(\D{3})\.\s(\D{3})\.(\d{1,2})\sat\s(\d{1,2}:\d{1,2})(am|pm)/gm;
  let match = fReg.exec(stripped);
  return match;
};
const makeFinalExamEvent = (
  courseName: string,
  parsedFinalExam: RegExpExecArray,
) => {
  let finalExamEvent = new Object();
  finalExamEvent['start'] = new Object();
  finalExamEvent['end'] = new Object();
  finalExamEvent['start']['dateTime'] = getFinalExamDates(parsedFinalExam)[0];
  finalExamEvent['end']['dateTime'] = getFinalExamDates(parsedFinalExam)[1];
  finalExamEvent['start']['timeZone'] = 'America/Los_Angeles';
  finalExamEvent['end']['timeZone'] = 'America/Los_Angeles';
  finalExamEvent['summary'] = courseName + ' (Final)';
  return finalExamEvent;
};
const findFirstFinal = (strippedArray: string[]) => {
  let earliestFinal = "99999999999";
  for (let i = 0; i < strippedArray.length; i++) {
    const finalExam = getFinalExamMatches(strippedArray[i]);
    const finalExamStartDate = getFinalExamDates(finalExam)[0].slice(0, 10);
    const untilDate = finalExamStartDate.replace(/-/g, '');
    if (untilDate < earliestFinal) {
      earliestFinal = untilDate;
    }
  }
  return earliestFinal;
};
const createEventObjects = () => {
  let scheduleNode = <HTMLInputElement>document.getElementById('schedule');
  // replace all new lines character to space
  let stripped = scheduleNode.value.replace(/(\r\n|\n|\r)/gm, ' ');
  // First date of spring instruction
  let userInputDate = '2019-04-01';
  let strippedArray = stripped.split('...');
  // There will be an empty item at the end of the array, we want to pop it
  strippedArray.pop();
  // We use the earliest final date to determine when instruction ends
  let earliestFinal = findFirstFinal(strippedArray);
  let finalEventsArray = [];
  for (let i = 0; i < strippedArray.length; i++) {
    const courseName = getCourseNames(strippedArray[i]);
    const combinedCourseName = courseName[1] + courseName[2] + courseName[3];
    const time = getTimes(strippedArray[i]);
    const finalExam = getFinalExamMatches(strippedArray[i]);
    const finalExamEvent = makeFinalExamEvent(combinedCourseName, finalExam);
    const untilDate = earliestFinal;
    finalEventsArray.push(finalExamEvent);
    let e = new Object();
    // 1 item if there's no discussion, else there is discussion.
    for (let j = 0; j < time.length; j++) {
      e = new Object();
      e['start'] = new Object();
      e['end'] = new Object();
      e['recurrence'] = new Array();
      if (j == 0) {
        e['summary'] = combinedCourseName + ' (Lec)';
      } else {
        e['summary'] = combinedCourseName + ' (Dis)';
      }
      let startTime = formatTime(
        userInputDate,
        time[j][2],
        time[j][4],
        time[j][1],
      );
      let endTime = formatTime(
        userInputDate,
        time[j][3],
        time[j][4],
        time[j][1],
      );
      let location = time[j][5];
      e['start']['dateTime'] = startTime;
      e['end']['dateTime'] = endTime;
      e['start']['timeZone'] = defaultTimeZone;
      e['end']['timeZone'] = defaultTimeZone;
      e['recurrence'].push(getReaccurence(untilDate, time[j][1]));
      e['location'] = location;
      finalEventsArray.push(e);
    }
  }
  console.log(finalEventsArray);
  return finalEventsArray;
};
const getReaccurence = (untilDate: string, dates: string) => {
  let baseRule = 'RRULE:FREQ=WEEKLY;';
  const datesArray = dates.split('');
  let rrule = '';
  let byday = 'BYDAY=';
  let until = 'UNTIL=';
  let lastmonth = untilDate.slice(0, 6);
  let lastday = parseInt(untilDate.slice(-2));
  let lastdayString = '';
  if (lastday < 10) {
    lastdayString = '0' + lastday.toString();
  }
  until += lastmonth + lastdayString;
  datesArray.forEach(date => {
	  byday += dateDict[date]
  });
  rrule = baseRule + until + ';' + byday;
  // Remove the last comma
  rrule = rrule.substring(0, rrule.length - 1);
  return rrule;
};
const getFinalExamDates = (date: RegExpExecArray) => {
  let formattedStartDate = currentYear;
  let formattedEndDate = currentYear;
  let adjustedStartTimeInt = parseInt(date[4]);
  let adjustedEndTimeInt = parseInt(date[4]) + 2;
  let adjustedStartTime = adjustedStartTimeInt.toString() + date[4].slice(-3);
  let adjustedEndTime = adjustedEndTimeInt.toString() + date[4].slice(-3);
  formattedStartDate += "-" + monthDict[date[2]] 
  formattedEndDate += "-" + monthDict[date[2]]
  formattedStartDate += '-' + date[3];
  formattedEndDate += '-' + date[3];
  // google api requires double digit hh
  if (date[4].length === 4) {
    if (date[5] === 'pm') {
      adjustedStartTimeInt += 12;
      adjustedStartTime = adjustedStartTimeInt.toString() + date[4].slice(-3);
      adjustedEndTimeInt += 12;
      adjustedEndTime = adjustedEndTimeInt.toString() + date[4].slice(-3);
    }
  } 
  formattedStartDate += 'T' + adjustedStartTime + ':00';
  formattedEndDate += 'T' + adjustedEndTime + ':00';
  let finalDatesInArray = new Array();
  finalDatesInArray.push(formattedStartDate);
  finalDatesInArray.push(formattedEndDate);
  return finalDatesInArray;
};
const formatTime = (
  userInputDate: string,
  time: string,
  amOrPm: string,
  recurrence: string,
) => {
  // Turn hh:mm to hh:mm:ss
  let adjustedDate = userInputDate.slice(-2);
  let adjustedDateInt = parseInt(adjustedDate);
  let firstDate = recurrence.slice(0, 1);
  let adjustedTimeInt = parseInt(time);
  let adjustedTime = adjustedTimeInt.toString() + time.slice(-3);
  // If h is single digit
  if (time.length == 4) {
    if (amOrPm === 'PM') {
      adjustedTimeInt += 12;
      adjustedTime = adjustedTimeInt.toString() + time.slice(-3);
    }
    if (adjustedTimeInt < 10) {
      adjustedTime = '0' + adjustedTime;
    }
  }
  adjustedDateInt += dateIntDict[firstDate]
  if (adjustedDateInt < 10) {
    adjustedDate = '0' + adjustedDateInt.toString();
  }
  return (
    userInputDate.slice(0, userInputDate.length - 2) +
    adjustedDate +
    'T' +
    adjustedTime +
    ':00'
  );
};
const getCourseNames = (stripped: string) => {
  // Desired outcome:
  // [0] = Full match
  // [1] = Course code e.g ECS34
  // [2] = the separator (useless)
  // [3] = Course name e.g Introduction to Programming
  // [4] = Date (not useful, mainly to capture the garbage)
  const cnReg = /([A-Z]{1,3}\s\d{1,3}[A-Z]?)(\s-\s)(\D+)\s([MTRWF]{1,3})/;
  let courseNames = cnReg.exec(stripped);
  return courseNames;
};
const getTimes = (stripped: string) => {
  // [1] = Date e.g MWF, TR
  // [2] = Time e.g 1:10 - 2:00
  const dReg = /([MTWRF]{1,3})\s(\d{1,2}:\d{1,2})[\s\-]{3}(\d{1,2}:\d{1,2})\s(PM|AM)\s(\w+\s\d+)/gm;
  let match = dReg.exec(stripped);
  let datesArray = [];
  while (match != null) {
    datesArray.push(match);
    match = dReg.exec(stripped);
  }
  return datesArray;
};
