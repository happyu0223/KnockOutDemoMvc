(function ($) {
    $.validator.methods.number = function (value, element) {
        return this.optional(element) || $.isNumeric(value);
    };

    $.extend($.validator.methods, {
        'greater-than': function (value, elem, param) {
            try {
                var $value = $('#' + param);
            } catch (e) {
                $value = [];
            }
            if ($value.length && this.optional($value[0])) return true;
            if (this.optional(elem)) return true;

            var $elem = $(elem);
            var type = $elem.data('comparison-type') || $elem.attr('type');
            switch (type) {
                case 'number':
                    return +$elem.val() >= +($value.length ? $value.val() : param);
                case 'date':
                default:
                    return new Date($elem.val()) >= new Date($value.length ? $value.val() : param);
            }
        },
        'not-greater-than': function (value, elem, param) {
            try {
                var $value = $('#' + param);
            } catch (e) {
                $value = [];
            }
            if ($value.length && this.optional($value[0])) return true;
            if (this.optional(elem)) return true;

            var $elem = $(elem);
            var type = $elem.data('comparison-type') || $elem.attr('type');
            switch (type) {
                case 'date':
                    return new Date($elem.val()) <= new Date($value.length ? $value.val() : param);
                case 'number':
                    return +$elem.val() <= +($value.length ? $value.val() : param);
            }
        },
        'select2-required': function (value, element, param) {
            var $elem = $(element);
            if ($elem.attr('multiple') == 'multiple') {
                return value && $.isArray(value) && value.length && $.grep(value, function (item) {
                    return !!item;
                }).length;
            } else {
                return !!value;
            }
        },
        'not-equal-to': function (value, elem, param) {
            return value != param;
        },
        'max-to':function (value, elem, param) {
            var target = $(param);
            return +value <= +target.val();
        }
    });
    $.extend($.validator.messages, {
        'select2-required': "字段必填。",
        "greater-than": function (params, elem) {
            var msg, $elem = $(elem), type = $elem.data('comparison-type') || $elem.attr('type'), label;
            try {
                label = $('label[for="' + params + '"].control-label');
            } catch (e) {
                label = [];
            }
            switch (type) {
                case 'number':
                    msg = '{0}必须大于或等于{1}';
                    break;
                case 'date':
                default:
                    msg = '{0}必须晚于或等于{1}';
                    break;
            }
            return $.validator.format(msg, $('label[for="' + $(elem).attr('name') + '"].control-label').text() || $(elem).attr('name'), label.length && label.text() || params);
        },
        "not-greater-than": function (params, elem) {
            function isToday(date) {
                var now = new Date(), temp = new Date(date);
                return temp.getYear() == now.getYear() && temp.getDate() == now.getDate() && temp.getDay() == now.getDay();
            }
            var msg, $elem = $(elem), type = $elem.data('comparison-type') || $elem.attr('type');
            try {
                var label = $('label[for="' + params + '"].control-label');
            } catch (e) {
                label = [];
            }
            switch (type) {
                case 'date':
                    msg = '{0}必须不晚于{1}';
                    if (!label.length && isToday(params)) params = '当天';
                    break;
                case 'number':
                    msg = '{0}必须不大于{1}';
                    break;
            }
            return $.validator.format(msg, $('label[for="' + $(elem).attr('name') + '"].control-label').text(), label.length ? label.text() : params);
        },
        'not-equal-to': function (params, elem) {
            return $.validator.format('输入的数字不能等于{0}', params);
        },
        'max-to': function (param, elem) {
            return $.validator.format("请输入小于等于{0}的值。", $(param).val());
        }
    });
    $.validator.setDefaults({
        showErrors: function () {
            var i, elements;
            for (i = 0; this.errorList[i]; i++) {
                var error = this.errorList[i];
                if (this.settings.highlight) {
                    this.settings.highlight.call(this, error.element, this.settings.errorClass, this.settings.validClass);
                }
                this.showLabel(error.element, error.message);
            }
            if (this.errorList.length) {
                this.toShow = this.toShow.add(this.containers);
            }
            if (this.settings.success) {
                for (i = 0; this.successList[i]; i++) {
                    this.showLabel(this.successList[i]);
                }
            }
            if (this.settings.unhighlight) {
                for (i = 0, elements = this.validElements() ; elements[i]; i++) {
                    this.settings.unhighlight.call(this, elements[i], this.settings.errorClass, this.settings.validClass);
                }
            }
            this.toHide = this.toHide.not(this.toShow);
            this.hideErrors();
            this.addWrapper(this.toShow).show();
        },
        errorPlacement: function (error, element) {
            var openEvent = 'focusin.ve', closeEvent = 'focusout.ve', orig = element, handlers = {};
            if (element.hasClass('select2-offscreen')) {
                element = element.prev('.select2-container');
                openEvent = 'select2-open.ve';
                closeEvent = 'select2-close.ve';
            }
            element.popover('destroy');
            element.popover({
                animation: false,
                placement: 'top',
                html: true,
                content: error.outerHtml(),
                trigger: 'manual'
            });
            handlers[openEvent] = function () {
                element.popover('show');
            };
            handlers[closeEvent] = function () {
                element.popover('hide');
            };
            orig.off('.ve').on(handlers);
        },
        highlight: function (element, errorClass, validClass) {
            var $elem = $(element);
            if (element.type === "radio") {
                $elem.closest('.control-group').addClass(errorClass).removeClass(validClass);
                $elem.addClass(errorClass).removeClass(validClass);
            } else {
                if ($elem.hasClass('select2-offscreen')) {
                    $elem.prev('.select2-container').addClass(errorClass);
                    $elem.addClass(errorClass).removeClass(validClass);
                    var self = this;
                    $elem.on('change.jve', function () {
                        self.element(this);
                    });
                } else {
                    $elem.closest('.control-group').addClass(errorClass).removeClass(validClass);
                    $elem.addClass(errorClass).removeClass(validClass);
                }
            }
        },
        unhighlight: function (element, errorClass, validClass) {
            var $elem = $(element);
            if (element.type === "radio") {
                $elem.closest('.control-group').removeClass(errorClass).addClass(validClass);
                $elem.removeClass(errorClass).addClass(validClass);
                $elem.popover('hide');
            } else {
                if ($elem.hasClass('select2-offscreen')) {
                    $elem.prev('.select2-container').removeClass(errorClass).popover('hide');
                    $elem.removeClass(errorClass).addClass(validClass);
                    $elem.off('change.jve');
                } else {
                    $elem.closest('.control-group').removeClass(errorClass).addClass(validClass);
                    $elem.removeClass(errorClass).addClass(validClass);
                    $elem.popover('hide');
                }
                $elem.off('.ve');
            }
        }
    });
})(jQuery);
