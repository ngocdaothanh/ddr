(function(d3, c3) {
    window.DataDrivenRoadmap = window.DataDrivenRoadmap || {};

    DataDrivenRoadmap.roadmap = function() {
        var roadmap = c3.component()
            .extend(c3.withDimensions())
            .extend(function() {
                c3.singular().elementClass('grid-bands')(this.selection());
                c3.singular().elementClass('today')(this.selection());
                c3.singular().elementClass('x-axis-top')(this.selection());
                c3.singular().elementClass('x-axis-bottom')(this.selection());
            })
            .extend(c3.drawable())
            .elementClass('swimlane')
            .extend({
                swimlaneLabelWidth: c3.prop(150),
                rightPadding: c3.prop(50),
                rowHeight: c3.prop(40),
                xAxisHeight: c3.prop(50),
                startDate: c3.prop(-1),
                endDate: c3.prop(-1),
                minDate: function() {
                    var startDate = this.startDate();
                    return startDate !== -1 ? d3.time.month.floor(new Date(startDate)) : -1;
                },
                maxDate: function() {
                    var endDate = this.endDate();
                    var timeUnit = d3.time.month;
                    return endDate !== -1 ? timeUnit.offset(timeUnit.floor(new Date(endDate)), 1) : -1;
                },
                xScale: function() {
                    var data = this.data();
                    // Find the domain
                    var allEvents = _.flatten(_.pluck(data, 'events'));
                    var startDate = this.startDate();
                    var minDate = startDate !== -1 ? startDate : d3.min(allEvents, function(d) {
                        return d3.min([d.start, d.end]);
                    });
                    var endDate = this.endDate();
                    var maxDate = endDate !== -1 ? endDate : d3.max(allEvents, function(d) {
                        return d3.max([d.start, d.end]);
                    });

                    // Round domain to month
                    var timeUnit = d3.time.month;
                    minDate = timeUnit.floor(new Date(minDate));
                    maxDate = timeUnit.offset(timeUnit.floor(new Date(maxDate)), 1);

                    return d3.time.scale()
                        .domain([minDate, maxDate])
                        .range([this.swimlaneLabelWidth(), this.width() - this.rightPadding()]);
                }
            })
            .enter(function(event) {
                var width = this.width();
                event.selection.each(function(d, i) {
                    if (i === 0) return;

                    d3.select(this).append('line')
                        .classed('swimlane-divider', true)
                        .attr({
                            x1: 0,
                            x2: width,
                            y1: 0,
                            y2: 0
                        });
                });
                event.selection.append('text').classed('swimlane-label', true);
            })
            .update(function(event) {
                var xScale = this.xScale();
                var xAxisHeight = this.xAxisHeight();

                // Render labels
                var swimlaneLabelWidth = this.swimlaneLabelWidth();
                var labelHeights = [];
                var rowHeight = this.rowHeight();
                event.selection.selectAll('.swimlane-label').each(function(d) {
                    var label = d3.select(this);
                    label.text(function(d) {
                            return d.name;
                        })
                        .attr({
                            y: function(d) {
                                return rowHeight / 2;
                            },
                            dy: '0.30em'
                        });
                    c3.utils.wrapText(label, swimlaneLabelWidth);
                    labelHeights.push(this.getBBox().height + 25);
                });

                var timeUnit = getSuitableTimeUnit(xScale);

                // Render the top x axis
                this.selection().select('.x-axis-top').call(
                    xAxis().scale(xScale).orient('top').tickUnit(timeUnit)
                ).attr({
                    transform: 'translate(0,' + xAxisHeight + ')'
                });

                // Render swimlane contents and translate
                var plotHeight = xAxisHeight;
                event.selection.each(function(d, i) {
                    var swimlaneContainer = d3.select(this).attr('transform', 'translate(0,' + plotHeight + ')');

                    var swimlaneContents = DataDrivenRoadmap.swimlaneContents()
                        .xScale(xScale)
                        .rowHeight(rowHeight)
                        .data(d.events)(swimlaneContainer);

                    plotHeight += swimlaneContents.numRows() * rowHeight;
                });

                // Render grid bands
                this.selection().select('.grid-bands').call(
                    gridBands().scale(xScale).height(plotHeight - xAxisHeight).tickUnit(timeUnit)
                ).attr({
                    transform: 'translate(0,' + xAxisHeight + ')'
                });
                
                // Render the bottom x axis
                this.selection().select('.x-axis-bottom')
                    .call(
                        xAxis().scale(xScale).tickUnit(timeUnit)
                    )
                    .attr({
                        transform: 'translate(0,' + plotHeight + ')'
                    });

                // Render today line
                var today = new Date();
                if (today >= xScale.domain()[0] && today <= xScale.domain()[1]) {
                    var xToday = xScale(new Date());
                    c3.singular().elementTag('line').update(function(event) {
                        event.selection.attr({
                            x1: xToday,
                            y1: 0,
                            x2: xToday,
                            y2: plotHeight + xAxisHeight
                        });
                    })(this.selection().select('.today'));
                    c3.singular().elementTag('text').update(function(event) {
                        var text = AJS.I18n.getText('com.atlassian.confluence.roadmap.confluence-data-driven-roadmap.data-driven-roadmap.today');
                        event.selection.text(text).attr({
                            x: xToday + 10,
                            y: 10,
                            dy: '1em'
                        });
                    })(this.selection().select('.today'));
                }

                // Adjust height of the svg element.
                var totalHeight = plotHeight + xAxisHeight;
                this.selection().style('height', totalHeight + 'px');
            });

        roadmap.data.get(function(newValue) {
            return DataDrivenRoadmap.processData(newValue, this.minDate(), this.maxDate());
        });

        function getSuitableTimeUnit(scale) {
            var IDEAL_SPACE_PER_TICK = 110;
            var domain = scale.domain();
            var range = scale.range();
            var length = Math.abs(range[0] - range[1]);
            var idealTicks = length / IDEAL_SPACE_PER_TICK;

            var timeUnits = [d3.time.week, d3.time.month, d3.time.year];
            var result = _.reduce(_.map(timeUnits, function(timeUnit, i) {
                var start = timeUnit.floor(domain[0])
                var millis = timeUnit.offset(start, 1) - start;
                var ticks = (domain[1] - domain[0]) / millis;
                var variance = Math.abs(idealTicks - ticks);
                return {
                    i: i,
                    timeUnit: timeUnit,
                    variance: variance
                };
            }), function(memo, d) {
                return memo.variance > d.variance ? d : memo;
            });
            return result.timeUnit;
        }

        var xAxis = function() {
            return c3.singular()
                .elementClass('x-axis')
                .extend(c3.withDimensions())
                .extend({
                    orient: c3.prop('bottom'),
                    scale: c3.prop(d3.scale.linear()),
                    tickUnit: c3.prop(d3.time.month),
                    tickCount: c3.prop(1)
                })
                .update(function(event) {
                    var scale = this.scale();
                    var tickUnit = this.tickUnit();
                    var tickFormat = tickUnit === d3.time.week ? "%d %b %y" : "%b %Y";
                    d3.svg.axis()
                        .orient(this.orient())
                        .ticks(tickUnit, this.tickCount())
                        .tickFormat(d3.time.format(tickFormat))
                        .scale(scale)(event.selection);
                });
        };

        var gridBands = function() {
            return c3.drawable()
                .elementTag('rect')
                .elementClass('x-band')
                .extend({
                    scale: c3.prop(d3.scale.linear()),
                    tickUnit: c3.prop(d3.time.month),
                    tickCount: c3.prop(1),
                    height: c3.prop(),
                    data: function() {
                        return this.scale().ticks(this.tickUnit(), this.tickCount());
                    }
                })
                .update(function(event) {
                    var scale = this.scale();
                    var height = this.height();
                    var data = this.data();
                    event.selection.attr({
                        x: function(d) {
                            return Math.floor(scale(d));
                        },
                        y: 0,
                        height: height,
                        width: function(d, i) {
                            var end = i === data.length - 1 ? scale.range()[1] : scale(data[i + 1]);
                            return Math.ceil(end - scale(d));
                        }
                    });
                });
        };

        return roadmap;
    };
}(d3, c3));
