(function(d3, c3) {
    window.DataDrivenRoadmap = window.DataDrivenRoadmap || {};

    DataDrivenRoadmap.milestone = function() {
        var diamond = c3.drawable()
            .extend({
                x: c3.inherit('x'),
                y: c3.inherit('y'),
                milestoneSize: c3.inherit('milestoneSize')
            })
            .elementTag('rect')
            .update(function(event) {
                var milestoneSize = this.milestoneSize();
                var halfSize = milestoneSize / 2;
                var x = this.x();
                var y = this.y();
                event.selection.each(function(d) {
                    d3.select(this).attr({
                        width: milestoneSize,
                        height: milestoneSize,
                        x: x(d) - halfSize,
                        y: y,
                        transform: 'rotate(45,' + (x(d)) + ',' + (y + halfSize) + ')'
                    });
                });
            });

        var label = c3.drawable()
            .extend({
                x: c3.inherit('x'),
                y: c3.inherit('y'),
                milestoneSize: c3.inherit('milestoneSize'),
                xScale: c3.inherit('xScale'),
                padding: c3.prop(10)
            })
            .elementTag('text')
            .update(function(event) {
                var milestoneSize = this.milestoneSize();
                var halfSize = milestoneSize / 2;
                var x = this.x();
                var y = this.y();
                var xScale = this.xScale();
                var padding = this.padding();
                event.selection.each(function(d) {
                    var labelElement = d3.select(this).text(d.label)
                        .attr('y', y + milestoneSize - 4);

                    var labelWidth = labelElement.node().getBBox().width;

                    var scaledX = x(d);
                    if (scaledX + halfSize + labelWidth > xScale.range()[1]) {
                        // Position label on the left of the milestone
                        labelElement.attr('x', scaledX - halfSize - labelWidth - padding);
                    } else {
                        // Position label on the right of the milestone
                        labelElement.attr('x', scaledX + halfSize + padding);
                    }
                });
            });

        return c3.component()
            .extend({
                data: c3.prop([]),
                xScale: c3.prop(),
                rowHeight: c3.prop(),
                milestoneSize: c3.prop(15),
                x: function() {
                    var xScale = this.xScale();
                    return function(d) {
                        return xScale(d.start);
                    };
                },
                y: function() {
                    var rowHeight = this.rowHeight();
                    var milestoneSize = this.milestoneSize();
                    return (rowHeight - milestoneSize) / 2;
                }
            })
            .extend(function() {
                var selection = this.selection().classed('milestone', true);
                diamond.parent(this)(selection);
                label.parent(this)(selection);
                DataDrivenRoadmap.utils.applyStatusColor(selection);
            });
    };
}(d3, c3));