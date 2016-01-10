(function (ko) {
    /**
    The DOM does not fire the 'change' event for <select> elements whenever the selection is programmatically changed.
    Knockout does not aim to change this behavior.  
    Thus, if an observable value is changed, KO programmatically
    changes the <select> selection, but any other frameworks that are listening for the 'change' event will not be notified.
    For widget frameworks like jQueryUI/jQueryMobile, the enhanced widget will not update with the new selection.
    This hook modifies ko.selectExtensions.writeValue by programmatically triggering the 'change' event if the 
    selectedIndex changes.
    */
    //(function KoEnableSelectChangeEventOnObservableWrite() {
    //    var baseWriteValue = ko.selectExtensions.writeValue;

    //    ko.selectExtensions.writeValue = function (element) {
    //        var originalIndex = element.selectedIndex;

    //        baseWriteValue.apply(this, arguments);

    //        if (originalIndex !== element.selectedIndex) {
    //            ko.dependencyDetection.ignore(ko.utils.triggerEvent, null, [element, "change"]);
    //        }
    //    }
    //})();

    ko.bindingHandlers.datepicker = {
        init: function (element, valueAccessor, allBindingsAccessor) {
            var value = utils.parseDate(ko.utils.unwrapObservable(valueAccessor()));
            var observable = valueAccessor();
            observable(value);
            //initialize datepicker with some optional options
            var defaults = {
                showAnim: 'slide',
                beforeShow: function () {
                    $(this).css({ 'z-index': '2000000', 'position': 'relative' });
                },
                onClose: function () {
                    // TODO: should load the previous prop
                    $(this).css({ 'z-index': 'auto', 'position': 'static' });
                }
            };
            var options = allBindingsAccessor().datepickerOptions;
            var old;
            if (options) {
                if (options.beforeShow) {
                    old = options.beforeShow;
                    options.beforeShow = function () {
                        defaults.beforeShow();
                        old();
                    }
                }
                if (options.onClose) {
                    old = options.onClose;
                    options.onClose = function () {
                        defaults.onClose();
                        old();
                    };
                }
            }
            var options = $.extend({}, defaults, allBindingsAccessor().datepickerOptions || {});
            $(element).datepicker(options);

            //handle the field changing
            ko.utils.registerEventHandler(element, "change", function () {
                var observable = valueAccessor();
                observable($(element).datepicker("getDate"));
            });

            //handle disposal (if KO removes by the template binding)
            ko.utils.domNodeDisposal.addDisposeCallback(element, function () {
                $(element).datepicker("destroy");
            });

        },
        update: function (element, valueAccessor) {
            var value = utils.parseDate(ko.utils.unwrapObservable(valueAccessor())),
                current = $(element).datepicker("getDate");
            if (value && current && value - current !== 0 || !value && current || value && !current) {
                $(element).datepicker("setDate", value);
            }
            //if (value - current !== 0) {
            //    $(element).datepicker("setDate", value);
            //}        
        }
    };

    // enable/disable : single-way binding from view model to widget
    // bug : onpropertychange in IE7-10 won't be trigger when the underlying select is set disabled=true
    // so we have to depend on ko's subscrib machanisum to set select2's state
    // single value : dual-way binding / single-way binding
    // multiple value : dual-way binding / single-way binding
    //
    ko.bindingHandlers.select2 = {
        init: function (element, valueAccessor, bindingAccessor) {
            var options = ko.toJS(valueAccessor()) || {};
            var defaults = {
                width: '220px'
            };
            options = $.extend(defaults, options);
            var $element = $(element);
            var bindings = bindingAccessor();
            if (bindings.optionsCaption != undefined) $.extend(options, { placeholderOption: "first", allowClear: true, placeholder: bindings.optionsCaption });
            $element.select2(options);
            var isMultiple = $element.prop('multiple');
            var valueBinding = isMultiple ? bindings.selectedOptions : bindings.value;
            if (valueBinding !== undefined && ko.isObservable(valueBinding)) {
                valueBinding.subscribe(function (newVal) {
                    $element.select2('val', !newVal || !$.isArray(newVal) ? newVal : $.grep(newVal, function (v) {
                        return !!v;
                    }));
                });
            } else {
                if (isMultiple) {
                    ko.utils.registerEventHandler(element, "change", function () {
                        var valueToWrite = [], temp;
                        ko.utils.arrayForEach(element.getElementsByTagName("option"), function (node) {
                            // if there is an placeholder opton under the select, shouldn't include it when updating select2's value
                            if (node.selected) (temp = ko.selectExtensions.readValue(node)) && valueToWrite.push(temp);
                        });
                        if ($element.select2('val') != $element.val()) $element.select2('val', valueToWrite);
                    });
                } else {
                    $element.change(function () {
                        if ($element.select2('val') != $element.val()) $element.select2('val', $element.val());
                    });
                }
            }
            var activeBinding = bindings.disable || bindings.enable, state = ko.utils.unwrapObservable(activeBinding), isDisable = !!bindings.disable;
            if (activeBinding) $element.select2('enable', isDisable ? !state : state);
            if (ko.isObservable(activeBinding)) {
                activeBinding.subscribe(function (newVal) {
                    $element.select2('enable', isDisable ? !newVal : newVal);
                });
            }
            // syncronize active state between select and select2
            if ($element.prop('disabled')) $element.select2('disable', true);
        },
        update: function (element, valueAccessor, bindingAccessor) {
            var $element = $(element);
            var bindings = bindingAccessor();
            function applyChange() {
                if (!bindings.options && element.getElementsByTagName("option").length != ko.utils.unwrapObservable(bindings.options).length) {
                    $element.data('updating').push(setTimeout(applyChange, 0));
                    return;
                }
                var v = escapeEmpty($element.val());
                $element.select2('val', v); //TODO: couldn't check value is updating, don't know why yet
            }
            function escapeEmpty(v) {
                if (v && $.isArray(v) && !v[0]) v.shift();
                return v;
            }
            // need to update select2's value even we don't have value binding,
            // since we may change the underlying select's options
            // and that may change select's value
            if (!bindings.options || (ko.utils.unwrapObservable(bindings.options).length &&
                element.getElementsByTagName("option").length == (ko.utils.unwrapObservable(bindings.options).length + (bindings.optionsCaption == undefined ? 0 : 1)))) {
                $element.select2('val', escapeEmpty(bindings.value ? ko.utils.unwrapObservable(bindings.value) : $element.val()));
                // if the value has been set, then we need to cancel the timer triggered before the updating operation.
                var q = $element.data('updating');
                if (q) for (var i = 0, len = q.length; i < len; i++) clearTimeout(q[i]);
                $element.removeData('updating');
            } else {
                // if we change the select's options, the value will be changed but the changed event won't be triggered.
                var tid = setTimeout(applyChange, 0);
                var queue = $element.data('updating') || [];
                queue.push(tid);
            }
        }
    };

    // sample
    // <div class="spark label-warning" data-bind="sparkline:[CommodityHappened,CommodityTotal, $root.isStatusOfCommodityFinished(item)]" data-toggle="tooltip" data-html="true" title="已完成数量：{0}<br/>合同总量：{1}">
    //    <div class="finished label-success"></div>
    //    <span class="label" data-bind="text: $root.isStatusOfCommodityFinished(item) ? '完成' : '未完成'"></span>
    // </div>
    //
    //
    ko.bindingHandlers.sparkline = {
        init: function (element, valueAccessor) {
            var values = valueAccessor();
            var $elem = $(element);
            var width = (values[values.length - 1] === true) ? 1 : Math.min(0.95, Math.max(0, (Math.max(Math.max(accounting.parse(values[0]), (accounting.parse(values[2]) || 0)), 0) || 0) / (accounting.parse(values[1]) || 0.001)));
            switch (values.length) {
                case 3:
                    if (width == 0) $elem.children('.finished').css('opacity', 0);
                    else $elem.children('.finished').width(100 * width + '%').fadeIn(20);
                    break;
                case 4:
                    if (width == 0) $elem.children('.ongoing').css('opacity', 0);
                    else $elem.children('.ongoing').width(100 * width + '%').fadeIn(20);
                    width = (values[values.length - 1] === true) ? 1 : Math.min(1, Math.max(0, (accounting.parse(values[2]) || 0) / (accounting.parse(values[0]) || 0.001)));
                    if (width == 0) $('.ongoing > .finished', $elem).css('opacity', 0);
                    else $('.ongoing > .finished', $elem).width(100 * width + '%').fadeIn(20);
            }
        },
        update: function (element, valueAccessor) {
            var values = valueAccessor();
            var $elem = $(element);
            $.each(values, function (i, v) {
                values[i] = values[i] || '待定';
            });
            var msg = String.prototype.format.apply($elem.attr('title'), values);
            $elem.attr({ 'title': msg });
            if ($elem.data('toggle') == 'tooltip') {
                $elem.tooltip({
                    html: true
                });
            }
        }
    };

    function InlineEditorInitialize(onInlineEditorSave) {
        var $input = $("input[name='EditableValue']");
        $editor = $('.inline-editor');
        $mask = $('.inline-editor-mask');
        $(".inline-editor-footer > button[type='submit']").click(function () {
            var source = $($editor.data('inline-editor-source'));
            var url = source.data('inline-editor-url');
            var newVal = $input.val();
            onInlineEditorSave(url, source.data('inline-editor-view-model'), newVal, function () {
                $mask.hide();
                $editor.hide();
            }, source, source.data('inline-editor-bindings'));
        });
        $(".inline-editor-mask").click(function () {
            $mask.hide();
            $editor.hide();
        });
    }
    ko.exportSymbol('utils.InlineEditorInitialize', InlineEditorInitialize);

    // Step #1:append these html to the end of body TODO: omit the step#1
    //<div class="inline-editor-mask"></div>
    //<div class='inline-editor'>
    //    <div class='inline-editor-body'>
    //        <input type='text' name="EditableValue" />
    //    </div>
    //    <div class='inline-editor-footer'>
    //        <button type="submit" class="btn btn-primary">确认</button>
    //    </div>
    //</div>
    // Step #2:
    //<td class="gmk-amount" data-bind="text:BasePrice, inlineEditor:{url:'basePriceUrl'}"></td>
    ko.bindingHandlers.inlineEditor = {
        init: function (element, valueAccessor, bindingAccessor, viewModel) {
            var value = valueAccessor();
            if (!value.url) return;
            var allBindings = bindingAccessor();
            if (!value.onInitialize) {
                value.onInitialize = function (e) {
                    $('.inline-editor-body > input').val(allBindings.text ? ko.utils.unwrapObservable(allBindings.text) : $(e.currentTarget).text());
                }
            }
            $elem = $(element);
            $elem.data('inline-editor-url', value.url);
            $elem.data('inline-editor-view-model', viewModel);
            if (!ko.isObservable(allBindings.text)) $elem.data('inline-editor-bindings', allBindings);
            var $editor = $('.inline-editor');
            var $mask = $('.inline-editor-mask');
            $elem.addClass('inline-editor-trigger');
            $elem.dblclick(function (e) {
                value.onInitialize(e);
                $editor.data('inline-editor-source', element);
                var offset = $(element).offset()
                $editor.css('left', offset.left).css('top', offset.top).show();
                $mask.show();
                $('.inline-editor-body > input', $editor).focus();
            });
        }
    };

    // the difference between slimChecked and checked: slimChecked support shift key to do range selection
    // Sample
    // <td><input type="checkbox" data-bind="slimChecked: isSelected, previousSelection: $parent.previousSelection, currentSelection: $parent.currentSelection" /></td>
    ko.bindingHandlers['slimChecked'] = {
        'init': function (element, valueAccessor, allBindingsAccessor, viewModel, bindingContext) {
            var allBindings = allBindingsAccessor();
            var updateHandler = function (e) {
                if (element.type != "checkbox") return;
                var valueToWrite = element.checked;

                var modelValue = valueAccessor(), unwrappedValue = ko.utils.unwrapObservable(modelValue);

                ko.expressionRewriting.writeValueToProperty(modelValue, allBindingsAccessor, 'checked', valueToWrite, true);
                var rowkeyCallback = allBindings.rowkeyCallback || bindingContext.$parent.rowkeyCallback;
                var rowKey = rowkeyCallback ? rowkeyCallback(bindingContext.$data) : bindingContext.$index();
                allBindings.previousSelection.data[allBindings.previousSelection.index] = rowKey;
                allBindings.previousSelection.index = (allBindings.previousSelection.index + 1) % 2;
                if (e.shiftKey) allBindings.currentSelection(rowKey);
            };
            ko.utils.registerEventHandler(element, "click", updateHandler);

        },
        'update': function (element, valueAccessor) {
            if (element.type != "checkbox") return;
            var value = ko.utils.unwrapObservable(valueAccessor());
            element.checked = value;
        }
    };

    var slimCheckDefaults = {
        isSelectedObservable: function (elem) {
            return elem.isSelected;
        }
    };
    function SlimCheckExtension(observableList, options) {
        options = $.extend({}, slimCheckDefaults, options || {});
        this.previousSelection = { data: [], index: 0 };
        this.currentSelection = ko.observable();
        // NOTE: rowkeyCallback is required when we could remove items in the list directly.
        this.rowkeyCallback = options.rowkeyCallback;
        this.isSelectedObservable = options.isSelectedObservable;
        var self = this;
        function _indexOf(v) {
            var i;
            if (self.rowkeyCallback) {
                for (i = 0, items = (self.currentSlimCheckArr || observableList)(), len = items.length; i < len; i++) {
                    if (self.rowkeyCallback(items[i]) == v) return i;
                }
                return -1;
            } else {
                return v;
            }
        }
        this.currentSelection.subscribe(function (newVal) {
            var data = self.previousSelection.data, index = self.previousSelection.index,
                v1 = _indexOf(data[index]), v2 = _indexOf(newVal),
            start = Math.min(v1, v2),
            end = Math.max(v1, v2),
            list = (self.currentSlimCheckArr || observableList)();
            if (isNaN(end) || isNaN(start)) return;
            if (self.isSelectedObservable(list[end])()) {
                while (start < end) {
                    if (!self.isSelectedObservable(list[start])()) self.isSelectedObservable(list[start])(true);
                    start++;
                }
            } else {
                while (start < end) {
                    if (self.isSelectedObservable(list[start])()) self.isSelectedObservable(list[start])(false);
                    start++;
                }
            }
            self.previousSelection.index = (self.previousSelection.index + 1) % 2;
        });
        this.resetSlimCheck = function (currentArr) {
            self.previousSelection.data = [];
            self.previousSelection.index = 0;
            if (currentArr) self.currentSlimCheckArr = currentArr;
        };
    };
    ko.exportSymbol('SlimCheckExtension', SlimCheckExtension);

    // http://jsfiddle.net/blachniet/kq3GA/
    // 在 foreach 中无效
    /**
     * Knockout binding handler for bootstrapSwitch indicating the status
     * of the switch (on/off): https://github.com/nostalgiaz/bootstrap-switch
     */
    // Sample
    // <input type="radio" id="SetCommodityFinishStatus" data-bind="bootstrapSwitchOn:{SwitchChangeHandler:SwitchChangeHandler}" data-on-label="完成" data-off-label="未完成" />
    ko.bindingHandlers.bootstrapSwitchOn = {
        init: function (element, valueAccessor, allBindingsAccessor, viewModel) {
            var $elem = $(element), value = valueAccessor(), allBindings = allBindingsAccessor();
            $elem.bootstrapSwitch();
            $elem.on('switch-change', value.SwitchChangeHandler);
            if (allBindings.checked !== undefined) {
                $elem.bootstrapSwitch('setState', ko.utils.unwrapObservable(allBindings.checked), true);
                if (ko.isObservable(allBindings.checked)) {
                    allBindings.checked.subscribe(function (newVal) {
                        var vStatus = $elem.bootstrapSwitch('state');
                        if (vStatus != (!!newVal)) {
                            $elem.bootstrapSwitch('setState', (!!newVal), true);
                        }
                    });
                    $elem.change(function () {
                        if (arguments[1] === true) return;
                        allBindings.checked($elem.is(':checked'));
                    });
                }
            }
            if (allBindings.disable !== undefined) {
                $elem.bootstrapSwitch('setDisabled', ko.utils.unwrapObservable(allBindings.disable));
                if (ko.isObservable(allBindings.disable)) {
                    allBindings.disable.subscribe(function (newVal) {
                        $elem.bootstrapSwitch('setDisabled', newVal);
                    });
                }
            } else if (allBindings.enable !== undefined) {
                $elem.bootstrapSwitch('setDisabled', !ko.utils.unwrapObservable(allBindings.enable));
                if (ko.isObservable(allBindings.enable)) {
                    allBindings.enabled.subscribe(function (newVal) {
                        $elem.bootstrapSwitch('setDisabled', !newVal);
                    });
                }
            }
        },
        update: function (element, valueAccessor, allBindingsAccessor, viewModel) {
            var vStatus = $(element).bootstrapSwitch('state');
            var vmStatus = !!ko.utils.unwrapObservable(allBindingsAccessor().checked);
            if (vStatus != vmStatus) {
                $(element).bootstrapSwitch('setState', vmStatus, true);
            }
        }
    };

    ko.bindingHandlers.dateRangePicker = {
        init: function (element, valueAccessor, allBindingsAccessor, viewModel) {
            var $elem = $(element), allBindings = allBindingsAccessor(),
                opt = { format: 'YYYY-MM-DD', opens: 'left' }, val = $elem.val() || (allBindings.value && ko.utils.unwrapObservable(allBindings.value));
            if (val) {
                var splitting = val.split(' - ');
                if (splitting.length == 2) {
                    opt.startDate = splitting[0];
                    opt.endDate = splitting[1];
                }
            }
            $elem.daterangepicker(opt);
            if (allBindings.value && ko.isObservable(allBindings.value)) {
                allBindings.value.subscribe(function (newVal) {
                    var splitting = newVal ? newVal.split(' - ') : [];
                    if (splitting.length == 2) {
                        $elem.data('daterangepicker').setStartDate(splitting[0]);
                        $elem.data('daterangepicker').setEndDate(splitting[1]);
                    }
                });
            }
        }
    };

    ko.bindingHandlers.abbreviation = {
        init: function (element, valueAccessor) {
            var value = ko.utils.unwrapObservable(valueAccessor()), originalVal = value, max = 50, needAbbr = value && value.length > max, $element = $(element);
            $element.addClass('abbreviation');
            if (needAbbr) {
                value = value.substr(0, max);
                value = value + '...<a href="javascript:0;">查看全部<a>';
            }
            $element.html(value);
            if (needAbbr) $element.children('a').tooltip({ title: originalVal, placement: 'bottom' });
        }
    };

    ko.extenders.formatNumeric = function (target, precision) {
        if (!target) {
            return target;
        }
        var result = ko.computed({
            read: function () {                
                return utils.formatDecimal(target(), typeof precision === 'function' ? precision() : precision, '');
            },
            write: function (newValue) {
                var current = target(),
                    valueToWrite = utils.round(newValue, typeof precision === 'function' ? precision() : precision);
                if (!$.isNumeric(newValue)) {
                    valueToWrite = null;
                }
                //only write if it changed
                if (valueToWrite !== current) {
                    target(valueToWrite);
                } else {
                    //if the rounded value is the same, but a different value was written, force a notification for the current field
                    if (newValue !== current) {
                        target.notifySubscribers(valueToWrite);
                    }
                }
            }
        }).extend({ notify: 'always' });
        //initialize with current value to make sure it is rounded appropriately
        result(target());
        //return the new computed observable
        return result;
    };
    ko.extenders.formatWeight = function (target, precision) {
        return ko.extenders.formatNumeric(target, precision || 4);
    };
    ko.extenders.formatAmount = function (target, precision) {
        return ko.extenders.formatNumeric(target, precision || 2);
    };
    ko.extenders.round = function (target, precision) {
        if (!target) {
            return target;
        }
        var result = ko.computed({
            read: function () {
                return utils.round(target(), typeof precision === 'function' ? precision() : precision);
            },
            write: function (newValue) {
                var current = target(),
                    valueToWrite = utils.round(newValue, typeof precision === 'function' ? precision() : precision);
                if (!$.isNumeric(newValue)) {
                    valueToWrite = null;
                }
                //only write if it changed
                if (valueToWrite !== current) {
                    target(valueToWrite);
                } else {
                    //if the rounded value is the same, but a different value was written, force a notification for the current field
                    if (newValue !== current) {
                        target.notifySubscribers(valueToWrite);
                    }
                }
            }
        }).extend({ notify: 'always' });
        //initialize with current value to make sure it is rounded appropriately
        result(target());
        //return the new computed observable
        return result;
    };
    ko.extenders.roundWeight = function (target, precision) {
        return ko.extenders.round(target, precision || 4);
    };
    ko.extenders.roundAmount = function (target, precision) {
        return ko.extenders.round(target, precision || 2);
    };
    ko.extenders.subscribe = function (target, callback) {
        target.subscribe(callback);
        return target;
    };
    ko.extenders.replaceNan = function (target, nanVal) {
        var result = ko.computed({
            read: function () {
                return utils.replaceNan(target());
            },
            write: target
        }).extend({ notify: 'always' });
        return result;
    };
    ko.extenders.scaling = function (target, ratio) {
        var result = ko.computed({
            read: function () {
                return target() * ratio;
            },
            write: function (newVal) {
                target(newVal / ratio);
            }
        });
        return result;
    };
    ko.extenders.percentage = function (target, ratio) {
        return ko.extenders.scaling(target, 100);
    };
    ko.utils.appendOption = function (options, optionsText, optionsValue, findText, value) {
        //var getText = function (r) {
        //    return r[optionsText];
        //};
        var getValue = function (r) {
            return r[optionsValue];
        };
        var setText = function (r, text) {
            r[optionsText] = text;
        };
        var setValue = function (r, value) {
            r[optionsValue] = value;
        };
        var unwrapedOptions = ko.utils.unwrapObservable(options) || [];
        var unwrapedValue = ko.utils.unwrapObservable(value);
        if (unwrapedValue === null || unwrapedValue === undefined) {
            return unwrapedOptions;
        }
        var selectedOption = utils.find(unwrapedOptions, function (r) {
            return getValue(r) === unwrapedValue;
        });
        if (selectedOption) {
            return unwrapedOptions;
        }
        var option = {};
        setValue(option, unwrapedValue);
        setText(option, findText(unwrapedValue));
        return unwrapedOptions.concat([option]);
    };
})(ko);
