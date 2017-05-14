(function(d3, c3) {
    window.DataDrivenRoadmap = window.DataDrivenRoadmap || {};
    
    function RowMapper() {
        function doesOverlap(a, b) {
            return a.x < b.x + b.width && a.x + a.width > b.x;
        }

        var rows = [[]];

        /**
         * @param {{x: number, width: number}} box
         * @returns {number} the row index the box was inserted into
         */
        return function(box) {
            var addedToRow = -1;
            // For each event already added, find the first row that doesn't conflict
            _.some(rows, function(row, rowIndex) {
                var hasOverlapInRow = _.some(row, function(existingBox) {
                    return doesOverlap(existingBox, box);
                });
                if (!hasOverlapInRow) {
                    // No overlap in this row, add this box to it
                    row.push(box);
                    addedToRow = rowIndex;
                    return true;
                }
                return false;
            });
            if (addedToRow === -1) {
                // Create a new row
                rows.push([box]);
                addedToRow = rows.length - 1;
            }
            return addedToRow;
        };
    };

    DataDrivenRoadmap.swimlaneContents = function() {
        function isMilestone(d) {
            return d.start === d.end;
        }

        var numRows = 0;

        return c3.drawable()
            .extend({
                xScale: c3.prop(),
                rowHeight: c3.prop(),
                numRows: function() {
                    return numRows;
                }
            })
            .update(function(event) {
                var xScale = this.xScale();
                var rowHeight = this.rowHeight();
                var milestone = DataDrivenRoadmap.milestone()
                    .xScale(xScale)
                    .rowHeight(rowHeight);
                var duration = DataDrivenRoadmap.duration()
                    .xScale(xScale)
                    .rowHeight(rowHeight);

                function getComponentFor(d) {
                    return (isMilestone(d) ? milestone : duration).data([d]);
                }

                var rowMapper = RowMapper();
                numRows = 0;
                event.selection.each(function(d) {
                    var group = d3.select(this);

                    // Draw the component
                    getComponentFor(d)(group);

                    // Adjust y-pos of the group, based on row in the swimlane
                    var box = _.pick(this.getBBox(), 'x', 'width');
                    if (isMilestone(d)) {
                        // Give milestones extra padding to allow for spacing between text
                        box.x -= 10;
                        box.width += 10;
                    }
                    var row = rowMapper(box);
                    numRows = Math.max(row + 1, numRows);
                    var y = row * rowHeight;
                    group.attr('transform', 'translate(0,' + y + ')');
                });
            });
    };
}(d3, c3));
