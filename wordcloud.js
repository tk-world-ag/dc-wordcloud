(function (dc){
    'use strict';

    let cloud = require("d3-cloud");

    /**
     * This wraps d3-cloud chart for dc.
     * The functionality is inspired by dc.rowChart.
     *
     * @param parent
     * @param chartGroup
     * @return {String|node|d3.selection|dc.baseMixin|string}
     */
    dc.wordcloudChart = function(parent, chartGroup) {
        let _g;

        let _wordCssClass = 'cloud_word';
        let _titleWordCssClass = 'cloud_title';

        let _font = "Impact";
        let _fontStyle = "normal";
        let _fontWeight = "normal";
        let _wordPadding = 1;
        let _spiral = "archimedean";

        let _rotate = function() {
            return (~~(Math.random() * 6) - 3) * 30;
        };

        let _textAcessor = function(d) {
            return d.text;
        };

        let _baseSize = 10;
        let _fontSize = function(d) {
            return d.value <= 0 ? 0 : Math.log(d.value) * _chart.baseSize()
        };

        /**
         * This chart ist using margins and colors.
         */
        let _chart = dc.colorMixin(dc.marginMixin(dc.baseMixin({})));

        /**
         * This callback is initially called when dc renders the charts.
         *
         * @returns {dc.colorMixin}
         * @private
         */
        _chart._doRender = function() {
            _chart.resetSvg();

            _g = _chart.svg()
                .append('g')
                .attr("transform", "translate(" + (_chart.effectiveWidth() / 2 + _chart.margins().left) + "," + (_chart.effectiveHeight() + _chart.margins().top) / 2 + ")");

            drawChart();

            return _chart;
        };

        /**
         * This function is called when the chart needs to be redrwan.
         * @todo: this function is called twice
         *
         * @returns {dc.colorMixin}
         * @private
         */
        _chart._doRedraw = function() {
            updateChart();

            return _chart;
        };

        /**
         * Delegate filter functionality.
         *
         * @param d
         */
        function onClick(d) {
            _chart.onClick(d);
        }

        /**
         * Receive the data and start drawing the chart by calling
         * the word cloud layout algorithm, which will itself call the
         * actual drawing function when finished.
         */
        function drawChart() {
            let words = _chart.data().map(function(d) {
                return {
                    'text': d.key,
                    'size': _chart.fontSize()(d),
                    'value': _chart.valueAccessor()(d),
                    'key': _chart.keyAccessor()(d),
                    'title': _chart.title()(d),
                    'fill': _chart.getColor(d)
                }
            });
            calculatePositions(words);
        }

        /**
         * Only set the value, when updated. And decide if a word
         * is outlined or not.
         */
        function updateChart() {
            let words = _chart.data().reduce(function(p, d) {
                p[d.key] = {
                    'value' : _chart.valueAccessor()(d)
                };
                return p;
            }, {});

            let allWords = _g.selectAll('text.' + _wordCssClass);
            allWords.data().map(function(d) {
                console.log(d);
                if (d.key in words && words[d.key].value > 0) {
                    d.value = words[d.key].value;
                    d.outline = false;
                } else {
                    d.outline = true;
                    d.value = 0;
                }
                return d;
            });

            updateElements(allWords);
        }

        /**
         * This function processes the result from the word cloud layout algorithm.
         *
         * @param cloud
         */
        function drawCloudResult(cloud) {
            let gWords = _g.selectAll('text.' + _wordCssClass)
                .data(cloud);

            removeElements(gWords);
            updateElements(createElements(gWords));
        }

        /**
         * Remove words.
         *
         * @param words
         */
        function removeElements (words) {
            words.exit().remove();
        }

        /**
         * Create all text elements and add a title tag.
         *
         * @param words
         * @returns {*}
         */
        function createElements(words) {
            let wordsEnter = words.enter().append("text")
                .attr("class", _wordCssClass)
                .style("font-family", _chart.font())
                .attr("text-anchor", "middle")
                .text(_chart.keyAccessor())
                .attr('cursor', 'pointer')
                .on('click', onClick);

            createTitles(wordsEnter);

            return wordsEnter;
        }

        /**
         * This function updates the appearance of the words but keeps their position.
         * When filtered by words it will gray out other words. When the value of a
         * word is zero, it will be outlined instead of disappearing.
         *
         * @param gWords
         */
        function updateElements(gWords) {
            let text = gWords
                .attr('fill', function(d) {
                    return (_chart.hasFilter() && !_chart.hasFilter(_chart.keyAccessor()(d))) ? '#ccc' : d.fill;
                }).attr('stroke', function(d) {
                    if (d.outline) {
                        return '#ccc';
                    }
                }).attr('fill-opacity', function(d) {
                    if (d.outline) {
                        return '0.0';
                    }
                });

            dc.transition(text, _chart.transitionDuration(), _chart.transitionDelay())
                .attr('font-size', function(d) { return d.size + "px"; })
                .attr("transform", function(d) {
                    return "translate(" + [d.x, d.y] + ")rotate(" + d.rotate + ")";
                });
        }

        /**
         * Append a title tag to all words.
         *
         * @param wordsEnter
         */
        function createTitles(wordsEnter) {
            wordsEnter.append('title')
                .attr('class', _titleWordCssClass)
                .text(function(d) { return d.title; });
        }

        /**
         * The word cloud layout will be computed with the given data.
         * When finished the algorithm will call drawCloudResult.
         *
         * @see drawCloudResult
         * @param data
         */
        function calculatePositions(data) {
            cloud().words(data)
                .size([_chart.effectiveWidth(), _chart.effectiveHeight()])
                .rotate(_chart.rotate())
                .text(_chart.textAcessor())
                .font(_chart.font())
                .fontStyle(_chart.fontStyle())
                .fontSize(_chart.fontSize())
                .fontWeight(_chart.fontWeight())
                .rotate(_chart.rotate())
                .spiral(_chart.spiral())
                .padding(_chart.wordPadding())
                .on("end", drawCloudResult)
                .start();
        }

        /**
         * May be used by fontSize to scale.
         * @see _fontSize
         *
         * @param baseSize
         * @returns {dc.colorMixin|number}
         */
        _chart.baseSize = function(baseSize) {
            if (!arguments.length){
                return _baseSize;
            }

            _baseSize = baseSize;
            return _chart;
        };

        /**
         * This will be directly passed to the cloud function.
         * @see https://github.com/jasondavies/d3-cloud#font
         *
         * @param font
         * @returns {string|dc.colorMixin}
         */
        _chart.font = function(font) {
            if (!arguments.length){
                return _font;
            }

            _font = font;
            return _chart;
        };

        /**
         * This will be directly passed to the cloud function.
         * @see https://github.com/jasondavies/d3-cloud#fontStyle
         *
         * @param fontStyle
         * @returns {string|dc.colorMixin}
         */
        _chart.fontStyle = function(fontStyle) {
            if (!arguments.length){
                return _fontStyle;
            }

            _fontStyle = fontStyle;
            return _chart;
        };

        /**
         * This will be directly passed to the cloud function.
         * @see https://github.com/jasondavies/d3-cloud#fontWeight
         *
         * @param fontWeight
         * @returns {string|dc.colorMixin}
         */
        _chart.fontWeight = function(fontWeight) {
            if (!arguments.length){
                return _fontWeight;
            }

            _fontWeight = fontWeight;
            return _chart;
        };

        /**
         * This will be directly passed to the cloud function.
         * @see https://github.com/jasondavies/d3-cloud#rotate
         *
         * @param rotate
         * @returns {dc.colorMixin|(function(): number)}
         */
        _chart.rotate = function(rotate) {
            if (!arguments.length){
                return _rotate;
            }

            _rotate = rotate;
            return _chart;
        };

        /**
         * This will be directly passed to the cloud function.
         * @see https://github.com/jasondavies/d3-cloud#text
         *
         * @param textAcessor
         * @return {dc.colorMixin|(function(*): *)}
         */
        _chart.textAcessor = function(textAcessor) {
            if (!arguments.length){
                return _textAcessor;
            }

            _textAcessor = textAcessor;
            return _chart;
        };

        /**
         * This will be directly passed to the cloud function.
         * @see https://github.com/jasondavies/d3-cloud#padding
         *
         * @param wordPadding
         * @returns {dc.colorMixin|number}
         */
        _chart.wordPadding = function(wordPadding) {
            if (!arguments.length){
                return _wordPadding;
            }

            _wordPadding = wordPadding;
            return _chart;
        };

        /**
         * This will be directly passed to the cloud function.
         * @see https://github.com/jasondavies/d3-cloud#spiral
         *
         * @param spiral
         * @return {dc.colorMixin|(function(*): *)|string}
         */
        _chart.spiral = function(spiral) {
            if (!arguments.length){
                return _spiral;
            }

            _spiral = spiral;
            return _chart;
        };

        /**
         * This will be directly passed to the cloud function.
         * @see https://github.com/jasondavies/d3-cloud#fontSize
         *
         * @param fontSize
         * @returns {dc.colorMixin|(function(*): number)}
         */
        _chart.fontSize = function(fontSize) {
            if (!arguments.length){
                return _fontSize;
            }

            _fontSize = fontSize;
            return _chart;
        };

        return _chart.anchor(parent, chartGroup);
    }
})(dc);
