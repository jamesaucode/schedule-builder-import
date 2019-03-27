'use strict';
type StringMap = { [s: string]: string; }
type StringIntMap = { [s: string]: number; }
type course = {
	summary : string,
	start: { dateTime: string, timeZone: string },
	end: { dateTime: string, timeZone: string },
	location : string, 
	recurrence: string[]
}
type courseFinalExam = {
	summary : string,
	start : { dateTime : string, timeZone: string },
	end: { dateTime : string, timeZone: string }
}
const currentDateObject : Date = new Date();
const currentYear : string = currentDateObject.getFullYear().toString();
const defaultTimeZone : string = 'America/Los_Angeles';
const monthDict : StringMap = {
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
const dateDict : StringMap = {M: 'MO,', T: 'TU,', W: 'WE,', R: 'TH,', F: 'FR,'};
const dateIntDict : StringIntMap = {T: 1, W: 2, R: 3, F: 4};
const getFinalExamMatches = (stripped: string) => {
  const fReg : RegExp = /Final\sExam:\s(\D{3})\.\s(\D{3})\.(\d{1,2})\sat\s(\d{1,2}:\d{1,2})(am|pm)/gm;
  let match : RegExpExecArray = fReg.exec(stripped);
  return match;
};
const makeFinalExamEvent = (
  courseName: string,
  parsedFinalExam: RegExpExecArray,
) => {
  let finalExamEvent : Object = new Object();
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
  let earliestFinal : string = "999999999";
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
const handleChange = (event : KeyboardEvent) => {
  const errorNode = <HTMLInputElement>document.getElementById('error');
  let datePickNode = <HTMLInputElement>document.getElementById('datepick');
  const re = /^\d{4}\-\d{2}\-\d{2}$/;
  if (datePickNode.value.match(re) || datePickNode.value.length === 0) {
    errorNode.style.display = 'none';
  } else {
    errorNode.style.display = 'block';
  }
};
const createEventObjects = () => {
  let scheduleNode = <HTMLInputElement>document.getElementById('schedule');
  // replace all new lines character to space
  let stripped : string = scheduleNode.value.replace(/(\r\n|\n|\r)/gm, ' ');
  // First date of spring instruction
  let datePickNode = <HTMLInputElement>document.getElementById('datepick');
  let userInputDate : string = datePickNode.value.toString();
  let strippedArray : string[] = stripped.split('...');
  // There will be an empty item at the end of the array, we want to pop it
  strippedArray.pop();
  // We use the earliest final date to determine when instruction ends
  let earliestFinal : string = findFirstFinal(strippedArray);
  let finalEventsArray : course[] = [];
  for (let i = 0; i < strippedArray.length; i++) {
    const courseName : RegExpExecArray = getCourseNames(strippedArray[i]);
    const combinedCourseName : string = courseName[1] + courseName[2] + courseName[3];
    const time : Object[] = getTimes(strippedArray[i]);
    const finalExam : RegExpExecArray = getFinalExamMatches(strippedArray[i]);
    const finalExamEvent : any = makeFinalExamEvent(combinedCourseName, finalExam);
    const untilDate : string = earliestFinal;
    finalEventsArray.push(finalExamEvent);
    let e;
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
      let startTime : string = formatTime(
        userInputDate,
        time[j][2],
        time[j][4],
        time[j][1],
      );
      let endTime : string = formatTime(
        userInputDate,
        time[j][3],
        time[j][4],
        time[j][1],
      );
      let location : string = time[j][5];
      e['start']['dateTime'] = startTime;
      e['end']['dateTime'] = endTime;
      e['start']['timeZone'] = defaultTimeZone;
      e['end']['timeZone'] = defaultTimeZone;
      e['recurrence'].push(getReaccurence(untilDate, time[j][1]));
      e['location'] = location;
      finalEventsArray.push(e);
    }
  }
  appendListItem(finalEventsArray);
  console.log(finalEventsArray);
  return finalEventsArray;
};
const appendListItem = (finalEventsArray: course[]) => {
  const coursesNode : HTMLElement = document.getElementById('courses');
  removeAllChild(coursesNode);
  if (finalEventsArray.length > 0) {
    for (let i = 0; i < finalEventsArray.length; i++) {
      var listItem : HTMLElement = document.createElement('p');
      listItem.classList.add('listItem');
	appendText(i + 1 + ' . ' + finalEventsArray[i].summary + '\n', listItem)
      coursesNode.appendChild(listItem);
    }
  } else {
	  appendText("Nothing to show!", coursesNode)
  }
};
const removeAllChild = (node : HTMLElement) => {
	while (node.firstChild) {
		node.removeChild(node.firstChild)
	}
}
const appendText = (message : string, parentNode ) => {
	const textContent : Text = document.createTextNode(message)
	parentNode.appendChild(textContent)
}
const toggleListClick = () => {
  const coursesNode : HTMLElement = document.getElementById('courses');
  if (coursesNode.classList.contains('hide')) {
    coursesNode.classList.remove('hide');
  } else {
    coursesNode.classList.add('hide');
  }
};
const getReaccurence = (untilDate: string, dates: string) => {
  let baseRule : string = 'RRULE:FREQ=WEEKLY;';
  const datesArray : string[] = dates.split('');
  let rrule : string = '';
  let byday : string = 'BYDAY=';
  let until : string = 'UNTIL=';
  let lastmonth : string = untilDate.slice(0, 6);
  let lastday : number = parseInt(untilDate.slice(-2));
  let lastdayString : string  = lastday.toString();
  if (lastday < 10) {
    lastdayString = '0' + lastday.toString();
  }
  until += lastmonth + lastdayString;
  datesArray.forEach(date => {
    byday += dateDict[date];
  });
  rrule = baseRule + until + ';' + byday;
  // Remove the last comma
  rrule = rrule.substring(0, rrule.length - 1);
  return rrule;
};
const getFinalExamDates = (date: RegExpExecArray) => {
  let formattedStartDate : string = currentYear;
  let formattedEndDate : string = currentYear;
  let adjustedStartTimeInt : number = parseInt(date[4]);
  let adjustedEndTimeInt : number = parseInt(date[4]) + 2;
  let adjustedStartTime : string = adjustedStartTimeInt.toString() + date[4].slice(-3);
  let adjustedEndTime : string = adjustedEndTimeInt.toString() + date[4].slice(-3);
  let finalDatesInArray : string[] = new Array();

  formattedStartDate += '-' + monthDict[date[2]];
  formattedEndDate += '-' + monthDict[date[2]];
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
  let adjustedDate : string = userInputDate.slice(-2);
  let adjustedDateInt : number = parseInt(adjustedDate);
  let firstDate : string = recurrence.slice(0, 1);
  let adjustedTimeInt : number = parseInt(time);
  let adjustedTime : string = adjustedTimeInt.toString() + time.slice(-3);
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
  adjustedDateInt += dateIntDict[firstDate];
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
  const cnReg : RegExp = /([A-Z]{1,3}\s\d{1,3}[A-Z]?)(\s-\s)(\D+)\s([MTRWF]{1,3})/;
  let courseNames : RegExpExecArray= cnReg.exec(stripped);
  return courseNames;
};
const getTimes = (stripped: string) => {
  // [1] = Date e.g MWF, TR
  // [2] = Time e.g 1:10 - 2:00
  const dReg : RegExp = /([MTWRF]{1,3})\s(\d{1,2}:\d{1,2})[\s\-]{3}(\d{1,2}:\d{1,2})\s(PM|AM)\s(\w+\s\d+)/gm;
	// let match : RegExpExecArray= dReg.exec(stripped);
	let match;
	let datesArray : Object[] = [];
  while (( match = dReg.exec(stripped)) !== null) {
    datesArray.push(match);
  }
  return datesArray;
};
