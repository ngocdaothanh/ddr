(function(c3) {
    window.DataDrivenRoadmap = window.DataDrivenRoadmap || {};

    DataDrivenRoadmap.processData = function(data, startDate, endDate) {
        return _.compact(_.map(data, function(swimlane) {
            swimlane = _.clone(swimlane);
            swimlane.events = _.compact(_.map(swimlane.events, function(event) {
                // Normalize milestones by giving them the same start and end date
                if (!event.start) {
                    event.start = event.end;
                } else if (!event.end) {
                    event.end = event.start;
                }

                // Filter out events that don't occur in the given timeframe
                if (startDate !== -1 && event.end < startDate) return null;
                if (endDate !== -1 && event.start > endDate) return null;

                return event;
            }));
            return swimlane.events.length ? swimlane : null;
        }));
    };

}(c3));