(function(d3, c3) {
    c3.utils = {
        /**
         * Split text into multiple positioned `tspans` to simulate wrapping to a given width
         * Small positioning modifications to original code from http://bl.ocks.org/mbostock/7555321
         *
         * @param text The text element to wrap
         * @param width The width of the wrapping container
         */
        wrapText: function (text, width) {
            text.each(function() {
                var text = d3.select(this),
                    words = text.text().split(/\s+/).reverse(),
                    word,
                    line = [],
                    lineNumber = 0,
                    lineHeight = 1.5, // ems
                    y = text.attr("y"),
                    dy = parseFloat(text.attr("dy")),
                    tspan = text.text(null).append("tspan").attr("x", 0).attr("y", y).attr("dy", dy + "em");
                while (word = words.pop()) {
                    line.push(word);
                    tspan.text(line.join(" "));
                    if (tspan.node().getComputedTextLength() > width) {
                        line.pop();
                        tspan.text(line.join(" "));
                        line = [word];
                        tspan = text.append("tspan").attr("y", y).attr("x", 0).attr("dy", ++lineNumber * lineHeight + dy + "em").text(word);
                    }
                }
            });
        },

        /**
         *
         * @param text The text element to truncate
         * @param widthAccessor The width of the bounding box the text must fit inside
         * @param heightAccessor The height of the bounding the text must fit inside
         */
        containText: function (text, widthAccessor, heightAccessor) {
            text.each(function() {
                var d = this.__data__;
                var text = d3.select(this);
                var textBounds = { width:0, height:0 };
                var padding = 4;

                try {
                    textBounds = text.node().getBBox();
                } catch (e) {
                    // Firefox throws inscrutable NS_ERROR_FAILURE
                    // in situations where label is inside a group with no dimensions
                }

                if (textBounds.height + padding > heightAccessor(d)) {
                    text.text('');
                } else if (textBounds.width + padding > widthAccessor(d)) {
                    text.text('…');
                }
            });
        },

        truncateText: function(text, widthAccessor) {
            var padding = 12;
            text.each(function(d) {
                var textSelection = d3.select(this);
                var textContent = textSelection.text();
                while (textContent.length && textSelection.node().getBBox().width + padding > widthAccessor(d)) {
                    textContent = textContent.substring(0, textContent.length - 1);
                    textSelection.text(textContent);
                }
            });
        }
    };
})(d3, c3);
