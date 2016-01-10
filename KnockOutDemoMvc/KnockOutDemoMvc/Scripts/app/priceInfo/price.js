/**
 * Created by amy on 2015-06-03.
 */

var GMK = GMK || {};
GMK.PriceInfo = GMK.PriceInfo || {};
GMK.PriceInfo.Manage = GMK.PriceInfo.Manage || {};

GMK.PriceInfo.Manage.start = function (viewRoute) {
    var route = {
        baseUrl: 'PriceInfo/'
    };
    GMK.Features.CommonModels.onReady(function (models) {
        var viewModel = new GMK.PriceInfo.Manage.ManageViewModel(models, viewRoute,
            {
                saveUrl: route.baseUrl + "Save",
                createUrl: route.baseUrl + "Create",
                getUrl: route.baseUrl + "Get",
                deleteUrl: route.baseUrl + "Delete",
                getDetailUrl: route.baseUrl + "GetPriceDetail",
                reloadUrl: viewRoute.reloadUrl
            });
        viewModel.initialize(function () {
            ko.applyBindings(viewModel);
        });
    });
};

GMK.PriceInfo.Manage.ManageViewModel = function (models, route, options) {
    this.commonModels = models;
    var self = $.extend(this, models);
    var base = GMK.Features.FeatureBase;
    self.initialized = ko.observable(false);

    self.contract = {};
    self.priceInfo = {};
    self.priceList = ko.observableArray();
    self.isEdit = ko.observable(false);
    self.allInstruments = ko.observableArray();
    self.noPriceInfoError = ko.observable(false);

    self.priceMakingTypes = $.grep(models.EnumOptions.PriceMakingType, function (r) {
        return r.value == models.Enums.PriceMakingType.FixPrice
            || r.value == models.Enums.PriceMakingType.FirePrice
            || r.value == models.Enums.PriceMakingType.AvgPrice;
    });

    self.priceModel = new GMK.PriceInfo.Manage.PriceModel(route.fixPrice, route.firePrice, route.avgPrice, route.avgPriceInstrument, models, self);

    self.onDelete = function (type, data, event) {
        base._delete(options.deleteUrl, { detailId: data.Id, infoId: self.priceInfo.WFPriceInfoId() }, function (result) {
            Cookies.set('alert-message', '删除成功');
            location.href = options.reloadUrl + '?' + $.param({ contractId: route.contractId });
        });
    };

    self.onSave = function (data, event) {
        var postData = route.commonPrice;
        postData.PriceInfoId = self.priceInfo.WFPriceInfoId();
        if (self.priceModel.type() == self.priceModel.priceTypes.FixPrice) { //定价 
            postData.PriceMakingType = self.priceModel.priceTypes.FixPrice;
            postData.FixPrice = ko.mapping.toJS(self.priceModel.fixPrice);
            postData.FixPrice.PriceMakingType = self.priceModel.priceTypes.FixPrice;
        } else if (self.priceModel.type() == self.priceModel.priceTypes.FirePrice) { //点价
            if (models.isForeignExchange(self.priceModel.firePrice.item.PriceMarket())) {
                if (self.priceModel.firePrice.instrumentDate() != null) {                    
                    var instrument = models.findDateCodeInstrument(self.priceModel.firePrice.instrumentDate());
                    if (instrument)
                        self.priceModel.firePrice.item.InstrumentId(instrument.id);
                    else {
                        alert('点价合约暂未设置，请联系管理员。'); return false;
                    }
                }
            }

            var dates = (self.priceModel.firePrice.item.startAndEndDate() || '').split(' - ');
            if (dates[0])
                self.priceModel.firePrice.item.FireStartDate(dates[0]);
            if (dates[1])
                self.priceModel.firePrice.item.FireEndDate(dates[1]);

            postData.PriceMakingType = self.priceModel.priceTypes.FirePrice;
            postData.FirePrice = ko.mapping.toJS(self.priceModel.firePrice);
            postData.FirePrice.PriceMakingType = self.priceModel.priceTypes.FirePrice;
            postData.FirePrice.Item = ko.mapping.toJS(self.priceModel.firePrice.item);

        } else if (self.priceModel.type() == self.priceModel.priceTypes.AvgPrice) {
            var dates = (self.priceModel.avgPrice.item.startAndEndDate() || '').split(' - ');
            if (dates[0])
                self.priceModel.avgPrice.item.StartTime(dates[0]);
            if (dates[1])
                self.priceModel.avgPrice.item.EndTime(dates[1]);

            postData.PriceMakingType = self.priceModel.priceTypes.AvgPrice;
            postData.AvgPrice = ko.mapping.toJS(self.priceModel.avgPrice);
            postData.AvgPrice.PriceMakingType = self.priceModel.priceTypes.AvgPrice;
            postData.AvgPrice.Item = ko.mapping.toJS(self.priceModel.avgPrice.item);
        }
        if (self.isEdit()) {
            base._post(options.saveUrl, postData, function (result) {
                Cookies.set('alert-message', '编辑成功');
                self.initialize();
                $("#priceModal").modal('hide');
            });
        } else {
            base._post(options.createUrl, postData, function (result) {
                Cookies.set('alert-message', '新增成功');
                self.initialize();
                $("#priceModal").modal('hide');
            });
        }
    };

    self.onEdit = function (type, data) {
        self.isEdit(true);
        self.priceModel.type(type);
        ko.mapping.fromJS(route.fixPrice, self.priceModel.fixPrice);
        ko.mapping.fromJS(route.firePrice, self.priceModel.firePrice);
        ko.mapping.fromJS(route.firePrice.Item, self.priceModel.firePrice.item);
        ko.mapping.fromJS(route.avgPrice, self.priceModel.avgPrice);
        ko.mapping.fromJS(route.avgPrice.Item, self.priceModel.avgPrice.item);

        base._get(options.getDetailUrl, { detailId: data.Id }, function (result) {
            var detail = result.Data.detail ? result.Data.detail : null;
            if (detail != null) {
                if (self.priceModel.type() == self.priceModel.priceTypes.FixPrice) { //定价
                    ko.mapping.fromJS(detail, self.priceModel.fixPrice);
                } else if (self.priceModel.type() == self.priceModel.priceTypes.FirePrice) { //点价
                    if (detail.Item.IsBuyerFire == true)
                        detail.Item.IsBuyerFire = "true";
                    else
                        detail.Item.IsBuyerFire = "false";
                    if (detail.Item.IsSwap == true)
                        detail.Item.IsSwap = "true";
                    else
                        detail.Item.IsSwap = "false";
                    ko.mapping.fromJS(detail, self.priceModel.firePrice);
                    ko.mapping.fromJS(detail.Item, self.priceModel.firePrice.item);

                    self.priceModel.firePrice.instrumentDate(models.findInstrument(detail.Item.InstrumentId));
                    var date = utils.formatDate(self.priceModel.firePrice.item.FireStartDate()) + " - " + utils.formatDate(self.priceModel.firePrice.item.FireEndDate());
                    if (date != " - ") {
                        self.priceModel.firePrice.item.startAndEndDate(date);
                    }

                } else if (self.priceModel.type() == self.priceModel.priceTypes.AvgPrice) {
                    ko.mapping.fromJS(detail, self.priceModel.avgPrice);
                    ko.mapping.fromJS(detail.Item, self.priceModel.avgPrice.item);
                    self.priceModel.avgPrice.item.InstrumentCode(getAvgInstrument(detail));
                    var date = utils.formatDate(self.priceModel.avgPrice.item.StartTime()) + " - " + utils.formatDate(self.priceModel.avgPrice.item.EndTime());
                    if (date != " - ") {
                        self.priceModel.avgPrice.item.startAndEndDate(date);
                    }
                }
                $('#priceModal').modal('show');
            } else {
                alert("所选数据已被修改，请刷新后重试。");
            }
        });
    };

    self.onAdd = function () {
        self.isEdit(false);
        self.priceModel.type(null);
        ko.mapping.fromJS(route.fixPrice, self.priceModel.fixPrice);
        ko.mapping.fromJS(route.firePrice, self.priceModel.firePrice);
        ko.mapping.fromJS(route.firePrice.Item, self.priceModel.firePrice.item);
        self.priceModel.firePrice.item.IsBuyerFire("true");
        self.priceModel.firePrice.item.IsSwap("false");
        ko.mapping.fromJS(route.avgPrice, self.priceModel.avgPrice);
        ko.mapping.fromJS(route.avgPrice.Item, self.priceModel.avgPrice.item);

        self.priceModel.avgPrice.item.startAndEndDate(null);
        self.priceModel.firePrice.item.startAndEndDate(null);

        return true;
    };
    self.initialize = function (callback) {
        base._get(options.getUrl, { contractId: route.contractId }, function (result) {
            self.contract = ko.mapping.fromJS(result.Data.contract);
            if (result.Data.priceInfo != null) {
                self.priceInfo = ko.mapping.fromJS(result.Data.priceInfo);
                self.priceList(initList(result.Data.priceInfo));

                route.fixPrice.InfoId = result.Data.priceInfo.WFPriceInfoId;
                route.firePrice.InfoId = result.Data.priceInfo.WFPriceInfoId;
                route.avgPrice.InfoId = result.Data.priceInfo.WFPriceInfoId;

                var commodityId = self.contract.CommodityId();
                var data = $.grep(models.AllInstruments(), function (instrument) {
                    return instrument.commodityTypeId == commodityId;
                });
                self.allInstruments(data);
            } else {
                self.noPriceInfoError(true);
            }
            self.initialized(true);
            if (callback) {
                callback();
            }
        });

        self.priceModel.firePrice.initLMEInstrument();
    };

    self.invalids = {
        price: ko.observable(0)
    };
    self.customShowErrors = ko.observable();
    utils.setCustomShowErrors(self.customShowErrors);
    self.setCustomShowErrors = {
        price: function () { self.customShowErrors(self.invalids.price); }
    }

    self.canEdit = function () {
        if (self.priceInfo.MakingType && (self.priceInfo.MakingType() == models.Enums.PriceMakingType.ComplexPrice ||
           self.priceInfo.MakingType() == models.Enums.PriceMakingType.Undeclared))
            return true;
        else
            return false;
    }

    function initList(priceInfo) {
        var list = [];
        $.each(priceInfo.FixPrices, function (i, r) {
            var info = $.extend(r, {
                type: self.priceModel.priceTypes.FixPrice
            });
            list.push(info);
        });
        $.each(priceInfo.FirePrices, function (i, r) {
            var info = $.extend(r, {
                type: self.priceModel.priceTypes.FirePrice,
                strumentCode: models.findInstrument(r.Item.InstrumentId),
                moreInfo: getMoreInfo(r)
            });
            list.push(info);
        });
        $.each(priceInfo.AvgPrices, function (i, r) {
            var info = $.extend(r, {
                type: self.priceModel.priceTypes.AvgPrice,
                strumentCode: getAvgInstrument(r),
                moreInfo: getMoreInfo(r)
            });
            list.push(info);
        });
        return list;
    };

    function getAvgInstrument(avgPrice) {
        var code = "";
        if (avgPrice && avgPrice.WFPriceInstruments.length > 0) {
            var exchange = models.findById(models._AllExchanges, avgPrice.Item.PriceMarket);
            if (!(exchange && exchange.name == "伦敦金属交易所")) {
                var lcdis = avgPrice.WFPriceInstruments;
                if (lcdis.length == 1) {
                    code = self.commonModels.findInstrument(lcdis[0].WFInstrumentId);
                } else {
                    $.each(lcdis, function (i, r) {
                        var startDate = r.StartDate != null ? r.StartDate : (lcdis[i - 1] ? lcdis[i - 1].EndDate : avgPrice.StartTime);
                        var endDate = r.EndDate != null ? r.EndDate : (lcdis[i + 1] ? lcdis[i + 1].StartDate : avgPrice.EndTime);
                        code += "作价时间:" + utils.formatDate(startDate) + "至" + utils.formatDate(endDate) + "，合约：" + models.findInstrument(r.WFInstrumentId) + "<br />";
                    });
                }
            }
        }
        return code;
    }

    function getMoreInfo(price) {
        var info = "";
        if (price.PriceMakingType == self.priceModel.priceTypes.FirePrice) {
            info += '保证金比例：' + price.Item.MarginRate + '；' + (price.Item.IsBuyerFire ? '客户点价' : '非客户点价');
            if (models.isForeignExchange(price.Item.PriceMarket)) {
                info += "<br />";
                info += "点价类型：" + models.Enums.PricingType._Notes[price.Item.PricingType] +"；"+ (price.Item.IsSwap ? "接受调期" :"不接受调期");
            }
        } if (price.PriceMakingType == self.priceModel.priceTypes.AvgPrice) {
            info += '作价天数：' + price.Item.DayCount;
        }
        return info;
    }
};

