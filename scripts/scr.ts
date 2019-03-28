'use strict';
/* Interfaces  */

interface StringMap {
  [s: string]: string;
}
interface StringIntMap {
  [s: string]: number;
}
interface ICourse {
  summary: string;
  start: {dateTime: string; timeZone: string};
  end: {dateTime: string; timeZone: string};
  location: string;
  recurrence: string[];
}
interface ICourseFinalExam {
  summary: string;
  start: {dateTime: string; timeZone: string};
  end: {dateTime: string; timeZone: string};
}
interface ITime {
  CURRENTYEAR: string;
  startTime: string;
  endTime: string;
}

window.onload = () => {
  handleChange();
  createEventObjects();
};

/***********************/

/* constants */

const CURRENTDATEOBJECT: Date = new Date();
const CURRENTYEAR: string = CURRENTDATEOBJECT.getFullYear().toString();
const DEFAULTTIMEZONE: string = 'America/Los_Angeles';
const MONTHDICT: StringMap = {
  Jan: '01',
  Feb: '02',
  Mar: '03',
  Apr: '05',
  May: '05',
  Jun: '06',
  Jul: '07',
  Aug: '08',
  Sep: '09',
  Oct: '10',
  Nov: '11',
  Dec: '12',
};
const DATEDICT: StringMap = {M: 'MO,', T: 'TU,', W: 'WE,', R: 'TH,', F: 'FR,'};
const DATEINTDICT: StringIntMap = {T: 1, W: 2, R: 3, F: 4};

/**************/

