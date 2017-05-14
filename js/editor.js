(function ($) {
    $(document).ready(function () {
        AJS.MacroBrowser.setMacroJsOverride("data-driven-roadmap", {
            updateMacroParametersForPreview: function (params) {
                var useRelativeDates = $("#macro-param-relative-dates");

                var updateVisibility = function () {
                    var value = useRelativeDates.val();

                    if (value == 'Relative') {
                        $("#macro-param-div-mindate").hide();
                        $("#macro-param-div-maxdate").hide();

                        $("#macro-param-div-relspan").show();
                    } else if (value == 'Absolute') {
                        $("#macro-param-div-mindate").show();
                        $("#macro-param-div-maxdate").show();

                        $("#macro-param-div-relspan").hide();
                    } else {
                        $("#macro-param-div-mindate").hide();
                        $("#macro-param-div-maxdate").hide();

                        $("#macro-param-div-relspan").hide();
                    }
                };

                useRelativeDates.change(function () {
                    updateVisibility();
                });

                updateVisibility();

                return params;
            }
        });
    });
})(AJS.$);