GMK.PriceInfo.Manage.PriceModel = function (fixPrice, firePrice, avgPrice, avgPriceInstrument, commonModels, manageModels) {
    var self = this;
    self.priceTypes = commonModels.Enums.PriceMakingType;
    self.type = ko.observable();

    self.fixPrice = ko.mapping.fromJS(fixPrice);
    //需要添加根据内外贸默认设置选择交易所的方法
    self.firePrice = new GMK.PriceInfo.Manage.FirePriceModel(firePrice, commonModels, manageModels);
    self.avgPrice = new GMK.PriceInfo.Manage.AvgPriceModel(avgPrice, avgPriceInstrument, commonModels, manageModels);

};

GMK.PriceInfo.Manage.FirePriceModel = function (firePrice, commonModels, manageModels) {
    var self = $.extend(this, ko.mapping.fromJS(firePrice));
    self.item = ko.mapping.fromJS(firePrice.Item);
    self.item.IsBuyerFire("true");
    self.item.IsSwap("false");
    self.instrumentDate = ko.observable();
    self.item.startAndEndDate = ko.observable();

    self.instruments = ko.computed(function () {
        var result = [];
        var exchangeId = self.item.PriceMarket();
        var date = self.item.FireStartDate() == null ? (manageModels.contract.SignDate ? manageModels.contract.SignDate() : moment()) : self.item.FireStartDate();
        if (exchangeId) {
            result = $.grep(manageModels.allInstruments(), function (instrument) {
                return instrument.exchangeId == exchangeId && utils.compareDate(instrument.lastTradingDay, date);
            });
        }
        if (!self.item.WFPriceDetailId()) {
            var date = moment().startOf('d').toDate();
            var temp = $.grep(result, function (item) {
                return item.currentStartDate && item.currentEndDate && new moment(item.currentStartDate).toDate() <= date && new moment(item.currentEndDate).toDate() >= date;
            });
            self.item.InstrumentId(temp.length ? temp[0].id : null);
        }
        return result;
    });

    self.initLMEInstrument = function () {
        var base = GMK.Features.FeatureBase;
        var _untradableDaysCache = {};
        var _lastKey;
        function _getUntradableDays(exchangeId, startDate, callback) {
            var key = exchangeId + '_' + startDate.valueOf();
            if (_lastKey == key) {
                $('#firePriceInstrumentDate').datepicker('show');
                return;
            }
            _lastKey = key;
            if (_untradableDaysCache[key]) {
                callback(_untradableDaysCache[key]);
            }
            base._get("Contract/GetUntradableDays", { exchangeId: exchangeId, startDate: utils.formatDate(startDate) }, function (result) {
                result.data = $.map(result.data, function (d) {
                    return moment(d).toDate();
                });
                _untradableDaysCache[key] = result.data;
                callback(result.data);
            });
        }
        var _showInstrumentDatepicker = (function () {
            _getUntradableDays(self.item.PriceMarket(), utils.parseDate(manageModels.contract.SignDate()), function (data) {
                $('#firePriceInstrumentDate').datepicker('option', 'minDate', utils.parseDate(manageModels.contract.SignDate()));
                $('#firePriceInstrumentDate').datepicker('option', 'disabledDates', data).datepicker('show');
            });
        }).bind(self);

        var _methods = {
            onClickInsrumentDate: function () {
                _showInstrumentDatepicker();
            },
            setMinDate: function (minDate) {
                $('#firePriceInstrumentDate').datepicker('option', 'minDate', utils.parseDate(minDate));
            }
        };
        $.extend(this, _methods);
    };

    self.setDate = ko.computed(function () {
        var dates = (self.item.startAndEndDate() || '').split(' - ');
        if (dates[0])
            self.item.FireStartDate(dates[0]);
        if (dates[1])
            self.item.FireEndDate(dates[1]);
    });
};

