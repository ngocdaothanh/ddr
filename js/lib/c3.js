(function(d3) {
    var c3 = {};

    /**
     * A set of common defaults that c3 components can use.
     * Components should always be written to use sensible defaults in their properties,
     * instead of null or undefined, where possible.
     * This object is NOT designed to be overwritten at runtime to change global defaults.
     */
    c3.defaults = {
        x: function(d) { return d[0]; },
        y: function(d) { return d[1]; }
    };

    /**
     * Throws an error if the value is not a number (either NaN or other types).
     * 
     * Detect problems early by checking that values are numbers when expected,
     * rather than continuing to operate on NaNs as if things are all good.
     * 
     * @param  {*} value - value to be tested
     * @return {*} the same value that was passed in
     */
    c3.checkIsNumber = function(value) {
        if (typeof value !== 'number') {
            throw new Error("Expected a number, but received: " + value);
        }
        return value;
    };

    c3.isEmpty = function(value) {
        return !value || !value.length;
    };

    /**
     * Creates a property getter/setter function a la d3's getters and setters.
     * The actual property value is stored inside a closure.
     * 
     *    var color = c3.prop('red');
     *    color(); // red
     *    color('blue'); // set value to blue
     *
     * The property's getter or setter can be customised by calling .get() or .set()
     * on the property function.
     * The getter function is passed the stored value and should return a transformed value.
     * The setter function is passed the newValue and the oldValue and should return
     * the value to be stored.
     * 
     *    c3.prop(10).get(function(value) {
     *        return value + 'px';
     *    }).set(function(newValue, oldValue) {
     *        // Prevent the value from being set below 10
     *        if (newValue < 10) return oldValue;
     *        return newValue;
     *    });
     *
     * @param {*} [defaultValue] - the initial value of the property
     */
    c3.prop = function(defaultValue) {
        var value = defaultValue;

        var getter = function(value) {
            return value;
        };

        var setter = function(newValue, oldValue) {
            return newValue;
        };

        function prop(newValue) {
            if (arguments.length === 0) {
                return getter.call(this, value);
            }

            value = setter.call(this, newValue, value);

            return this;
        }

        prop.get = function(newGetter) {
            getter = newGetter;
            return this;
        };

        prop.set = function(newSetter) {
            setter = newSetter;
            return this;
        };

        return prop;
    };

    /**
     * Generates a c3.prop that inherits its value from parent components if
     * the prop contains a null or undefined value.
     * 
     * A defaultValue should be supplied in case no parent supplies a value.
     *
     *    c3.inherit('color', 'red');
     *
     * If the defaultValue needs to be evaluated, pass a function to .onDefault() instead.
     *
     *    c3.inherit('color').onDefault(function() {
     *        // Random color between red and blue
     *        return d3.scale.linear().range(['red', 'blue'])(Math.random());
     *    });
     * 
     * @param {string} from - the name of the property on the parent to inherit from
     * @param {*} [defaultValue] - default value that is returned if no parent returns a value
     */
    c3.inherit = function(from, defaultValue) {
        var onDefault;
        var prop = c3.prop().get(function(value) {
            if (value != null) return value;
            for (var parent = this.parent(); parent; parent = parent.parent()) {
                if (typeof parent[from] === 'function') {
                    value = parent[from]();
                    if (value != null) return value;
                }
            }
            return onDefault ? onDefault.call(this) : defaultValue;
        });
        prop.onDefault = function(fn) {
            onDefault = fn;
            return this;
        };
        return prop;
    };

    /**
     * Creates a function that can be used as an event trigger or to bind an event
     * handler.
     *
     *    var click = c3.event();
     *    click(handler); // bind an event handler
     *    click();        // trigger the event
     *
     * @param {function} [defaultHandler] - a handler that is run after other handlers,
     *    defining the default behaviour for the event.
     */
    c3.event = function(defaultHandler) {
        var handlers = [];

        function bind(handler, context) {
            handlers.push({
                handler: handler,
                context: context
            });
        }

        function emit(eventData) {
            var emitContext = this;
            eventData = eventData || {};

            _.each(handlers, function(handlerEntry) {
                handlerEntry.handler.call(handlerEntry.context || emitContext, eventData);
            });

            if (defaultHandler) defaultHandler.call(this, eventData);
        }

        function event() {
            if (typeof arguments[0] === 'function') {
                bind.apply(this, arguments);
            } else {
                emit.apply(this, arguments);
            }
            return this;
        }

        event.off = function(handler, context) {
            handlers = _.reject(handlers, function(handlerEntry) {
                var matchesHandler = handler == null || handlerEntry.handler == handler;
                var matchesContext = context == null || handlerEntry.context == context;
                return matchesHandler && matchesContext;
            });
            return this;
        };

        return event;
    };

    /**
     * Plot an array of points as an area under the points
     */
    c3.areaPlot = function() {
        return c3.component('areaPlot')
            .extend(c3.drawable())
            .extend(c3.plottable())
            .elementTag('path')
            .elementClass('area')
            .dataFilter(function(data) {
                return [data];
            })
            .extend({
                areaConstructor: c3.prop(d3.svg.area)
            })
            .update(function(event) {
                var area = this.areaConstructor()()
                    .x(this.x());
                if (this.cartesian()) {
                    area
                        .y0(this.height())
                        .y1(this.y());
                } else {
                    area
                        .y0(this.y())
                        .y1(0);
                }

                event.selection.attr('d', area(this.data()));
            });
    };

    c3.axis = function() {
        return c3.component('axis')
            .extend(c3.plottable())
            .extend(function() {
                this.selection().call(this.axis());
            })
            .extend({
                axisConstructor: c3.inherit('axisConstructor', d3.svg.axis),
                orient: c3.prop('bottom'),
                horizontal: function() {
                    var orient = this.orient();
                    return orient === 'bottom' || orient === 'top';
                },
                axis: function() {
                    var horizontal = this.horizontal();
                    return this.axisConstructor().call(this)
                        .scale(horizontal ? this.xScale() : this.yScale())
                        .orient(this.orient());
                }
            });
    };

    /**
     * A layout that consists of 5 regions (center, north, south, west, east),
     * each of which can contain a single component.
     *   - North and south must have their height set
     *   - West and east must have their width set
     *   
     * The width and height of center is automatically calculated based on the other regions.
     */
    c3.borderLayout = function() {
        var region = function() {
            return c3.prop().set(function(component) {
                return component.parent(this);
            });
        };
        var regionsDrawable = c3.drawable()
            .extend({
                data: function() {
                    return borderLayout.occupiedRegions();
                }
            }).dataKey(function(d) {
                return d.name;
            })
            .update(function(event) {
                var positions = borderLayout.positions();
                event.selection.each(function(d) {
                    var regionContainer = d3.select(this);
                    var position = positions[d.name];
                    regionContainer.attr('transform', 'translate(' + position.left + ',' + position.top + ')');
                    d.component
                        .width(position.width)
                        .height(position.height);
                    d.component(regionContainer);
                });
            });
        var borderLayout = c3.component('borderLayout')
            .extend(c3.plottable())
            .extend(function() {
                regionsDrawable(this.selection());
            })
            .extend({
                center: region(),
                north:  region(),
                south:  region(),
                west:   region(),
                east:   region(),

                xRange: function() {
                    return [0, this.centerWidth()];
                },
                yRange: function() {
                    return [this.centerHeight(), 0];
                },
                centerWidth: function() {
                    // TODO Optimise
                    return this.positions().center.width;
                },
                centerHeight: function() {
                    // TODO Optimise
                    return this.positions().center.height;
                },
                occupiedRegions: function() {
                    var borderLayout = this;
                    return _.compact(_.map(['center', 'north', 'south', 'west', 'east'], function(name) {
                        var component = borderLayout[name]();
                        return component ? {
                            name: name,
                            component: borderLayout[name]()
                        } : null;
                    }));
                },
                positions: function() {
                    var margins = {
                        top:    c3.checkIsNumber(this.north() ? this.north().height() : 0),
                        bottom: c3.checkIsNumber(this.south() ? this.south().height() : 0),
                        left:   c3.checkIsNumber(this.west() ? this.west().width() : 0),
                        right:  c3.checkIsNumber(this.east() ? this.east().width() : 0)
                    };
                    var layoutWidth = c3.checkIsNumber(this.width());
                    var layoutHeight = c3.checkIsNumber(this.height());

                    var positions = {};
                    var center = positions.center = {
                        left: margins.left,
                        top: margins.top,
                        width: layoutWidth - margins.left - margins.right,
                        height: layoutHeight - margins.top - margins.bottom
                    };
                    if (this.north()) {
                        positions.north = {
                            top: margins.top,
                            left: margins.left,
                            height: margins.top,
                            width: center.width
                        };
                    }
                    if (this.south()) {
                        positions.south = {
                            top: layoutHeight - margins.bottom,
                            left: margins.left,
                            height: margins.bottom,
                            width: center.width
                        };
                    }
                    if (this.west()) {
                        positions.west = {
                            top: margins.top,
                            left: margins.left,
                            height: center.height,
                            width: margins.left
                        };
                    }
                    if (this.east()) {
                        positions.east = {
                            top: margins.top,
                            left: layoutWidth - margins.right,
                            height: center.height,
                            width: margins.right
                        };
                    }
                    return positions;
                }
            });
        return borderLayout;
    };

    /**
     * Plot an array of points as circles
     */
    c3.circlePlot = function() {
        return c3.component('circlePlot')
            .extend(c3.drawable())
            .extend(c3.plottable())
            .elementTag('circle')
            .update(function(event) {
                event.selection
                    .attr('cx', this.x())
                    .attr('cy', this.y())
                    .attr('r', this.radiusAccessor());
            })
            .extend({
                radiusAccessor: c3.prop(function() { return 4; })
            });
    };

    /**
     * A component mixin that add a boolean `clipped` property (default: false)
     * to a c3.component. If set to true, sets a clipping path on the component
     * that prevents it's content from overflowing
     *
     */
    c3.clippable = (function() {
        var clippingPathCounter = 0;

        return function () {
            return c3.component('clippable')
                .extend({
                    clipped: c3.prop(false)
                })
                .extend(function() {
                    if (!this.clipped()) return;

                    var target = this;
                    var clip = c3.singular()
                        .elementTag('clipPath')
                        .enter(function(event) {
                            var randomId = 'c3clip' + clippingPathCounter;
                            clippingPathCounter++;
                            target.selection().attr('clip-path', 'url(#' + randomId + ')');
                            event.selection
                                .attr('id', randomId)
                                .append('rect')
                                .attr('x', '0')
                                .attr('y', '0')
                                .attr('fill', 'none');
                        })
                        .update(function(event) {
                            event.selection.select('rect')
                                .attr('width', target.width())
                                .attr('height', target.height());
                        }); 
                    clip(this.selection());
                });
        };
    }());

    /*
     * Author: Patrick Teen (Atlassian) 2013
     */
    (function (figue) {
        if (!figue) return;
        
        function _internalXAccessor(d) { return d.point[0]; }
        function _internalYAccessor(d) { return d.point[1]; }
        function _buildPointFromTree(tree) {
            var point = _.extend({}, {
                point: [ 
                    this.xScale().invert(tree.centroid[0]), 
                    this.yScale().invert(tree.centroid[1])
                ],
                size: tree.size,
                distance: tree.dist,
                isCluster: false
            });
            if (tree.left || tree.right) {
                point.isCluster = true;
            }
            point.label = _resolveAllChildLabels(tree);
            return point;
        }
        function _resolveAllChildLabels(tree) {
            var result = [];
            if (tree && tree.label == -1) {
                result.push.apply(result, _resolveAllChildLabels(tree.left));
                result.push.apply(result, _resolveAllChildLabels(tree.right));
            } else {
                result.push(tree.label);
            }
            return result;
        }
        function _pruneAgglomerate(tree, clusteredResult, unclusteredResult) {
            if (tree) {
                if (tree.dist && tree.dist > this.threshold()) {
                    _pruneAgglomerate.call(this, tree.left, clusteredResult, unclusteredResult);
                    _pruneAgglomerate.call(this, tree.right, clusteredResult, unclusteredResult);
                } else {
                    var point = _buildPointFromTree.call(this, tree );
                    point.isCluster ? clusteredResult.push(point) : unclusteredResult.push(point);
                }
            }
        }
        function _updateClustering() {
            var clustered = [],
                unclustered = [];

            var x = this.x(),
                y = this.y();

            var vectorLabels = _.map(this.data(), this.labelAccessor());
            var scaledVectors = _.map(this.data(), function(element) {
                return [
                    x(element),
                    y(element)
                ]
            }, this);

            var agglomerate = figue.agglomerate(vectorLabels, scaledVectors, figue.MAX_DISTANCE, figue.COMPLETE_LINKAGE);
            
            _pruneAgglomerate.call(this, agglomerate, clustered, unclustered);

            this.getLayer('clusteredLayer').data(clustered);
            this.getLayer('unclusteredLayer').data(unclustered);
        }
        c3.clusteredCirclePlot = function() {
            var clusteredCirclePlot = c3.component()
                .extend({
                    clustered: c3.prop([]),
                    unclustered: c3.prop([]),
                    clusterRadiusAccessor: c3.prop(function() { return 10; }),
                    singletonRadiusAccessor: c3.prop(function() { return 5; })
                });
            clusteredCirclePlot
                .extend(_updateClustering)
                .extend(c3.layerable()
                    .addLayer('clusteredLayer', c3.circlePlot()
                        .xAccessor(_internalXAccessor)
                        .yAccessor(_internalYAccessor)
                        .elementClass('cluster')
                        .radiusAccessor(function (elem) {
                            return clusteredCirclePlot.clusterRadiusAccessor()(elem);
                        })
                    )
                    .addLayer('unclusteredLayer', c3.circlePlot()
                        .xAccessor(_internalXAccessor)
                        .yAccessor(_internalYAccessor)
                        .elementClass('singleton')
                        .radiusAccessor(function (elem) {
                            return clusteredCirclePlot.singletonRadiusAccessor()(elem);
                        })
                    )
                    .extend({
                        labelAccessor: c3.prop(function(element) { return element.issue; }),
                        threshold: c3.prop(10)
                    })
            );
            return clusteredCirclePlot;
        };
    }(window.figue));

    /**
     * The root c3 component constructor.
     *
     * A component is a function that can be applied to a d3 selection.
     *
     * A component can be applied to any number of selections.
     * 
     *    var myComponent = c3.component();
     *    myComponent(selection1);
     *    myComponent(selection2);
     *
     * When applied to a selection, the component has access to the selection through
     * this.selection().
     *
     * A component can be extended by adding properties before it is applied.
     * 
     *    var myComponent = c3.component().extend({
     *        color: c3.prop('red'),
     *        click: c3.event(),
     *        saySomething: function() { alert('Something!'); }
     *    });
     *
     * A component can also be extended by mixing in another component.
     * 
     *    var myComponent = c3.component().extend(otherComponent);
     *
     * A component can have a parent component, by setting the parent as property.
     *
     *    var parent = c3.component();
     *    var child = c3.component().parent(parent);
     *
     * This allows children components to access their parents' properties by
     * calling this.parent(), and to inherit parent properties through c3.inherit().
     *
     * @param {string} [displayName] - name to show when debugging
     */
    c3.component = function(displayName) {
        var mixins = [];

        function makeComponentFunction() {
            var component = function (selection) {
                return component.applyTo(component, selection);
            };
            return component;
        }

        var component = makeComponentFunction();

        /**
         * Copy src into dest, but excluding keys in exclude
         * @param {function|object} dest
         * @param {function|object} src
         * @param {function|object} [exclude]
         */
        function selectiveCopy(dest, src, exclude) {
            // Can't use _.each as src can be a function, in which case
            // _.each will see src.length and think it's an array
            for (var key in src) {
                if (exclude && key in exclude) continue;
                dest[key] = src[key];
            }
            return dest;
        }

        var componentCommon = {
            displayName: displayName,
            selection: c3.prop(null),
            parent: c3.prop(null),
            /**
             * Applies a component to a selection, setting base as the context
             * @param {c3.component} base
             * @param {d3.selection} selection
             */
            applyTo: function(base, selection) {
                if (selection) component.selection(selection);
                _.each(mixins, function(mixin) {
                    if (mixin.applyTo) {
                        mixin.applyTo(base, selection);
                    } else {
                        mixin.call(base, selection);
                    }
                });
                return component;
            },
            /**
             * Extend the component with additional behaviour and/or properties.
             * @param {c3.component|function|object} mixable
             */
            extend: function(mixable) {
                if (typeof mixable === 'function') {
                    if (mixable.parent) {
                        mixable.parent(component);
                    }
                    mixins.push(mixable);
                }
                return selectiveCopy(component, mixable, componentCommon);
            }
        };

        return _.extend(component, componentCommon);
    };

    c3.deviationPlot = function() {
        return c3.component('deviationPlot')
            .extend(c3.drawable())
            .extend(c3.plottable())
            .elementTag('path')
            .elementClass('area')
            .dataFilter(function(data) {
                return [data];
            })
            .update(function(event) {
                var yAccessor = this.yAccessor();
                var deviationAccessor = this.deviationAccessor();
                var yScale = this.yScale();
                var area = d3.svg.area()
                    .x(this.x())
                    .y0(function(d) {
                        return yScale(yAccessor(d) + deviationAccessor(d));
                    })
                    .y1(function(d) {
                        return yScale(Math.max(yAccessor(d) - deviationAccessor(d), 0));
                    });

                event.selection.attr('d', area(this.data()));
            })
            .extend({
                deviationAccessor: c3.prop(function(d) { return d[2]; })
            });
    };

    /**
     * A component that maps data to elements, using d3's enter and exit joins
     * to add/remove elements as necessary.
     */
    c3.drawable = function() {
        return c3.component('drawable')
            .extend(c3.withData())
            .extend(c3.withElements())
            .extend(function() {
                var binding = this.dataBinding();
                this.enter({ selection: this.drawEnter(binding.enter()) });
                this.exit({ selection: this.drawExit(binding.exit()) });
                this.update({ selection: binding });
            })
            .extend({
                enter:         c3.event(),
                exit:          c3.event(),
                update:        c3.event(),
                dataFilter:    c3.prop(_.identity),
                dataBinding: function() {
                    var data = this.dataFilter()(this.data());
                    return this.elements().data(data, this.dataKey());
                },
                drawEnter: function(enter) {
                    var elements = enter.append(this.elementTag());
                    var elementClass = this.elementClass();
                    if (elementClass) {
                        elements.classed(elementClass, true);
                    }
                    return elements;
                },
                drawExit: function(exit) {
                    return exit.remove();
                }
            });
    };

    /**
     * Fits the component to the dimensions of it's parent node.
     */
    c3.fitToParent = function () {
        return c3.component('fitToParent')
            .extend({
                width: c3.prop(),
                height: c3.prop()
            })
            .extend(function (){
                var domParent = this.selection().node().domNode.parentElement;

                this.height(c3.checkIsNumber(domParent.clientHeight));
                this.width(c3.checkIsNumber(domParent.clientWidth));
            });
    };
    c3.gridLines = function() {
        return c3.component('gridLines')
            .extend(c3.axis())
            .axisConstructor(function() {
                var tickSize;
                switch (this.orient()) {
                    case 'left': tickSize = -this.width(); break;
                    case 'right': tickSize = this.width(); break;
                    case 'top': tickSize = -this.height(); break;
                    case 'bottom': tickSize = this.height(); break;
                }
                return d3.svg.axis().tickSize(tickSize).tickFormat('');
            });
    };

    /**
     * IE8 and below use r2d3 to render c3 charts. Because we need responsive
     * charts and can't set fixed dimensions on the SVG element, r2d3 fails to get
     * a useable height and width for RaphaelJS to initialise a canvas. So we look
     * for the dimensions of the parent DOM node and pass those instead.
     */
    c3.ieDimensions = function () {
        // Only apply for IE8 and below
        if (document.documentMode && document.documentMode < 9) {
            return c3.component('ieDimensions')
                .extend(c3.fitToParent());
        }
    };

    c3.labelledAxis = function() {
        return c3.component('labelledAxis')
            .extend(c3.axis())
            .extend({
                text: c3.prop('')
            })
            .extend(function() {
                // Render label
                var text = this.text();
                var label = c3.singular()
                    .elementTag('text')
                    .elementClass('axis-label')
                    .enter(function(event) {
                        event.selection.attr('text-anchor', 'middle');
                    })
                    .update(function(event) {
                        event.selection.text(text);
                    });
                var labelElement = label(this.selection()).elements();

                // Positioning
                var x = 0,
                    y = 0,
                    degrees = 0;
                var bBox = labelElement.node().getBBox();
                switch(this.orient()) {
                    case 'left':
                        degrees = 270;
                        x = -1 * this.width() + bBox.height; // bbox not yet rotated
                        y = this.height() / 2;
                        break;
                    case 'right':
                        degrees = 90;
                        x = this.width() - bBox.height;
                        y = this.height() / 2;
                        break;
                    case 'top':
                        degrees = 0;
                        x = this.width() / 2;
                        y = -1 * this.height() + bBox.height;
                        break;
                    default: // bottom
                        degrees = 0;
                        x = this.width() / 2;
                        y = this.height() - bBox.height / 2;
                }
                labelElement.attr('transform', 'translate(' + x + ', ' + y +') rotate(' + degrees + ', 0, 0)');
            });
    };

    /**
     * Allows components to be layered on top of each other and
     * share common data and/or scales
     */
    c3.layerable = function() {
        var layerDrawable = c3.drawable()
            .elementClass('layer')
            .update(function(event) {
                event.selection.each(function(d, i) {
                    d.component(d3.select(this).classed(d.name, true));
                });
            });

        return c3.component('layerable')
            .extend(function() {
                layerDrawable(this.selection());
            })
            .extend(c3.plottable())
            .extend({
                layers: function() {
                    return layerDrawable.data();
                },
                getLayer: function(name) {
                    var layer = _.findWhere(this.layers(), { name: name });
                    return layer ? layer.component : undefined;
                },
                addLayer: function(name, component) {
                    if (!this.getLayer(name)) {
                        this.layers().push({
                            name: name,
                            component: component.parent(this)
                        });
                    }
                    return this;
                },
                removeLayer: function(name) {
                    var layers = this.layers();
                    var removed = _.reject(layers, function(layer) {
                        return layer.name === name;
                    });
                    if (removed.length !== layers.length) {
                        this.layers(removed);
                    }
                    return this;
                }
            });
    };

    /**
     * Plot an array of points as a line
     */
    c3.linePlot = function() {
        return c3.component('linePlot')
            .extend(c3.drawable())
            .extend(c3.plottable())
            .elementTag('path')
            .elementClass('line')
            .dataFilter(function(data) {
                return [data]; // Map all of the data values to a single element
            })
            .extend({
                lineConstructor: c3.prop(d3.svg.line)
            })
            .update(function(event) {
                var line = this.lineConstructor()()
                    .x(this.x())
                    .y(this.y());

                event.selection.attr('d', line(this.data()))
                    .attr('stroke', 'black')
                    .attr('fill', 'none');
            });
    };

    /**
     * A component that maps data to x and y coordinates in a container
     * with width and height.
     */
    c3.plottable = function() {
        return c3.component('plottable')
            .extend(c3.withData())
            .extend(c3.withDimensions())
            .extend(c3.clippable())
            .extend({
                x: function() {
                    var xScale = this.xScale();
                    var xAccessor = this.xAccessor();
                    return function(d, i) {
                        return xScale(xAccessor(d, i));
                    };
                },
                y: function() {
                    var yScale = this.yScale();
                    var yAccessor = this.yAccessor();
                    return function(d, i) {
                        return yScale(yAccessor(d, i));
                    };
                },
                xAccessor: c3.inherit('xAccessor', c3.defaults.x),
                yAccessor: c3.inherit('yAccessor', c3.defaults.y),
                xScaleConstructor: c3.inherit('xScaleConstructor', d3.scale.linear),
                yScaleConstructor: c3.inherit('yScaleConstructor', d3.scale.linear),
                xDomain: c3.inherit('xDomain').onDefault(function() {
                    if (c3.isEmpty(this.data())) return;
                    
                    var min = c3.checkIsNumber(d3.min(this.data(), this.xAccessor()));
                    var max = c3.checkIsNumber(d3.max(this.data(), this.xAccessor()));
                    return [min, max];
                }),
                yDomain: c3.inherit('yDomain').onDefault(function() {
                    if (c3.isEmpty(this.data())) return;
                    
                    var min = c3.checkIsNumber(d3.min(this.data(), this.yAccessor()));
                    var max = c3.checkIsNumber(d3.max(this.data(), this.yAccessor()));
                    return [min, max];
                }),
                xRange: c3.inherit('xRange').onDefault(function() {
                    var width = c3.checkIsNumber(this.width());
                    return [0, width];
                }),
                yRange: c3.inherit('yRange').onDefault(function() {
                    var height = c3.checkIsNumber(this.height());
                    return this.cartesian() ? [height, 0] : [0, height];
                }),
                xScale: function() {
                    return this.xScaleConstructor()()
                        .domain(this.xDomain())
                        .range(this.xRange());
                },
                yScale: function() {
                    return this.yScaleConstructor()()
                        .domain(this.yDomain())
                        .range(this.yRange());
                },
                cartesian: c3.prop(true)
            });
    };

    c3.singular = function() {
        return c3.component('singular')
            .extend(c3.withElements())
            .extend({
                enter: c3.event(),
                update: c3.event()
            })
            .extend(function() {
                var element = this.elements();
                if (!element.node()) {
                    element = this.selection().append(this.elementTag());
                    if (this.elementClass()) {
                        element.classed(this.elementClass(), true);
                    }
                    this.enter({ selection: element });
                }
                this.update({ selection: element });
            });
    };

    c3.withData = function() {
        return c3.component('withData')
            .extend({
                data: c3.inherit('data', []),
                dataKey: c3.inherit('dataKey')
            });
    };

    c3.withDimensions = function() {
        return c3.component('withDimensions')
            .extend({
                width: c3.inherit('width').onDefault(function() {
                    return parseInt(this.selection().style('width'), 10) || 0;
                }),
                height: c3.inherit('height').onDefault(function() {
                    return parseInt(this.selection().style('height'), 10) || 0;
                })
            });
    };

    c3.withElements = function() {
        return c3.component('withElements')
            .extend({
                elementTag: c3.prop('g'),
                elementClass: c3.prop(''),
                elementSelector: function() {
                    return this.elementClass() ?
                        this.elementTag() + '.' + this.elementClass() :
                        this.elementTag();
                },
                elements: function() {
                    var containerNode = this.selection().node();
                    return this.selection().selectAll(this.elementSelector()).filter(function() {
                        return this.parentNode === containerNode;
                    });
                }
            });
    };

    window.c3 = c3;
})(d3);
