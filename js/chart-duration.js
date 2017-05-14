(function(c3) {
    window.DataDrivenRoadmap = window.DataDrivenRoadmap || {};

    DataDrivenRoadmap.duration = function() {
        function truncatedStart(xScale, d) {
            return Math.max(xScale(d.start), xScale.range()[0]);
        }

        function truncatedEnd(xScale, d) {
            return Math.min(xScale(d.end), xScale.range()[1]);
        }

        function isStartTruncated(xScale, d) {
            return xScale.domain()[0] > d.start;
        }

        function isEndTruncated(xScale, d) {
            return xScale.domain()[1] < d.end;
        }

        function rectPath(x, y, width, height, r, roundLeft, roundRight) {
            var leftR = roundLeft ? r : 0;
            var rightR = roundRight ? r : 0;
            return 'M' + (x + leftR) + ',' + y +
                'h' + (width - leftR - rightR) +
                (rightR ?
                    'a' + rightR + ',' + rightR + ' 0 0 1 ' + rightR + ',' + rightR :
                    '') +
                'v' + (height - rightR * 2) +
                (rightR ?
                    'a' + rightR + ',' + rightR + ' 0 0 1 ' + -rightR + ',' + rightR :
                    '') +
                'h' + -(width - leftR - rightR) +
                (leftR ?
                    'a' + leftR + ',' + leftR + ' 0 0 1 ' + -leftR + ',' + -leftR :
                    '') +
                'v' + -(height - leftR * 2) +
                (leftR ?
                    'a' + leftR + ',' + leftR + ' 0 0 1 ' + leftR + ',' + -leftR :
                    '') +
                'z';
        }

        var rect = c3.drawable()
            .elementTag('path')
            .extend({
                xScale: c3.inherit('xScale'),
                x: c3.inherit('x'),
                y: c3.inherit('y'),
                width: c3.inherit('width'),
                height: c3.inherit('height')
            })
            .update(function(event) {
                var xScale = this.xScale();
                var x = this.x();
                var y = this.y();
                var width = this.width();
                var height = this.height();
                event.selection.attr('d', function(d) {
                    var roundLeft = !isStartTruncated(xScale, d);
                    var roundRight = !isEndTruncated(xScale, d);
                    return rectPath(x(d), y, width(d), height, 4, roundLeft, roundRight);
                });
            });

        var label = c3.drawable()
            .elementTag('text')
            .extend({
                x: c3.inherit('x'),
                width: c3.inherit('width'),
                height: c3.inherit('height')
            })
            .update(function(event) {
                var x = this.x();
                var width = this.width();
                var text = event.selection.attr({
                    'text-anchor': 'middle',
                    x: function(d) {
                        return x(d) + width(d) / 2;
                    },
                    y: this.height(),
                    dy: '-0.10em'
                }).text(function(d) {
                    return d.label;
                });

                c3.utils.truncateText(text, function(d) {
                    return width(d);
                });
            });

        return c3.component()
            .extend({
                data: c3.prop([]),
                xScale: c3.prop(),
                rowHeight: c3.prop(),
                barHeight: c3.prop(25),
                width: function() {
                    var xScale = this.xScale();
                    return function(d) {
                        return truncatedEnd(xScale, d) - truncatedStart(xScale, d);
                    };
                },
                height: function() {
                    return this.barHeight();
                },
                x: function() {
                    var xScale = this.xScale();
                    return _.partial(truncatedStart, this.xScale());
                },
                y: function() {
                    var rowHeight = this.rowHeight();
                    var barHeight = this.barHeight();
                    return (rowHeight - barHeight) / 2;
                }
            })
            .extend(function() {
                var d = this.data()[0];
                var xScale = this.xScale();
                var selection = this.selection()
                    .classed('duration', true)
                    .classed('start-truncated', isStartTruncated(xScale, d))
                    .classed('end-truncated', isEndTruncated(xScale, d));

                rect.parent(this)(selection);
                label.parent(this)(selection);
                DataDrivenRoadmap.utils.applyStatusColor(selection);
            });
    };
}(c3));