GMK.PriceInfo.Manage.AvgPriceModel = function (avgPrice, avgPriceInstrument, commonModels, manageModels) {
    var self = $.extend(this, ko.mapping.fromJS(avgPrice));
    self.avgPriceInstrument = avgPriceInstrument;
    self.item = ko.mapping.fromJS(avgPrice.Item);
    self.item.InstrumentCode = ko.observable();
    self.item.startAndEndDate = ko.observable();

    self.priceTypes = $.grep(commonModels.Enums.PriceMakingType, function (r) {
        return r.value == commonModels.Enums.PriceMakingType.FixPrice
            || r.value == commonModels.Enums.PriceMakingType.FirePrice
            || r.value == commonModels.Enums.PriceMakingType.AvgPrice;
    });
   
    self.isSpotPriceMakingMarket = ko.computed(function () {
        var exchange = commonModels.findById(commonModels._AllExchanges, self.item.PriceMarket());
        return (exchange || {}).type & commonModels.Enums.CorporationTypeFlag.SpotPriceMakingMarket;
    });
    self.item.PriceMarket.subscribe(function (val) {
        var exchange = commonModels.findById(commonModels._AllExchanges, val);
        var isSpotPriceMakingMarket = (exchange || {}).type & commonModels.Enums.CorporationTypeFlag.SpotPriceMakingMarket;
        if (isSpotPriceMakingMarket) {
            self.item.SettlementPriceType(commonModels.Enums.SettlementPriceType.FullDay);            
        }
    });

    self.settlementPriceTypes = ko.computed(function () {
        return self.isSpotPriceMakingMarket()
            ? $.grep(commonModels.EnumOptions.SettlementPriceType, function (r) { return r.text == '当日'; })
            : commonModels.EnumOptions.SettlementPriceType;
    });

    self.instruments = ko.computed(function () {
        var result = [];
        var exchangeId = self.item.PriceMarket();

        var date = self.item.StartTime() == null ? (manageModels.contract.SignDate ? manageModels.contract.SignDate() : moment()) : self.item.StartTime();
        if (exchangeId) {
            result = $.grep(manageModels.allInstruments(), function (instrument) {
                return instrument.exchangeId == exchangeId && utils.compareDate(instrument.lastTradingDay, date);
            });
        }
        return result;
    });
    self.continuousInstruments = ko.computed(function () {
        return manageModels.initialized() && manageModels.commonModels.listInstruments({
            commodityId: manageModels.priceInfo.CommodityId(),
            exchangeId: self.item.PriceMarket(),
            instrumentType: manageModels.commonModels.Enums.InstrumentType.Continuous
        }) || [];
    });
    self.setDate = ko.observable(function () {
        var dates = (self.item.startAndEndDate() || '').split(' - ');
        if (dates[0])
            self.item.FireStartDate(dates[0]);
        if (dates[1])
            self.item.FireEndDate(dates[1]);
    });
}
