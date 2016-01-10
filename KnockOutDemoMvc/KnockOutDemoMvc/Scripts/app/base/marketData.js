var GMK = GMK || {};
GMK.MarketData = GMK.MarketData || {};
GMK.MarketData.start = function (route, element, success) {
    GMK.Features.CommonModels.onReady(function (commonModels) {
        if (route.action === 'Index') {
            var viewModel = new GMK.MarketData.IndexViewModel(commonModels, route, {
                searchUrl: route.baseUrl + 'List',
                deleteUrl: route.baseUrl + 'Delete'
            });
            viewModel.initialize(function () {
                ko.applyBindings(viewModel, element);
                viewModel.commonModels.registerQueryFormEvent();
                if (success) {
                    success();
                }
            });
        } else if (route.action === 'Create') {
            var viewModel = new GMK.MarketData.CreateViewModel(commonModels, route, {
                indexUrl: route.baseUrl + 'Index',
                saveUrl: route.baseUrl + 'Create'
            });
            viewModel.initialize(function () {
                ko.applyBindings(viewModel, element);
                if (success) {
                    success();
                }
            });
        } else if (route.action === 'Edit') {
            var viewModel = new GMK.MarketData.EditViewModel(commonModels, route, {
                getUrl: route.baseUrl + 'Get',
                indexUrl: route.baseUrl + 'Index',
                saveUrl: route.baseUrl + 'Edit'
            });
            viewModel.initialize(function () {
                ko.applyBindings(viewModel, element);
                if (success) {
                    success();
                }
            });
        }
    });
};
GMK.MarketData.IndexViewModel = function (commonModels, route, options) {
    var self = this;
    self.commonModels = commonModels;
    var base = GMK.Features.FeatureBase;
    self.query = ko.mapping.fromJS(route.values.query);
    self.currQuery = ko.mapping.toJS(self.query);
    var pagination;

    self.items = ko.observableArray();

    self.instruments = ko.computed(function () {
        var list = $.grep(self.commonModels.AllInstruments(), function (r) {
            return r.commodityTypeId == self.query.CommodityTypeId() && r.exchangeId == self.query.MarketId();
        });

        return list;
    });

    self.initialize = function (callback) {
        self.currQuery = ko.mapping.toJS(self.query);
        self.currQuery.CommodityTypeId = (commonModels.UserCommodityTypes[0] || {}).id;
        self.currQuery.MarketId = commonModels.AllExchanges[0].id;
        base._get(options.searchUrl, self.currQuery, function (result) {
            self.fillItems(result);
            if (callback) {
                callback();
            }
        });
    };
    self.onSearch = function () {
        _search();
    };
    function _search(withPagination) {
        var dateRange = $('#DateRange').val();
        self.query.DateRange = dateRange;
        self.currQuery = ko.mapping.toJS(self.query);
        self.currQuery.InstrumentId = $('#InstrumentId').val();
        if (withPagination) self.currQuery.Pagination = pagination;
        base._get(options.searchUrl, self.currQuery, function (result) {
            self.fillItems(result);
        }).done(function () {
            if (withPagination) delete self.currQuery.pagination;
        });
    }
    self.fillItems = function (result) {
        self.items(ko.mapping.fromJS(result.Data.list)());
        pagination = result.Data.pagination;
        base._paginate($(route.values.pager), result.Data.pagination, function () {
            return $.extend(true, {}, self.currQuery);
        }, options.searchUrl, self.fillItems);
    };
    self.onDelete = function (item) {
        base._delete(options.deleteUrl, {
            id: item.WFInstrumentSettlementPriceId()
        }, function () {
            _search(true);
        });
    };
}
GMK.MarketData.CreateViewModel = function (commonModels, route, options) {
    var self = this, date = new moment(new moment(new Date()).format('YYYY-MM-DD'), 'YYYY-MM-DD').toDate();
    self.commonModels = commonModels;
    var base = GMK.Features.FeatureBase;
    self.item = null;
    self.initialize = function (callback) {
        self.item = new GMK.MarketData.ItemViewModel(route.values.item, commonModels);
        self.item.PriceDate(date);
        self.item.CommodityId(commonModels.UserCommodityTypes[0].id);
        self.item._init(commonModels);

        if (callback) {
            callback();
        }
    };
    self.onSave = function () {
        var plainItem = self.item.toJs();
        if (plainItem.instrumentDateError == true) {
            alert("所选日期代表的合约不正确，请选择正确的合约。");
            return false;
        } else {
            base._postThenBack(options.saveUrl, plainItem);
        }
    };

    this.instrumentDate = ko.observable();
};
GMK.MarketData.EditViewModel = function (commonModels, route, options) {
    var self = this;
    self.commonModels = commonModels;
    var base = GMK.Features.FeatureBase;
    self.id = route.values.id;
    self.item = null;
    self.CommodityTypeId = ko.observable();
    self.initialize = function (callback) {
        base._get(options.getUrl, { id: self.id }, function (result) {
            self.item = new GMK.MarketData.ItemViewModel(result.Data, commonModels);
            self.item._init(commonModels);

            var instrument = self.commonModels.findById(commonModels.AllInstruments(), result.Data.InstrumentId);
            if (instrument) {
                self.CommodityTypeId(instrument.commodityTypeId);
                self.CommodityTypeId.subscribe(function () {
                    self.item.InstrumentId(null);
                });
                self.item.type(instrument.instrumentType);                

                if (commonModels.isForeignExchange(self.item.PriceMarket()) && self.item.type() == commonModels.Enums.InstrumentType.Normal) {
                    self.item.instrumentDate(instrument.code);
                }
            }
            if (callback) {
                callback();
            }
        });
    };
    self.onSave = function () {
        var plainItem = self.item.toJs();
        if (plainItem.instrumentDateError == true) {
            alert("所选日期代表的合约不正确，请选择正确的合约。");
            return false;
        } else {
            base._postThenBack(options.saveUrl, plainItem);
        }
    };
};
GMK.MarketData.ItemViewModel = function (plainItem, commonModels) {
    var self = $.extend(this, ko.mapping.fromJS(plainItem));
    self.type = ko.observable();
    self.instrumentDate = ko.observable();

    self.isSpotPriceMakingMarket = ko.computed(function () {
        var exchange = commonModels.findById(commonModels._AllExchanges, self.PriceMarket());
        return (exchange || {}).type & commonModels.Enums.CorporationTypeFlag.SpotPriceMakingMarket;
    });

    self.instruments = ko.computed(function () {
        var result;
        var exchangeId = self.PriceMarket();
        var commodityTypeId = self.CommodityId();
        if (self.PriceDate() != null) {
            if (commonModels.isForeignExchange(self.PriceMarket()) && self.type() == commonModels.Enums.InstrumentType.Continuous) {
                result = $.grep(commonModels.AllInstruments(), function (instrument) {
                    return instrument.instrumentType === self.type() && instrument.exchangeId == exchangeId;
                });
            } else {
                if (commodityTypeId && exchangeId) {
                    result = $.grep(commonModels.AllInstruments(), function (instrument) {
                        return instrument.exchangeId == exchangeId && instrument.commodityTypeId == commodityTypeId 
                            && utils.compareDate(instrument.lastTradingDay, self.PriceDate());
                    });
                } else {
                    result = [];
                }
            }
            if (!plainItem.WFInstrumentSettlementPriceId) {
                var date = self.PriceDate();
                var temp = $.grep(result, function (item) {
                    return item.currentStartDate && item.currentEndDate && new moment(item.currentStartDate).toDate() <= date && new moment(item.currentEndDate).toDate() >= date;
                });
                self.InstrumentId(temp.length ? temp[0].id : null);
            }
        }
        return result;
    });

    self.toJs = function () {
        var plainItem = ko.mapping.toJS(self);
        if (self.isSpotPriceMakingMarket()) {
            plainItem.InstrumentId = null;
            plainItem.SettlementPrice = null;
            plainItem.TradeWeight = null;
        }
        if (commonModels.isForeignExchange(self.PriceMarket()) && self.type() == commonModels.Enums.InstrumentType.Normal) {
            if (self.instrumentDate() != null) {
                var date = utils.parseDate(self.instrumentDate());
                var instrument = $.grep(self.instruments(), function (r) {
                    var iDate = utils.parseDate(r.code);
                    if(iDate != null)
                        return date.getFullYear() == iDate.getFullYear() && date.getMonth() == iDate.getMonth() && date.getDate() == iDate.getDate();
                });

                if (instrument.length > 0)
                    plainItem.InstrumentId = instrument[0].id;
                else
                    plainItem.instrumentDateError = true;
            }
        }
        return plainItem;
    };

    self._init = function (commonModels) {
        var base = GMK.Features.FeatureBase;
        $("InstrumentDate").tooltip({placement: 'right',
            position: {
                my: "right",
                at: "center top",
            }
        });
        $("InstrumentId").tooltip({placement: 'right',
            position: {
                my: "right center",
                at: "center top",
            }
        });

        var _untradableDaysCache = {};
        var _$instrumentDate = $('#InstrumentDate');
        var _lastKey;
        function _getUntradableDays(exchangeId, startDate, callback) {
            var key = exchangeId + '_' + startDate.valueOf();
            if (_lastKey == key) {
                _$instrumentDate.datepicker('show');
                return;
            }
            _lastKey = key;
            if (_untradableDaysCache[key]) {
                callback(_untradableDaysCache[key]);
            }
            base._get("Contract/GetUntradableDays", { exchangeId: exchangeId, startDate: utils.formatDate(startDate)}, function (result) {
                result.data = $.map(result.data, function (d) {
                    return moment(d).toDate();
                });
                _untradableDaysCache[key] = result.data;
                callback(result.data);
            });
        }
        var _showInstrumentDatepicker = (function () {
            _getUntradableDays(self.PriceMarket(), moment(self.PriceDate()).startOf('d').toDate(), function (data) {
                _$instrumentDate.datepicker('option', 'minDate', utils.parseDate(moment(self.PriceDate()).startOf('d').toDate()));
                _$instrumentDate.off('focusin').datepicker('option', 'disabledDates', data).datepicker('show');
                //setTimeout(function () { $('#InstrumentDate').datepicker('show'); }, 100);
            });
        }).bind(self);
        $('#InstrumentDate').focusin(_showInstrumentDatepicker);

        var _methods = {
            onCloseInsrumentDate: function () {
                _$instrumentDate.off('.focusin').focusin(_showInstrumentDatepicker);
            },
            onSelectPriceDate: ko.computed(function () {
                if (self.PriceDate() != null) {
                    _$instrumentDate.datepicker('option', 'minDate', utils.parseDate(self.PriceDate()));
                    _$instrumentDate.off('.focusin').focusin(_showInstrumentDatepicker);
                }
                else {
                    _$instrumentDate.unbind('focusin');
                    self.instrumentDate(null);
                }
            }),
        };
        $.extend(this, _methods);
    }

    self.changeToolTip = ko.computed(function () {
        if (commonModels.isForeignExchange(self.PriceMarket())) {
            if(self.PriceDate() != null)
                $('#InstrumentDate').tooltip('destroy');
            else
                $('#InstrumentDate').tooltip('show');
        } else
            if (self.PriceDate() != null)
                $('#InstrumentId').tooltip('destroy');
            else
                $('#InstrumentId').tooltip('show');
    });
};



