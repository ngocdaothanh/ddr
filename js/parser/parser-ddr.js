define('ddr.parser.ddr', ['underscore', 'ddr.parser.status', 'ddr.parser.date', 'parse-duration'], function (_, statusParser, dateParser, parseDuration) {
    'use strict';
    function SwimlaneEvent(startDate, endDate, title, status, swimlane) {
        this.data = {};
        this.start = startDate;
        this.end = endDate;
        this.label = title;
        //TODO: status color vs status
        this.statusColor = status;
        this.swimlane = swimlane;

        this.putProperty = function (name, value) {
            this.data[name] = value;
        };
    }

    var parseDDRTable = function(table, colOptions, dateFormat, language) {
        var errors = [];

        var tableHasNoColumns = function(columns) {
            return _.intersection(table.columns, columns).length === 0;
        };

        if (tableHasNoColumns(colOptions.swimlane)
            || tableHasNoColumns(colOptions.title)
            || tableHasNoColumns(colOptions.status)) {
            return errors.push({title: "Table missing required columns: swimlane, title, or status", row: -1});
        }

        // One of start date or end date can be missing
        if (tableHasNoColumns(colOptions.startDate)
            && tableHasNoColumns(colOptions.endDate)) {
            return errors.push({title: "Table missing required columns: start date and end date", row: -1});
        }

        var swimlanes = {};

        function addSwimlaneEvent(swimlane, event) {
            // Case insensitive
            function getExistingSwimlane() {
                var swimlaneLowerCase = swimlane.toLowerCase();
                return _.find(_.keys(swimlanes), function(key) { return key.toLowerCase() === swimlaneLowerCase});
            }

            var key = getExistingSwimlane();

            if (key) {
                swimlanes[key].events.push(event);
            } else {
                swimlanes[swimlane] = {name: swimlane, events: [event]};
            }
        }

        var aggregateSwimlanes = colOptions.aggregateSwimlanes;

        // Returns the matched (case insensitive) swimlane in eventSwimlane or undefined.
        function matchAggregateSwimlanes(eventSwimlane) {
            // https://developer.mozilla.org/en/docs/Web/JavaScript/Guide/Regular_Expressions
            function escapeRegExp(string) {
                return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            }

            for (var i = 0; i < aggregateSwimlanes.length; i++) {
                var aswimlane = aggregateSwimlanes[i];
                var pattern = new RegExp('(^|\\s)(' + escapeRegExp(aswimlane) + ')($|\\s)', 'im');
                var matchRet = pattern.exec(eventSwimlane);
                if (matchRet) {
                    // Return the matched swimlane in eventSwimlane, not aswimlane which is lower case
                    return matchRet[2];
                }
            }

            return undefined;
        }

        for (var i = 0; i < table.rows.length; i++) {
            var row = table.rows[i];

            var event = null;
            try {
                event = parseRow(row, i, table, colOptions, dateFormat, language, swimlanes);
            } catch (ex) {
                errors.push(ex);
            }

            if (event == null) {
                continue;
            }

            var swimlane = matchAggregateSwimlanes(event.swimlane);
            if (swimlane) {
                addSwimlaneEvent(swimlane, event);
            } else {
                addSwimlaneEvent(event.swimlane, event);
            }
        }

        return {
            errors: errors,
            swimlanes: swimlanes,
            table: table
        };
    };

    var trim = function(str) {
        return str.replace(String.fromCharCode(160), " ").trim();
    };

    var isEmpty = function(node) {
        if (node) {
            var text = trim(node.text());

            if (text !== "") return false;
        }

        return true;
    };

    var parseDurationNode = function(node, name, i) {
        if (node) {
            var text = trim(node.text());
            if (text) {
                var duration = parseDuration(text);
                if (isNaN(duration)) {
                    throw {title: "Error parsing " + name, row: i};
                }
                return duration;
            }
        }
        return null;
    };

    var parseNumberNode = function(node, name, i) {
        if (node) {
            var text = trim(node.text());
            if (text) {
                var duration = parseFloat(text);
                if (isNaN(duration)) {
                    throw {title: "Error parsing " + name, row: i};
                }
                return duration;
            }
        }
        return null;
    };

    var parseRow = function(row, i, table, colOptions, dateFormat, language, swimlanes) {
        var usedColNames = [];
        var getCol = function(colNames) {
            if (!colNames) {
                return null;
            }
            for (var i = 0; i < colNames.length; i++) {
                var name = colNames[i];
                var col  = row[name];
                if (col) {
                    usedColNames.push(name);
                    return col;
                }
            }
            return null;
        };

        var swimlaneNode = getCol(colOptions.swimlane);
        var titleNode = getCol(colOptions.title);

        var startDate = getCol(colOptions.startDate);
        var endDate = getCol(colOptions.endDate);
        var effortNode = getCol(colOptions.effort);
        var peopleNode = getCol(colOptions.people);
        var status = getCol(colOptions.status);

        if (isEmpty(swimlaneNode) || isEmpty(titleNode) || isEmpty(status)) {
            throw {title: "Missing swimlane, title or status", row: i};
        }

        var swimlane = trim(swimlaneNode.text());
        var title = titleNode.text();

        var statusColor = statusParser.parseStatus(status);
        var statusText = status ? status.text() : "";

        var start = dateParser.parseDate(startDate, dateFormat, language);
        var end = dateParser.parseDate(endDate, dateFormat, language);
        var effort = isEmpty(effortNode) ? null : parseDurationNode(effortNode);
        var people = parseNumberNode(peopleNode);

        var previousSwimlaneEventEnd;
        if (swimlanes[swimlane]) {
            var swimlaneEvents = swimlanes[swimlane] ? swimlanes[swimlane].events : null;
            previousSwimlaneEventEnd = (swimlaneEvents && swimlaneEvents.length) ? swimlaneEvents[swimlaneEvents.length-1].end : null;
        }

        if (!start && !previousSwimlaneEventEnd) {
            throw {title: "Failed to parse start date or no previous swimlane", row: row};
        }

        if (!start && !end) {
            start = previousSwimlaneEventEnd;
        }

        if (!end) {
            if ((effort && isNaN(effort)) || (people && isNaN(people))) {
                throw {title: "Failed to parse effort + people", row: row};
            }

            if (effort && people) {
                end = start + effort / people;
            }
        }

        var swimlaneEvent = new SwimlaneEvent(
                start,
                end,
                title,
                statusColor,
                swimlane
        );

        swimlaneEvent.putProperty("Status", statusText);

        for (var j = 0; j < table.columnNames.length; j++) {
            var column = table.columnNames[j];
            var lowerCase = column.toLowerCase();
            if (!_.contains(usedColNames, lowerCase) && column) {
                var cell = row[lowerCase];
                var htmlContents = cell.html();
                swimlaneEvent.putProperty(column, htmlContents);
            }
        }

        return swimlaneEvent;
    };

    return {
        parseDDRTable: parseDDRTable
    };
});