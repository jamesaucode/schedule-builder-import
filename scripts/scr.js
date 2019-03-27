'use strict';
var currentDateObject = new Date();
var currentYear = currentDateObject.getFullYear().toString();
var defaultTimeZone = 'America/Los_Angeles';
var monthDict = {
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
var dateDict = { M: 'MO,', T: 'TU,', W: 'WE,', R: 'TH,', F: 'FR,' };
var dateIntDict = { T: 1, W: 2, R: 3, F: 4 };
var getFinalExamMatches = function (stripped) {
    var fReg = /Final\sExam:\s(\D{3})\.\s(\D{3})\.(\d{1,2})\sat\s(\d{1,2}:\d{1,2})(am|pm)/gm;
    var match = fReg.exec(stripped);
    return match;
};
var makeFinalExamEvent = function (courseName, parsedFinalExam) {
    var finalExamEvent = new Object();
    finalExamEvent['start'] = new Object();
    finalExamEvent['end'] = new Object();
    finalExamEvent['start']['dateTime'] = getFinalExamDates(parsedFinalExam)[0];
    finalExamEvent['end']['dateTime'] = getFinalExamDates(parsedFinalExam)[1];
    finalExamEvent['start']['timeZone'] = 'America/Los_Angeles';
    finalExamEvent['end']['timeZone'] = 'America/Los_Angeles';
    finalExamEvent['summary'] = courseName + ' (Final)';
    return finalExamEvent;
};
var findFirstFinal = function (strippedArray) {
    var earliestFinal = '99999999999';
    for (var i = 0; i < strippedArray.length; i++) {
        var finalExam = getFinalExamMatches(strippedArray[i]);
        var finalExamStartDate = getFinalExamDates(finalExam)[0].slice(0, 10);
        var untilDate = finalExamStartDate.replace(/-/g, '');
        if (untilDate < earliestFinal) {
            earliestFinal = untilDate;
        }
    }
    return earliestFinal;
};
var handleChange = function (event) {
    var errorNode = document.getElementById('error');
    var datePickNode = document.getElementById('datepick');
    var re = /^\d{4}\-\d{2}\-\d{2}$/;
    if (datePickNode.value.match(re) || datePickNode.value.length === 0) {
        errorNode.style.display = 'none';
    }
    else {
        errorNode.style.display = 'block';
    }
};
var createEventObjects = function () {
    var scheduleNode = document.getElementById('schedule');
    // replace all new lines character to space
    var stripped = scheduleNode.value.replace(/(\r\n|\n|\r)/gm, ' ');
    // First date of spring instruction
    var datePickNode = document.getElementById('datepick');
    var userInputDate = datePickNode.value.toString();
    var strippedArray = stripped.split('...');
    // There will be an empty item at the end of the array, we want to pop it
    strippedArray.pop();
    // We use the earliest final date to determine when instruction ends
    var earliestFinal = findFirstFinal(strippedArray);
    var finalEventsArray = [];
    for (var i = 0; i < strippedArray.length; i++) {
        var courseName = getCourseNames(strippedArray[i]);
        var combinedCourseName = courseName[1] + courseName[2] + courseName[3];
        var time = getTimes(strippedArray[i]);
        var finalExam = getFinalExamMatches(strippedArray[i]);
        var finalExamEvent = makeFinalExamEvent(combinedCourseName, finalExam);
        var untilDate = earliestFinal;
        finalEventsArray.push(finalExamEvent);
        var e = new Object();
        // 1 item if there's no discussion, else there is discussion.
        for (var j = 0; j < time.length; j++) {
            e = new Object();
            e['start'] = new Object();
            e['end'] = new Object();
            e['recurrence'] = new Array();
            if (j == 0) {
                e['summary'] = combinedCourseName + ' (Lec)';
            }
            else {
                e['summary'] = combinedCourseName + ' (Dis)';
            }
            var startTime = formatTime(userInputDate, time[j][2], time[j][4], time[j][1]);
            var endTime = formatTime(userInputDate, time[j][3], time[j][4], time[j][1]);
            var location_1 = time[j][5];
            e['start']['dateTime'] = startTime;
            e['end']['dateTime'] = endTime;
            e['start']['timeZone'] = defaultTimeZone;
            e['end']['timeZone'] = defaultTimeZone;
            e['recurrence'].push(getReaccurence(untilDate, time[j][1]));
            e['location'] = location_1;
            finalEventsArray.push(e);
        }
    }
    console.log(finalEventsArray);
    return finalEventsArray;
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
        byday += dateDict[date];
    });
    rrule = baseRule + until + ';' + byday;
    // Remove the last comma
    rrule = rrule.substring(0, rrule.length - 1);
    return rrule;
};
var getFinalExamDates = function (date) {
    var formattedStartDate = currentYear;
    var formattedEndDate = currentYear;
    var adjustedStartTimeInt = parseInt(date[4]);
    var adjustedEndTimeInt = parseInt(date[4]) + 2;
    var adjustedStartTime = adjustedStartTimeInt.toString() + date[4].slice(-3);
    var adjustedEndTime = adjustedEndTimeInt.toString() + date[4].slice(-3);
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
    var finalDatesInArray = new Array();
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
    var match = dReg.exec(stripped);
    var datesArray = [];
    while (match != null) {
        datesArray.push(match);
        match = dReg.exec(stripped);
    }
    return datesArray;
};
