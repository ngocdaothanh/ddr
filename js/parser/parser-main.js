define('ddr.parser.main', ['ddr.parser.table', 'ddr.parser.ddr', 'plite'], function (tableParser, ddrParser, plite, microevent) {
    return {
        parse: function (root, colOptions, dateFormat, language) {
            root = $(root);
            var tables = root.find("table");
            //var events = new microevent();

            var promises = _.map(tables, function (table) {
                return tableParser.parseTable($(table)).then(function(parsedTable) {
                    return ddrParser.parseDDRTable(parsedTable, colOptions, dateFormat, language)
                });
            });

            return plite.all(promises).then(function (results) {
                var allSwimlanes = _.map(results, function (result) {
                    _.each(result.errors, function (error) {
                        console.log("Failed to pass row ", error.row, " of table. Error: ", error.title)
                    });

                    return result.swimlanes;
                });

                var mergedSwimlanes = {};

                _.each(allSwimlanes, function(newSwimlanes) {
                    _.each(newSwimlanes, function (v, k) {
                        var swimlane = mergedSwimlanes[k];
                        if (!swimlane) {
                            mergedSwimlanes[k] = v;
                        } else {
                            swimlane.events = swimlane.events.concat(v.events);
                        }
                    });
                });

                return mergedSwimlanes;
            }).then(function (swimlanes) {
                return _.values(swimlanes);
            });
        }
    }
});
