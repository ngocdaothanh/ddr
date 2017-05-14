(function() {
    window.DataDrivenRoadmap = window.DataDrivenRoadmap || {};

    var SideInlineDialog = {};

    /**
     * @param {string} id
     * @param {jQuery|element|string} trigger
     * @param {function} renderFn
     * @param {object} opts
     * @returns {InlineDialog}
     */
    SideInlineDialog.create = function(id, trigger, renderFn, opts) {
        opts = opts || {};
        _.defaults(opts, {
            calculatePositions: _.compose(SideInlineDialog._calculatePositions, SideInlineDialog._getDimensions),
            gravity: 'w',
            offsetX: 15,
            offsetY: 0
        });

        return AJS.InlineDialog(trigger, id, renderFn, opts);
    };

    /**
     * @param {jQuery} popup
     * @param {object} targetPosition
     * @param {object} mousePosition
     * @param {object} opts
     * @return {object}
     * @private
     */
    SideInlineDialog._getDimensions = function(popup, targetPosition, mousePosition, opts) {
        // Support positioning inside a scroll container other than <body>
        var constrainedScroll = opts.container.toLowerCase() !== 'body';
        var $scrollContainer = AJS.$(opts.container);
        var $scrollWindow = constrainedScroll ?
            AJS.$(opts.container).parent() :
            AJS.$(window);
        var scrollContainerOffset = constrainedScroll ?
            $scrollContainer.offset() : { left: 0, top: 0 };
        var scrollWindowOffset = constrainedScroll ?
            $scrollWindow.offset() : { left: 0, top: 0 };

        var trigger = targetPosition.target;
        var triggerOffset = trigger.offset();
        // Support SVG elements as triggers
        var triggerClientRect = trigger[0].getBoundingClientRect && trigger[0].getBoundingClientRect();

        var v = {
            // determines how close to the edge the dialog needs to be before it is considered offscreen
            screenPadding: 10,
            // Min distance arrow needs to be from the edge of the dialog
            arrowMargin: 5,
            window: {
                top: scrollWindowOffset.top,
                left: scrollWindowOffset.left,
                scrollTop: $scrollWindow.scrollTop(),
                scrollLeft: $scrollWindow.scrollLeft(),
                width: $scrollWindow.width(),
                height: $scrollWindow.height()
            },
            scrollContainer: {
                width: $scrollContainer.width(),
                height: $scrollContainer.height()
            },
            // Position of the trigger is relative to the scroll container
            trigger: {
                top: triggerOffset.top - scrollContainerOffset.top,
                left: triggerOffset.left - scrollContainerOffset.left,
                width: triggerClientRect ? triggerClientRect.width : trigger.outerWidth(),
                height: triggerClientRect ? triggerClientRect.height : trigger.outerHeight()
            },
            dialog: {
                width: popup.width(),
                height: popup.height(),
                offset: {
                    top: opts.offsetY,
                    left: opts.offsetX
                }
            },
            arrow: {
                height: popup.find('.arrow').outerHeight()
            }
        };

        return v;

    };

    /**
     * @param {object} dimensions
     * @returns {object}
     * @private
     */
    SideInlineDialog._calculatePositions = function(dimensions) {
        var screenPadding = dimensions.screenPadding;
        var win = dimensions.window;
        var trigger = dimensions.trigger;
        var dialog = dimensions.dialog;
        var arrow = dimensions.arrow;
        var scrollContainer = dimensions.scrollContainer;

        var triggerScrollOffset = {
            top: trigger.top - win.scrollTop,
            left: trigger.left - win.scrollLeft
        };

        // Halves - because the browser doesn't do sub-pixel positioning, we need to consistently floor
        // all decimal values or you can get 1px jumps in arrow positioning when the dialog's height changes.
        var halfTriggerHeight = Math.floor(trigger.height / 2);
        var halfPopupHeight = Math.floor(dialog.height / 2);
        var halfArrowHeight = Math.floor(arrow.height / 2);

        // Figure out where to position the dialog, preferring the right
        var spaceOnLeft = triggerScrollOffset.left - dialog.offset.left - screenPadding;

        // This implementation may not be suitable for horizontally scrolling containers
        var spaceOnRight = scrollContainer.width - triggerScrollOffset.left - trigger.width - dialog.offset.left - screenPadding;

        var enoughSpaceOnLeft = spaceOnLeft >= dialog.width;
        var enoughSpaceOnRight = spaceOnRight >= dialog.width;
        var dialogLocation = !enoughSpaceOnRight && enoughSpaceOnLeft ? 'left' : 'right';

        // Screen padding needs to be adjusted if the arrow would extend into it
        var arrowScreenTop = triggerScrollOffset.top + halfTriggerHeight - halfArrowHeight;
        var arrowScreenBottom = win.height - arrowScreenTop - arrow.height;
        screenPadding = Math.min(screenPadding, arrowScreenTop - dimensions.arrowMargin);
        screenPadding = Math.min(screenPadding, arrowScreenBottom - dimensions.arrowMargin);

        // Figure out if the dialog needs to be adjusted up or down to fit on the screen
        var spaceAbove = Math.max(triggerScrollOffset.top - screenPadding, 0);
        var spaceBelow = Math.max(win.height - triggerScrollOffset.top - trigger.height - screenPadding, 0);
        var overflowAbove = Math.max(halfPopupHeight - halfTriggerHeight - dialog.offset.top - spaceAbove, 0);
        var overflowBelow = Math.max(halfPopupHeight - halfTriggerHeight + dialog.offset.top - spaceBelow, 0);
        var adjustmentForOverflow = overflowAbove || -overflowBelow || 0;

        // Calculate coordinates for the dialog, after adjustments for fitting onto the screen
        var popupCss = {
            top: trigger.top + halfTriggerHeight - halfPopupHeight + dialog.offset.top + adjustmentForOverflow,
            left: dialogLocation === 'right' ?
                trigger.left + trigger.width + dialog.offset.left :
                trigger.left - dialog.width - dialog.offset.left
        };

        // Calculate coordinates for the dialog's arrow. It is relative to the dialog, not the page
        var arrowCss = {
            position: 'absolute',
            top: halfPopupHeight - halfArrowHeight - adjustmentForOverflow
        };

        var gravity;

        if (dialogLocation === 'right') {
            gravity = 'w';
        } else {
            gravity = 'e';
        }

        return {
            dialogLocation: dialogLocation,
            popupCss: popupCss,
            arrowCss: arrowCss,
            gravity: gravity
        };
    };

    /**
     * @param {object} positions
     * @returns {string} SVG path
     * @private
     */
    SideInlineDialog._getArrowPath = function(positions) {
        return positions.dialogLocation === 'right' ?
            "M8,0L0,8,8,16" :
            "M8,0L16,8,8,16";
    };

    DataDrivenRoadmap.SideInlineDialog = SideInlineDialog;
})();
