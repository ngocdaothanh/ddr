(function(d3) {
    window.DataDrivenRoadmap = window.DataDrivenRoadmap || {};

    DataDrivenRoadmap.utils = {
        applyStatusColor: function (selection) {
            selection.each(function (d) {
                d3.select(this).classed(d.statusColor, true)
            });
        }
    };
}(d3));