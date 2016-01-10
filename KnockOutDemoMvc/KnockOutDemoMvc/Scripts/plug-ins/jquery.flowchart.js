(function (window, $, jsPlumb) {
    function Flowchart(el, options) {
        if (!options.data) throw 'data is required';

        var chart = $('.flowchart', el), endpoints = [], nodes, connections = {}, labels, labelsReverseMapping = [], tops = 0, bottoms = 0,
            instance = jsPlumb.getInstance({
                DragOptions: { cursor: 'pointer', zIndex: 2000 },
                ConnectionOverlays: [
					['Arrow', { location: 1, width: 7, length: 7 }],
					['Label', {
					    location: 0.5,
					    id: 'label',
					    cssClass: 'aLabel'
					}]
                ],
                Container: chart,
                LogEnabled: true
            }),
            connectorPaintStyle = {
                lineWidth: 2,
                strokeStyle: '#61b7cf',
                joinStyle: 'round',
                outlineColor: 'white',
                outlineWidth: 1
            },
			connectorHoverStyle = {
			    lineWidth: 2,
			    strokeStyle: '#216477',
			    outlineWidth: 1,
			    outlineColor: 'white'
			},
			endpointHoverStyle = {
			    fillStyle: '#216477',
			    strokeStyle: '#216477'
			},
			sourceEndpoint = {
			    endpoint: 'Rectangle',
			    paintStyle: {
			        strokeStyle: '#7ab02c',
			        width: 5,
			        height: 5
			    },
			    isSource: true,
			    connector: ['Flowchart', { stub: [30, 40], gap: 0, cornerRadius: 5, alwaysRespectStubs: true }],
			    connectorStyle: connectorPaintStyle,
			    hoverPaintStyle: endpointHoverStyle,
			    //connectorHoverStyle:connectorHoverStyle,
			    dragOptions: {},
			    overlays: [
					['Label', {
					    location: [0.5, 1.5],
					    label: '',
					    cssClass: 'endpointSourceLabel'
					}]
			    ]
			},
			targetEndpoint = {
			    endpoint: 'Rectangle',
			    paintStyle: { fillStyle: '#7ab02c', width: 5, height: 5 },
			    hoverPaintStyle: endpointHoverStyle,
			    maxConnections: -1,
			    dropOptions: { hoverClass: 'hover', activeClass: 'active' },
			    isTarget: true,
			    overlays: [['Label', { location: [0.5, -0.5], label: '', cssClass: 'endpointTargetLabel' }]]
			};


        function _initialize() {
            _insertEndpoints([0.5, 0, 0, -1]);
            _insertEndpoints([0.5, 1, 0, 1]);

            nodes = $.map(options.data.nodes, _convertNodes);
            labels = options.data.labels;
            var i = 1, orderedLabels = [];
            for (var prop in labels) {
                labelsReverseMapping[labels[prop]] = i;
                orderedLabels.push(labels[prop]);
                i++;
            }
            _poseNodes();
            _generateConditionList(orderedLabels);
            _generateMarks();
            instance.draggable($('.window', el), { grid: [20, 20] });
        }

        function _convertNodes(data) {
            var n = new Node();
            n.seq = data.seq;
            n.text = data.text;
            n.ins = data.ins;
            n.outs = data.outs;
            n.isWalked = data.isWalked;
            n.isProcessing = data.isProcessing;
            n.actualNext = data.actualNextStepId;
            return n;
        }

        var prefix = 'FlowChartNode'.length;
        function _initConnection(con) {
            var key = con.sourceId.substring(prefix) + '-' + con.targetId.substring(prefix);
            if (labels[key]) {
                con.getOverlay('label').setLabel(labelsReverseMapping[labels[key]] + '');
            } else {
                con.removeOverlay('label');
            }
        }

        function _addMainEdges() {
            var src, cur1 = ['RightMiddle'], cur2 = ['RightMiddle', 'LeftMiddle'], cur3 = ['LeftMiddle'], id, tmp, left, right, reserved, uuid1, uuid2;
            $.each(nodes, function (i, node) {
                id = _makeNodeId(node);
                $.each((i == 0) ? cur1 : ((i == nodes.length - 1) ? cur3 : cur2), function (j, ep) {
                    src = $.extend(true, {}, sourceEndpoint);
                    src.connectorStyle.strokeStyle = _getConnectorColor(node, nodes[i+1]);
                    instance.addEndpoint(id, src, { anchor: ep, uuid: _makeConnectionUUID(node, ep), enabled: false });
                });

                left = $.grep(node.outs, function (o) { return o < node.seq; }).reverse();
                right = $.grep(node.outs, function (o) { return o > node.seq; });
                reserved = _chooseSrc(node, true, left.length);
                $.each(left, function (k, out) {
                    if (out == node.seq + 1) return;
                    src = $.extend(true, {}, sourceEndpoint);
                    src.connectorStyle.strokeStyle = _getConnectorColor(node, nodes[out]);
                    src.connector = ['Bezier', { curviness: 90 + (k + 1) * 20 }];
                    tmp = reserved.shift();
                    uuid1 = _makeConnectionUUID(node, tmp);
                    instance.addEndpoint(id, src, { anchor: tmp, uuid: uuid1, enabled: false });
                    tmp = _chooseTarget(nodes[out]);
                    uuid2 = _makeConnectionUUID(nodes[out], tmp);
                    instance.addEndpoint(_makeNodeId(nodes[out]), $.extend(true, {}, targetEndpoint),
                        { anchor: tmp, uuid: uuid2, enabled: false });
                    connections[uuid1] = uuid2;
                });
                reserved = _chooseSrc(node, false, right.length);
                $.each(right, function (k, out) {
                    if (out == node.seq + 1) return;
                    src = $.extend(true, {}, sourceEndpoint);
                    src.connectorStyle.strokeStyle = _getConnectorColor(node, nodes[out]);
                    src.connector = ['Bezier', { curviness: 90 + (k+1) * 20 }];
                    tmp = reserved.pop();
                    uuid1 = _makeConnectionUUID(node, tmp);
                    instance.addEndpoint(id, src, { anchor: tmp, uuid: uuid1, enabled: false });
                    tmp = _chooseTarget(nodes[out], tmp[1] == 0);
                    uuid2 = _makeConnectionUUID(nodes[out], tmp);
                    instance.addEndpoint(_makeNodeId(nodes[out]), $.extend(true, {}, targetEndpoint),
                        { anchor: tmp, uuid: uuid2, enabled: false });
                    connections[uuid1] = uuid2;
                });
            });
        }

        function _getConnectorColor(from, to) {
            var state = MarkState.NotWalked;
            if (to && from.actualNext == to.seq) state = MarkState.Walked;
            return $.grep(defaultMarks, function (mark) {
                return mark.type == MarkType.Line && mark.state == state;
            })[0].bgColor;
        }

        function _addConnections() {
            var last = nodes.length - 1;
            $.each(nodes, function (i, node) {
                if (i == last) return;
                instance.connect({ uuids: [_makeConnectionUUID(node, 'RightMiddle'), _makeConnectionUUID(nodes[i+1], 'LeftMiddle')], editable: false });
            });
            for (var src in connections) {
                instance.connect({uuids:[src, connections[src]], editable:false});
            }
        }

        function _makeNodeId(node) {
            return 'FlowChartNode' + node.seq;
        }

        function _makeConnectionUUID(node, from) {
            return $.isArray(from) ? '{0}{1}{2}{3}{4}'.format(node.seq, from[0], from[1], from[2], from[3]) : (node.seq+from);
        }

        function _chooseSrc(node, toLeft, reservation) {
            result = [];
            if (_isTop()) $.each(node.bitmap.findTopAvailable(0, reservation), function (i, index) {
                result.push(endpoints[index]);
            });
            else $.each(node.bitmap.findBottomAvailable(-1, reservation), function (i, index) {
                    result.push(endpoints[index]);
                });
            $.each(result, function (i, item) {
                if (item[1] == 0) tops++;
                else bottoms++;
            });
            return result;
        }

        function _chooseTarget(node, fromTop) {
            if (fromTop) return endpoints[node.bitmap.findTopAvailable()];
            else return endpoints[node.bitmap.findBottomAvailable()];
        }

        function _insertEndpoints(basepoint) {
            var i = 0, orig = basepoint, tmp = [];
            while (i < 5) {
                orig = lefter(orig);
                tmp.push(orig);
                i++;
            }
            tmp.reverse();
            tmp.push(basepoint);
            i = 0;
            while (i < 5) {
                basepoint = righter(basepoint);
                tmp.push(basepoint);
                i++;
            }
            Array.prototype.push.apply(endpoints, tmp);
            function lefter(p) {
                return [parseFloat((p[0] - 0.1).toFixed(3)), p[1], p[2], p[3]];
            }
            function righter(p) {
                return [parseFloat((p[0] + 0.1).toFixed(3)), p[1], p[2], p[3]];
            }
        }

        function _isTop() {
            return tops < bottoms;
        }

        function _poseNodes() {
            var str = '<div class="window" id="FlowChartNode{1}" style="top:{2}em;left:{3}em;background-color:{4}" data-state="{5}"><strong>{0}</strong></div>',
                top = 15, left = 5, result = [], node;
            $.each(nodes, function (i, node) {
                result.push(str.format(node.text, node.seq, top, left, _getBackgroundColor(node), node.isWalked || node.isProcessing ? '1' : ''));
                left += 15;
            });
            chart.append(result.concat(''));
            _addMainEdges();
            instance.bind('connection', function (connInfo, originalEvent) {
                _initConnection(connInfo.connection);
            });
            _addConnections();
        }

        function _getBackgroundColor(node) {
            var state = MarkState.NotWalked;
            if (node.isWalked) {
                state = MarkState.Walked;
            } if (node.isProcessing) {
                state = MarkState.Processing;
            }
            return $.grep(defaultMarks, function (mark) {
                return mark.type == MarkType.Rect && mark.state == state;
            })[0].bgColor;
        }

        function _generateConditionList(labels) {
            var ul = $('<ul class="flowchart-labels"></ul>');
            $.each(labels, function (i, label) {
                ul.append('<li>' + label + '</li>');
            });
            el.append(ul);
        }

        var MarkState = {
            NotWalked: 'notWalked',
            Start: 'start',
            End : 'end',
            Walked : 'walked',
            Processing:'processing',
        }, MarkType = {
            Rect : 0,
            Line : 1
        }, defaultMarks = [
            new Mark(MarkType.Rect, MarkState.Walked, '已处理节点', '#2f96b4'),
            new Mark(MarkType.Rect,MarkState.NotWalked, '未处理节点', ''),
            new Mark(MarkType.Rect, MarkState.Processing, '当前处理节点', '#faa732'),
            new Mark(MarkType.Line, MarkState.Walked, '经过的路径', '#2f96b4'),
            new Mark(MarkType.Line, MarkState.NotWalked, '未经过的路径', 'gray')
        ];
        function _generateMarks() {
            var marksDiv = $('<div class="flowchart-marks"><h5>图例</h5></div>');
            var rects = $('<ul class="flowchart-mark-rect"></ul>');
            var lines = $('<ul class=flowchart-mark-line></ul>');
            $.each(defaultMarks, function (i, mark) {
                switch (mark.type) {
                    case MarkType.Rect:
                        rects.append('<li><label>{0}</label><div class="window" style="position:static; background-color:{1}"></div></li>'.format(mark.tag, mark.bgColor));
                        break;
                    case MarkType.Line:
                        lines.append('<li><label>{0}</label><div style="background-color:{1}"></div></li>'.format(mark.tag, mark.bgColor));
                        break;
                }
            });
            marksDiv.append(rects, lines);
            el.append(marksDiv);
        }

        _initialize();

        function Mark(type, state, tag, bgColor) {
            this.type = type;
            this.state = state;
            this.tag = tag;
            this.bgColor = bgColor;
        }

        function Node() {
            this.text = '';
            this.seq = null; // must be 0-based
            this.ins = [];
            this.outs = [];
            this.isWalked = false;
            this.isProcessing = false;
            this.bitmap = new Bitmap();
            this.actualNext = null;
        }

        function Bitmap() {
            var _v = 0, _max = endpoints.length, _mid = _max / 2;
            this.findTopAvailable = function (from, reservation) {
                if (from == undefined) from = 0;
                if (reservation == undefined) reservation = 1;
                var result = [];
                if (reservation == 0) return result;
                if (from < 0) {
                    from = _mid + from;
                    while (from >= 0) {
                        if (!(_v & (2 << from))) {
                            _v = _v | (2 << from);
                            result.push(from);
                            if (reservation == 1) return result;
                            else reservation--;
                        }
                        from--;
                    }
                } else {
                    while (from < _mid) {
                        if (!(_v & (2 << from))) {
                            _v = _v | (2 << from);
                            result.push(from);
                            if (reservation == 1) return result;
                            else reservation--;
                        }
                        from++;
                    }
                }
            };
            this.findBottomAvailable = function (from, reservation) {
                if (from == undefined) from = 0;
                if (reservation == undefined) reservation = 1;
                var result = [];
                if (reservation == 0) return result;
                if (from < 0) {
                    from = _max + from;
                    while (from >= 0) {
                        if (!(_v & (2 << from))) {
                            _v = _v | (2 << from);
                            result.push(from);
                            if (reservation == 1) return result;
                            else reservation--;
                        }
                        from--;
                    }
                } else {
                    from += _mid;
                    while (from < _max) {
                        if (!(_v & (2 << from))) {
                            _v = _v | (2 << from);
                            result.push(from);
                            if (reservation == 1) return result;
                            else reservation--;
                        }
                        from++;
                    }
                }

            }
        }
    };

    $.fn.flowchart = function (options) {
        this.each(function () {
            var el = $(this);
            if (el.data('flowchart')) return;
            el.data('flowchart', new Flowchart(el, options));
        });
        return this;
    };
})(window, jQuery, jsPlumb);