const getFinalExamMatches = (stripped: string) => {
  const fReg: RegExp = /Final\sExam:\s(\D{3})\.\s(\D{3})\.(\d{1,2})\sat\s(\d{1,2}:\d{1,2})(am|pm)/gm;
  let match: RegExpExecArray = fReg.exec(stripped);
  return match;
};
const makeFinalExamEvent = (
  courseName: string,
  parsedFinalExam: RegExpExecArray,
) => {
  let finalExamEvent = <ICourseFinalExam>{
    start: {},
    end: {},
  };
  finalExamEvent['start']['dateTime'] = getFinalExamDates(parsedFinalExam)[0];
  finalExamEvent['end']['dateTime'] = getFinalExamDates(parsedFinalExam)[1];
  finalExamEvent['start']['timeZone'] = DEFAULTTIMEZONE;
  finalExamEvent['end']['timeZone'] = DEFAULTTIMEZONE;
  finalExamEvent['summary'] = courseName + ' (Final)';
  return finalExamEvent;
};
const findFirstFinal = (strippedArray: string[]) => {
  let earliestFinal: string = '999999999';
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
const validateDate = () => {
  const re = /^\d{2}\-\d{2}$/;
  let datePickNode = <HTMLInputElement>document.getElementById('datepick');
  if (datePickNode.value.match(re) || datePickNode.value.length === 0) {
    return true;
  }
  return false;
};
const handleChange = () => {
  const errorNode: HTMLElement = document.getElementById('error');
  if (validateDate() === true) {
    errorNode.style.display = 'none';
  } else {
    errorNode.style.display = 'block';
  }
};
const createEventObjects = () => {
  let scheduleNode: HTMLInputElement = <HTMLInputElement>(
    document.getElementById('schedule')
  );
  // replace all new lines character to space
  let stripped: string = scheduleNode.value.replace(/(\r\n|\n|\r)/gm, ' ');
  // First date of spring instruction
  let datePickNode: HTMLInputElement = <HTMLInputElement>(
    document.getElementById('datepick')
  );
  let userInputDate: string = CURRENTYEAR + '-' + datePickNode.value.toString();
  let strippedArray: string[] = stripped.split('...');
  // There will be an empty item at the end of the array, we want to pop it
  strippedArray.pop();
  // We use the earliest final date to determine when instruction ends
  let earliestFinal: string = findFirstFinal(strippedArray);
  let eventsArray: ICourse[]= [];
  let examsArray: ICourseFinalExam[] = [];

  for (let i = 0; i < strippedArray.length; i++) {
    const courseName: RegExpExecArray = getCourseNames(strippedArray[i]);
    const combinedCourseName: string =
      courseName[1] + courseName[2] + courseName[3];
    const time: RegExpExecArray[] = getTimes(strippedArray[i]);
    const finalExam: RegExpExecArray = getFinalExamMatches(strippedArray[i]);
    const finalExamEvent: ICourseFinalExam = makeFinalExamEvent(
      combinedCourseName,
      finalExam,
    );
    const untilDate: string = earliestFinal;
    examsArray.push(finalExamEvent);
    // 1 item if there's no discussion, else there is discussion.
    for (let j = 0; j < time.length; j++) {
      let event: ICourse = <ICourse>{start: {}, end: {}};
      event['recurrence'] = new Array();
      if (j === 0) {
        event['summary'] = combinedCourseName + ' (Lecture)';
      } else {
        event['summary'] = combinedCourseName + ' (Discussion)';
      }
      let startTime: string = formatTime(
        userInputDate,
        time[j][2],
        time[j][4],
        time[j][1],
      );
      let endTime: string = formatTime(
        userInputDate,
        time[j][3],
        time[j][4],
        time[j][1],
      );
      let location: string = time[j][5];
      event['start']['dateTime'] = startTime;
      event['end']['dateTime'] = endTime;
      event['start']['timeZone'] = DEFAULTTIMEZONE;
      event['end']['timeZone'] = DEFAULTTIMEZONE;
      event['recurrence'].push(getReaccurence(untilDate, time[j][1]));
      event['location'] = location;
      eventsArray.push(event);
    }
  }
  appendListItem(eventsArray, examsArray);
  if (eventsArray.length > 0) {
    showPreviewButton();
  } else {
    hidePreviewButton();
  }
	return { eventsArray, examsArray };
};
const showPreviewButton = () => {
  const buttonNode = document.getElementById('preview');
  buttonNode.classList.remove('hide');
};
const hidePreviewButton = () => {
  const buttonNode = document.getElementById('preview');
  buttonNode.classList.add('hide');
};
const appendListItem = (
  eventsArray: ICourse[],
  examsArray: ICourseFinalExam[],
) => {
  const coursesNode: HTMLElement = document.getElementById('courses');
  // Clear previous appended text
  removeAllChild(coursesNode);
  if (eventsArray.length > 0) {
    for (let i = 0; i < eventsArray.length; i++) {
      let listItem: HTMLDivElement = document.createElement('div');
      let message: string = eventsArray[i].summary;
      let location: string = eventsArray[i].location;
      let date: string =
        ' Every : ' + eventsArray[i].recurrence[0].match(/BYDAY=(\D+)/)[1];
      listItem.classList.add('listItem');
      appendText(message, listItem);
      appendText(date, listItem);
      appendText(location, listItem);
      coursesNode.appendChild(listItem);
    }
  }
  if (examsArray.length > 0) {
    for (let i = 0; i < examsArray.length; i++) {
      let listItem: HTMLDivElement = document.createElement('div');
      let message: string = examsArray[i].summary;
      let date: string =
        examsArray[i].start.dateTime.replace("T", " ") +
        ' - ' +
        examsArray[i].end.dateTime.replace("T", " ");
      listItem.classList.add('listItem');
      appendText(message, listItem);
      appendText(date, listItem);
      coursesNode.appendChild(listItem);
    }
  }
};
const removeAllChild = (node: HTMLElement) => {
  while (node.firstChild) {
    node.removeChild(node.firstChild);
  }
};
const appendText = (message: string, parentNode: HTMLElement) => {
  const textContent: HTMLParagraphElement = document.createElement('p');
  const text: Text = document.createTextNode(message);
  textContent.appendChild(text);
  parentNode.appendChild(textContent);
};
const toggleListClick = () => {
  const coursesNode: HTMLElement = document.getElementById('courses');
  const arrowNode: HTMLElement = document.getElementById('arrow');
  if (coursesNode.classList.contains('hide')) {
    coursesNode.classList.remove('hide');
  } else {
    coursesNode.classList.add('hide');
  }
  if (arrowNode.classList.contains('fa-sort-down')) {
    arrowNode.classList.remove('fa-sort-down');
    arrowNode.classList.add('fa-sort-up');
  } else {
    arrowNode.classList.remove('fa-sort-up');
    arrowNode.classList.add('fa-sort-down');
  }
};
const getReaccurence = (untilDate: string, dates: string) => {
  let baseRule: string = 'RRULE:FREQ=WEEKLY;';
  const datesArray: string[] = dates.split('');
  let rrule: string = '';
  let byday: string = 'BYDAY=';
  let until: string = 'UNTIL=';
  let lastmonth: string = untilDate.slice(0, 6);
  let lastday: number = parseInt(untilDate.slice(-2));
  let lastdayString: string = lastday.toString();
  if (lastday < 10) {
    lastdayString = '0' + lastday.toString();
  }
  until += lastmonth + lastdayString;
  datesArray.forEach(date => {
    byday += DATEDICT[date];
  });
  rrule = baseRule + until + ';' + byday;
  // Remove the last comma
  rrule = rrule.substring(0, rrule.length - 1);
  return rrule;
};
const getFinalExamDates = (date: RegExpExecArray) => {
  let formattedStartDate: string = CURRENTYEAR;
  let formattedEndDate: string = CURRENTYEAR;
  let adjustedStartTimeInt: number = parseInt(date[4]);
  let adjustedEndTimeInt: number = parseInt(date[4]) + 2;
  let adjustedStartTime: string =
    adjustedStartTimeInt.toString() + date[4].slice(-3);
  let adjustedEndTime: string =
    adjustedEndTimeInt.toString() + date[4].slice(-3);
  let finalDatesInArray: string[] = [];
  formattedStartDate += '-' + MONTHDICT[date[2]];
  formattedEndDate += '-' + MONTHDICT[date[2]];
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
  let adjustedDate: string = userInputDate.slice(-2);
  let adjustedDateInt: number = parseInt(adjustedDate);
  let firstDate: string = recurrence.slice(0, 1);
  let adjustedTimeInt: number = parseInt(time);
  let adjustedTime: string = adjustedTimeInt.toString() + time.slice(-3);
  // If h is single digit
  if (time.length === 4) {
    if (amOrPm === 'PM') {
      adjustedTimeInt += 12;
      adjustedTime = adjustedTimeInt.toString() + time.slice(-3);
    }
    if (adjustedTimeInt < 10) {
      adjustedTime = '0' + adjustedTime;
    }
  }
  adjustedDateInt += DATEINTDICT[firstDate];
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
  const cnReg: RegExp = /([A-Z]{1,3}\s\d{1,3}[A-Z]?)(\s-\s)(\D+)\s([MTRWF]{1,3})/;
  let courseNames: RegExpExecArray = cnReg.exec(stripped);
  return courseNames;
};
const getTimes = (stripped: string) => {
  // [1] = Date e.g MWF, TR
  // [2] = Time e.g 1:10 - 2:00
  const dReg: RegExp = /([MTWRF]{1,3})\s(\d{1,2}:\d{1,2})[\s\-]{3}(\d{1,2}:\d{1,2})\s(PM|AM)\s(\w+\s\d+)/gm;
  // let match : RegExpExecArray= dReg.exec(stripped);
  let match: RegExpExecArray;
  let datesArray: RegExpExecArray[] = [];
  while ((match = dReg.exec(stripped)) !== null) {
    datesArray.push(match);
  }
  return datesArray;
};
