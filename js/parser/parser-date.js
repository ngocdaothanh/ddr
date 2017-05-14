define('ddr.parser.date', ['ddr.moment.with.locales'], function (moment) {
    var parseTimeElement = function(timeElement) {
        var datetime = timeElement.attr("datetime");
        var m = moment(datetime, 'YYYY-MM-DD', true);
        return m.isValid() ? m.toDate() : undefined;
    };

    // Java SimpleDateFormat and Moment.js are not fully compatible:
    // http://docs.oracle.com/javase/8/docs/api/java/text/SimpleDateFormat.html
    // http://momentjs.com/docs/#/parsing/string-format/
    //
    // We do these conversions:
    // * y -> Y
    // * d -> D
    // * E -> d
    var javaDateFormatToMomentJsDateFormat = function(javaDateFormat) {
        return javaDateFormat.replace(/y/g, 'Y').replace(/d/g, 'D').replace(/E/g, 'd');
    };

    var parseJavaDate = function(text, dateFormat, language) {
        var momentDateFormat = javaDateFormatToMomentJsDateFormat(dateFormat);
        var m = moment(text, momentDateFormat, language, true);
        return m.isValid() ? m.toDate() : undefined;
    };

    // Can't use moment.js because the format can be arbitary, like: 1-6-2014
    var parseDayMonthYear = function(text) {
        var dateValues = /(\d+)-(\d+)-(\d+)/.exec(text);
        if (dateValues) {
            var day   = parseInt(dateValues[1]);
            var month = parseInt(dateValues[2]) - 1;
            var year  = parseInt(dateValues[3]);
            return new Date(year, month, day);
        } else {
            return undefined;
        }
    };

    return {
        // Returns milliseconds since Epoch, or undefined
        parseDate: function (node, dateFormat, language) {
            var date = undefined;

            if (node) {
                var timeElement = node.find("time");
                if (timeElement.length > 0) {
                    date = parseTimeElement(timeElement);
                } else {
                    var text = node.text().trim();
                    if (text) {
                        // Try Java SimpleDateFormat first, then fall back to DD-MM-YYYY
                        date = parseJavaDate(text, dateFormat, language);
                        if (!date) date = parseDayMonthYear(text);
                    }
                }
            }

            return date ? date.getTime() : undefined;
        }
    };
});
