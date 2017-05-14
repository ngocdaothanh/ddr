(function ($, d3) {
    window.DataDrivenRoadmap = window.DataDrivenRoadmap || {};

    var inlineDialog;
    $(document).ready(function() {
        inlineDialog = DataDrivenRoadmap.SideInlineDialog.create(
                'data-driven-roadmap-dialog',
                '.data-driven-roadmap .duration, .data-driven-roadmap .milestone',
                showPopup,
                {
                    useLiveEvents: true,
                    width: 400
                }
        );

        function showPopup($contents, trigger, doShowPopup) {
            var eventData = trigger.__data__;
            $contents.closest('.aui-inline-dialog').addClass('data-driven-roadmap-inline-dialog');

            var status = $.trim(eventData.data.Status);
            var dataWithoutStatus = _.clone(eventData.data);
            delete dataWithoutStatus.Status;
            var data = _.map(dataWithoutStatus, function (value, key, list) {
                if (value) {
                    value = value.replace(/^&nbsp;/, '').replace(/&nbsp;$/, '');
                }
                return {key: key, value: value}
            });

            var dateFormatter = d3.time.format('%d %b %Y');
            $contents.html(com.atlassian.confluence.datadrivenroadmap.tooltip({
                label: eventData.label,
                data: data,
                status: status,
                statusColor: eventData.statusColor,
                startDate: eventData.start && dateFormatter(new Date(eventData.start)),
                endDate: eventData.end && dateFormatter(new Date(eventData.end))
            }));

            $contents.css({
                maxHeight: $(window).height() * 0.8
            });

            // Hack to prevent multiple arrows from being rendered
            $('#arrow-data-driven-roadmap-dialog path').remove();

            doShowPopup();
            inlineDialog.refresh();
        }
    });

    DataDrivenRoadmap.macro = function (id, startDate, endDate, dateFormat, language) {
        require(['ddr.parser.main'], function (ddrParser) {
            // May be undefined in Edit mode
            var rawColOptions = WRM.data.claim('com.atlassian.confluence.roadmap:data-driven-roadmap:col-options:' + id);
            if (!rawColOptions) {
                return;
            }

            // Convert each value from comma separated string to array
            var colOptions = {};
            var toColArray = function (colString) {
                return _.map(colString.split(','), function (elem) {
                    return elem.trim().toLowerCase();
                });
            };
            _.each(_.keys(rawColOptions), function (k) {
                colOptions[k] = toColArray(rawColOptions[k]);
            });

            var selector = '#roadmapmacro-' + id;

            var parseFunction = function () {
                ddrParser.parse($("div.ddr-data#ddr-data-" + id), colOptions, dateFormat, language).then(function (data) {
                    var container = d3.select(selector);
                    var roadmap = DataDrivenRoadmap.roadmap().startDate(startDate).endDate(endDate).data(data);

                    // Re-render chart on window resize
                    var redraw = _.debounce(function () {
                        inlineDialog.hide();
                        roadmap(container);

                        // AP's existence means we are running in Connect plugin environment
                        if (window.AP) {
                            window.AP.events.emit('com.atlassian.confluence.roadmap:confluence-data-driven-roadmap:redraw');
                        }
                    }, 300);

                    redraw();
                    $(window).on('resize', redraw);
                    AJS.bind('sidebar.collapsed sidebar.expanded', redraw);
                });
            };

            $(document).ready(function() {
                var currentExecution;

                var debouncedParseFunction = function() {

                    if (currentExecution) {
                        clearTimeout(currentExecution);
                    }

                    currentExecution = setTimeout(function() {
                        $(selector).empty();
                        parseFunction();
                        currentExecution = null;
                    }, 500);
                };

                debouncedParseFunction();
                AJS.bind("confluence.extra.jira:jira-table:completed.success", debouncedParseFunction);
            });

        });
    };
}(jQuery, d3));
