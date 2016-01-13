if (!Array.prototype.indexOf) {
    Array.prototype.indexOf = function (searchElement, fromIndex) {
        if (this === undefined || this === null) {
            throw new TypeError('"this" is null or not defined');
        }
        var length = this.length >>> 0; // Hack to convert object.length to a UInt32
        fromIndex = +fromIndex || 0;
        if (Math.abs(fromIndex) === Infinity) {
            fromIndex = 0;
        }
        if (fromIndex < 0) {
            fromIndex += length;
            if (fromIndex < 0) {
                fromIndex = 0;
            }
        }
        for (; fromIndex < length; fromIndex++) {
            if (this[fromIndex] === searchElement) {
                return fromIndex;
            }
        }
        return -1;
    };
}
if (!Array.prototype.max) {
    Array.prototype.max = function () {
        return Math.max.apply({}, this);
    };
}
if (!Array.prototype.min) {
    Array.prototype.min = function () {
        return Math.min.apply({}, this);
    };
}

// keyer: function to get array item's key as string
if (!Array.prototype.getUnique) {
    Array.prototype.getUnique = function (keyer) {
        var u = {}, a = [];
        if (!keyer) keyer = function (item) { return item; };
        for (var i = 0, l = this.length; i < l; ++i) {
            var key = keyer(this[i]);
            if (u.hasOwnProperty(key)) continue;
            a.push(this[i]);
            u[key] = 1;
        }
        return a;
    };
}

if (!Array.prototype.sum) {
    Array.prototype.sum = function (dataFetchCallback) {
        var start = 0;
        for (var i = 0; i < this.length; i++) start += dataFetchCallback ? dataFetchCallback(this[i]) : this[i];
        return start;
    };
}

// Function for JavaScript equivalent to printf/string.format
if (!String.prototype.format) {
    String.prototype.format = function () {
        var formatted = this;
        for (var i = 0; i < arguments.length; i++) {
            var regexp = new RegExp('\\{' + i + '\\}', 'gi');
            formatted = formatted.replace(regexp, arguments[i]);
        }
        return formatted;
    };
}
if (!String.prototype.toTitleCase) {
    String.prototype.toTitleCase = function () {
        var formatted = this;
        if (!!!formatted) return formatted;
        var i = 0, temp = [];
        while (formatted[i] >= 'A' && formatted[i] <= 'Z') {
            temp.push(formatted[i].toLowerCase());
            i++;
        }
        if (i > 1) {
            temp.pop();
            i--;
        }
        formatted = temp.join('') + formatted.substr(i);
        return formatted;
    };
}

// Array Remove - By John Resig (MIT Licensed)
if (!Array.prototype.remove) {
    Array.prototype.remove = function (from, to) {
        var rest = this.slice((to || from) + 1 || this.length);
        this.length = from < 0 ? this.length + from : from;
        return this.push.apply(this, rest);
    };
}


