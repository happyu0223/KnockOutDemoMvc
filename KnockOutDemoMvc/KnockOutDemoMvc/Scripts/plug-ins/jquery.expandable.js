///<reference path="../jquery-ui.js"/>
///<reference path="../utility.js"/>

/// events
/// 1. expanded: after the child table has loaded data, external source could trigger this event;
/// 2. created: after the widget is created, external code could subscribe this event and do something, such as,
///     modify the summary row's colspan
$.widget('gmk.expandable', {
    _observers: [],
    _maxWaitingTimes: 25,
    _tick:10,
    _create: function () {
        var self = this;
        if (this.element[0].tagName != 'TABLE') throw 'this widget is only applied to table';
        setTimeout(_inner.bind(self), self._tick);
        function _inner() {
            self.waiting = (self.waiting || 0) + 1;
            var testing=this.element.children('tbody').children('tr');
            if (self.waiting < self._maxWaitingTimes && (!testing.length || !$(testing[0]).outerHeight())) {
                setTimeout(_inner.bind(self), self._tick);
                return;
            }
            self.option({
                bracketColor: '#aaa',
                signBorderColor: '#aaa',
                signColor: '#aaa',
                //type: 'table' /* 'row' or 'table'; table: all the children is in another table; row: all the children share the same column scheme with their parent row' */
                //toggleCallback:null,
                //thRowSpan:1, /* not used */
                //stripped:false
            });
            console.log(self.waiting >= self._maxWaitingTimes ? 'expandable - warning: timeout!!!' : ('expandable - info: the waiting times ' + self.waiting));
            this.element.on('expanded.expandable', function (e, o) {
                self.sync(o.target.closest('tr').next());
            });
            if (self.option('stripped')) this.element.addClass('table-stripped-by-2');
            var thead = $(this.element.children('thead').children('tr')[0]), rows = this.element.children('tbody').children('tr');
            $(thead.children('th')[0]).attr('title', '收起全部')
                .css('color', self.option('signColor'))
                .html('<i class="icon-chevron-up"></i><i class="icon-chevron-up" style="position:absolute;left:2px;bottom:13px;display:block;margin-top:0px;width:13px;"></i><span style="font-weight:normal;">全部</span>')
                .click(function () {
                var $item;
                $.each(self.element.find('i.expand-row'), function (i, item) {
                    $item = $(item);
                    if (!$item.data('isFolded')) $item.click();
                });
                });
            var isTableType = self.option('type') != 'row';
            var isFirstChild = false;
            $.each(rows, function (i, row) {
                var $row = $(row), $td = $($row.children('td')[0]);
                if (isTableType) {
                    if (i % 2) {
                        // child table
                        if (!$row.hasClass('child')) $row.addClass('child');
                        $td.addClass('child-table-prefix-cell')
                            .html('<div style="width:1px;background-color:{0};height:100%;"></div><div style="position:relative;top:-1px;width:6px;height:1px;background-color:{0};"></div>'.format(self.option('bracketColor')));
                        $row.find('table').addClass('table-inner');
                        self._bindRefresh(row);
                    } else {
                        // parent row
                        $td.addClass('parent-prefix-cell')
                            .html('<i class="icon-plus expand-row" style="padding:1px;color:{0};z-index:2;position:relative;cursor:pointer;"></i><div style="height:100%;margin-top:19px;background-color:{1};width:1px;position:absolute;left:19px;top:0px;display:none;"></div>'.format(self.option('signColor'), self.option('bracketColor')));
                        $td.children('i').click(function () {
                            self._toggle($(this));
                        }).data('isFolded', true);
                    }
                } else {
                    // type is row
                    if ($row.data('group-id')) {
                        // parent row
                        var isLeaf = $row.data('is-leaf');
                        $td.addClass('parent-prefix-cell')
                            .html('<i class="{2} expand-row" style="padding:1px;color:{0};z-index:2;position:relative;cursor:pointer;"></i>{1}'.format(self.option('signColor'), isLeaf ? '' : '<div style="height:100%;margin-top:19px;background-color:{0};width:1px;position:absolute;left:19px;top:0px;display:none;"></div>'.format(self.option('bracketColor')), isLeaf ? 'icon-minus' : 'icon-plus'));
                        $td.children('i').click(function () {
                            self._toggle($(this));
                        }).data('isFolded', true);
                        isFirstChild = true;
                    } else if ($row.data('group-id') === '') {
                        isFirstChild = false;
                    } else {
                        $row.addClass('child-row');
                        if (isFirstChild) {
                            // child table
                            $td.next().addClass('indent-1');
                            $td.addClass('child-table-prefix-cell')
                                .html('<div style="width:1px;background-color:{0};"></div><div style="position:relative;top:-1px;width:6px;height:1px;background-color:{0};"></div>'.format(self.option('bracketColor')));
                            $row.find('table').addClass('table-inner');
                            self._bindRefresh(row);
                            isFirstChild = false;
                        } else {
                            $td.addClass('indent-1');
                        }
                    }
                }
            });
            if (isTableType) {
                $.each(rows, function (i, row) {
                    var $row = $(row);
                    if (i % 2) {
                        $($row.children('td')[0]).css('height', $row.outerHeight() + 'px');
                    } else {
                        $($row.children('td')[0]).css('height', ($row.outerHeight() - 8) + 'px');
                    }
                });
            } else {
                $.each(rows, function (i, row) {
                    var $row = $(row);
                    if ($row.data('group-id')) {
                        $($row.children('td')[0]).css('height', ($row.height() - 8) + 'px');
                    } else if ($row.data('group-id') === '') {
                        // nothing to do
                    } else {
                        var firstChild = $($row.children('td')[0]);
                        if (firstChild.hasClass('child-table-prefix-cell')) $(firstChild.children()[0]).css('height', ($row.height() * parseInt(firstChild.attr('rowspan'), 10) - 8) + 'px');
                    }
                });
            }
            self.element.trigger('created.expandable');
        }
    },
    _bindRefresh: function (row) {
        var self = this, observer = window.MutationObserver || window.WebKitMutationObserver || window.MozMutationObserver, obj;
        if (observer !== undefined) {
            obj = new observer(function (mutations) {
                $.each(mutations, function (i, mutation) {
                    self.sync($(mutation.target));
                });
            });
            obj.observe(row, {
                attributes: true,
                attributesFilter: ['height']
            });
            self._observers.push(obj);
        } else {
            // should be IE8-10
            if (row.attachEvent) row.attachEvent('onpropertychange', function (e) {
                if (~e.propertyName.indexOf('height')) self.sync($(e.srcElement));
            });
        }
    },
    isFolded: function($i) {
        return $i.data('isFolded');
    },
    sync: function ($childRow) {
        var self = this;
        // row's height change
        var $i = $($childRow.prev().children('td')[0]).children('i');
        if ($childRow.css('display') == 'none') {
            self._toggle($i, true);
            return;
        }
        var tds = $childRow.children('td'), firstTd = $(tds[0]), oldHeight = firstTd.outerHeight(), newHeight = $(tds[1]).children('table').not('.hide').outerHeight(true);
        if (oldHeight != newHeight) firstTd.css('height', newHeight);
        self._toggle($i, false);
    },
    _toggle: function ($this, v) {
        var self = this, isFolded = $this.data('isFolded');
        if (isFolded == v) return;
        isFolded = v === undefined ? !isFolded : v;
        var isTableType = self.option('type') != 'row';
        if (isFolded) {
            $this.addClass('icon-plus').removeClass('icon-minus');
            $this.next().hide();
        } else {
            $this.addClass('icon-minus').removeClass('icon-plus');
            $this.next().show();
        }
        $this.data('isFolded', isFolded);
        if (isTableType) {
            $this.closest('tr').next().toggle();
        } else {
            $(self.element).find('[data-parent-group="'+ $this.closest('tr').data('group-id') + '"]').toggle();
        }
        var callback = self.option('toggleCallback');
        if (callback) callback({ isFolded: isFolded, target: $this });
    },
    _destroy: function () {
        $.each(this._observers, function (i, observer) {
            observer.disconnect();
        });
        this._observers.splice(0, this._observers.length);
        //var thead = this.element.children('thead').children('tr');
        //$(thead.children('th')[0]).remove();
    }
});