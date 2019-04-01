'use strict';
window.onload = function () {
    handleChange();
    createEventObjects();
};
/***********************/
/* constants */
var CURRENTDATEOBJECT = new Date();
var CURRENTYEAR = CURRENTDATEOBJECT.getFullYear().toString();
var DEFAULTTIMEZONE = 'America/Los_Angeles';
var MONTHDICT = {
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
    Dec: '12'
};
var DATEDICT = { M: 'MO,', T: 'TU,', W: 'WE,', R: 'TH,', F: 'FR,' };
var DATEINTDICT = { T: 1, W: 2, R: 3, F: 4 };
/**************/
var getFinalExamMatches = function (stripped) {
    var fReg = /Final\sExam:\s(\D{3})\.\s(\D{3})\.(\d{1,2})\sat\s(\d{1,2}:\d{1,2})(am|pm)/gm;
    var match = fReg.exec(stripped);
    return match;
};
var makeFinalExamEvent = function (courseName, parsedFinalExam) {
    var finalExamEvent = {
        start: {},
        end: {}
    };
    finalExamEvent['start']['dateTime'] = getFinalExamDates(parsedFinalExam)[0];
    finalExamEvent['end']['dateTime'] = getFinalExamDates(parsedFinalExam)[1];
    finalExamEvent['start']['timeZone'] = DEFAULTTIMEZONE;
    finalExamEvent['end']['timeZone'] = DEFAULTTIMEZONE;
    finalExamEvent['summary'] = courseName + ' (Final)';
    return finalExamEvent;
};
var findFirstFinal = function (strippedArray) {
    var earliestFinal = '999999999';
    for (var i = 0; i < strippedArray.length; i++) {
        var finalExam = getFinalExamMatches(strippedArray[i]);
        if (finalExam !== null) {
            var finalExamStartDate = getFinalExamDates(finalExam)[0].slice(0, 10);
            var untilDate = finalExamStartDate.replace(/-/g, '');
            if (untilDate < earliestFinal) {
                earliestFinal = untilDate;
            }
        }
    }
    return earliestFinal;
};
var validateDate = function () {
    var re = /^\d{2}\-\d{2}$/;
    var datePickNode = document.getElementById('datepick');
    if (datePickNode.value.match(re) || datePickNode.value.length === 0) {
        return true;
    }
    return false;
};
var handleChange = function () {
    var errorNode = document.getElementById('error');
    if (validateDate() === true) {
        errorNode.style.display = 'none';
    }
    else {
        errorNode.style.display = 'block';
    }
};
var createEventObjects = function () {
    var scheduleNode = (document.getElementById('schedule'));
    // replace all new lines character to space
    var stripped = scheduleNode.value.replace(/(\r\n|\n|\r)/gm, ' ');
    // First date of spring instruction
    var datePickNode = (document.getElementById('datepick'));
    var userInputDate = CURRENTYEAR + '-' + datePickNode.value.toString();
    var strippedArray = stripped.split('...');
    // There will be an empty item at the end of the array, we want to pop it
    strippedArray.pop();
    // We use the earliest final date to determine when instruction ends
    var earliestFinal = findFirstFinal(strippedArray);
    var eventsArray = [];
    var examsArray = [];
    for (var i = 0; i < strippedArray.length; i++) {
        var courseName = getCourseNames(strippedArray[i]);
        var combinedCourseName = courseName[1] + courseName[2] + courseName[3];
        var time = getTimes(strippedArray[i]);
        var finalExam = getFinalExamMatches(strippedArray[i]);
        if (finalExam !== null) {
            var finalExamEvent = makeFinalExamEvent(combinedCourseName, finalExam);
            examsArray.push(finalExamEvent);
        }
        var untilDate = earliestFinal;
        // 1 item if there's no discussion, else there is discussion.
        for (var j = 0; j < time.length; j++) {
            var event_1 = { start: {}, end: {} };
            event_1['recurrence'] = new Array();
            if (j === 0) {
                event_1['summary'] = combinedCourseName + ' (Lecture)';
            }
            else {
                event_1['summary'] = combinedCourseName + ' (Discussion)';
            }
            var startTime = formatTime(userInputDate, time[j][2], time[j][4], time[j][1]);
            var endTime = formatTime(userInputDate, time[j][3], time[j][4], time[j][1]);
            var location_1 = time[j][5];
            event_1['start']['dateTime'] = startTime;
            event_1['end']['dateTime'] = endTime;
            event_1['start']['timeZone'] = DEFAULTTIMEZONE;
            event_1['end']['timeZone'] = DEFAULTTIMEZONE;
            event_1['recurrence'].push(getReaccurence(untilDate, time[j][1]));
            event_1['location'] = location_1;
            eventsArray.push(event_1);
        }
    }
    appendListItem(eventsArray, examsArray);
    if (eventsArray.length > 0) {
        showPreviewButton();
    }
    else {
        hidePreviewButton();
    }
    return { eventsArray: eventsArray, examsArray: examsArray };
};
var showPreviewButton = function () {
    var buttonNode = document.getElementById('preview');
    buttonNode.classList.remove('hide');
};
var hidePreviewButton = function () {
    var buttonNode = document.getElementById('preview');
    buttonNode.classList.add('hide');
};
var appendListItem = function (eventsArray, examsArray) {
    var coursesNode = document.getElementById('courses');
    // Clear previous appended text
    removeAllChild(coursesNode);
    if (eventsArray.length > 0) {
        for (var i = 0; i < eventsArray.length; i++) {
            var listItem = document.createElement('div');
            var message = eventsArray[i].summary;
            var location_2 = eventsArray[i].location;
            var date = ' Every : ' +
                eventsArray[i].recurrence[0].match(/BYDAY=(\D+)/)[1];
            listItem.classList.add('listItem');
            appendText(message, listItem);
            appendText(date, listItem);
            appendText(location_2, listItem);
            coursesNode.appendChild(listItem);
        }
    }
    if (examsArray.length > 0) {
        for (var i = 0; i < examsArray.length; i++) {
            var listItem = document.createElement('div');
            var message = examsArray[i].summary;
            var date = examsArray[i].start.dateTime.replace('T', ' ') +
                ' - ' +
                examsArray[i].end.dateTime.replace('T', ' ');
            listItem.classList.add('listItem');
            appendText(message, listItem);
            appendText(date, listItem);
            coursesNode.appendChild(listItem);
        }
    }
};
var removeAllChild = function (node) {
    while (node.firstChild) {
        node.removeChild(node.firstChild);
    }
};
var appendText = function (message, parentNode) {
    var textContent = document.createElement('p');
    var text = document.createTextNode(message);
    textContent.appendChild(text);
    parentNode.appendChild(textContent);
};
var toggleListClick = function () {
    var coursesNode = document.getElementById('courses');
    var arrowNode = document.getElementById('arrow');
    if (coursesNode.classList.contains('hide')) {
        coursesNode.classList.remove('hide');
    }
    else {
        coursesNode.classList.add('hide');
    }
    if (arrowNode.classList.contains('fa-sort-down')) {
        arrowNode.classList.remove('fa-sort-down');
        arrowNode.classList.add('fa-sort-up');
    }
    else {
        arrowNode.classList.remove('fa-sort-up');
        arrowNode.classList.add('fa-sort-down');
    }
};
var getReaccurence = function (untilDate, dates) {
    var baseRule = 'RRULE:FREQ=WEEKLY;';
    var datesArray = dates.split('');
    var rrule = '';
    var byday = 'BYDAY=';
    var until = 'UNTIL=';
    var lastmonth = untilDate.slice(0, 6);
    var lastday = parseInt(untilDate.slice(-2));
    var lastdayString = lastday.toString();
    if (lastday < 10) {
        lastdayString = '0' + lastday.toString();
    }
    until += lastmonth + lastdayString;
    datesArray.forEach(function (date) {
        byday += DATEDICT[date];
    });
    rrule = baseRule + until + ';' + byday;
    // Remove the last comma
    rrule = rrule.substring(0, rrule.length - 1);
    return rrule;
};
var getFinalExamDates = function (date) {
    var formattedStartDate = CURRENTYEAR;
    var formattedEndDate = CURRENTYEAR;
    var adjustedStartTimeInt = parseInt(date[4]);
    var adjustedEndTimeInt = parseInt(date[4]) + 2;
    var adjustedStartTime = adjustedStartTimeInt.toString() + date[4].slice(-3);
    var adjustedEndTime = adjustedEndTimeInt.toString() + date[4].slice(-3);
    var finalDatesInArray = [];
    formattedStartDate += '-' + MONTHDICT[date[2]];
    formattedEndDate += '-' + MONTHDICT[date[2]];
    formattedStartDate += '-' + date[3];
    formattedEndDate += '-' + date[3];
    // google api requires double digit hh
    if (date[4].length === 4) {
        if (date[5] === 'pm') {
            adjustedStartTimeInt += 12;
            adjustedStartTime =
                adjustedStartTimeInt.toString() + date[4].slice(-3);
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
var formatTime = function (userInputDate, time, amOrPm, recurrence) {
    // Turn hh:mm to hh:mm:ss
    var adjustedDate = userInputDate.slice(-2);
    var adjustedDateInt = parseInt(adjustedDate);
    var firstDate = recurrence.slice(0, 1);
    var adjustedTimeInt = parseInt(time);
    var adjustedTime = adjustedTimeInt.toString() + time.slice(-3);
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
    return (userInputDate.slice(0, userInputDate.length - 2) +
        adjustedDate +
        'T' +
        adjustedTime +
        ':00');
};
var getCourseNames = function (stripped) {
    // Desired outcome:
    // [0] = Full match
    // [1] = Course code e.g ECS34
    // [2] = the separator (useless)
    // [3] = Course name e.g Introduction to Programming
    // [4] = Date (not useful, mainly to capture the garbage)
    var cnReg = /([A-Z]{1,3}\s\d{1,3}[A-Z]?)(\s-\s)(\D+)\s([MTRWF]{1,3})/;
    var courseNames = cnReg.exec(stripped);
    return courseNames;
};
var getTimes = function (stripped) {
    // [1] = Date e.g MWF, TR
    // [2] = Time e.g 1:10 - 2:00
    var dReg = /([MTWRF]{1,3})\s(\d{1,2}:\d{1,2})[\s\-]{3}(\d{1,2}:\d{1,2})\s(PM|AM)\s(\w+\s\d+)/gm;
    // let match : RegExpExecArray= dReg.exec(stripped);
    var match;
    var datesArray = [];
    while ((match = dReg.exec(stripped)) !== null) {
        datesArray.push(match);
    }
    return datesArray;
};
