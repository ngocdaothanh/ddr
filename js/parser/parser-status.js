define('ddr.parser.status', ['underscore'], function (_) {
    var allowedColors = [
        'blue',
        'red',
        'green',
        'yellow',
        'gray',
        'ash-gray',
        'silver',
        'brown',
        'orange',
        'tan',
        'light-brown',
        'bright-blue-2',
        'slate',
        'lime-green',
        'emerald',
        'violet',
        'mauve',
        'bright-pink',
        'pink',
        'black',
        'dark-red',
        'light-red',
        'dark-green',
        'light-green',
        'dark-blue',
        'light-blue',
        'dark-orange',
        'light-orange',
        'dark-pink',
        'light-pink',
        'dark-purple',
        'light-purple',
        'dark-yellow',
        'light-yellow'
    ];

    function formatColor(color) {
        return color.toLowerCase().trim().replace(' ', '-');
    }

    return {
        parseStatus: function (node) {
            if (node) {
                // Check for aui lozenge
                var auiLozenge = node.find('.aui-lozenge');
                if (auiLozenge) {
                    var lozengeCssClasses = [
                        'aui-lozenge-error',
                        'aui-lozenge-success',
                        'aui-lozenge-current',
                        'aui-lozenge-error',
                        'aui-lozenge-complete'
                    ];
                    for (var c = 0; c < lozengeCssClasses.length; c++) {
                        if (auiLozenge.hasClass(lozengeCssClasses[c])) {
                            return lozengeCssClasses[c].replace('aui-lozenge-', '');
                        }
                    }
                }

                if (node.children().length > 0) {
                    var firstElement = node.children().first();
                    if (firstElement.hasClass('editor-inline-macro') && 'img'.equals(firstElement.tagName())) {
                        var parameters = firstElement.attr('data-macro-parameters');
                        var matches = /colour=([a-zA-Z]+)/.exec(parameters);
                        if (matches) {
                            return matches[1].toLowerCase();
                        }
                    }
                }

                var statusText = node.text();
                var formattedStatusText = formatColor(statusText);
                if (_.contains(allowedColors, formattedStatusText)) {
                    return formattedStatusText;
                }
            }

            return '';
        }
    }
});