// jquery extensions
(function ($) {

    jQuery.ajaxSettings.traditional = true;

    $.fn.outerHtml = function () {
        if (this.length == 0) return false;
        var elem = this[0], name = elem.tagName.toLowerCase();
        if (elem.outerHTML) return elem.outerHTML;
        var attrs = $.map(elem.attributes, function (i) { return i.name + '="' + i.value + '"'; });
        return "<" + name + (attrs.length > 0 ? " " + attrs.join(" ") : "") + ">" + elem.innerHTML + "</" + name + ">";
    };

    var r20 = /%20/g,
        rbracket = /\[\]$/;
    function buildParams(prefix, obj, traditional, add) {
        var name;

        if (jQuery.isArray(obj)) {
            // Serialize array item.
            jQuery.each(obj, function (i, v) {
                if (traditional || rbracket.test(prefix)) {
                    // Treat each array item as a scalar.
                    add(prefix, v);

                } else {
                    // Item is non-scalar (array or object), encode its numeric index.
                    buildParams(prefix + "[" + (typeof v === "object" ? i : "") + "]", v, traditional, add);
                }
            });

        } else if (jQuery.type(obj) === "object") {
            // Serialize object item.
            for (name in obj) {
                buildParams(prefix + "." + name, obj[name], traditional, add);
            }

        } else {
            // Serialize scalar item.
            add(prefix, obj);
        }
    }
    $.param = function (a, traditional) {
        var prefix,
            s = [],
            add = function (key, value) {
                // If value is a function, invoke it and return its value
                value = jQuery.isFunction(value) ? value() : (value == null ? "" : value);
                s[s.length] = encodeURIComponent(key) + "=" + encodeURIComponent(value);
            };

        // Set traditional to true for jQuery <= 1.3.2 behavior.
        if (traditional === undefined) {
            traditional = jQuery.ajaxSettings && jQuery.ajaxSettings.traditional;
        }

        // If an array was passed in, assume that it is an array of form elements.
        if (jQuery.isArray(a) || (a.jquery && !jQuery.isPlainObject(a))) {
            // Serialize the form elements
            jQuery.each(a, function () {
                add(this.name, this.value);
            });

        } else {
            // If traditional, encode the "old" way (the way 1.3.2 or older
            // did it), otherwise encode params recursively.
            for (prefix in a) {
                buildParams(prefix, a[prefix], traditional, add);
            }
        }

        // Return the resulting serialization
        return s.join("&").replace(r20, "+");
    };
})(jQuery);
var utils = new (function () {
    var mod = this;

    mod.upperCamelCaseToLower = function (s) {
        var formatted = s;
        if (!!!formatted) return formatted;
        var i = 0, temp = [];
        while (formatted[i] >= 'A' && formatted[i] <= 'Z') {
            temp.push(formatted[i].toLowerCase());
            i++;
        }
        if (i > 1) {
            temp.pop();
            i--;
        }
        formatted = temp.join('') + formatted.substr(i);
        return formatted;
    };

    mod.lowerCamelCaseToUpper = function (s) {
        if (/^[a-z]/.test(s)) {
            
        }
    };

    mod.Epsilon = 0.0000001;

    function formatDate(dateString, format) {
        //return new Date(parseInt(dateString.substr(6))).toString(format || 'yyyy-MM-dd');
        return dateFormatter(dateString, format);
    }

    function getDateString(date) {
        //var theDate = date || new Date();
        //return ("0" + (theDate.getMonth() + 1)).substr(-2, 2) + '/' + theDate.getDate() + '/' + theDate.getFullYear();
        return dateFormatter(date || new Date(), 'MM/DD/YYYY');
    }

    function getFirstDayOfNextMonth() {
        var date = new Date();
        var month = date.getMonth() + 1;
        var year = date.getFullYear();
        if (month > 12) {
            month -= 12;
            year++;
        }
        return new Date(year, month, 1);
    }

    function trim(str) {
        return str.replace(/(^\s*)|(\s*$)/g, "");
    }

    function isEmpty(str) {
        return this.trim(str) == "";
    }

    function hasScrollbar(elem) {
        elem = elem || document.body;
        var result = !!elem.scrollTop;
        if (!result) {
            elem.scrollTop = 1;
            result = !!elem.scrollTop;
            elem.scrollTop = 0;
        }
        return result;
    }

    function serialize(selector, normalize) {
        var $selector = typeof selector !== 'string' ? selector : $(selector)
        var data = {};
        $(selector).each(function (i, item) {
            var attrName = $(this).attr('name');
            if (attrName) {
                if (($(this).is(':radio') || $(this).is(':checkbox')) && !$(this).prop('checked')) {
                    return;
                }

                var val = $(this).is(':checkbox') ? $(this).prop('checked') : $(this).val();
                if ($(this).hasClass('gmk-account') && $(this).is('input:text')) {
                    val = accounting.parse(val);
                }
                if (normalize) attrName = attrName.toTitleCase();
                if (val) {
                    if (!!data[attrName]) {
                        data[attrName] += "," + val;
                    } else {
                        data[attrName] = val;
                    }
                } else {
                    data[attrName] = '';
                }
            }
        });
        return data;
    }

    function deserialize(selector, data) {
        if (!data) return;
        $(selector).each(function (i, item) {
            var field = $(this).attr('name');
            if (!!field) {
                var value = data[field];
                if (value == undefined) value = data[field.toTitleCase()];
                if (value === undefined || value == null) value = '';
                var $this = $(this);
                if ($this.is(':radio')) {
                    $this.prop('checked', $this.val().toLowerCase() == value.toString().toLowerCase());
                    $this.trigger('change');
                } else {
                    $this.val(value.toString());
                    $this.trigger('change');
                }
            }
        });
    }

    function reset(container) {
        $(container).find("input, select").val("");
        $(container).find(":checkbox").removeAttr('checked');
    }

    function startLoading() {
        $.blockUI({
            css: { border: 'none', padding: '15px', backgroundColor: '#000', '-webkit-border-radius': '10px', '-moz-border-radius': '10px', opacity: .6, color: '#fff' },
            overlayCSS: { backgroundColor: '#333', opacity: 0.3 },
            ignoreIfBlocked: true
        });
    }

    function endLoading() {
        $.unblockUI();
    }

    function autoFormatString() {
        $('.gmk-datetime').each(function () {
            var $this = $(this);
            if ($this.is(':text') && !!$this.val()) {
                $this.val(formatDate($this.val()));
            }
            else if (!!$this.text()) {
                $this.text(formatDate($this.text()));
            }
        });
        formatDecimal();
        $(".datepicker:not(.hasDatepicker)").datepicker({
            beforeShow: function () {
                $(this).css({ 'z-index': '2000000', 'position': 'relative' });
            },
            onClose: function () {
                // TODO: should load the previous prop
                $(this).css({ 'z-index': 'auto', 'position': 'static' });
            }
        });
    }

    function formatDecimal(num, precision, thousands) {
        if (num == undefined && precision === undefined) {
            function elemFormatDecimalInternal(prec) {
                var $this = $(this);
                var method = $this.is('input') ? 'val' : 'text';
                var val = $this[method]();
                if (!!val && !isNaN(val)) $this[method](accounting.formatNumber(utils.round(val, prec), prec, $this.data('thousands')));
            }

            $('.gmk-weight').each(function () {
                elemFormatDecimalInternal.call(this, 4);
            });
            $('.gmk-amount').each(function () {
                elemFormatDecimalInternal.call(this, 2);
            });
        } else {
            var number = ko.isObservable(num) ? num() : num;
            var prec = ko.isObservable(precision) ? precision() : precision;
            return $.isNumeric(number) ? accounting.formatNumber(utils.round(number, prec), prec, thousands) : number;
            //function formatDecimalInternal(prec) {
            //    return accounting.formatNumber(utils.round(num, prec), prec, thousands);
            //}
            //if (ko.isObservable(precision)) {
            //    return ko.computed(function () {
            //        return formatDecimalInternal(precision());
            //    });
            //} else {
            //    return formatDecimalInternal(precision);
            //}
        }
    }

    function formatWeight(num, precision, thousands) {
        return formatDecimal(num, precision || 4, thousands);
    }

    function formatAmount(num, precision, thousands) {
        return formatDecimal(num, precision || 2, thousands);
    }

    function replaceNan(val, nanVal) {
        return (typeof val === 'number' && !$.isNumeric(val)) ? nanVal : val;
    }

    mod.replaceNan = replaceNan;
    mod.formatDecimal = formatDecimal;
    mod.formatWeight = formatWeight;
    mod.formatAmount = formatAmount;
    mod.formatDate = formatDate;
    mod.getDateString = getDateString;
    mod.getFirstDayOfNextMonth = getFirstDayOfNextMonth;
    mod.trim = trim;
    mod.isEmpty = isEmpty;
    mod.hasScrollbar = hasScrollbar;
    mod.serialize = serialize;
    mod.deserialize = deserialize;
    mod.reset = reset;
    mod.startLoading = startLoading;
    mod.endLoading = endLoading;
    mod.autoFormatString = autoFormatString;

    function parseDate(v, format) {
        if (v) {
            var m = moment(v, format);
            if (m.isValid()) {
                return m.toDate();
            }
        }
        return null;
    }

    function parseISO8601(v) {
        var regexIso8601 = /^(\d{4}|\+\d{6})(?:-(\d{2})(?:-(\d{2})(?:T(\d{2}):(\d{2}):(\d{2})\.(\d*)(?:Z|([\-+])(\d{2}):(\d{2}))?)?)?)?$/;
        var m = regexIso8601.exec(v);
        if (m) {
            return Date.UTC(
                m[1],
                (m[2] || 1) - 1,
                m[3] || 1,
                m[4] - (m[8] ? m[8] + m[9] : 0) || 0,
                m[5] - (m[8] ? m[8] + m[10] : 0) || 0,
                m[6] || 0,
                +((+('0.' + (m[7] || 0)) * 1000).toFixed(0))
            );
        } else {
            return Date.parse(v);
        }
    }

    function datetimeFormatter(v, format) {
        if (v) {
            var m = moment(v);
            if (m.isValid()) {
                return m.format(format || 'YYYY-MM-DD HH:mm');
            } else {
                return v;
            }
        } else {
            return '';
        }
    }

    function dateFormatter(v, format) {
        return datetimeFormatter(v, format || 'YYYY-MM-DD');
    }

    function timeFormatter(v, format) {
        return datetimeFormatter(v, format || 'HH:mm');
    }

    function formatAllDatetime() {
        $('time').each(function () {
            if ($(this).hasClass('t-datetime')) {
                $(this).text(datetimeFormatter($(this).attr('datetime')));
            } else if ($(this).hasClass('t-date')) {
                $(this).text(dateFormatter($(this).attr('datetime')));
            } else if ($(this).hasClass('t-time')) {
                $(this).text(timeFormatter($(this).attr('datetime')));
            }
        });
    }

    function datetimeDeformatter(v, format) {
        return parseDate(v, format || 'YYYY-MM-DD HH:mm')
    }

    function dateDeformatter(v, format) {
        return parseDate(v, format || 'YYYY-MM-DD')
    }

    function timeDeformatter(v, format) {
        return parseDate(v, format || 'HH:mm')
    }

    function find(array, match) {
        if (array && match) {
            for (var i = 0, l = array.length; i < l; i++) {
                var item = array[i];
                if (match(item, i)) {
                    return item;
                }
            }
        }
        return null;
    }

    function uppercaseAmount(amount) {
        if (!$.isNumeric(amount)) {
            return amount;
        }
        //var a = formatAmount(amount, 2, '');
        var a = decimal.formatNonEx(amount, 2);
        if ('string' !== typeof a) {
            return amount;
        }
        var ra = /^-?\d+\.\d\d$/;
        if (!ra.test(a)) {
            return amount;
        }
        var y = a.slice(0, a.length - 3), j = a[a.length - 2], f = a[a.length - 1];
        var uy = uppercaseIntegerStr(y), uj = uppercaseIntegerStr(j), uf = uppercaseIntegerStr(f);
        if (uy !== '零' && uj !== '零' && uf !== '零') {
            return uy + '元' + uj + '角' + uf + '分';
        } else if (uy !== '零' && uj !== '零' && uf === '零') {
            return uy + '元' + uj + '角整';
        } else if (uy !== '零' && uj === '零' && uf !== '零') {
            return uy + '元' + '零' + uf + '分';
        } else if (uy !== '零' && uj === '零' && uf === '零') {
            return uy + '元整';
        } else if (uy === '零' && uj !== '零' && uf !== '零') {
            return uj + '角' + uf + '分';
        } else if (uy === '零' && uj !== '零' && uf === '零') {
            return uj + '角整';
        } else if (uy === '零' && uj === '零' && uf !== '零') {
            return uf + '分';
        } else if (uy === '零' && uj === '零' && uf === '零') {
            return '零元整';
        }
    }

    function uppercaseIntegerStr(n) {
        if ('string' !== typeof n) {
            return n;
        }
        var ri = /^-?\d+$/;
        if (!ri.test(n)) {
            return n;
        }
        if (n[0] === '-') {
            return '负' + uppercaseIntegerStr(n.slice(1));
        }
        n = n.replace(/^0+(.+)$/, '$1');
        if (n.length > 8) {
            var qe8 = n.slice(0, n.length - 8);
            var re8 = n.slice(n.length - 8);
            var uqe8 = uppercaseIntegerStr(qe8);
            var ure8 = uppercaseIntegerStr(re8);
            if (ure8 === '零') {
                return uqe8 + '亿';
            } else if (re8[0] === '0') {
                return uqe8 + '亿零' + ure8;
            } else {
                return uqe8 + '亿' + ure8;
            }
        }
        if (n.length > 4) {
            var qe4 = n.slice(0, n.length - 4);
            var re4 = n.slice(n.length - 4);
            var uqe4 = uppercaseIntegerStr(qe4);
            var ure4 = uppercaseIntegerStr(re4);
            if (ure4 === '零') {
                return uqe4 + '万';
            } else if (re4[0] === '0') {
                return uqe4 + '万零' + ure4;
            } else {
                return uqe4 + '万' + ure4;
            }
        }
        var q = n[n.length - 4] || '0', b = n[n.length - 3] || '0', s = n[n.length - 2] || '0', g = n[n.length - 1];
        var digits = ['零', '壹', '贰', '叁', '肆', '伍', '陆', '柒', '捌', '玖'];
        var uq = digits[q] + '仟', ub = digits[b] + '佰', us = digits[s] + '拾', ug = digits[g];
        var ds = [q, b, s, g];
        var uds = [uq, ub, us, ug];
        var ds = [q, b, s, g];
        var uds = [uq, ub, us, ug];
        for (var i = 0; i < 4; i++) {
            if (ds[i] === '0') {
                uds[i] = '零';
            }
        }
        var u = uds.join('');
        u = u.replace(/^零+(.+)$/, '$1');
        u = u.replace(/^(.+?)零+$/, '$1');
        u = u.replace(/^(.+?)零+(.+)$/, '$1零$2');
        return u;
    }
    mod.uppercaseIntegerStr = uppercaseIntegerStr;

    function getMoneyUnit(type) {
        if (type == '人民币') {
            return '元';
        } return type;
    }

    mod.getMoneyUnit = getMoneyUnit;
    mod.parseDate = parseDate;
    mod.datetimeFormatter = datetimeFormatter;
    mod.dateFormatter = dateFormatter;
    mod.timeFormatter = timeFormatter;
    mod.formatAllDatetime = formatAllDatetime;
    mod.datetimeDeformatter = datetimeDeformatter;
    mod.dateDeformatter = dateDeformatter;
    mod.timeDeformatter = timeDeformatter;
    mod.find = find;
    mod.uppercaseAmount = uppercaseAmount;



    mod.parseFloat = function (str) {
        var num = +str;
        return $.isNumeric(num) ? num : 0;
    };

    function doValidate(elem, callback, context, invalidHandler, preValidate, postValidate) {
        return function (data, event) {
            if (preValidate && preValidate() === false) return;
            var $form = ($.type(elem) == 'string') ? $(elem) : $(event.currentTarget).closest('form');
            var $d = $('.mustValid:disabled', $form).prop('disabled', false);
            var isValid, len = $form.length;
            if (len == 1) isValid = $form.valid();
            else {
                isValid = true;
                $.each($form, function (i, item) {
                    isValid = $(item).valid() && isValid;
                });
            }
            if (isValid) {
                $d.prop('disabled', true);
                if (postValidate && postValidate() === false) return;
                callback.apply(context, arguments);
            } else {
                $d.prop('disabled', true);
                if (invalidHandler) {
                    invalidHandler();
                }
            }
        };
    }
    function setCustomShowErrors(getCustomShowErrors) {
        jQuery.validator.setDefaults({
            showErrors: function (errorMap, errorList) {
                this.defaultShowErrors();
                var customShowErrors = getCustomShowErrors();
                if (customShowErrors) {
                    customShowErrors(this.numberOfInvalids(), errorMap, errorList);
                }
            }
        });
    }
    mod.doValidate = doValidate;
    mod.setCustomShowErrors = setCustomShowErrors;

    function computePercentage(m) {
        return ko.isObservable(m) ? ko.computed({
            read: function () {
                return +((100 * m()).toFixed(2));
            },
            write: function (val) {
                m(+((val / 100).toFixed(4)));
            }
        }) : (100 * m);
    }

    function computeOpposite(m) {
        return ko.isObservable(m) ? ko.computed({
            read: function () {
                return computeOpposite(m());
            },
            write: function (val) {
                m(computeOpposite(val));
            }
        }) : ($.isNumeric(m) ? -m : m);
    }

    mod.computePercentage = computePercentage;
    mod.computeOpposite = computeOpposite;

    var decimal = new (function () {
        var decimal = this;
        function parse(num) {
            return $.isNumeric(+num) ? new BigDecimal('' + (+num)) : num;
        }
        function formatNonEx(num, precision) {
            return $.isNumeric(+num) ? parse(num).format(-1, precision === undefined ? -1 : precision) : num;
        }
        function formatNonExWithoutBigDecimal(num) {
            num = +num || 0;
            var s = '' + num;
            if (s.indexOf('e') > -1) {
                var en = +s.slice(1 + s.indexOf('e'));
                var m = s.slice(0, s.indexOf('e'));
                var a = m.split('');
                if (a[1] === '.') {
                    a.splice(1, 1);
                }
                if (en < 0) {
                    var z = '0.';
                    for (var i = 0; i < -en - 1; i++) {
                        z = z + '0';
                    }
                    return z + a.join('');
                } else if (en === 0) {
                    return m;
                } else if (en >= a.length - 1) {
                    var z = '';
                    for (var i = 0; i < en - a.length + 1; i++) {
                        z = z + '0';
                    }
                    return a.join('') + z;
                } else {
                    a.splice(1 + en, 0, '.');
                    return a.join('');
                }
            }
            return s;
        }
        function toNum(bigDecimal) {
            return +bigDecimal;
        }
        function round(num, scale, roundingMode) {
            return $.isNumeric(+num) ? +(decimal.parse(num).setScale(scale || 0, roundingMode || BigDecimal.prototype.ROUND_HALF_UP)) : num;
        }
        function add(a, b) {
            return $.isNumeric(+a) && $.isNumeric(+b) ? toNum(parse(a).add(parse(b))) : +a + +b;
        }
        function subtract(a, b) {
            return $.isNumeric(+a) && $.isNumeric(+b) ? toNum(parse(a).subtract(parse(b))) : a - b;
        }
        function multiply(a, b) {
            return $.isNumeric(+a) && $.isNumeric(+b) ? toNum(parse(a).multiply(parse(b))) : a * b;
        }
        function divide(a, b, scale, roundingMode) {
            return $.isNumeric(+a) && $.isNumeric(+b) && +b !== 0 ? toNum(parse(a).divide(parse(b), scale || 30, roundingMode || BigDecimal.prototype.ROUND_HALF_UP)) : a / b;
        }
        decimal.parse = parse;
        decimal.formatNonEx = formatNonEx;
        decimal.toNum = toNum;
        decimal.round = round;
        decimal.add = add;
        decimal.subtract = subtract;
        decimal.multiply = multiply;
        decimal.divide = divide;
    })();
    mod.decimal = decimal;
    mod.formatNonEx = decimal.formatNonEx;
    mod.add = decimal.add;
    mod.subtract = decimal.subtract;
    mod.multiply = decimal.multiply;
    mod.divide = decimal.divide;

    var round = decimal.round;
    mod.round = round;

    function roundAmount(num, scale, roundingMode) {
        return round(num, scale || 2, roundingMode || BigDecimal.prototype.ROUND_HALF_UP);
    }

    function roundWeight(num, scale, roundingMode) {
        return round(num, scale || 4, roundingMode || BigDecimal.prototype.ROUND_HALF_UP);
    }
    mod.roundAmount = roundAmount;
    mod.roundWeight = roundWeight;

    var discount = new (function () {
        var DEFAULT_T_ANNUAL = 365.2425;
        var COMPUTE_OPTION = {
            COMPOND: 1,
            SIMPLE: 2,
            ROUGH: 3,
        };
        function computeRdByValues(pv, fv) {
            return (fv - pv) / fv;
        }
        function computeRiByValues(pv, fv) {
            return (fv - pv) / pv;
        }
        function computePvByRd(fv, rd) {
            return fv * (1 - rd);
        }
        function computeFvByRd(pv, rd) {
            return pv / (1 - rd);
        }
        function computePvByRi(fv, ri) {
            return fv / (1 + +ri);
        }
        function computeFvByRi(pv, ri) {
            return pv * (1 + +ri);
        }
        function computeRdByRi(ri) {
            return ri / (1 + +ri);
            //return 1 - 1 / (1 + +ri);
        }
        function computeRiByRd(rd) {
            return rd / (1 - rd);
            //return 1 / (1 - rd) - 1;
        }
        function computeRit1(t1, rit2, t2, computeOption) {
            computeOption = computeOption | COMPUTE_OPTION.COMPOND;
            if (computeOption === COMPUTE_OPTION.COMPOND) {
                return Math.pow(1 + +rit2, t1 / t2) - 1;
                //return Math.exp(Math.log(1 + +rit2) * t1 / t2) - 1;
            } else if (computeOption === COMPUTE_OPTION.SIMPLE) {
                return rit2 * t1 / t2;
            }
        }
        function computeRdt1(t1, rdt2, t2, computeOption) {
            computeOption = computeOption | COMPUTE_OPTION.COMPOND;
            if (computeOption === COMPUTE_OPTION.COMPOND || computeOption === COMPUTE_OPTION.SIMPLE) {
                return computeRdByRi(computeRit1(t1, computeRiByRd(rdt2), t2, computeOption));
            } else if (computeOption === COMPUTE_OPTION.ROUGH) {
                return rdt2 * t1 / t2;
            }
        }
        function computeRdtByRdannual(t, rdannual, tannual, computeOption) {
            return computeRdt1(t, rdannual, tannual || DEFAULT_T_ANNUAL, computeOption);
        }
        this.DEFAULT_T_ANNUAL = DEFAULT_T_ANNUAL;
        this.COMPUTE_OPTION = $.extend({}, COMPUTE_OPTION, true);
        this.computeRdByValues = computeRdByValues;
        this.computeRiByValues = computeRiByValues;
        this.computePvByRd = computePvByRd;
        this.computeFvByRd = computeFvByRd;
        this.computePvByRi = computePvByRi;
        this.computeFvByRi = computeFvByRi;
        this.computeRdByRi = computeRdByRi;
        this.computeRiByRd = computeRiByRd;
        this.computeRit1 = computeRit1;
        this.computeRdt1 = computeRdt1;
        this.computeRdtByRdannual = computeRdtByRdannual;
    })();
    mod.discount = discount;

    function keepUnfoldsState(rowIndex) {
        store.set('unfolds', [rowIndex]);
    }

    function getUnfoldsState() {
        return store.get('unfolds');
    }

    function keepRowState(rowIndex) {
        store.set('row', rowIndex);
    }

    function cleanEmpty(obj) {
        for (var prop in obj) {
            var v = obj[prop];
            if (v === null || v === '' || v === undefined) {
                delete obj[prop];
            }
            else {
                if (typeof obj[prop] != 'object') continue;
                cleanEmpty(obj[prop]);
            }
        }
    }

    function getCleanedEmpty(obj) {
        var c = $.extend({}, obj, true);
        cleanEmpty(c);
        return c;
    }

    function getBaseUrl() {
        // IE don't accept absolute url for History.pushState until IE10, so give it empty origin.
        return location.origin ? (location.origin + location.pathname) : '';
    }

    window.rebuildUrl_i = 0;
    function rebuildUrl(query) {
        if (window.rebuildUrl_i == 0) {
            window.rebuildUrl_i = 1;
            return;
        }
        var origQuery = $.extend({}, query);
        var preference = query || store.get('query');
        cleanEmpty(preference);
        if (query.pagination) {
            if (query.pagination.currentPage == 1) delete query.pagination.currentPage;
            if (query.pagination.pageSize == 10) delete query.pagination.pageSize;
            if (query.pagination.totalCount) delete query.pagination.totalCount;
            if (query.pagination.pageCount) delete query.pagination.pageCount;
        }
        var url = $.param(query), baseUrl = getBaseUrl();
        var newUrl = url ? baseUrl + '?' + url : baseUrl;
        var href = window.location.href, start = href.indexOf(newUrl);
        if (start > -1 && start + newUrl.length == href.length) return;
        History.pushState(origQuery, window.title, newUrl);
    }

    function responseStateChange(v) {
        if (v === false) store.set('responseStateChange', false);
        else store.remove('responseStateChange');
    }

    function isStateChangeSuppressed() {
        return store.get('responseStateChange') === false;
    }

    mod.keepUnfoldsState = keepUnfoldsState;
    mod.keepRowState = keepRowState;
    mod.cleanEmpty = cleanEmpty;
    mod.getCleanedEmpty = getCleanedEmpty;
    mod.rebuildUrl = rebuildUrl;
    mod.responseStateChange = responseStateChange;
    mod.isStateChangeSuppressed = isStateChangeSuppressed;

    function paramWithFromUrl(param) {
        return $.param(param);
    }
    mod.paramWithFromUrl = paramWithFromUrl;

    function downloadFile(setForm) {

        function getCookie(name) {
            var parts = document.cookie.split(name + "=");
            if (parts.length == 2)
                return parts.pop().split(";").shift();
        }

        function expireCookie(cName) {
            document.cookie = encodeURIComponent(cName) + "=deleted; expires=" + new Date(0).toUTCString();
        }

        function setFormToken() {
            var downloadToken = new Date().getTime();
            if ($('#downloadToken').length === 0) {
                $('<input type="hidden" id="downloadToken" />').appendTo('body');
            }
            $('#downloadToken').val(downloadToken);
            return downloadToken;
        }

        var downloadTimer;
        var attempts = 60;

        // Prevents double-submits by waiting for a cookie from the server.
        function blockResubmit() {
            var downloadToken = setFormToken();
            $('#page-spinner').show();

            downloadTimer = window.setInterval(function () {
                var token = getCookie("downloadToken");

                if ((token == downloadToken) || (attempts == 0)) {
                    unblockSubmit();
                }

                attempts--;
            }, 1000);
            return downloadToken;
        }

        function unblockSubmit() {
            $('#page-spinner').hide();
            window.clearInterval(downloadTimer);
            expireCookie("downloadToken");
        }

        var downloadToken = blockResubmit();

        var $iframe;
        if ($('#hiddenDownloader').length === 0) {
            $('<iframe id="hiddenDownloader" style="display: none;"></iframe>').appendTo('body');
        }
        $iframe = $('#hiddenDownloader');
        var delay = $iframe.contents().find('body').length === 0 ? 50 : 0;
        // ie 新建 iframe 有延迟
        setTimeout(function () {
            if ($('#f_export_delivery_bill', $iframe.contents().find('body')).length === 0) {
                $iframe.contents().find('body').append('<form id="f_export_delivery_bill" method="post"></form>');
            }
            var $form = $('#f_export_delivery_bill', $iframe.contents().find('body'));

            setForm($form, downloadToken);

            $form.submit();
        }, delay);
    }
    mod.downloadFile = downloadFile;
    function fileDownload(url, options) {
        if ($.fileDownload) {
            return $.fileDownload(url, $.extend({
                cookieName: 'downloadToken',
                failCallback: function (responseHtml, url) { alert('失败'); }
            }, options || {}));
        } else {
            console.log('未引入 ~/Scripts/plug-ins/jquery.fileDownload.js');
            return downloadFile(function ($form, downloadToken) {
                $form.attr('action', url);
            });
        }
    }
    mod.fileDownload = fileDownload;

    function openWindow() {
        var win = window.open('about:blank', '_blank', 'height=0,width=0,left=' + screen.width + ',top=' + screen.height + ',location=yes,resizable=yes,scrollbars=yes');
        win.resizeTo(0, 0);
        win.moveTo(screen.width, screen.height);
        window.focus();
        win.redirectTo = function (url) {
            win.moveTo(0, 0);
            win.resizeTo(screen.availWidth, screen.availHeight);
            win.location.href = url;
            win.focus();
        };
        return win;
    }
    function openWindowRedirectTo(url) {
        return function () {
            openWindow().redirectTo(url);
        };
    }
    mod.openWindow = openWindow;
    mod.openWindowRedirectTo = openWindowRedirectTo;

    function urlAction(action, controller, params, rootUrl) {
        return ((rootUrl || (window.GMK && window.GMK.Context && window.GMK.Context.RootUrl) || window.rootUrl).replace(/\/$/, '') + '/' + (controller || window.GMK.Context.ControllerName) + '/' + (action || window.GMK.Context.ActionName) + '?' + $.param(params || {}, true)).replace(/\?$/, '');
    }
    function urlContent(contentPath, rootSiteUrl) {
        return contentPath.replace(/^~\//, ((rootSiteUrl || (window.GMK && window.GMK.Context && window.GMK.Context.RootSiteUrl) || window.rootSiteUrl).replace(/\/$/, '') + '/'));
    }
    mod.urlAction = urlAction;
    mod.urlContent = urlContent;
    function openWindowRedirectToAction(action, controller, params, rootUrl) {
        return function () {
            var url = urlAction(action, controller, params, rootUrl);
            openWindow().redirectTo(url);
        };
    }
    mod.openWindowRedirectToAction = openWindowRedirectToAction;

    var dismissAlertTimeoutId;
    function _dismissAlertSync() {
        $('#sys-alert').removeClass('in');
    }

    function dismissAlert(sync) {
        if (dismissAlertTimeoutId) clearTimeout(dismissAlertTimeoutId);
        if (sync) {
            _dismissAlertSync();
            dismissAlertTimeoutId = null;
        } else {
            dismissAlertTimeoutId = setTimeout(_dismissAlertSync, 3000);
        }
        Cookies.expire('alert-message');
    }
    function showAlert(msg) {
        if (dismissAlertTimeoutId) {
            clearTimeout(dismissAlertTimeoutId);
            dismissAlertTimeoutId = null;
        }
        $('#sys-alert-content').text(msg);
        if (msg) $('#sys-alert').addClass('in');
    }
    function flickAlert(msg) {
        if (!msg) {
            dismissAlert(true);
            return;
        }
        showAlert(msg);
        dismissAlert();
    }
    mod.dismissAlert = dismissAlert;
    mod.showAlert = showAlert;
    mod.flickAlert = flickAlert;

    mod.alert = function (msg, ok) {
        var dialog = alertify.alert(msg);
        dialog.show();
        dialog.ok = ok;
        return dialog;
    };
    mod.confirm = function (msg, ok, cancel) {
        if (!ok) throw 'invalid argument';
        var dialog = alertify.confirm(msg);
        dialog.show();
        dialog.ok = ok;
        dialog.cancel = cancel;
        return dialog;
    };

    mod.encodeHtml = function (s) {
        return $('<div>').text(s).html();
    };

    mod.getDateDiff = function (startDate, endDate) {
        startDate = new Date(startDate);
        endDate = new Date(endDate);
        var startTime = Date.UTC(startDate.getFullYear(), startDate.getMonth(), startDate.getDate());
        var endTime = Date.UTC(endDate.getFullYear(), endDate.getMonth(), endDate.getDate());
        var dates = Math.abs((startTime - endTime)) / (24 * 60 * 60 * 1000);
        return dates;
    };

    mod.compareDate = function (date1, date2) {
        date1 = new Date(date1);
        date2 = new Date(date2);
        var startTime = Date.UTC(date1.getFullYear(), date1.getMonth(), date1.getDate());
        var endTime = Date.UTC(date2.getFullYear(), date2.getMonth(), date2.getDate());

        if (startTime >= endTime)
            return true;
        if (startTime < endTime)
            return false;
    };
    /*
    * 根据输入的日期返回日期间隔文字；
    * 如果正好是一个月，返回月份；
    * 如果非一个月，返回 date1 to date2
    */
    mod.getDateDiffText = function (fromDate,toDate,lang,format) {
        fromDate = new Date(fromDate);
        toDate = new Date(toDate);

        var year = fromDate.getFullYear();
        var month = fromDate.getMonth();
        var firstDay = new Date(year, month, 1); //firstday of month
        var tempDay = new Date(year, month, 0);
        var lastDay = new Date(year, month, tempDay.getDate()); //lastday of month

        if (Date.UTC(fromDate.getFullYear(), fromDate.getMonth(), fromDate.getDate()) == Date.UTC(firstDay.getFullYear(), firstDay.getMonth(), firstDay.getDate())
            && Date.UTC(toDate.getFullYear(), toDate.getMonth(), toDate.getDate() == Date.UTC(lastDay.getFullYear(), lastDay.getMonth(), lastDay.getDate()))) {
            if (lang === 'en') {
                return mod.formatEnglishDate(fromDate,  format ||'MMMM,YYYY');
            } else {
                return mod.formatDate(fromDate, format ||'YYYY年MM月');
            }
        } else {
            if (lang === 'en')
                return mod.formatEnglishDate(fromDate, format || 'MMM DD,YYYY') + ' to ' + mod.formatEnglishDate(toDate, format || 'MMM DD,YYYY');
            else
                return mod.formatDate(fromDate, format || 'YYYY-MM-DD') + '到' + mod.formatDate(toDate,format || 'YYYY-MM-DD');
        }
        
    };

    mod.namespace = function (nsLiteral) {
        if (!window["__gmk_ns__"]) window["__gmk_ns__"] = {};
        var ns = window["__gmk_ns__"];
        var splittings = nsLiteral.split('.');
        var result;
        $.each(splittings, function (i, name) {
            if (!ns[name]) ns[name] = {};
            ns = result = ns[name];
        });
        return result;
    };

    mod.obj = function (nsLiteral) {
        return mod.namespace(nsLiteral);
    };

    mod.inherit = function (parent, child) {
        var f = function () { };

        f.prototype = parent.prototype;
        child.prototype = new f();
        child.prototype.constructor = child;
    };

    mod.formatEnglishDate = function (date, format) {
        var lang = moment.lang();
        if (!date) return '';
        if (!format) format = 'DD MMM,YYYY';
        moment.lang('en');
        var result = moment(date).format(format);
        moment.lang(lang);
        return result;
    };
    mod.getSup = function (day) {
        if (day == 1) return 'st';
        else if (day == 2) return 'nd';
        else if (day == 3) return 'rd';
        else return 'th';
    };

    //人工设置高亮tab 输入：高亮的tab元素id
    mod.setMenuHighlight = function (container) {
        var submenu = $('#' + container).closest('ul').closest('li')[0];
        if ($(submenu).hasClass('submenu')) {
            $('#' + container).addClass('open');
            $(submenu).addClass('open').addClass('delactive')
                    .find('.label > i.icon-chevron-up').removeClass('icon-chevron-up').addClass('icon-chevron-down');
        }
    };
})();
function _class(cls) {
    var result = function () {
        !this.hasOwnProperty('upper') && (this.upper = function () {
            return result.prototype;
        });
        cls.apply(this, arguments);
    };

    result.inherit = function (_super) {
        // _super must be made by _class
        this.prototype = new _super();
        return this;
    };
    return result;
}
